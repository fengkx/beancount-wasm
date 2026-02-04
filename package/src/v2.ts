import {
  createBeancountRuntime as createRuntime,
  installBeancount as install,
  type CreateRuntimeOptions,
  type InstallOptions,
} from "./runtime.js";

export const VERSION = "v2";

export type V2InstallOptions = Omit<InstallOptions, "version">;
export type V2RuntimeOptions = Omit<CreateRuntimeOptions, "version">;

export const installBeancount = (pyodide: any, options: V2InstallOptions = {}) =>
  install(pyodide, { ...options, version: "v2" });

export const createBeancountRuntime = (options: V2RuntimeOptions = {}) =>
  createRuntime({ ...options, version: "v2" });

export {
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
} from "./runtime.js";
