# v3 Pyodide Upgrade Benchmark Baseline (2026-02-12)

This benchmark captures runtime performance before and after upgrading
`beancount-v3` from:

- `pyodide 0.25.1 + emscripten 3.1.46 + cp311`

to:

- `pyodide 0.29.3 + emscripten 4.0.9 + cp313`

## Scope

The benchmark measures Pyodide runtime behavior (not build time):

- `install_ms`
- `first_parse_ms`
- `warm_parse_avg_ms`
- `warm_parse_p50_ms`
- `warm_parse_p95_ms`

Input ledger:

- `deps/beancount-v3/examples/example.beancount`

## Interpretation

- This folder is a historical snapshot, not a universal performance truth.
- Absolute timings are machine-dependent (CPU, memory pressure, thermal state).
- For regression decisions, run `scripts/compare-pyodide-v3-live.mjs` on the target machine.

## Data files

- `before.json`: pre-upgrade result
- `after.json`: post-upgrade result

## Result summary

| Metric | Before (ms) | After (ms) | Change |
| --- | ---: | ---: | ---: |
| install_ms | 220.08 | 119.70 | -45.61% |
| first_parse_ms | 422.83 | 381.56 | -9.76% |
| warm_parse_avg_ms | 223.70 | 163.15 | -27.07% |
| warm_parse_p50_ms | 222.74 | 151.65 | -31.91% |
| warm_parse_p95_ms | 320.95 | 223.88 | -30.24% |

Conclusion: this upgrade improves runtime performance across all measured dimensions.
