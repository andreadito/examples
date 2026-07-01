import pytest
from sqlalchemy import create_engine, text

from tabfm_realtime.config import TableConfig

FEATURES = ("amount", "region")


@pytest.fixture
def engine(tmp_path):
    eng = create_engine(f"sqlite:///{tmp_path/'test.db'}")
    with eng.begin() as conn:
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
    yield eng
    eng.dispose()


@pytest.fixture
def table_cfg():
    return TableConfig(
        table="observations", id_column="id", feature_columns=FEATURES
    )


def insert(engine, amount, region="us"):
    from sqlalchemy import text

    with engine.begin() as conn:
        conn.execute(
            text("INSERT INTO observations (amount, region) VALUES (:a, :r)"),
            {"a": amount, "r": region},
        )
