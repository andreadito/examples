"""The scoring loop.

Each tick pulls up to ``batch_size`` unscored rows, scores them in one batch
and writes the predictions back. Rows that land between ticks accumulate in the
table, so the poll interval *is* the micro-batch window -- "seconds is ok".
"""

from __future__ import annotations

import logging
import threading

import pandas as pd

from tabfm_realtime.datasource import SqlDataSource
from tabfm_realtime.predictor import Predictor

logger = logging.getLogger(__name__)


class ScoringService:
    def __init__(
        self,
        source: SqlDataSource,
        predictor: Predictor,
        *,
        id_column: str,
        feature_columns: tuple[str, ...],
        batch_size: int = 64,
        poll_interval: float = 1.0,
    ):
        self.source = source
        self.predictor = predictor
        self.id_column = id_column
        self.feature_columns = list(feature_columns)
        self.batch_size = batch_size
        self.poll_interval = poll_interval

    def score_once(self) -> int:
        """Score at most one batch. Returns the number of rows written."""
        rows = self.source.fetch_unscored(self.batch_size)
        if not rows:
            return 0
        frame = pd.DataFrame(rows)
        labels, confidence = self.predictor.predict(frame[self.feature_columns])
        predictions = list(
            zip(frame[self.id_column].tolist(), labels.tolist(), confidence.tolist())
        )
        written = self.source.write_predictions(predictions)
        logger.info("Scored %d row(s).", written)
        return written

    def run_forever(self, stop_event: threading.Event | None = None) -> None:
        """Poll and score until ``stop_event`` is set (or forever)."""
        stop_event = stop_event or threading.Event()
        logger.info(
            "Scoring loop started (batch_size=%d, poll_interval=%.1fs).",
            self.batch_size,
            self.poll_interval,
        )
        while not stop_event.is_set():
            try:
                processed = self.score_once()
            except Exception:  # keep the loop alive across transient failures
                logger.exception("Scoring tick failed; retrying after backoff.")
                processed = 0
            if processed == 0:
                # Nothing waiting -- sleep, but wake immediately on shutdown.
                stop_event.wait(self.poll_interval)
