import { getWheelInfo, type BeancountVersionInput } from "./wheels.js";

const PACKAGE_VERSION = __BEANCOUNT_WASM_VERSION__;

export const DEFAULT_WHEEL_BASE_URL = `https://cdn.jsdelivr.net/npm/beancount-wasm@${PACKAGE_VERSION}/`;
export const DEFAULT_PYODIDE_BASE_URL =
  "https://cdn.jsdelivr.net/pyodide/v0.25.1/full/";

function normalizeTrailingSlash(value: string) {
  return value.endsWith("/") ? value : `${value}/`;
}

export function resolveBaseUrl(wheelBaseUrl?: string | URL) {
  if (!wheelBaseUrl) {
    return new URL(DEFAULT_WHEEL_BASE_URL);
  }
  if (wheelBaseUrl instanceof URL) {
    return new URL(normalizeTrailingSlash(wheelBaseUrl.toString()));
  }
  return new URL(normalizeTrailingSlash(wheelBaseUrl), import.meta.url);
}

export function resolveWheelUrl({
  version = "v3",
  wheelBaseUrl,
}: {
  version?: BeancountVersionInput;
  wheelBaseUrl?: string | URL;
} = {}) {
  const info = getWheelInfo(version);
  const baseUrl = resolveBaseUrl(wheelBaseUrl);
  return new URL(`wheels/${info.version}/${info.filename}`, baseUrl).toString();
}

export function resolvePyodideBaseUrl(pyodideBaseUrl?: string) {
  if (!pyodideBaseUrl) {
    return DEFAULT_PYODIDE_BASE_URL;
  }
  return normalizeTrailingSlash(pyodideBaseUrl);
}
