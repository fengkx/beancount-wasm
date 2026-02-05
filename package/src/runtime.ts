import { loadInlineWheelBytes } from "./internal/inline.js";
import { loadPyodideFromBase } from "./internal/pyodide.js";
import type { PyodideFS, PyodideRuntime } from "./internal/pyodide-types.js";
import {
  DEFAULT_PYODIDE_BASE_URL,
  DEFAULT_WHEEL_BASE_URL,
  resolveWheelUrl,
} from "./internal/urls.js";
import {
  VERSIONS,
  getWheelInfo,
  type BeancountVersion,
  type BeancountVersionInput,
} from "./internal/wheels.js";

export {
  VERSIONS,
  getWheelInfo,
  resolveWheelUrl,
  DEFAULT_WHEEL_BASE_URL,
  DEFAULT_PYODIDE_BASE_URL,
};

export type { BeancountVersion, BeancountVersionInput };

export type InlineMode = "auto" | "prefer" | "only" | "off";

export type { PyodideRuntime };

export type InstallOptions = {
  version?: BeancountVersionInput;
  wheelBaseUrl?: string | URL;
  deps?: boolean;
  inline?: InlineMode;
  pythonPackages?: string[];
  onStatus?: (message: string) => void;
};

export type InstallResult = {
  version: BeancountVersion;
  wheelUrl: string;
  source: "url" | "inline";
  filePath?: string;
};

export type CreateRuntimeOptions = InstallOptions & {
  pyodideBaseUrl?: string;
};

export type FileContent = string | Uint8Array;

export type FileEntry = {
  name: string;
  content: FileContent;
};

export type FileTreeOptions = {
  root: string;
  cache?: Map<string, FileContent>;
};

export type FileTree = {
  root: string;
  cache: Map<string, FileContent>;
  update: (files: FileEntry[]) => void;
  remove: (names: string[]) => void;
  reset: (files: FileEntry[]) => void;
};

const INLINE_DEFAULT: InlineMode = "auto";

function getInstallOrder(mode: InlineMode): Array<"url" | "inline"> {
  switch (mode) {
    case "only":
      return ["inline"];
    case "prefer":
      return ["inline", "url"];
    case "off":
      return ["url"];
    case "auto":
    default:
      return ["url", "inline"];
  }
}

function ensureDir(fs: PyodideFS, dir: string) {
  const parts = dir.split("/").filter(Boolean);
  let current = "";
  for (const part of parts) {
    current += `/${part}`;
    if (!fs.analyzePath(current).exists) {
      fs.mkdir(current);
    }
  }
}

function normalizeFileName(name: string) {
  return name.replace(/^\/+/, "");
}

function resolveFilePath(root: string, name: string) {
  const normalized = normalizeFileName(name);
  return normalized ? `${root}/${normalized}` : root;
}

function writeInlineWheel(
  pyodide: PyodideRuntime,
  filename: string,
  bytes: Uint8Array,
) {
  const fs = pyodide.FS;
  const baseDir = "/tmp/beancount-wasm";
  ensureDir(fs, baseDir);
  const filePath = `${baseDir}/${filename}`;
  fs.writeFile(filePath, bytes);
  return filePath;
}

async function installWheel(
  pyodide: PyodideRuntime,
  wheelUrl: string,
  installDeps: boolean,
) {
  await pyodide.loadPackage("micropip");

  pyodide.globals.set("wheel_url", wheelUrl);
  pyodide.globals.set("install_deps", installDeps);

  try {
    await pyodide.runPythonAsync(`
import micropip
wheel_url = globals()["wheel_url"]
install_deps = globals()["install_deps"]
await micropip.install(wheel_url, deps=install_deps)
`);
  } finally {
    pyodide.globals.delete("wheel_url");
    pyodide.globals.delete("install_deps");
  }
}

async function installPythonPackages(
  pyodide: PyodideRuntime,
  pythonPackages: string[] | undefined,
  onStatus?: (message: string) => void,
) {
  if (!pythonPackages?.length) {
    return;
  }
  onStatus?.(`Installing Python packages: ${pythonPackages.join(", ")}...`);
  await pyodide.loadPackage("micropip");
  pyodide.globals.set("extra_packages", pythonPackages);
  try {
    await pyodide.runPythonAsync(`
import micropip
extra_packages = globals()["extra_packages"]
await micropip.install(extra_packages)
`);
  } finally {
    pyodide.globals.delete("extra_packages");
  }
}

export async function installBeancount(
  pyodide: PyodideRuntime,
  options: InstallOptions = {},
): Promise<InstallResult> {
  if (!pyodide) {
    throw new Error("installBeancount: pyodide instance is required");
  }

  const {
    version = "v3",
    wheelBaseUrl,
    deps,
    inline = INLINE_DEFAULT,
    pythonPackages,
    onStatus,
  } = options;
  const info = getWheelInfo(version);
  const installDeps = deps ?? info.deps;
  const order = getInstallOrder(inline);

  const installFromUrl = async () => {
    const wheelUrl = resolveWheelUrl({ version: info.version, wheelBaseUrl });
    onStatus?.(`Installing Beancount ${info.version} from URL...`);
    await installWheel(pyodide, wheelUrl, installDeps);
    await installPythonPackages(pyodide, pythonPackages, onStatus);
    return { version: info.version, wheelUrl, source: "url" as const };
  };

  const installFromInline = async () => {
    onStatus?.(`Installing Beancount ${info.version} from inline wheel...`);
    const bytes = await loadInlineWheelBytes(info.version);
    const filePath = writeInlineWheel(pyodide, info.filename, bytes);
    const wheelUrl = `emfs:${filePath}`;
    await installWheel(pyodide, wheelUrl, installDeps);
    await installPythonPackages(pyodide, pythonPackages, onStatus);
    return {
      version: info.version,
      wheelUrl,
      source: "inline" as const,
      filePath,
    };
  };

  let firstError: unknown;
  for (const mode of order) {
    try {
      return mode === "url" ? await installFromUrl() : await installFromInline();
    } catch (err) {
      if (!firstError) {
        firstError = err;
      } else if (err && typeof err === "object" && !("cause" in err)) {
        (err as { cause?: unknown }).cause = firstError;
      }
      if (mode === order[order.length - 1]) {
        throw err;
      }
    }
  }

  throw firstError ?? new Error("Failed to install Beancount.");
}

export async function createBeancountRuntime(
  options: CreateRuntimeOptions = {},
) {
  const { pyodideBaseUrl, onStatus, ...installOptions } = options;
  onStatus?.(
    `Loading Pyodide runtime (default base ${DEFAULT_PYODIDE_BASE_URL})...`,
  );
  const pyodide = await loadPyodideFromBase(pyodideBaseUrl, onStatus);
  const installResult = await installBeancount(pyodide, {
    ...installOptions,
    onStatus,
  });
  return { pyodide, installResult, version: installResult.version };
}

export function createFileTree(
  pyodide: PyodideRuntime,
  options: FileTreeOptions,
): FileTree {
  if (!pyodide) {
    throw new Error("createFileTree: pyodide instance is required");
  }

  const { root, cache = new Map<string, FileContent>() } = options;

  const update = (files: FileEntry[]) => {
    const fs = pyodide.FS;
    ensureDir(fs, root);

    for (const file of files) {
      const name = normalizeFileName(file.name);
      if (!name) {
        continue;
      }
      const prev = cache.get(name);
      if (prev === file.content) {
        continue;
      }
      const fullPath = resolveFilePath(root, name);
      const dir = fullPath.slice(0, fullPath.lastIndexOf("/"));
      ensureDir(fs, dir);
      fs.writeFile(fullPath, file.content);
      cache.set(name, file.content);
    }
  };

  const remove = (names: string[]) => {
    const fs = pyodide.FS;
    if (!fs.analyzePath(root).exists) {
      for (const name of names) {
        cache.delete(normalizeFileName(name));
      }
      return;
    }

    for (const rawName of names) {
      const name = normalizeFileName(rawName);
      if (!name) {
        continue;
      }
      const fullPath = resolveFilePath(root, name);
      if (fs.analyzePath(fullPath).exists) {
        fs.unlink(fullPath);
      }
      cache.delete(name);
    }
  };

  const reset = (files: FileEntry[]) => {
    const fs = pyodide.FS;
    ensureDir(fs, root);
    const nextCache = new Map<string, FileContent>();

    for (const file of files) {
      const name = normalizeFileName(file.name);
      if (!name) {
        continue;
      }
      nextCache.set(name, file.content);
      const prev = cache.get(name);
      if (prev === file.content) {
        continue;
      }
      const fullPath = resolveFilePath(root, name);
      const dir = fullPath.slice(0, fullPath.lastIndexOf("/"));
      ensureDir(fs, dir);
      fs.writeFile(fullPath, file.content);
    }

    for (const name of cache.keys()) {
      if (nextCache.has(name)) {
        continue;
      }
      const fullPath = resolveFilePath(root, name);
      if (fs.analyzePath(fullPath).exists) {
        fs.unlink(fullPath);
      }
    }

    cache.clear();
    for (const [name, content] of nextCache.entries()) {
      cache.set(name, content);
    }
  };

  return {
    root,
    cache,
    update,
    remove,
    reset,
  };
}
