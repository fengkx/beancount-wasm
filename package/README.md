# beancount-wasm

This package ships Pyodide-compatible Beancount wheels for v2 and v3 and a tiny
wrapper to install them into a Pyodide runtime.

## Usage

```js
import { loadPyodide } from "https://cdn.jsdelivr.net/pyodide/v0.25.1/full/pyodide.mjs";
import { installBeancount } from "beancount-wasm";

const pyodide = await loadPyodide({ indexURL: "https://cdn.jsdelivr.net/pyodide/v0.25.1/full/" });
await installBeancount(pyodide, { version: "v3" });

const result = await pyodide.runPythonAsync(`
from beancount import loader
entries, errors, options = loader.load_string("2024-01-01 open Assets:Cash USD")
len(entries)
`);
console.log(result);
```

## API

### `installBeancount(pyodide, options)`
- `version`: `"v2"` or `"v3"` (default: `"v3"`)
- `wheelBaseUrl`: optional base URL for wheels. Use this if you host wheels
  somewhere other than alongside the package.
- `deps`: optional boolean to override the default dependency handling.

### `resolveWheelUrl({ version, wheelBaseUrl })`
Returns the URL used for the selected wheel.

### `getWheelInfo(version)`
Returns `{ version, filename, deps }` for the selected Beancount version.

## Wheel assets

The wheels live under `wheels/v2/` and `wheels/v3/` within the package. When
serving in the browser, these files must be available over HTTP (for example,
by exposing `node_modules/beancount-wasm/` as static assets).
