import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (relative) => JSON.parse(fs.readFileSync(path.join(root, relative), 'utf8'));
const rootManifest = read('package.json');
const workspaces = (rootManifest.workspaces ?? []).map((workspace) => ({
  path: workspace,
  manifest: read(path.posix.join(workspace, 'package.json')),
}));
const failures = [];
if (rootManifest.packageManager && !/^npm@/.test(rootManifest.packageManager)) failures.push('root packageManager must identify npm when specified');
if (!rootManifest.engines?.node || !/^>=22(?:\.|$)/.test(rootManifest.engines.node)) failures.push('root Node engine must require Node 22 or newer');
if (workspaces.length !== 3) failures.push(`expected 3 workspaces, found ${workspaces.length}`);
for (const expected of ['apps/web', 'apps/admin', 'apps/mobile']) {
  if (!workspaces.some((workspace) => workspace.path === expected)) failures.push(`workspace missing: ${expected}`);
}
for (const { path: workspacePath, manifest } of workspaces) {
  if (!manifest.name) failures.push(`${workspacePath}: package name is missing`);
  if (manifest.private !== true) failures.push(`${workspacePath}: workspace must remain private`);
  if (!manifest.scripts || typeof manifest.scripts !== 'object') failures.push(`${workspacePath}: scripts map is missing`);
}
const mobile = workspaces.find((workspace) => workspace.path === 'apps/mobile')?.manifest;
if (mobile?.dependencies?.expo !== '~58.0.0') failures.push('mobile Expo version range changed unexpectedly');
if (mobile?.dependencies?.['react-native'] !== '0.88.0') failures.push('mobile React Native version changed unexpectedly');
if (mobile?.dependencies?.react !== '19.3.0') failures.push('mobile React version changed unexpectedly');
if (!fs.existsSync(path.join(root, 'package-lock.json'))) failures.push('root package-lock.json is still missing');
if (failures.length) {
  console.error('DEPENDENCY PREFLIGHT BLOCKED:');
  for (const failure of failures) console.error(`- ${failure}`);
  console.error('Do not switch CI to npm ci or claim a reproducible install until a registry-resolved lockfile is available.');
  process.exitCode = 2;
} else {
  console.log(`Dependency manifest preflight passed for ${workspaces.length} workspaces.`);
}
