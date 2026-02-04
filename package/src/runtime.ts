import { loadInlineWheelBytes } from "./internal/inline.js";
import { loadPyodideFromBase } from "./internal/pyodide.js";
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

export type InstallOptions = {
  version?: BeancountVersionInput;
  wheelBaseUrl?: string | URL;
  deps?: boolean;
  inline?: InlineMode;
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

function ensureDir(fs: any, dir: string) {
  const parts = dir.split("/").filter(Boolean);
  let current = "";
  for (const part of parts) {
    current += `/${part}`;
    if (!fs.analyzePath(current).exists) {
      fs.mkdir(current);
    }
  }
}

function writeInlineWheel(pyodide: any, filename: string, bytes: Uint8Array) {
  const fs = pyodide.FS;
  const baseDir = "/tmp/beancount-wasm";
  ensureDir(fs, baseDir);
  const filePath = `${baseDir}/${filename}`;
  fs.writeFile(filePath, bytes);
  return filePath;
}

async function installWheel(
  pyodide: any,
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

export async function installBeancount(
  pyodide: any,
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
    onStatus,
  } = options;
  const info = getWheelInfo(version);
  const installDeps = deps ?? info.deps;
  const order = getInstallOrder(inline);

  const installFromUrl = async () => {
    const wheelUrl = resolveWheelUrl({ version: info.version, wheelBaseUrl });
    onStatus?.(`Installing Beancount ${info.version} from URL...`);
    await installWheel(pyodide, wheelUrl, installDeps);
    return { version: info.version, wheelUrl, source: "url" as const };
  };

  const installFromInline = async () => {
    onStatus?.(`Installing Beancount ${info.version} from inline wheel...`);
    const bytes = await loadInlineWheelBytes(info.version);
    const filePath = writeInlineWheel(pyodide, info.filename, bytes);
    const wheelUrl = `emfs:${filePath}`;
    await installWheel(pyodide, wheelUrl, installDeps);
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
