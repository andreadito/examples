"""SQL data source: claim unscored rows, write predictions back.

Built on SQLAlchemy Core so the exact same code runs against Postgres (the
primary target) and SQLite (the zero-infra demo). On Postgres the unscored
query uses ``FOR UPDATE SKIP LOCKED`` when ``lock_rows=True`` so several
workers can share one table without handing the same row to two of them.
"""

from __future__ import annotations

from typing import Any

from sqlalchemy import MetaData, Table, func, select, update
from sqlalchemy.engine import Engine

from tabfm_realtime.config import TableConfig

# A single scored row ready to be written back: (id_value, label, probability).
Prediction = tuple[Any, Any, float]


class SqlDataSource:
    """Reads unscored rows from a table and persists predictions to it."""

    def __init__(self, engine: Engine, cfg: TableConfig, *, lock_rows: bool = True):
        self.engine = engine
        self.cfg = cfg
        self._lock_rows = lock_rows and engine.dialect.name == "postgresql"
        self.table = Table(cfg.table, MetaData(), autoload_with=engine)

    def fetch_unscored(self, limit: int) -> list[dict[str, Any]]:
        """Return up to ``limit`` rows whose score column is still NULL.

        Each dict contains the id column and every configured feature column.
        """
        cfg = self.cfg
        tbl = self.table
        columns = [tbl.c[cfg.id_column]] + [
            tbl.c[name] for name in cfg.feature_columns
        ]
        stmt = (
            select(*columns)
            .where(tbl.c[cfg.scored_at_column].is_(None))
            .order_by(tbl.c[cfg.id_column])
            .limit(limit)
        )
        if self._lock_rows:
            stmt = stmt.with_for_update(skip_locked=True)
        with self.engine.begin() as conn:
            return [dict(row) for row in conn.execute(stmt).mappings().all()]

    def write_predictions(self, predictions: list[Prediction]) -> int:
        """Persist predictions, stamping ``scored_at`` with the server clock.

        The update is idempotent: it only touches rows still marked unscored,
        so a crash between fetch and write never double-scores a row.
        Returns the number of rows actually updated.
        """
        if not predictions:
            return 0
        cfg = self.cfg
        tbl = self.table
        updated = 0
        with self.engine.begin() as conn:
            for id_value, label, proba in predictions:
                result = conn.execute(
                    update(tbl)
                    .where(tbl.c[cfg.id_column] == id_value)
                    .where(tbl.c[cfg.scored_at_column].is_(None))
                    .values(
                        {
                            cfg.prediction_column: label,
                            cfg.proba_column: float(proba),
                            cfg.scored_at_column: func.now(),
                        }
                    )
                )
                updated += result.rowcount or 0
        return updated
