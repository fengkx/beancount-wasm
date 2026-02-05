import { resolvePyodideBaseUrl } from "./urls.js";
import type { PyodideRuntime } from "./pyodide-types.js";

export async function loadPyodideFromBase(
  baseUrl?: string,
  status?: (message: string) => void,
) {
  const resolvedBase = resolvePyodideBaseUrl(baseUrl);
  status?.(`Loading Pyodide from ${resolvedBase}`);
  type LoadPyodide = (options?: { indexURL?: string }) => Promise<PyodideRuntime>;
  const { loadPyodide } = (await import(
    /* webpackIgnore: true */ `${resolvedBase}pyodide.mjs`
  )) as unknown as { loadPyodide: LoadPyodide };
  return loadPyodide({ indexURL: resolvedBase });
}
