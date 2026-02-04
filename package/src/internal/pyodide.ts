import { resolvePyodideBaseUrl } from "./urls.js";

export async function loadPyodideFromBase(
  baseUrl?: string,
  status?: (message: string) => void,
) {
  const resolvedBase = resolvePyodideBaseUrl(baseUrl);
  status?.(`Loading Pyodide from ${resolvedBase}`);
  const { loadPyodide } = await import(
    /* webpackIgnore: true */ `${resolvedBase}pyodide.mjs`
  );
  return loadPyodide({ indexURL: resolvedBase });
}
