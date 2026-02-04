import { AsyncCall } from "async-call-rpc/base";
import { WorkerChannel } from "async-call-rpc/utils/web/worker.js";
import { installBeancount } from "beancount-wasm/runtime";

const PYODIDE_VERSION = "v0.25.1";
const PYODIDE_BASE = `https://cdn.jsdelivr.net/pyodide/${PYODIDE_VERSION}/full/`;

const pyodideByVersion = new Map();
const fileCacheByVersion = new Map();

const mainApi = AsyncCall(
  {
    runBeancheck,
  },
  {
    channel: new WorkerChannel(),
  },
);

function postStatus(message) {
  void mainApi.reportStatus(message);
}

async function getPyodide(version) {
  if (pyodideByVersion.has(version)) {
    return pyodideByVersion.get(version);
  }

  const promise = (async () => {
    postStatus(`Loading Pyodide (${version})...`);
    const { loadPyodide } = await import(
      /* webpackIgnore: true */
      `${PYODIDE_BASE}pyodide.mjs`,
    );
    const pyodide = await loadPyodide({ indexURL: PYODIDE_BASE });

    postStatus(`Installing Beancount ${version}...`);
    await installBeancount(pyodide, { version, inline: "only" });

    postStatus(`Ready (${version})`);
    return pyodide;
  })().catch((err) => {
    postStatus(`Init failed (${version}): ${err}`);
    throw err;
  });

  pyodideByVersion.set(version, promise);
  return promise;
}

function mkdirp(fs, dir) {
  const parts = dir.split("/").filter(Boolean);
  let current = "";
  for (const part of parts) {
    current += `/${part}`;
    if (!fs.analyzePath(current).exists) {
      fs.mkdir(current);
    }
  }
}

function ensureRoot(pyodide, root) {
  const fs = pyodide.FS;
  if (!fs.analyzePath(root).exists) {
    fs.mkdir(root);
  }
}

function syncFilesIncremental(pyodide, root, files, cache) {
  ensureRoot(pyodide, root);
  const fs = pyodide.FS;
  const nextCache = new Map();

  for (const file of files) {
    nextCache.set(file.name, file.content);
    const prev = cache.get(file.name);
    if (prev === file.content) {
      continue;
    }
    const fullPath = `${root}/${file.name}`;
    const dir = fullPath.slice(0, fullPath.lastIndexOf("/"));
    mkdirp(fs, dir);
    fs.writeFile(fullPath, file.content);
  }

  for (const name of cache.keys()) {
    if (nextCache.has(name)) continue;
    const fullPath = `${root}/${name}`;
    if (fs.analyzePath(fullPath).exists) {
      fs.unlink(fullPath);
    }
  }

  cache.clear();
  for (const [name, content] of nextCache.entries()) {
    cache.set(name, content);
  }
}

async function runBeancheck({ version, entryFile, files }) {
  const pyodide = await getPyodide(version);
  const root = `/work-${version}`;
  const cache = fileCacheByVersion.get(version) ?? new Map();
  if (!fileCacheByVersion.has(version)) {
    fileCacheByVersion.set(version, cache);
  }

  postStatus(`Syncing files (${version})...`);
  syncFilesIncremental(pyodide, root, files, cache);

  const entryPath = `${root}/${entryFile}`;
  pyodide.globals.set("entry_path", entryPath);

  postStatus(`Running beancount loader (${version})...`);
  return pyodide.runPythonAsync(`
from beancount import loader
import json

entries, errors, options = loader.load_file(entry_path)

err_list = [
  {
    'file': e.source.get('filename'),
    'line': e.source.get('lineno'),
    'message': e.message,
  }
  for e in errors
]

json.dumps({
  'errors': err_list,
  'entries': len(entries),
  'includes': options.get('include', []),
})
`);
}

void mainApi.reportReady();
