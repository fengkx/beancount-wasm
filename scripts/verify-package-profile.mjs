#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PACKAGE_DIR = path.join(ROOT, 'package');

function parseArgs(argv) {
  let expect;
  for (let i = 2; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--expect') {
      expect = argv[i + 1];
      i += 1;
      continue;
    }
    throw new Error(`Unknown argument: ${arg}`);
  }
  if (!expect || (expect !== 'release' && expect !== 'debug-symbols')) {
    throw new Error('Usage: verify-package-profile.mjs --expect release|debug-symbols');
  }
  return { expect };
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function getWheelFiles(version) {
  const dir = path.join(PACKAGE_DIR, 'wheels', version);
  const files = (await fs.readdir(dir)).filter((name) => name.endsWith('.whl')).sort();
  assert(files.length === 1, `Expected exactly one wheel in ${dir}, found ${files.length}`);
  return files[0];
}

function readUleb(bytes, offset) {
  let value = 0;
  let shift = 0;
  let index = offset;
  while (true) {
    const b = bytes[index];
    index += 1;
    value |= (b & 0x7f) << shift;
    if (b < 0x80) {
      break;
    }
    shift += 7;
  }
  return { value, next: index };
}

function readWasmCustomSections(bytes) {
  assert(bytes[0] === 0x00 && bytes[1] === 0x61 && bytes[2] === 0x73 && bytes[3] === 0x6d, 'Invalid wasm magic');
  const sections = [];
  let i = 8;
  while (i < bytes.length) {
    const sectionId = bytes[i];
    i += 1;
    const sizeInfo = readUleb(bytes, i);
    const sectionSize = sizeInfo.value;
    i = sizeInfo.next;
    const sectionStart = i;
    if (sectionId === 0) {
      const nameLenInfo = readUleb(bytes, i);
      const nameLen = nameLenInfo.value;
      const nameStart = nameLenInfo.next;
      const name = Buffer.from(bytes.subarray(nameStart, nameStart + nameLen)).toString('utf8');
      sections.push(name);
    }
    i = sectionStart + sectionSize;
  }
  return sections;
}

function readWasmSectionsFromWheel(wheelPath) {
  const listOutput = execFileSync('unzip', ['-Z1', wheelPath], { encoding: 'utf8' });
  const wasmEntry = listOutput
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .find((name) => name.endsWith('.so') || name.endsWith('.wasm'));
  assert(wasmEntry, `No wasm/.so module found in ${wheelPath}`);
  const bytes = execFileSync('unzip', ['-p', wheelPath, wasmEntry]);
  return readWasmCustomSections(bytes);
}

async function main() {
  const { expect } = parseArgs(process.argv);

  const buildProfilePath = path.join(PACKAGE_DIR, 'build-profile.json');
  const buildProfile = JSON.parse(await fs.readFile(buildProfilePath, 'utf8'));
  assert(buildProfile.profile === expect, `build-profile.json mismatch: expected ${expect}, got ${buildProfile.profile}`);
  assert(buildProfile.inline === true, 'build-profile.json inline must be true');

  const [v2Wheel, v3Wheel] = await Promise.all([
    getWheelFiles('v2'),
    getWheelFiles('v3'),
  ]);

  const wheelsTs = await fs.readFile(path.join(PACKAGE_DIR, 'src/internal/wheels.ts'), 'utf8');
  const v2Match = wheelsTs.match(/v2:\s*\{\s*filename:\s*"([^"]+)"/m);
  const v3Match = wheelsTs.match(/v3:\s*\{\s*filename:\s*"([^"]+)"/m);
  assert(v2Match, 'Failed to parse v2 filename from src/internal/wheels.ts');
  assert(v3Match, 'Failed to parse v3 filename from src/internal/wheels.ts');
  const v2Info = v2Match[1];
  const v3Info = v3Match[1];
  assert(v2Info === v2Wheel, `v2 wheel mismatch: source=${v2Info}, dir=${v2Wheel}`);
  assert(v3Info === v3Wheel, `v3 wheel mismatch: source=${v3Info}, dir=${v3Wheel}`);

  const inlineV2 = await fs.readFile(path.join(PACKAGE_DIR, 'src/inline/v2.ts'), 'utf8');
  const inlineV3 = await fs.readFile(path.join(PACKAGE_DIR, 'src/inline/v3.ts'), 'utf8');
  assert(inlineV2.includes(`../../wheels/v2/${v2Wheel}`), 'inline/v2.ts wheel import mismatch');
  assert(inlineV3.includes(`../../wheels/v3/${v3Wheel}`), 'inline/v3.ts wheel import mismatch');

  const [v2Sections, v3Sections] = await Promise.all([
    Promise.resolve(readWasmSectionsFromWheel(path.join(PACKAGE_DIR, 'wheels/v2', v2Wheel))),
    Promise.resolve(readWasmSectionsFromWheel(path.join(PACKAGE_DIR, 'wheels/v3', v3Wheel))),
  ]);

  const hasDebugSignal = (sections) =>
    sections.includes('name')
    || sections.includes('sourceMappingURL')
    || sections.some((section) => section.startsWith('.debug'));

  if (expect === 'debug-symbols') {
    assert(hasDebugSignal(v2Sections), `v2 wheel missing debug symbols signal: ${v2Sections.join(', ')}`);
    assert(hasDebugSignal(v3Sections), `v3 wheel missing debug symbols signal: ${v3Sections.join(', ')}`);
  }

  console.log(`Profile verification passed: ${expect}`);
  console.log(`v2=${v2Wheel}`);
  console.log(`v3=${v3Wheel}`);
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
