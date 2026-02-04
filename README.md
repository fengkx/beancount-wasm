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
./scripts/build-wheels.sh
```

This writes wheels into:
- `package/wheels/v2/`
- `package/wheels/v3/`

## Run demo

From the repo root:

```sh
python3 -m http.server 8080
```

Then open `http://localhost:8080/demo/` in your browser.

## Package

The npm package lives in `package/`:

```sh
cd package
npm pack
```
