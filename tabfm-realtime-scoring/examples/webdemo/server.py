"""Live web demo: rows landing + TabFM predictions, in a table and a chart.

Runs the scoring loop against a local SQLite DB (MockPredictor, so no model
download) and serves one page that streams each newly-scored row over
Server-Sent Events. Pure standard library on the server side.

    python examples/webdemo/server.py
    # then open http://127.0.0.1:8000

Point ``DB_URL`` at ``postgresql+psycopg://...`` and drop the writer thread to
visualise a real Postgres table instead.
"""

from __future__ import annotations

import json
import logging
import math
import os
import threading
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

from sqlalchemy import create_engine, text

from tabfm_realtime.config import TableConfig
from tabfm_realtime.datasource import SqlDataSource
from tabfm_realtime.predictor import MockPredictor
from tabfm_realtime.service import ScoringService

HERE = Path(__file__).parent
DB_URL = "sqlite:///./webdemo.db"
FEATURES = ("amount", "region")
HOST, PORT = "127.0.0.1", 8000
# Small batch + occasional bursts from the writer make the pending queue
# visibly build up and drain in the UI.
BATCH_SIZE = 8


def build_predictor():
    """Pick the demo predictor, honouring USE_TABFM. Returns (predictor, mode).

    ``USE_TABFM=1`` loads the real TabFM model from Hugging Face using the
    bundled ``context.csv`` as in-context examples; anything else (or a missing
    TabFM install) falls back to the deterministic MockPredictor.
    """
    mock = MockPredictor("amount", threshold=0.0, positive="high", negative="low")
    if os.environ.get("USE_TABFM", "").lower() not in {"1", "true", "yes"}:
        return mock, "mock"
    try:
        import pandas as pd

        import tabfm
    except ImportError:
        logging.warning("USE_TABFM set but tabfm not installed; using MockPredictor.")
        return mock, "mock"

    from tabfm_realtime.predictor import TabFMPredictor

    backend = os.environ.get("BACKEND", "jax")
    ctx = pd.read_csv(os.environ.get("CONTEXT_CSV", str(HERE / "context.csv")))
    loader = getattr(tabfm, f"tabfm_v1_0_0_{backend}")
    model = loader.load(model_type="classification")
    predictor = TabFMPredictor(
        model,
        ctx[list(FEATURES)],
        ctx["label"].to_numpy(),
        batch_size=BATCH_SIZE,
    )
    logging.info("Loaded TabFM (%s) with %d context rows.", backend, len(ctx))
    return predictor, f"tabfm:{backend}"


def setup(engine) -> None:
    with engine.begin() as conn:
        conn.execute(text("DROP TABLE IF EXISTS observations"))
        conn.execute(
            text(
                """
                CREATE TABLE observations (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    amount REAL,
                    region TEXT,
                    prediction TEXT,
                    proba REAL,
                    scored_at TIMESTAMP
                )
                """
            )
        )


def stream_rows(engine, stop: threading.Event) -> None:
    """Simulate a sine-ish stream of rows landing in the table over time.

    Every so often a *burst* of rows lands at once, so the pending queue
    visibly spikes and then drains as the loop catches up.
    """
    regions = ["us", "eu", "apac"]
    i = 0
    while not stop.is_set():
        burst = 25 if (i > 0 and i % 12 == 0) else 1
        with engine.begin() as conn:
            for _ in range(burst):
                amount = round(80 * math.sin(i / 6.0) + (i * 13 % 40) - 20, 1)
                conn.execute(
                    text("INSERT INTO observations (amount, region) VALUES (:a, :r)"),
                    {"a": amount, "r": regions[i % 3]},
                )
                i += 1
        stop.wait(0.5)


class Handler(BaseHTTPRequestHandler):
    def do_GET(self):  # noqa: N802 (stdlib naming)
        if self.path in ("/", "/index.html"):
            self._serve_file("index.html", "text/html; charset=utf-8")
        elif self.path == "/chart.umd.min.js":
            self._serve_file("chart.umd.min.js", "text/javascript; charset=utf-8")
        elif self.path == "/events":
            self._serve_events()
        else:
            self.send_error(404)

    def _serve_file(self, name: str, ctype: str) -> None:
        body = (HERE / name).read_bytes()
        self.send_response(200)
        self.send_header("Content-Type", ctype)
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def _serve_events(self) -> None:
        self.send_response(200)
        self.send_header("Content-Type", "text/event-stream")
        self.send_header("Cache-Control", "no-cache")
        self.send_header("Connection", "keep-alive")
        self.end_headers()

        engine = self.server.engine  # type: ignore[attr-defined]
        stop = self.server.stop  # type: ignore[attr-defined]
        mode = self.server.mode  # type: ignore[attr-defined]
        last_id = 0
        try:
            while not stop.is_set():
                with engine.begin() as conn:
                    rows = (
                        conn.execute(
                            text(
                                "SELECT id, amount, region, prediction, proba "
                                "FROM observations "
                                "WHERE scored_at IS NOT NULL AND id > :last "
                                "ORDER BY id"
                            ),
                            {"last": last_id},
                        )
                        .mappings()
                        .all()
                    )
                    pending = conn.execute(
                        text(
                            "SELECT count(*) FROM observations WHERE scored_at IS NULL"
                        )
                    ).scalar_one()
                    scored = conn.execute(
                        text(
                            "SELECT count(*) FROM observations "
                            "WHERE scored_at IS NOT NULL"
                        )
                    ).scalar_one()
                for row in rows:
                    last_id = row["id"]
                    self._sse("row", dict(row))
                self._sse("stats", {"pending": pending, "scored": scored, "mode": mode})
                stop.wait(0.4)
        except (BrokenPipeError, ConnectionResetError):
            pass  # browser tab closed

    def _sse(self, event: str, payload: dict) -> None:
        self.wfile.write(f"event: {event}\ndata: {json.dumps(payload)}\n\n".encode())
        self.wfile.flush()

    def log_message(self, *args):  # keep the console focused on the loop
        pass


def main() -> None:
    logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")
    engine = create_engine(DB_URL, connect_args={"check_same_thread": False})
    setup(engine)

    cfg = TableConfig(table="observations", id_column="id", feature_columns=FEATURES)
    source = SqlDataSource(engine, cfg)
    predictor, mode = build_predictor()
    service = ScoringService(
        source,
        predictor,
        id_column="id",
        feature_columns=FEATURES,
        batch_size=BATCH_SIZE,
        poll_interval=0.5,
    )

    stop = threading.Event()
    threading.Thread(target=stream_rows, args=(engine, stop), daemon=True).start()
    threading.Thread(target=service.run_forever, args=(stop,), daemon=True).start()

    server = ThreadingHTTPServer((HOST, PORT), Handler)
    server.engine = engine  # type: ignore[attr-defined]
    server.stop = stop  # type: ignore[attr-defined]
    server.mode = mode  # type: ignore[attr-defined]
    print(f"Predictor: {mode}. Open http://{HOST}:{PORT}  (Ctrl-C to stop)")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        stop.set()
        server.shutdown()
        engine.dispose()


if __name__ == "__main__":
    main()
