"""Near-real-time scoring of rows landing in a SQL table with TabFM.

Public surface:

* :class:`~tabfm_realtime.config.Settings` -- runtime configuration.
* :class:`~tabfm_realtime.datasource.SqlDataSource` -- polls a table for
  unscored rows and writes predictions back (Postgres, SQLite, ...).
* :class:`~tabfm_realtime.predictor.TabFMPredictor` /
  :class:`~tabfm_realtime.predictor.MockPredictor` -- the model wrappers.
* :class:`~tabfm_realtime.service.ScoringService` -- the micro-batch loop.
"""

from tabfm_realtime.config import Settings, TableConfig
from tabfm_realtime.datasource import SqlDataSource
from tabfm_realtime.predictor import MockPredictor, Predictor, TabFMPredictor
from tabfm_realtime.service import ScoringService

__all__ = [
    "Settings",
    "TableConfig",
    "SqlDataSource",
    "Predictor",
    "MockPredictor",
    "TabFMPredictor",
    "ScoringService",
]
