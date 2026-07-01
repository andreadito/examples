import threading

import numpy as np
import pandas as pd

from tabfm_realtime.datasource import SqlDataSource
from tabfm_realtime.predictor import MockPredictor, _pad_to
from tabfm_realtime.service import ScoringService
from tests.conftest import FEATURES, insert


def _service(engine, table_cfg, **kwargs):
    source = SqlDataSource(engine, table_cfg)
    predictor = MockPredictor("amount", positive="high", negative="low")
    return ScoringService(
        source,
        predictor,
        id_column=table_cfg.id_column,
        feature_columns=FEATURES,
        **kwargs,
    )


def test_score_once_scores_a_batch(engine, table_cfg):
    insert(engine, 50.0)
    insert(engine, -50.0)
    service = _service(engine, table_cfg, batch_size=16)

    assert service.score_once() == 2
    assert service.score_once() == 0  # nothing left

    source = SqlDataSource(engine, table_cfg)
    assert source.fetch_unscored(10) == []


def test_score_once_respects_batch_size(engine, table_cfg):
    for i in range(5):
        insert(engine, float(i))
    service = _service(engine, table_cfg, batch_size=2)

    assert service.score_once() == 2  # only one batch per tick


def test_mock_predictor_labels_and_confidence():
    predictor = MockPredictor("amount", threshold=0.0, positive="hi", negative="lo")
    frame = pd.DataFrame({"amount": [5.0, -5.0], "region": ["a", "b"]})

    labels, confidence = predictor.predict(frame)

    assert list(labels) == ["hi", "lo"]
    assert np.all(confidence > 0.5) and np.all(confidence <= 1.0)


def test_pad_to_keeps_width_constant():
    frame = pd.DataFrame({"amount": [1.0, 2.0]})
    assert len(_pad_to(frame, 8)) == 8
    # Padding rows repeat the last real row.
    assert _pad_to(frame, 8)["amount"].iloc[-1] == 2.0
    # Never grows beyond the requested width.
    assert len(_pad_to(frame, 1)) == 1


def test_run_forever_stops_on_event(engine, table_cfg):
    insert(engine, 10.0)
    service = _service(engine, table_cfg, batch_size=4, poll_interval=0.01)
    stop = threading.Event()

    t = threading.Thread(target=service.run_forever, args=(stop,))
    t.start()
    # Let it drain the row, then stop.
    threading.Event().wait(0.2)
    stop.set()
    t.join(timeout=2)

    assert not t.is_alive()
    assert SqlDataSource(engine, table_cfg).fetch_unscored(10) == []
