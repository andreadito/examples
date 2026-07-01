from sqlalchemy import text

from tabfm_realtime.datasource import SqlDataSource
from tests.conftest import insert


def test_fetch_unscored_returns_id_and_features(engine, table_cfg):
    insert(engine, 10.0, "eu")
    source = SqlDataSource(engine, table_cfg)

    rows = source.fetch_unscored(limit=10)

    assert len(rows) == 1
    assert rows[0]["id"] == 1
    assert rows[0]["amount"] == 10.0
    assert rows[0]["region"] == "eu"


def test_fetch_unscored_respects_limit(engine, table_cfg):
    for i in range(5):
        insert(engine, float(i))
    source = SqlDataSource(engine, table_cfg)

    assert len(source.fetch_unscored(limit=3)) == 3


def test_write_predictions_marks_rows_scored(engine, table_cfg):
    insert(engine, 5.0)
    source = SqlDataSource(engine, table_cfg)

    written = source.write_predictions([(1, "yes", 0.9)])

    assert written == 1
    # Once scored, the row is no longer returned.
    assert source.fetch_unscored(limit=10) == []
    with engine.begin() as conn:
        row = conn.execute(
            text("SELECT prediction, proba, scored_at FROM observations WHERE id=1")
        ).one()
    assert row.prediction == "yes"
    assert row.proba == 0.9
    assert row.scored_at is not None


def test_write_predictions_is_idempotent(engine, table_cfg):
    insert(engine, 5.0)
    source = SqlDataSource(engine, table_cfg)
    source.write_predictions([(1, "yes", 0.9)])

    # A second write for an already-scored row updates nothing.
    assert source.write_predictions([(1, "no", 0.1)]) == 0
    with engine.begin() as conn:
        pred = conn.execute(
            text("SELECT prediction FROM observations WHERE id=1")
        ).scalar_one()
    assert pred == "yes"
