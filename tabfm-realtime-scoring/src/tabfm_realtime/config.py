"""Runtime configuration, loaded from environment variables.

Everything the loop needs is captured here so the CLI, the demo and the tests
all construct the service the same way.
"""

from __future__ import annotations

import os
from dataclasses import dataclass, field


@dataclass(frozen=True)
class TableConfig:
    """Describes the table the loop reads from and writes back to.

    A row is considered *unscored* when ``scored_at_column`` is NULL. After a
    prediction is written, that column is stamped with the server clock so the
    row is never picked up twice.
    """

    table: str
    id_column: str
    feature_columns: tuple[str, ...]
    prediction_column: str = "prediction"
    proba_column: str = "proba"
    scored_at_column: str = "scored_at"


@dataclass(frozen=True)
class Settings:
    """Top-level configuration for a scoring run."""

    database_url: str
    table: TableConfig

    # How many rows to pull (and score as one batch) per tick. Keeping this
    # fixed keeps the TabFM input shape stable and avoids JAX recompilation.
    batch_size: int = 64
    # Seconds to sleep when a tick finds no unscored rows.
    poll_interval: float = 1.0

    # Predictor selection. When ``use_mock`` is true (or TabFM is not
    # installed) a deterministic MockPredictor is used instead of the model.
    use_mock: bool = False
    backend: str = "jax"  # "jax" or "pytorch"
    # CSV of historical labelled rows used as TabFM's in-context examples.
    # Must contain the feature columns plus ``context_target_column``.
    context_csv: str | None = None
    context_target_column: str = "label"

    @classmethod
    def from_env(cls, environ: dict[str, str] | None = None) -> "Settings":
        env = dict(os.environ if environ is None else environ)

        def _require(key: str) -> str:
            value = env.get(key)
            if not value:
                raise ValueError(f"Missing required environment variable: {key}")
            return value

        feature_columns = tuple(
            c.strip() for c in _require("FEATURE_COLUMNS").split(",") if c.strip()
        )
        table = TableConfig(
            table=_require("TABLE"),
            id_column=env.get("ID_COLUMN", "id"),
            feature_columns=feature_columns,
            prediction_column=env.get("PREDICTION_COLUMN", "prediction"),
            proba_column=env.get("PROBA_COLUMN", "proba"),
            scored_at_column=env.get("SCORED_AT_COLUMN", "scored_at"),
        )
        return cls(
            database_url=_require("DATABASE_URL"),
            table=table,
            batch_size=int(env.get("BATCH_SIZE", "64")),
            poll_interval=float(env.get("POLL_INTERVAL", "1.0")),
            use_mock=env.get("USE_MOCK", "").lower() in {"1", "true", "yes"},
            backend=env.get("BACKEND", "jax"),
            context_csv=env.get("CONTEXT_CSV") or None,
            context_target_column=env.get("CONTEXT_TARGET_COLUMN", "label"),
        )
