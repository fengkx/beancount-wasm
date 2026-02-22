# beancount-wasm

This repository bundles Pyodide-compatible Beancount wheels (v2 and v3) and a
small JavaScript wrapper for installing them into a Pyodide runtime. It also
contains a browser demo for multi-file editing and version switching.

## Layout
- `deps/beancount-v2`: submodule pinned to `v2-wasm`
- `deps/beancount-v3`: submodule pinned to `v3-wasm`
- `package/`: npm package root (wrapper + wheels)
- `demo/`: browser demo (not shipped in the npm package)
- `scripts/`: build helpers

## Setup

```sh
git submodule update --init --recursive
```

## Build wheels

```sh
./scripts/build-wheels.sh --profile release
```

This writes wheels into:
- `package/wheels/v2/`
- `package/wheels/v3/`

Build debug-symbol wheels for profiling:

```sh
./scripts/build-wheels.sh --profile debug-symbols
```

After building wheels, sync package metadata:

```sh
# release
node scripts/sync-wheel-metadata.mjs --profile release

# debug-symbols
node scripts/sync-wheel-metadata.mjs --profile debug-symbols
```

Verify package profile before packing/publishing:

```sh
# release
node scripts/verify-package-profile.mjs --expect release

# debug-symbols
node scripts/verify-package-profile.mjs --expect debug-symbols
```

## Run demo

The demo consumes the local package via a workspace dependency and is built
with Rsbuild for an end-to-end exercise of the wrapper.

```sh
pnpm install
pnpm run dev:demo
```

Then open the local dev server URL printed by Rsbuild.

## Package

The npm package lives in `package/`:

```sh
pnpm run build:package
pnpm -C package pack
```

Dist-tag strategy:
- `latest`: release wheels + release inline wheels
- `debug`: debug-symbol wheels + debug inline wheels

Install examples:

```sh
npm i beancount-wasm@latest
npm i beancount-wasm@debug
```

## Benchmark

Runtime benchmark script:

```sh
node scripts/benchmark-pyodide-v3.mjs \
  --pyodide-dist <pyodide-dist-dir> \
  --wheel <wheel-path> \
  --input <beancount-input-file> \
  --deps \
  --output <result-json>
```

Benchmark usage and options:
- `scripts/README.md`

Pinned v3 upgrade baseline (recorded on 2026-02-12):
- `benchmarks/v3-pyodide-upgrade-2026-02-12/`

For regression checks, prefer live A/B on the current machine:

```sh
node scripts/compare-pyodide-v3-live.mjs \
  --before-pyodide-dist <before-pyodide-dist-dir> \
  --before-wheel <before-wheel-path> \
  --after-pyodide-dist <after-pyodide-dist-dir> \
  --after-wheel <after-wheel-path> \
  --input <beancount-input-file> \
  --deps \
  --out-dir <output-dir>
```

Note: `before/after` wheel must match the corresponding `pyodide-dist` version.

Latest multi-run live benchmark snapshot:
- `benchmarks/live-v3-2026-02-12/`
