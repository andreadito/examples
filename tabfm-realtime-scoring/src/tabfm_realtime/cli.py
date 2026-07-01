"""Command-line entry point: build everything from the environment and run.

Example::

    export DATABASE_URL="postgresql+psycopg://user:pass@localhost:5432/app"
    export TABLE=observations
    export FEATURE_COLUMNS="amount,region,hour"
    export CONTEXT_CSV=./context.csv
    tabfm-score
"""

from __future__ import annotations

import logging
import signal
import threading

from sqlalchemy import create_engine

from tabfm_realtime.config import Settings
from tabfm_realtime.datasource import SqlDataSource
from tabfm_realtime.predictor import build_predictor
from tabfm_realtime.service import ScoringService


def main() -> None:
    logging.basicConfig(
        level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s"
    )
    settings = Settings.from_env()

    engine = create_engine(settings.database_url, pool_pre_ping=True)
    source = SqlDataSource(engine, settings.table)
    predictor = build_predictor(settings, batch_size=settings.batch_size)
    service = ScoringService(
        source,
        predictor,
        id_column=settings.table.id_column,
        feature_columns=settings.table.feature_columns,
        batch_size=settings.batch_size,
        poll_interval=settings.poll_interval,
    )

    stop_event = threading.Event()
    for sig in (signal.SIGINT, signal.SIGTERM):
        signal.signal(sig, lambda *_: stop_event.set())

    try:
        service.run_forever(stop_event)
    finally:
        engine.dispose()


if __name__ == "__main__":
    main()
