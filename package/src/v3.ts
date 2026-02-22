import {
  createBeancountRuntime as createRuntime,
  installBeancount as install,
  type CreateRuntimeOptions,
  type InstallOptions,
  type PyodideRuntime,
} from "./runtime.js";

export const VERSION = "v3";

export type V3InstallOptions = Omit<InstallOptions, "version">;
export type V3RuntimeOptions = Omit<CreateRuntimeOptions, "version">;

export const installBeancount = (
  pyodide: PyodideRuntime,
  options: V3InstallOptions = {},
) => install(pyodide, { ...options, version: "v3" });

export const createBeancountRuntime = (options: V3RuntimeOptions = {}) =>
  createRuntime({ ...options, version: "v3" });

export {
  BUILD_PROFILE,
  createFileTree,
  DEFAULT_PYODIDE_BASE_URL,
  DEFAULT_WHEEL_BASE_URL,
  VERSIONS,
  getWheelInfo,
  resolveWheelUrl,
} from "./runtime.js";
export type {
  BeancountVersion,
  CreateRuntimeOptions,
  FileContent,
  FileEntry,
  FileTree,
  FileTreeOptions,
  InlineMode,
  InstallOptions,
  InstallResult,
  PyodideRuntime,
} from "./runtime.js";
