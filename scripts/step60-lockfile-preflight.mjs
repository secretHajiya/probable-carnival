import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const rootManifest = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const lockPath = path.join(root, 'package-lock.json');

if (!fs.existsSync(lockPath)) {
  console.error('BLOCKED: root package-lock.json is missing.');
  console.error('Do not use npm ci or fabricate a lockfile. Generate it with registry access, then rerun this preflight.');
  process.exitCode = 2;
} else {
  let lock;
  try {
    lock = JSON.parse(fs.readFileSync(lockPath, 'utf8'));
  } catch (error) {
    console.error(`BLOCKED: package-lock.json is not valid JSON: ${error.message}`);
    process.exitCode = 2;
  }
  if (lock) {
    const failures = [];
    if (lock.lockfileVersion !== 3) failures.push(`expected lockfileVersion 3, found ${lock.lockfileVersion}`);
    if (!lock.packages || typeof lock.packages !== 'object') failures.push('packages map is missing');
    for (const workspace of rootManifest.workspaces ?? []) {
      const key = workspace.replace(/\\/g, '/');
      if (!lock.packages?.[key]) failures.push(`workspace entry missing: ${key}`);
    }
    if (failures.length) {
      console.error('BLOCKED: package-lock.json failed validation.');
      for (const failure of failures) console.error(`- ${failure}`);
      process.exitCode = 2;
    } else {
      console.log(`Lockfile preflight passed: npm lockfile v3 with ${rootManifest.workspaces.length} workspace entries.`);
    }
  }
}
