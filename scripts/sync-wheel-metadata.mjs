#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PACKAGE_DIR = path.join(ROOT, 'package');
const WHEELS_DIR = path.join(PACKAGE_DIR, 'wheels');

function parseArgs(argv) {
  const args = { profile: 'release' };
  for (let i = 2; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--profile') {
      args.profile = argv[i + 1] ?? '';
      i += 1;
      continue;
    }
    throw new Error(`Unknown argument: ${arg}`);
  }
  if (args.profile !== 'release' && args.profile !== 'debug-symbols') {
    throw new Error(`Invalid --profile: ${args.profile} (expected release|debug-symbols)`);
  }
  return args;
}

async function readWheelFilename(version) {
  const dir = path.join(WHEELS_DIR, version);
  const names = (await fs.readdir(dir)).filter((name) => name.endsWith('.whl')).sort();
  if (names.length !== 1) {
    throw new Error(`Expected exactly one wheel in ${dir}, found ${names.length}`);
  }
  return names[0];
}

function wheelVersionLiteral(version) {
  return version === 'v2' ? '2.3.6' : '3.2.0';
}

async function writeWheelsTs(v2Filename, v3Filename) {
  const target = path.join(PACKAGE_DIR, 'src/internal/wheels.ts');
  const content = `export type BeancountVersion = "v2" | "v3";
export type BeancountVersionInput = BeancountVersion | "2" | "3";

export const VERSIONS = ["v2", "v3"] as const;

const WHEELS: Record<
  BeancountVersion,
  { filename: string; deps: boolean }
> = {
  v2: {
    filename: "${v2Filename}",
    deps: false,
  },
  v3: {
    filename: "${v3Filename}",
    deps: true,
  },
};

const VERSION_ALIASES: Record<string, BeancountVersion> = {
  "2": "v2",
  v2: "v2",
  "3": "v3",
  v3: "v3",
};

export type WheelInfo = {
  version: BeancountVersion;
  filename: string;
  deps: boolean;
};

export function normalizeVersion(version: BeancountVersionInput | undefined): BeancountVersion {
  const key = String(version ?? "v3").toLowerCase();
  const normalized = VERSION_ALIASES[key];
  if (!normalized) {
    throw new Error(\`Unknown beancount version: \${version}. Use "v2" or "v3".\`);
  }
  return normalized;
}

export function getWheelInfo(version: BeancountVersionInput = "v3"): WheelInfo {
  const normalized = normalizeVersion(version);
  const info = WHEELS[normalized];
  return { version: normalized, filename: info.filename, deps: info.deps };
}
`;
  await fs.writeFile(target, content, 'utf8');
}

async function writeInlineTs(version, filename) {
  const target = path.join(PACKAGE_DIR, `src/inline/${version}.ts`);
  const content = `import wheelBytes from "../../wheels/${version}/${filename}";

export const VERSION = "${version}";
export const FILENAME =
  "${filename}";

export function getInlineWheelBytes() {
  return wheelBytes;
}
`;
  await fs.writeFile(target, content, 'utf8');
}

async function writeBuildProfile(profile) {
  const target = path.join(PACKAGE_DIR, 'build-profile.json');
  const content = JSON.stringify({ profile, inline: true }, null, 2) + '\n';
  await fs.writeFile(target, content, 'utf8');
}

async function main() {
  const { profile } = parseArgs(process.argv);
  const v2Filename = await readWheelFilename('v2');
  const v3Filename = await readWheelFilename('v3');

  if (!v2Filename.startsWith(`beancount-${wheelVersionLiteral('v2')}-`)) {
    throw new Error(`Unexpected v2 wheel filename: ${v2Filename}`);
  }
  if (!v3Filename.startsWith(`beancount-${wheelVersionLiteral('v3')}-`)) {
    throw new Error(`Unexpected v3 wheel filename: ${v3Filename}`);
  }

  await Promise.all([
    writeWheelsTs(v2Filename, v3Filename),
    writeInlineTs('v2', v2Filename),
    writeInlineTs('v3', v3Filename),
    writeBuildProfile(profile),
  ]);

  console.log(`Synced wheel metadata for profile=${profile}`);
  console.log(`v2=${v2Filename}`);
  console.log(`v3=${v3Filename}`);
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
