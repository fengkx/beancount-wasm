import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { defineConfig } from "tsdown";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const packageJsonPath = path.join(__dirname, "package.json");
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));

export default defineConfig({
  platform: 'browser',
  entry: {
    runtime: "src/runtime.ts",
    v2: "src/v2.ts",
    v3: "src/v3.ts",
    "inline/v2": "src/inline/v2.ts",
    "inline/v3": "src/inline/v3.ts",
  },
  format: "esm",
  dts: true,
  loader: {
    ".whl": "binary",
  },
  define: {
    __BEANCOUNT_WASM_VERSION__: JSON.stringify(packageJson.version),
  },
});
