import type { PyodideInterface } from "pyodide";

export type PyodideFS = {
  analyzePath: (path: string) => { exists: boolean };
  mkdir: (path: string) => void;
  writeFile: (path: string, data: string | Uint8Array) => void;
  unlink: (path: string) => void;
};

export type PyodideGlobals = {
  set: (name: string, value: unknown) => void;
  delete: (name: string) => void;
};

export type PyodideRuntime = {
  FS: PyodideFS;
  globals: PyodideInterface['globals'];
  loadPackage: PyodideInterface["loadPackage"];
  runPythonAsync: PyodideInterface["runPythonAsync"];
};
