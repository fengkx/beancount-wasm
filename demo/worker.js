import { AsyncCall } from "async-call-rpc/base";
import { WorkerChannel } from "async-call-rpc/utils/web/worker.js";
import { createFileTree, installBeancount } from "beancount-wasm/runtime";

const PYODIDE_VERSION = "v0.25.1";
const PYODIDE_BASE = `https://cdn.jsdelivr.net/pyodide/${PYODIDE_VERSION}/full/`;

const pyodideByVersion = new Map();
const fileTreeByVersion = new Map();

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

async function runBeancheck({ version, entryFile, updates = [], removed = [] }) {
  const pyodide = await getPyodide(version);
  const root = `/work-${version}`;
  let fileTree = fileTreeByVersion.get(version);
  if (!fileTree) {
    fileTree = createFileTree(pyodide, { root });
    fileTreeByVersion.set(version, fileTree);
  }

  postStatus(`Syncing files (${version})...`);
  if (updates.length) {
    fileTree.update(updates);
  }
  if (removed.length) {
    fileTree.remove(removed);
  }

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
