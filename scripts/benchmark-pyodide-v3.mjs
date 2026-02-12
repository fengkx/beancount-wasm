#!/usr/bin/env node
import { performance } from "node:perf_hooks";
import fs from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

function parseArgs(argv) {
  const args = {
    warmup: 3,
    runs: 15,
    deps: false,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const key = argv[i];
    const next = argv[i + 1];
    switch (key) {
      case "--pyodide-dist":
        args.pyodideDist = next;
        i += 1;
        break;
      case "--wheel":
        args.wheel = next;
        i += 1;
        break;
      case "--index-url":
        args.indexUrl = next;
        i += 1;
        break;
      case "--input":
        args.input = next;
        i += 1;
        break;
      case "--output":
        args.output = next;
        i += 1;
        break;
      case "--baseline":
        args.baseline = next;
        i += 1;
        break;
      case "--warmup":
        args.warmup = Number(next);
        i += 1;
        break;
      case "--runs":
        args.runs = Number(next);
        i += 1;
        break;
      case "--deps":
        args.deps = true;
        break;
      case "--no-deps":
        args.deps = false;
        break;
      default:
        throw new Error(`Unknown argument: ${key}`);
    }
  }

  if (!args.pyodideDist || !args.wheel || !args.input) {
    throw new Error(
      "Usage: benchmark-pyodide-v3.mjs --pyodide-dist <dir> --wheel <whl> --input <beancount-file> [--output <json>] [--baseline <json>] [--warmup 3] [--runs 15] [--deps|--no-deps]",
    );
  }

  return args;
}

function avg(values) {
  return values.reduce((acc, value) => acc + value, 0) / values.length;
}

function percentile(values, p) {
  const sorted = [...values].sort((a, b) => a - b);
  const idx = Math.min(sorted.length - 1, Math.max(0, Math.ceil((p / 100) * sorted.length) - 1));
  return sorted[idx];
}

function pctChange(before, after) {
  if (before === 0) return null;
  return ((after - before) / before) * 100;
}

function classify(change) {
  if (change === null) return "n/a";
  if (Math.abs(change) < 3) return "基本持平";
  if (change < 0) return "提升";
  return "回归";
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const pyodideDist = path.resolve(args.pyodideDist);
  const wheelPath = path.resolve(args.wheel);
  const inputPath = path.resolve(args.input);

  // Keep indexURL local by default so runs are reproducible and offline-friendly.
  const indexURL = args.indexUrl ?? `${path.resolve(pyodideDist)}${path.sep}`;
  const pyodideMjs = pathToFileURL(path.join(pyodideDist, "pyodide.mjs")).href;

  const [{ loadPyodide }, wheelBytes, beancountInput] = await Promise.all([
    import(pyodideMjs),
    fs.readFile(wheelPath),
    fs.readFile(inputPath, "utf-8"),
  ]);

  const pyodide = await loadPyodide({ indexURL });

  const installStart = performance.now();
  if (args.deps) {
    // Match runtime dependencies expected by beancount wheels in Pyodide.
    await pyodide.loadPackage(["regex", "click", "python-dateutil"]);
  }
  pyodide.FS.mkdirTree("/wheels");
  pyodide.FS.writeFile("/wheels/beancount.whl", wheelBytes);
  pyodide.globals.set("wheel_path", "/wheels/beancount.whl");
  await pyodide.runPythonAsync(`
import importlib
import site
import zipfile

# Install from local wheel bytes directly to avoid network variance from micropip.
target = site.getsitepackages()[0]
with zipfile.ZipFile(wheel_path, "r") as zf:
    zf.extractall(target)

importlib.invalidate_caches()
`);
  pyodide.globals.delete("wheel_path");
  const installMs = performance.now() - installStart;

  pyodide.globals.set("bench_input", beancountInput);

  const parseOnce = async () => {
    const started = performance.now();
    await pyodide.runPythonAsync(`
from beancount import loader
loader.load_string(bench_input)
`);
    return performance.now() - started;
  };

  const firstParseMs = await parseOnce();

  for (let i = 0; i < args.warmup; i += 1) {
    await parseOnce();
  }

  const warmSamples = [];
  for (let i = 0; i < args.runs; i += 1) {
    warmSamples.push(await parseOnce());
  }

  const result = {
    pyodide_dist: pyodideDist,
    wheel: wheelPath,
    input: inputPath,
    deps: args.deps,
    warmup_runs: args.warmup,
    measured_runs: args.runs,
    install_ms: installMs,
    first_parse_ms: firstParseMs,
    warm_parse_avg_ms: avg(warmSamples),
    warm_parse_p50_ms: percentile(warmSamples, 50),
    warm_parse_p95_ms: percentile(warmSamples, 95),
    warm_samples_ms: warmSamples,
    timestamp: new Date().toISOString(),
  };

  if (args.output) {
    await fs.writeFile(args.output, `${JSON.stringify(result, null, 2)}\n`, "utf-8");
  }

  console.log(JSON.stringify(result, null, 2));

  if (args.baseline) {
    const baseline = JSON.parse(await fs.readFile(args.baseline, "utf-8"));
    const fields = [
      "install_ms",
      "first_parse_ms",
      "warm_parse_avg_ms",
      "warm_parse_p50_ms",
      "warm_parse_p95_ms",
    ];
    const comparison = Object.fromEntries(
      fields.map((field) => {
        const change = pctChange(baseline[field], result[field]);
        return [
          field,
          {
            before: baseline[field],
            after: result[field],
            pct_change: change,
            verdict: classify(change),
          },
        ];
      }),
    );
    console.log("--- comparison ---");
    console.log(JSON.stringify(comparison, null, 2));
  }
}

main().catch((error) => {
  console.error(error.stack || String(error));
  process.exitCode = 1;
});
