"""Zero-infra demo: watch predictions fill in as rows land in a table.

Runs entirely on a local SQLite file with the MockPredictor, so it needs no
Postgres and no model download. It:

  1. creates an ``observations`` table,
  2. starts a background writer that inserts a new row every ~0.3s,
  3. runs the scoring loop for a few seconds,
  4. prints the scored table.

Swap the SQLite URL for a ``postgresql+psycopg://...`` one and drop the writer
thread to run the identical loop against Postgres.

    python examples/demo_sqlite.py
"""

from __future__ import annotations

import logging
import threading
import time

from sqlalchemy import create_engine, text

from tabfm_realtime.config import TableConfig
from tabfm_realtime.datasource import SqlDataSource
from tabfm_realtime.predictor import MockPredictor
from tabfm_realtime.service import ScoringService

DB_URL = "sqlite:///./demo.db"
FEATURES = ("amount", "region")


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
    """Simulate rows landing in the table over time."""
    regions = ["us", "eu", "apac"]
    i = 0
    while not stop.is_set():
        with engine.begin() as conn:
            conn.execute(
                text(
                    "INSERT INTO observations (amount, region) VALUES (:a, :r)"
                ),
                {"a": (i * 37 % 200) - 100, "r": regions[i % 3]},
            )
        i += 1
        stop.wait(0.3)


def main() -> None:
    logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")
    engine = create_engine(DB_URL)
    setup(engine)

    cfg = TableConfig(table="observations", id_column="id", feature_columns=FEATURES)
    source = SqlDataSource(engine, cfg)
    # Predict "high" when amount > 0, else "low".
    predictor = MockPredictor("amount", threshold=0.0, positive="high", negative="low")
    service = ScoringService(
        source,
        predictor,
        id_column=cfg.id_column,
        feature_columns=FEATURES,
        batch_size=16,
        poll_interval=0.5,
    )

    stop = threading.Event()
    writer = threading.Thread(target=stream_rows, args=(engine, stop), daemon=True)
    loop = threading.Thread(target=service.run_forever, args=(stop,), daemon=True)
    writer.start()
    loop.start()

    time.sleep(5)
    stop.set()
    writer.join(timeout=2)
    loop.join(timeout=2)

    with engine.begin() as conn:
        rows = conn.execute(
            text(
                "SELECT id, amount, region, prediction, proba "
                "FROM observations ORDER BY id"
            )
        ).all()
    scored = sum(1 for r in rows if r.prediction is not None)
    print(f"\n{len(rows)} rows landed, {scored} scored:\n")
    print(f"{'id':>3} {'amount':>7} {'region':>6} {'pred':>5} {'proba':>6}")
    for r in rows:
        proba = f"{r.proba:.3f}" if r.proba is not None else "-"
        print(
            f"{r.id:>3} {r.amount:>7.1f} {r.region:>6} "
            f"{str(r.prediction):>5} {proba:>6}"
        )


if __name__ == "__main__":
    main()
