# AGENTS.md instructions

<INSTRUCTIONS>
## Scope
- This file applies to the `beancount-wasm` repo only.
- Follow these repo-specific rules in addition to global instructions.

## Repo map
- `package/`: npm package root (TypeScript wrapper + wheels).
- `demo/`: browser-only demo (Monaco + Pyodide). Must never be shipped in the npm package.
- `deps/beancount-v2`, `deps/beancount-v3`: git submodules pinned to upstream `v2-wasm` / `v3-wasm`.
- `scripts/`: build helpers. Main entry: `scripts/build-wheels.sh`.

## Build & wheels
- Build wheels via `scripts/build-wheels.sh` (Docker-based).
- Outputs are copied into `package/wheels/<version>`.
- Do not delete or ignore `package/wheels/**`.
- Do not edit submodule contents unless explicitly requested.
- If build errors happen, keep the repo clean and document workarounds in
  `scripts/` or the relevant `README.md`.

## Packaging & exports
- The npm package root is `package/`.
- Wrapper is TypeScript under `package/src/`, built to `package/dist/` via `tsdown`
  (config: `package/tsdown.config.ts`).
- Keep these files consistent when changing public API or packaging:
  - `package/package.json`
  - `package/README.md`
- The package exposes subpath exports only (no default `.` export):
  - `beancount-wasm/runtime`
  - `beancount-wasm/v2`
  - `beancount-wasm/v3`
  - `beancount-wasm/inline/v2`
  - `beancount-wasm/inline/v3`
- `package/files` must not include `demo/` or `deps/`.
- Wheel filenames must remain intact to preserve Python and Emscripten tags.

## Workspace (pnpm)
- Workspace uses `pnpm` with root scripts in `package.json` and
  `pnpm-workspace.yaml`.
- Prefer `pnpm -C package build` and `pnpm -C demo dev/build/preview`.

## Runtime & inline wheels
- Inline wheels are bundled as `Uint8Array` via tsdown loader.
- Inline installation writes wheels to Pyodide FS and installs using
  `emfs:/...` to avoid `BadZipFile` issues with `micropip` fetching local paths.
- The wrapper exposes `inline` modes: `"auto" | "prefer" | "only" | "off"`.

## Demo rules
- Demo must load wheels from the package wrapper (imports from `beancount-wasm/*`),
  not hardcoded wheel URLs.
- Demo must support multi-file editing and Beancount version switching.
- Switching versions must initialize separate Pyodide runtimes to avoid conflicts.

## Change control
- Use minimal, targeted edits.
- Avoid reformatting unrelated files.
- Update README when behavior changes.

## Troubleshooting
- `zipfile.BadZipFile` while installing Beancount:
  - Likely caused by `micropip` fetching a non-wheel payload (HTML/404).
  - Use inline install via `emfs:/...` (already in `package/src/runtime.ts`).
  - Ensure `package/dist` is rebuilt after changing inline logic.
- Worker import errors for Pyodide (`Cannot find module ... pyodide.mjs`):
  - Ensure the worker uses `loadPyodide` via dynamic import with an absolute
    base URL (e.g. jsDelivr) and `webpackIgnore`/`viteIgnore` as needed.
- Demo can’t access wheels over HTTP:
  - Use `inline: "only"` or `inline: "prefer"` in the wrapper.
  - Verify the demo imports from `beancount-wasm/runtime` rather than
    hardcoded wheel URLs.
</INSTRUCTIONS>
