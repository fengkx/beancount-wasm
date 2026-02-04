const WHEELS = {
  v2: {
    filename: "beancount-2.3.6-cp311-cp311-emscripten_3_1_46_wasm32.whl",
    deps: false,
  },
  v3: {
    filename: "beancount-3.2.0-cp311-cp311-emscripten_3_1_46_wasm32.whl",
    deps: true,
  },
};

const VERSION_ALIASES = {
  "2": "v2",
  v2: "v2",
  "3": "v3",
  v3: "v3",
};

export const VERSIONS = Object.freeze(["v2", "v3"]);

function normalizeVersion(version) {
  const key = String(version ?? "v3").toLowerCase();
  const normalized = VERSION_ALIASES[key];
  if (!normalized) {
    throw new Error(`Unknown beancount version: ${version}. Use "v2" or "v3".`);
  }
  return normalized;
}

function resolveBaseUrl(wheelBaseUrl) {
  if (!wheelBaseUrl) {
    return new URL("./", import.meta.url);
  }
  if (wheelBaseUrl instanceof URL) {
    return wheelBaseUrl;
  }
  return new URL(wheelBaseUrl, import.meta.url);
}

export function getWheelInfo(version = "v3") {
  const normalized = normalizeVersion(version);
  const info = WHEELS[normalized];
  return { version: normalized, filename: info.filename, deps: info.deps };
}

export function resolveWheelUrl({ version = "v3", wheelBaseUrl } = {}) {
  const info = getWheelInfo(version);
  const baseUrl = resolveBaseUrl(wheelBaseUrl);
  return new URL(`wheels/${info.version}/${info.filename}`, baseUrl).toString();
}

export async function installBeancount(pyodide, options = {}) {
  if (!pyodide) {
    throw new Error("installBeancount: pyodide instance is required");
  }

  const { version = "v3", wheelBaseUrl, deps } = options;
  const info = getWheelInfo(version);
  const wheelUrl = resolveWheelUrl({ version: info.version, wheelBaseUrl });
  const installDeps = deps ?? info.deps;

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

  return { version: info.version, wheelUrl };
}
