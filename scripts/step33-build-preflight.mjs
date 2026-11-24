import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const required = [
  'node_modules/react/package.json',
  'node_modules/react-dom/package.json',
  'node_modules/@supabase/supabase-js/package.json',
  'node_modules/typescript/package.json',
  'node_modules/vite/package.json',
  'node_modules/@vitejs/plugin-react/package.json',
];
const missing = required.filter((item) => !fs.existsSync(path.join(root, item)));
const lockfiles = ['package-lock.json', 'npm-shrinkwrap.json', 'pnpm-lock.yaml', 'yarn.lock'];
const foundLockfiles = lockfiles.filter((item) => fs.existsSync(path.join(root, item)));
const nodeMajor = Number(process.versions.node.split('.')[0]);
const report = {
  node: process.versions.node,
  npmLockfiles: foundLockfiles,
  requiredPackages: required.length,
  missingPackages: missing,
  ready: nodeMajor >= 22 && missing.length === 0,
};
console.log(JSON.stringify(report, null, 2));
if (!report.ready) process.exitCode = 1;
