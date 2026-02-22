# Scripts

## `build-wheels.sh`

Build Beancount wheels for v2/v3 with selectable profile.

### Usage

```sh
./scripts/build-wheels.sh [--profile release|debug-symbols] [v2] [v3]
```

Defaults:
- profile: `release`
- versions: `v2 v3`

## `sync-wheel-metadata.mjs`

Syncs package source metadata with wheel files currently present in
`package/wheels/v2` and `package/wheels/v3`.

### Usage

```sh
node scripts/sync-wheel-metadata.mjs --profile release
node scripts/sync-wheel-metadata.mjs --profile debug-symbols
```

Updates:
- `package/src/internal/wheels.ts`
- `package/src/inline/v2.ts`
- `package/src/inline/v3.ts`
- `package/build-profile.json`

## `verify-package-profile.mjs`

Validates that package metadata, inline imports, and wheel sections match the
expected profile.

### Usage

```sh
node scripts/verify-package-profile.mjs --expect release
node scripts/verify-package-profile.mjs --expect debug-symbols
```

## `benchmark-pyodide-v3.mjs`

Run a reproducible runtime benchmark for `beancount-v3` in Pyodide.

### What it measures

- `install_ms`: install/setup phase inside runtime
- `first_parse_ms`: first `loader.load_string()` run
- `warm_parse_avg_ms`: average of warm runs
- `warm_parse_p50_ms`: p50 of warm runs
- `warm_parse_p95_ms`: p95 of warm runs

### Usage

```sh
node scripts/benchmark-pyodide-v3.mjs \
  --pyodide-dist <pyodide-dist-dir> \
  --wheel <wheel-path> \
  --input <beancount-input-file> \
  --deps \
  --warmup 3 \
  --runs 15 \
  --output <result-json>
```

Compare against an existing baseline:

```sh
node scripts/benchmark-pyodide-v3.mjs \
  --pyodide-dist <pyodide-dist-dir> \
  --wheel <wheel-path> \
  --input <beancount-input-file> \
  --deps \
  --output <after-json> \
  --baseline <before-json>
```

### Notes

- `--deps` loads `regex`, `click`, and `python-dateutil` before the wheel benchmark.
- To keep runs deterministic, prefer local `pyodide-dist` assets instead of CDN.
- `--pyodide-dist` and `--wheel` must be version-compatible.  
  Example: `cp311/emscripten_3_1_46` wheel should run with Pyodide 0.25.1 dist.
- Baseline data for the v3 upgrade is stored in:
  `benchmarks/v3-pyodide-upgrade-2026-02-12/`.

## `compare-pyodide-v3-live.mjs`

Run before/after versions on the current machine in one shot and produce a
live A/B comparison.

### Usage

```sh
node scripts/compare-pyodide-v3-live.mjs \
  --before-pyodide-dist <before-pyodide-dist-dir> \
  --before-wheel <before-wheel-path> \
  --after-pyodide-dist <after-pyodide-dist-dir> \
  --after-wheel <after-wheel-path> \
  --input <beancount-input-file> \
  --deps \
  --warmup 3 \
  --runs 15 \
  --out-dir <output-dir>
```

### Output files

- `<out-dir>/before.json`
- `<out-dir>/after.json`
- `<out-dir>/comparison.json`

This is the recommended way to compare performance across versions, because it
measures both variants in the same runtime environment.

### Practical recommendations

- Use at least `--warmup 5 --runs 30` for lower variance.
- Run 3 independent live comparisons and aggregate by median change.
- Prioritize `warm_parse_p50_ms` for typical latency and `warm_parse_p95_ms` for tail behavior.
