# Live A/B Benchmark (2026-02-12)

Environment: same machine, same input, same run window.

Command shape: `node scripts/compare-pyodide-v3-live.mjs --warmup 5 --runs 30 --deps`

Compared versions:
- before: `cp311 + emscripten_3_1_46` wheel + Pyodide 0.25.1 dist
- after: `cp313 + emscripten_4_0_9` wheel + Pyodide 0.29.3 dist

## Per-run Comparison (`pct_change`, after vs before)

| Metric | run1 | run2 | run3 |
| --- | ---: | ---: | ---: |
| install_ms | -16.75% | -38.10% | -69.82% |
| first_parse_ms | +93.65% | -3.56% | -9.50% |
| warm_parse_avg_ms | -4.85% | -4.50% | -8.44% |
| warm_parse_p50_ms | -10.83% | -6.82% | -6.60% |
| warm_parse_p95_ms | +17.55% | +7.18% | -11.88% |

## Aggregate

| Metric | Median Change | Mean Change |
| --- | ---: | ---: |
| install_ms | -38.10% | -41.56% |
| first_parse_ms | -3.56% | +26.86% |
| warm_parse_avg_ms | -4.85% | -5.93% |
| warm_parse_p50_ms | -6.82% | -8.08% |
| warm_parse_p95_ms | +7.18% | +4.29% |

## Interpretation

- `install_ms`: stable improvement (median negative).
- `first_parse_ms`: overall improvement by median, but run-to-run variance exists.
- `warm_parse_avg_ms` / `warm_parse_p50_ms`: generally improved by median.
- `warm_parse_p95_ms`: mixed; tail latency is sensitive and needs continued observation.

For regression gates, prefer median across multiple live runs, not a single run result.
