# AGENTS.md instructions

<INSTRUCTIONS>
## Scope
- This file applies to the `beancount-wasm` repo only.
- Follow these repo-specific rules in addition to global instructions.

## Repo layout
- `deps/beancount-v2` and `deps/beancount-v3` are git submodules pinned to the
  upstream `v2-wasm` and `v3-wasm` branches.
- `package/` is the npm package root. It contains the JS wrapper and built
  wheels under `package/wheels/v2` and `package/wheels/v3`.
- `demo/` is a browser-only demo (Monaco editor + Pyodide). It must not be
  included in the npm package.
- `scripts/` contains build helpers. The primary entry is
  `scripts/build-wheels.sh`.

## Build rules
- Build wheels via `scripts/build-wheels.sh`.
- The script builds inside Docker and copies outputs into
  `package/wheels/<version>`.
- Do not delete or ignore `package/wheels/**`.
- Do not edit submodule contents unless explicitly requested.
- When build errors occur, keep the repo in a clean state and document any
  workaround in `scripts/` or `README.md`.

## Packaging rules
- The npm package root is `package/`. Keep these files consistent:
  - `package/package.json`
  - `package/index.js`
  - `package/README.md`
- `package/files` must not include `demo/` or `deps/`.
- Wheel filenames should remain intact to preserve Python and Emscripten tags.

## Demo rules
- The demo should load wheels from the package wrapper (import from
  `../package/index.js`), not by hardcoding wheel URLs.
- The demo must support multi-file editing and Beancount version switching.
- Switching versions should initialize a separate Pyodide runtime to avoid
  package conflicts.

## Change control
- Use minimal, targeted edits.
- Avoid reformatting unrelated files.
- Update README when behavior changes.
</INSTRUCTIONS>
