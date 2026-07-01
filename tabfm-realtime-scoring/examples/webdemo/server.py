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
    """Simulate a sine-ish stream of rows landing in the table over time."""
    import math

    regions = ["us", "eu", "apac"]
    i = 0
    while not stop.is_set():
        amount = round(80 * math.sin(i / 6.0) + (i * 13 % 40) - 20, 1)
        with engine.begin() as conn:
            conn.execute(
                text("INSERT INTO observations (amount, region) VALUES (:a, :r)"),
                {"a": amount, "r": regions[i % 3]},
            )
        i += 1
        stop.wait(0.4)


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
                for row in rows:
                    last_id = row["id"]
                    self.wfile.write(f"data: {json.dumps(dict(row))}\n\n".encode())
                    self.wfile.flush()
                stop.wait(0.4)
        except (BrokenPipeError, ConnectionResetError):
            pass  # browser tab closed

    def log_message(self, *args):  # keep the console focused on the loop
        pass


def main() -> None:
    logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")
    engine = create_engine(DB_URL, connect_args={"check_same_thread": False})
    setup(engine)

    cfg = TableConfig(table="observations", id_column="id", feature_columns=FEATURES)
    source = SqlDataSource(engine, cfg)
    predictor = MockPredictor("amount", threshold=0.0, positive="high", negative="low")
    service = ScoringService(
        source,
        predictor,
        id_column="id",
        feature_columns=FEATURES,
        batch_size=16,
        poll_interval=0.5,
    )

    stop = threading.Event()
    threading.Thread(target=stream_rows, args=(engine, stop), daemon=True).start()
    threading.Thread(target=service.run_forever, args=(stop,), daemon=True).start()

    server = ThreadingHTTPServer((HOST, PORT), Handler)
    server.engine = engine  # type: ignore[attr-defined]
    server.stop = stop  # type: ignore[attr-defined]
    print(f"Open http://{HOST}:{PORT}  (Ctrl-C to stop)")
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
