#!/usr/bin/env node
import fs from "node:fs/promises";
import path from "node:path";
import { spawn } from "node:child_process";

function parseArgs(argv) {
  const args = {
    deps: false,
    warmup: 3,
    runs: 15,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const key = argv[i];
    const next = argv[i + 1];
    switch (key) {
      case "--before-pyodide-dist":
        args.beforePyodideDist = next;
        i += 1;
        break;
      case "--before-wheel":
        args.beforeWheel = next;
        i += 1;
        break;
      case "--after-pyodide-dist":
        args.afterPyodideDist = next;
        i += 1;
        break;
      case "--after-wheel":
        args.afterWheel = next;
        i += 1;
        break;
      case "--input":
        args.input = next;
        i += 1;
        break;
      case "--out-dir":
        args.outDir = next;
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

  const required = [
    "beforePyodideDist",
    "beforeWheel",
    "afterPyodideDist",
    "afterWheel",
    "input",
  ];
  for (const field of required) {
    if (!args[field]) {
      throw new Error(
        "Usage: compare-pyodide-v3-live.mjs --before-pyodide-dist <dir> --before-wheel <whl> --after-pyodide-dist <dir> --after-wheel <whl> --input <beancount-file> [--out-dir <dir>] [--warmup 3] [--runs 15] [--deps|--no-deps]",
      );
    }
  }

  return args;
}

function pctChange(before, after) {
  if (before === 0) return null;
  return ((after - before) / before) * 100;
}

function verdict(change) {
  if (change === null) return "n/a";
  if (Math.abs(change) < 3) return "flat";
  if (change < 0) return "improved";
  return "regressed";
}

function runNode(script, scriptArgs) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [script, ...scriptArgs], {
      // Stream child output so users can inspect per-phase benchmark logs in real time.
      stdio: "inherit",
    });
    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Command failed with exit code ${code}: node ${script}`));
      }
    });
  });
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const outDir = path.resolve(
    args.outDir ?? `benchmarks/live-v3-${new Date().toISOString().replace(/[:.]/g, "-")}`,
  );

  await fs.mkdir(outDir, { recursive: true });

  const beforePath = path.join(outDir, "before.json");
  const afterPath = path.join(outDir, "after.json");
  const comparePath = path.join(outDir, "comparison.json");

  const common = [
    "--input",
    path.resolve(args.input),
    "--warmup",
    String(args.warmup),
    "--runs",
    String(args.runs),
    args.deps ? "--deps" : "--no-deps",
  ];

  // Execute before/after sequentially on the same machine and same run window.
  // This keeps A/B comparison fair and minimizes cross-environment noise.
  await runNode(path.resolve("scripts/benchmark-pyodide-v3.mjs"), [
    "--pyodide-dist",
    path.resolve(args.beforePyodideDist),
    "--wheel",
    path.resolve(args.beforeWheel),
    "--output",
    beforePath,
    ...common,
  ]);

  await runNode(path.resolve("scripts/benchmark-pyodide-v3.mjs"), [
    "--pyodide-dist",
    path.resolve(args.afterPyodideDist),
    "--wheel",
    path.resolve(args.afterWheel),
    "--output",
    afterPath,
    ...common,
  ]);

  const before = JSON.parse(await fs.readFile(beforePath, "utf-8"));
  const after = JSON.parse(await fs.readFile(afterPath, "utf-8"));

  const fields = [
    "install_ms",
    "first_parse_ms",
    "warm_parse_avg_ms",
    "warm_parse_p50_ms",
    "warm_parse_p95_ms",
  ];

  const comparison = Object.fromEntries(
    fields.map((field) => {
      const change = pctChange(before[field], after[field]);
      return [
        field,
        {
          before: before[field],
          after: after[field],
          pct_change: change,
          verdict: verdict(change),
        },
      ];
    }),
  );

  const payload = {
    created_at: new Date().toISOString(),
    env: {
      input: path.resolve(args.input),
      before_pyodide_dist: path.resolve(args.beforePyodideDist),
      before_wheel: path.resolve(args.beforeWheel),
      after_pyodide_dist: path.resolve(args.afterPyodideDist),
      after_wheel: path.resolve(args.afterWheel),
      deps: args.deps,
      warmup: args.warmup,
      runs: args.runs,
    },
    comparison,
  };

  await fs.writeFile(comparePath, `${JSON.stringify(payload, null, 2)}\n`, "utf-8");

  console.log(`\nLive comparison saved to: ${comparePath}`);
  console.log(JSON.stringify(comparison, null, 2));
}

main().catch((error) => {
  console.error(error.stack || String(error));
  process.exitCode = 1;
});
