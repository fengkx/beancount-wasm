import { AsyncCall } from "async-call-rpc/base";
import { WorkerChannel } from "async-call-rpc/utils/web/worker.js";

const statusEl = document.getElementById("status");
const outputEl = document.getElementById("output");
const runBtn = document.getElementById("run");
const addFileBtn = document.getElementById("add-file");
const deleteFileBtn = document.getElementById("delete-file");
const fileListEl = document.getElementById("file-list");
const entrySelect = document.getElementById("entry-file");
const editorContainer = document.getElementById("editor");
const versionSelect = document.getElementById("version");

const MONACO_VERSION = "0.45.0";
const MONACO_BASE = `https://cdn.jsdelivr.net/npm/monaco-editor@${MONACO_VERSION}/min/vs`;
const MONACO_WORKER_BASE = `https://cdn.jsdelivr.net/npm/monaco-editor@${MONACO_VERSION}/min/`;

const INITIAL_FILES = [
  {
    name: "main.beancount",
    content: `include "accounts.beancount"
include "journal/transactions.beancount"
`,
  },
  {
    name: "accounts.beancount",
    content: `2024-01-01 open Assets:Cash USD
2024-01-01 open Expenses:Food USD
2024-01-01 open Equity:Opening-Balances USD
`,
  },
  {
    name: "journal/transactions.beancount",
    content: `2024-01-02 * "Init"
  Assets:Cash  10 USD
  Equity:Opening-Balances
`,
  },
];

let monacoApi = null;
let editor = null;
let activeFile = null;
const files = new Map();
let worker = null;
let workerReady = false;
let workerApi = null;

function setStatus(text) {
  statusEl.textContent = text;
}

function configureMonacoWorkers() {
  const workerSource = `self.MonacoEnvironment = { baseUrl: '${MONACO_WORKER_BASE}' };` +
    `importScripts('${MONACO_WORKER_BASE}vs/base/worker/workerMain.js');`;
  window.MonacoEnvironment = {
    getWorkerUrl() {
      return `data:text/javascript;charset=utf-8,${encodeURIComponent(workerSource)}`;
    },
  };
}

function loadMonaco() {
  return new Promise((resolve, reject) => {
    if (window.monaco) {
      resolve(window.monaco);
      return;
    }
    if (!window.require) {
      reject(new Error("Monaco loader not found"));
      return;
    }
    configureMonacoWorkers();
    window.require.config({ paths: { vs: MONACO_BASE } });
    window.require(["vs/editor/editor.main"], () => resolve(window.monaco), reject);
  });
}

function createModel(name, content) {
  const uri = monacoApi.Uri.parse(`file:///work/${name}`);
  return monacoApi.editor.createModel(content, "plaintext", uri);
}

function setActiveFile(name) {
  const model = files.get(name);
  if (!model) return;
  activeFile = name;
  editor.setModel(model);
  renderFileList();
}

function renderFileList() {
  fileListEl.textContent = "";
  for (const name of files.keys()) {
    const item = document.createElement("li");
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = name;
    if (name === activeFile) {
      button.classList.add("active");
    }
    button.addEventListener("click", () => setActiveFile(name));
    item.appendChild(button);
    fileListEl.appendChild(item);
  }
  refreshEntrySelect();
}

function refreshEntrySelect() {
  const current = entrySelect.value;
  entrySelect.textContent = "";
  for (const name of files.keys()) {
    const option = document.createElement("option");
    option.value = name;
    option.textContent = name;
    entrySelect.appendChild(option);
  }
  if (files.has(current)) {
    entrySelect.value = current;
  } else {
    entrySelect.value = files.keys().next().value || "";
  }
}

function normalizeFileName(name) {
  return name.trim().replace(/\\/g, "/");
}

function isValidFileName(name) {
  if (!name) return false;
  if (name.startsWith("/")) return false;
  const parts = name.split("/");
  for (const part of parts) {
    if (!part || part === "." || part === "..") return false;
  }
  return true;
}

function addFile() {
  const raw = window.prompt("New file name", "notes.beancount");
  if (raw === null) return;
  const name = normalizeFileName(raw);
  if (!isValidFileName(name)) {
    window.alert('Invalid file name. Use relative paths like "notes.beancount".');
    return;
  }
  if (files.has(name)) {
    window.alert("File already exists.");
    return;
  }
  const model = createModel(name, "");
  files.set(name, model);
  setActiveFile(name);
}

function deleteActiveFile() {
  if (!activeFile) return;
  if (files.size <= 1) {
    window.alert("At least one file is required.");
    return;
  }
  const toDelete = activeFile;
  files.get(toDelete).dispose();
  files.delete(toDelete);
  const next = files.keys().next().value;
  setActiveFile(next);
}

async function initEditor() {
  setStatus("Loading Monaco editor...");
  monacoApi = await loadMonaco();

  for (const file of INITIAL_FILES) {
    const model = createModel(file.name, file.content);
    files.set(file.name, model);
  }

  editor = monacoApi.editor.create(editorContainer, {
    model: files.get(INITIAL_FILES[0].name),
    automaticLayout: true,
    fontSize: 13,
    minimap: { enabled: false },
    scrollBeyondLastLine: false,
  });

  activeFile = INITIAL_FILES[0].name;
  renderFileList();
  setStatus("Editor ready");

  runBtn.disabled = false;
  addFileBtn.disabled = false;
  deleteFileBtn.disabled = false;
}

function initWorker() {
  worker = new Worker(new URL("./worker.js", import.meta.url), {
    type: "module",
  });
  workerApi = AsyncCall(
    {
      reportStatus: (message) => setStatus(message),
      reportReady: () => {
        workerReady = true;
      },
    },
    {
      channel: new WorkerChannel(worker),
    },
  );
}

async function runBeancheck() {
  outputEl.textContent = "";
  runBtn.disabled = true;

  try {
    if (!workerReady) {
      setStatus("Worker not ready yet...");
      runBtn.disabled = false;
      return;
    }
    const version = versionSelect.value;
    const entryFile = entrySelect.value;
    if (!entryFile || !files.has(entryFile)) {
      throw new Error("Entry file is missing.");
    }

    const payloadFiles = Array.from(files.entries()).map(([name, model]) => ({
      name,
      content: model.getValue(),
    }));
    const result = await workerApi.runBeancheck({
      version,
      entryFile,
      files: payloadFiles,
    });
    outputEl.textContent = result;
    setStatus(`Done (${version})`);
  } catch (err) {
    outputEl.textContent = String(err);
    setStatus("Failed");
  } finally {
    runBtn.disabled = false;
  }
}

runBtn.disabled = true;
addFileBtn.disabled = true;
deleteFileBtn.disabled = true;

runBtn.addEventListener("click", () => {
  void runBeancheck();
});

addFileBtn.addEventListener("click", addFile);

deleteFileBtn.addEventListener("click", deleteActiveFile);

entrySelect.addEventListener("change", () => {
  if (files.has(entrySelect.value)) {
    setActiveFile(entrySelect.value);
  }
});

initWorker();

void initEditor().catch((err) => {
  setStatus(`Editor init failed: ${err}`);
});
