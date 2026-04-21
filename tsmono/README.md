# tsmono

A tiny, dependency-free TypeScript monorepo helper. No plugins, no config file,
no generators — just the pieces you actually need:

1. **Workspace discovery** for the standard `apps/*` + `packages/*` layout.
2. **Dependency graph** built from each workspace's `package.json`.
3. **Cycle detection** that fails CI before a circular import ships.
4. **Topological task runner** so `build` / `test` / `lint` always run in the right order.
5. **`--affected` filter** powered by `git diff` so CI only runs the changed parts of the graph.
6. **Content-addressed output cache** so a clean-tree build is as fast as a no-op.
7. **`sync-tsconfig`** that keeps project references in lock-step with the graph.

Zero runtime dependencies.

## Install

```bash
cd tsmono
npm install
npm run build
npm link          # optional, exposes `tsmono` on your PATH
```

Or use it directly: `node tsmono/bin/tsmono.mjs <command>`.

## The layout

```
your-monorepo/
├── package.json              ← shared (global) deps: typescript, eslint, zod…
├── tsconfig.base.json
├── apps/
│   ├── web/package.json      ← app-local deps + scripts
│   └── api/package.json
└── packages/
    ├── ui/package.json       ← package-local deps + scripts
    └── utils/package.json
```

Every workspace inherits the root's deps (that's how `node_modules` hoisting
works already) and can declare its own on top. `tsmono why <name>` tells you
where each dep came from.

## Commands

| Command                                  | What it does                                                     |
| ---------------------------------------- | ---------------------------------------------------------------- |
| `tsmono init [dir]`                      | Scaffold root `package.json`, `tsconfig.base.json`, `apps/`, `packages/`. |
| `tsmono list`                            | List every workspace grouped by kind.                            |
| `tsmono graph [--json]`                  | Print the dependency graph in topological order.                 |
| `tsmono check`                           | Detect cycles and root/workspace version conflicts. Non-zero exit on any. |
| `tsmono run <script>`                    | Run an npm script in every workspace that defines it, deps first. Cached automatically. |
| `tsmono run <script> --only a,b`         | Same, but restricted to the listed workspaces.                   |
| `tsmono run <script> --affected [--base REF]` | Only run in workspaces changed (or downstream of changes) since `REF`. |
| `tsmono run <script> --no-cache`         | Disable output caching for this run.                             |
| `tsmono run <script> --force`            | Ignore cache hits; re-run and overwrite.                         |
| `tsmono affected [--base REF] [--json]`  | List workspaces affected since `REF`.                            |
| `tsmono why <workspace>`                 | Show a workspace's deps split into `workspace` / `local` / `root`. |
| `tsmono sync-tsconfig [--check]`         | Sync each workspace's `tsconfig.json` `references` + `composite` to the graph. |
| `tsmono cache info`                      | List cache entries with sizes.                                   |
| `tsmono cache clear`                     | Delete the local cache dir.                                      |

## Circular-dependency guard

`tsmono check` runs a DFS across the workspace graph. If `@fixture/a` depends
on `@fixture/b` which depends back on `@fixture/a`, you get:

```
FAIL: 1 circular dependency detected:
  @fixture/a -> @fixture/b -> @fixture/a
```

Wire it into CI:

```json
{
  "scripts": {
    "check": "tsmono check",
    "build": "tsmono run build"
  }
}
```

## Affected-only runs

`tsmono run build --affected` walks `git diff --name-only <base>`, attributes
each changed file to its workspace, then pulls in every downstream dependent.
Anything touching the repo root (package.json, lockfile, `tsconfig.base.json`,
`*.config.*`) is treated as a global change and runs everything.

```bash
# CI examples
tsmono affected --base origin/main --json   # emit the set for dashboards
tsmono run test --affected --base origin/main
```

The default base is the first of `origin/main`, `main`, `HEAD~1` that resolves,
so most repos need no `--base` flag.

## Output caching

Declare which paths a script emits and tsmono will skip work whose inputs
haven't changed:

```jsonc
// packages/ui/package.json
{
  "name": "@repo/ui",
  "scripts": { "build": "tsc -b" },
  "tsmono": {
    "outputs": { "build": ["dist"] }
  }
}
```

The cache key combines:
- the workspace's source file contents (outputs excluded),
- the script's command string,
- `package-lock.json` (so changing an npm dep invalidates), and
- the cache keys of every workspace dep (transitively).

On a hit, the declared output dirs are restored from `.tsmono-cache/<hash>/`.
No remote cache yet — everything is on local disk. Add `.tsmono-cache` to your
`.gitignore` (tsmono init does this for you).

## `tsconfig` project references

Keep `references` and `composite: true` in lock-step with the workspace graph:

```bash
tsmono sync-tsconfig          # write updates
tsmono sync-tsconfig --check  # fail CI on drift
```

Everything else in each `tsconfig.json` — `extends`, `include`, `exclude`,
the rest of `compilerOptions` — is preserved verbatim.

## How it differs from Nx / Turborepo

- **No config file.** The layout (`apps/*`, `packages/*`) *is* the config.
- **No plugin system.** Everything is a plain `package.json` script.
- **No remote cache.** Local content-addressed caching is built in; remote is not.
- **No framework assumptions.** Runs anywhere `npm run` runs.

Outgrow it and reach for Nx. Until then, this is all most teams need.

## Developing tsmono

```bash
npm run typecheck   # strict TS, no emit
npm run build       # emits dist/
npm test            # builds, then runs node --test against the fixtures
```

Test fixtures live in `test/fixtures/` — `basic/` is a healthy graph, `cycle/`
is a two-node circular dep used to verify the detector.
