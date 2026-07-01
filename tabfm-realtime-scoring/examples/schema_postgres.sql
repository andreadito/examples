-- Example target table for the scoring loop.
--
-- Your ingest process INSERTs rows with the feature columns populated and
-- prediction / proba / scored_at left NULL. The loop fills them in.

CREATE TABLE IF NOT EXISTS observations (
    id          BIGSERIAL PRIMARY KEY,

    -- feature columns (match FEATURE_COLUMNS in the environment)
    amount      DOUBLE PRECISION,
    region      TEXT,
    hour        INTEGER,

    -- populated by the scoring loop
    prediction  TEXT,
    proba       DOUBLE PRECISION,
    scored_at   TIMESTAMPTZ,

    landed_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Makes "find the next unscored rows" cheap even on a large table.
CREATE INDEX IF NOT EXISTS observations_unscored_idx
    ON observations (id)
    WHERE scored_at IS NULL;
