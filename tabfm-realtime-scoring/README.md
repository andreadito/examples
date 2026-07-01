# tabfm-realtime-scoring

Near-real-time scoring of rows landing in a SQL table with
[TabFM](https://github.com/google-research/tabfm), Google Research's tabular
foundation model.

A long-lived worker polls a table for unscored rows, scores each micro-batch
with a warmed TabFM model, and writes the prediction back. It targets
**Postgres**, but the same code runs against SQLite for a zero-infra demo.

> **Latency class:** this is *seconds*, not sub-millisecond. TabFM inference is
> a forward pass over your in-context examples plus the query batch, so it suits
> "score the new arrivals every second or two", not a per-request online
> endpoint.

## How it works

```
rows land (INSERT ... scored_at = NULL)
        │
        ▼
  ScoringService.run_forever()  ── every poll_interval ──▶ fetch_unscored(batch_size)
        │                                                        │
        │                                        rows accumulated between ticks
        ▼                                                        ▼
  predictor.predict(batch)  ◀── warmed once (weights + JAX compile) ──┘
        │
        ▼
  write_predictions()  → UPDATE ... SET prediction, proba, scored_at = now()
                          (only WHERE scored_at IS NULL → idempotent)
```

Key design choices, and why:

- **Model warmed once.** The process loads weights and triggers JAX compilation
  a single time; every tick reuses it. The first prediction is slow (download +
  compile), the rest are not.
- **The poll interval is the micro-batch window.** Rows that arrive between
  ticks are scored together — no per-row forward pass.
- **Fixed batch shape.** `TabFMPredictor` pads every batch to `batch_size`
  before calling the model so JAX compiles the forward pass once instead of
  retracing on each new batch size, then slices the padding back off.
- **Idempotent write-back.** `scored_at` is stamped with the server clock and
  the update only touches still-unscored rows, so a crash between fetch and
  write never double-scores.

## Install

```bash
cd tabfm-realtime-scoring
pip install -e '.[postgres,dev]'   # add ,tabfm to pull the real model
```

Without the `tabfm` extra (or when `USE_MOCK=1`), the loop uses a deterministic
`MockPredictor` so you can wire everything up before touching the model.

## Try the demo (no Postgres, no model download)

```bash
pip install -e '.[dev]'
python examples/demo_sqlite.py
```

It creates a SQLite table, streams rows into it in the background, runs the loop
for a few seconds, and prints the table with predictions filled in.

## Live web demo (table + line chart)

A single-page UI that streams each newly-scored row over Server-Sent Events so
you can watch predictions land in real time — as a line chart (points coloured
by prediction) or a table. Server side is pure standard library; Chart.js is
vendored locally, so it runs fully offline with no model download.

```bash
pip install -e '.[dev]'
python examples/webdemo/server.py
# open http://127.0.0.1:8000
```

Point `DB_URL` in `examples/webdemo/server.py` at a `postgresql+psycopg://...`
URL and remove the writer thread to visualise a real Postgres table instead.

## Run against Postgres

1. Create the table (see [`examples/schema_postgres.sql`](examples/schema_postgres.sql)).
2. Provide a CSV of historical labelled rows for TabFM's in-context examples —
   the feature columns plus a `label` column.
3. Configure via environment variables and run `tabfm-score`:

```bash
export DATABASE_URL="postgresql+psycopg://user:pass@localhost:5432/app"
export TABLE=observations
export FEATURE_COLUMNS="amount,region,hour"
export CONTEXT_CSV=./context.csv        # in-context examples for TabFM
export BATCH_SIZE=64                     # keep fixed to avoid JAX recompiles
export POLL_INTERVAL=1.0                 # seconds
tabfm-score
```

### Configuration

| Variable | Default | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | — (required) | SQLAlchemy URL (`postgresql+psycopg://…`, `sqlite:///…`) |
| `TABLE` | — (required) | Table to score |
| `FEATURE_COLUMNS` | — (required) | Comma-separated feature columns |
| `ID_COLUMN` | `id` | Primary key column |
| `PREDICTION_COLUMN` / `PROBA_COLUMN` / `SCORED_AT_COLUMN` | `prediction` / `proba` / `scored_at` | Write-back columns |
| `BATCH_SIZE` | `64` | Rows scored per tick (keep fixed) |
| `POLL_INTERVAL` | `1.0` | Sleep (s) when no rows are waiting |
| `CONTEXT_CSV` | — | CSV of labelled in-context examples |
| `CONTEXT_TARGET_COLUMN` | `label` | Target column in the context CSV |
| `BACKEND` | `jax` | TabFM backend (`jax` or `pytorch`) |
| `USE_MOCK` | `false` | Force the MockPredictor |

## Test

```bash
pip install -e '.[dev]'
pytest
```

## Scaling notes

- **Multiple workers.** On Postgres, `SqlDataSource(..., lock_rows=True)` (the
  default) issues `SELECT … FOR UPDATE SKIP LOCKED`, so you can run several
  workers against one table without them fighting over rows.
- **Regression.** Swap `TabFMClassifier` for `TabFMRegressor` in
  `TabFMPredictor`; the loop and data source are unchanged.
- **Event-driven instead of polling.** Replace the poll with Postgres
  `LISTEN/NOTIFY` (fire a trigger on insert) if you want lower latency than the
  poll interval.
- **Stronger accuracy.** Build the predictor with `ensemble=True` to use
  TabFM's `.ensemble()` preset (slower, more accurate).
