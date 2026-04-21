# tsmono

A tiny, dependency-free TypeScript monorepo helper. No plugins, no config file,
no generators — just the four things you actually need day one:

1. **Workspace discovery** for the standard `apps/*` + `packages/*` layout.
2. **Dependency graph** built from each workspace's `package.json`.
3. **Cycle detection** that fails CI before a circular import ships.
4. **Topological task runner** so `build` / `test` / `lint` always run in the right order.

It is ~500 lines of TypeScript with zero runtime dependencies.

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

| Command                      | What it does                                                     |
| ---------------------------- | ---------------------------------------------------------------- |
| `tsmono init [dir]`          | Scaffold root `package.json`, `tsconfig.base.json`, `apps/`, `packages/`. |
| `tsmono list`                | List every workspace grouped by kind.                            |
| `tsmono graph [--json]`      | Print the dependency graph in topological order.                 |
| `tsmono check`               | Detect cycles and root/workspace version conflicts. Non-zero exit on any. |
| `tsmono run <script>`        | Run an npm script in every workspace that defines it, deps first. |
| `tsmono run <script> --only a,b` | Same, but restricted to the listed workspaces.               |
| `tsmono why <workspace>`     | Show a workspace's deps split into `workspace` / `local` / `root`. |

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

## How it differs from Nx / Turborepo

- **No config file.** The layout (`apps/*`, `packages/*`) *is* the config.
- **No plugin system.** Everything is a plain `package.json` script.
- **No remote cache / affected graph (yet).** Topological order is the whole story.
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
