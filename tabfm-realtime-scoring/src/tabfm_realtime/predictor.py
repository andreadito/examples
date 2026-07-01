"""Model wrappers.

A :class:`Predictor` maps a batch of feature rows to ``(labels, probabilities)``.
Two implementations are provided:

* :class:`TabFMPredictor` -- wraps a real ``tabfm.TabFMClassifier`` fitted with
  in-context examples. It pads every batch to a fixed width so JAX compiles the
  forward pass once instead of retracing on each new batch size.
* :class:`MockPredictor` -- a deterministic threshold rule with no dependencies,
  so the demo and tests run without downloading model weights.
"""

from __future__ import annotations

import logging
from typing import Protocol

import numpy as np
import pandas as pd

logger = logging.getLogger(__name__)


class Predictor(Protocol):
    def predict(self, frame: pd.DataFrame) -> tuple[np.ndarray, np.ndarray]:
        """Return ``(labels, probabilities)`` aligned to ``frame``'s rows."""
        ...


def _pad_to(frame: pd.DataFrame, width: int) -> pd.DataFrame:
    """Repeat the last row until ``frame`` has exactly ``width`` rows.

    Keeping the batch shape constant is what stops JAX from recompiling the
    TabFM forward pass on every tick. Callers slice the real rows back off.
    """
    if len(frame) >= width:
        return frame.iloc[:width]
    pad = frame.iloc[[-1] * (width - len(frame))]
    return pd.concat([frame, pad], ignore_index=True)


class TabFMPredictor:
    """Wraps a fitted ``tabfm.TabFMClassifier`` for fixed-shape batch scoring."""

    def __init__(
        self,
        model,
        context_features: pd.DataFrame,
        context_labels: np.ndarray,
        *,
        batch_size: int,
        ensemble: bool = False,
    ):
        import tabfm  # imported lazily so the package works without it installed

        factory = tabfm.TabFMClassifier.ensemble if ensemble else tabfm.TabFMClassifier
        self.clf = factory(model=model)
        # "fit" just hands TabFM the in-context examples -- no gradient training.
        self.clf.fit(context_features, context_labels)
        self.batch_size = batch_size

    def predict(self, frame: pd.DataFrame) -> tuple[np.ndarray, np.ndarray]:
        n = len(frame)
        if n == 0:
            return np.array([]), np.array([])
        proba = np.asarray(self.clf.predict_proba(_pad_to(frame, self.batch_size)))
        proba = proba[:n]  # drop the padding rows
        best = proba.argmax(axis=1)
        labels = np.asarray(self.clf.classes_)[best]
        confidence = proba[np.arange(n), best]
        return labels, confidence


class MockPredictor:
    """Deterministic stand-in: threshold on one numeric feature.

    Useful for wiring, the demo and tests. Predicts ``positive`` when
    ``feature > threshold`` else ``negative``; confidence is the distance from
    the threshold squashed into (0.5, 1).
    """

    def __init__(
        self,
        feature: str,
        *,
        threshold: float = 0.0,
        positive: str = "yes",
        negative: str = "no",
    ):
        self.feature = feature
        self.threshold = threshold
        self.positive = positive
        self.negative = negative

    def predict(self, frame: pd.DataFrame) -> tuple[np.ndarray, np.ndarray]:
        values = pd.to_numeric(frame[self.feature], errors="coerce").fillna(
            self.threshold
        )
        margin = (values - self.threshold).to_numpy(dtype=float)
        labels = np.where(margin > 0, self.positive, self.negative)
        confidence = 0.5 + 0.5 * np.tanh(np.abs(margin))
        return labels, confidence


def build_predictor(settings, *, batch_size: int) -> Predictor:
    """Construct the configured predictor, falling back to the mock.

    Falls back to :class:`MockPredictor` when ``settings.use_mock`` is set, when
    TabFM is not importable, or when no context CSV is configured.
    """
    if settings.use_mock:
        logger.info("USE_MOCK set -- using MockPredictor.")
        return MockPredictor(settings.table.feature_columns[0])

    try:
        import tabfm
    except ImportError:
        logger.warning("tabfm not installed -- falling back to MockPredictor.")
        return MockPredictor(settings.table.feature_columns[0])

    if not settings.context_csv:
        logger.warning("No CONTEXT_CSV configured -- falling back to MockPredictor.")
        return MockPredictor(settings.table.feature_columns[0])

    context = pd.read_csv(settings.context_csv)
    labels = context[settings.context_target_column].to_numpy()
    features = context[list(settings.table.feature_columns)]
    loader = getattr(tabfm, f"tabfm_v1_0_0_{settings.backend}")
    model = loader.load(model_type="classification")
    logger.info(
        "Loaded TabFM (%s backend) with %d in-context examples.",
        settings.backend,
        len(context),
    )
    return TabFMPredictor(model, features, labels, batch_size=batch_size)
