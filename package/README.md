# beancount-wasm

This package ships Pyodide-compatible Beancount wheels for v2 and v3 and a tiny
wrapper to install them into a Pyodide runtime.

## Usage

```js
import { createBeancountRuntime } from "beancount-wasm/runtime";

const { pyodide } = await createBeancountRuntime({
  version: "v3",
  // Optional: override the base URL for Pyodide assets.
  // The base URL must contain pyodide.mjs and follow the same layout as
  // https://cdn.jsdelivr.net/pyodide/v0.25.1/full/
  // pyodideBaseUrl: "https://cdn.jsdelivr.net/pyodide/v0.25.1/full/",
});

const result = await pyodide.runPythonAsync(`
from beancount import loader
entries, errors, options = loader.load_string("2024-01-01 open Assets:Cash USD")
len(entries)
`);
console.log(result);
```

## API

### `createBeancountRuntime(options)`
Loads Pyodide and installs Beancount in one step.

Options:
- `version`: `"v2"` or `"v3"` (aliases: `"2"`, `"3"`, default: `"v3"`)
- `pyodideBaseUrl`: base URL for Pyodide assets (defaults to jsDelivr)
- `wheelBaseUrl`: base URL for wheels (defaults to jsDelivr npm CDN)
- `deps`: override Beancount dependency installation
- `pythonPackages`: extra Python packages to install via `micropip` after Beancount
- `inline`: `"auto" | "prefer" | "only" | "off"` (default: `"auto"`)
  - `auto`: try URL first, fallback to inline on failure
  - `prefer`: try inline first, fallback to URL
  - `only`: inline only
  - `off`: URL only
- `onStatus`: optional status callback

Example forcing inline-only mode:

```js
import { createBeancountRuntime } from "beancount-wasm/runtime";

const { pyodide } = await createBeancountRuntime({
  version: "v2",
  inline: "only",
});
```

### `installBeancount(pyodide, options)`
Installs Beancount into an existing Pyodide runtime.
Uses the same options as `createBeancountRuntime` (minus `pyodideBaseUrl`).

### `createFileTree(pyodide, { root, cache })`
Creates a file tree helper for the Pyodide FS. Each file entry is
`{ name, content }` where `name` is relative to `root`.

The returned helper exposes:
- `update(files)`: incremental writes for new/changed files
- `remove(names)`: delete files by name
- `reset(files)`: replace the tree to match the provided list

Example:

```js
import { createFileTree } from "beancount-wasm/runtime";

const fileTree = createFileTree(pyodide, { root: "/work" });
fileTree.update([{ name: "main.bean", content: "2024-01-01 open Assets:Cash" }]);
fileTree.remove(["old.bean"]);
fileTree.reset([{ name: "main.bean", content: "..." }]);
```

### `resolveWheelUrl({ version, wheelBaseUrl })`
Returns the URL used for the selected wheel.

### `getWheelInfo(version)`
Returns `{ version, filename, deps }` for the selected Beancount version.

## Wheel assets

The wheels live under `wheels/v2/` and `wheels/v3/` within the package. When
serving in the browser, these files must be available over HTTP unless you rely
on the built-in inline fallback (`inline: "auto"`).

## Exports

This package exposes subpath exports only:
- `beancount-wasm/runtime`
- `beancount-wasm/v2`
- `beancount-wasm/v3`
- `beancount-wasm/inline/v2`
- `beancount-wasm/inline/v3`

Version-specific entry example:

```js
import { createBeancountRuntime } from "beancount-wasm/v3";

const { pyodide } = await createBeancountRuntime();
```
