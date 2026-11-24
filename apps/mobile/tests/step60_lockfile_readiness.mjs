import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const mobileRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const repoRoot = path.resolve(mobileRoot, '..', '..');
const rootManifest = JSON.parse(fs.readFileSync(path.join(repoRoot, 'package.json'), 'utf8'));
const script = path.join(repoRoot, 'scripts', 'step60-lockfile-preflight.mjs');
const ci = fs.readFileSync(path.join(repoRoot, 'codemagic.yaml'), 'utf8');
const docs = fs.readFileSync(path.join(repoRoot, 'docs', 'STEP60_LOCKFILE_READINESS.md'), 'utf8');
let checks = 0;
const check = (condition, message) => { assert.ok(condition, message); checks += 1; };

check(rootManifest.workspaces.length === 3, 'three npm workspaces remain declared');
check(rootManifest.workspaces.includes('apps/mobile'), 'mobile workspace remains declared');
check(rootManifest.workspaces.includes('apps/web'), 'web workspace remains declared');
check(rootManifest.workspaces.includes('apps/admin'), 'admin workspace remains declared');
check(rootManifest.scripts?.['check:lockfile'] === 'node scripts/step60-lockfile-preflight.mjs', 'root lockfile guard command is wired');
check(fs.existsSync(script), 'lockfile preflight script exists');
check(fs.readFileSync(script, 'utf8').includes('lockfileVersion !== 3'), 'preflight enforces npm lockfile v3');
check(fs.readFileSync(script, 'utf8').includes('workspace entry missing'), 'preflight checks every workspace lock entry');
check(!fs.existsSync(path.join(repoRoot, 'package-lock.json')), 'missing lockfile is reported as current blocker');
const run = spawnSync(process.execPath, [script], { cwd: repoRoot, encoding: 'utf8' });
check(run.status === 2, 'preflight fails closed when lockfile is missing');
check(run.stderr.includes('BLOCKED: root package-lock.json is missing'), 'preflight explains the exact blocker');
check(/npm install/.test(ci) && !/npm ci/.test(ci), 'Codemagic does not use npm ci without a lockfile');
check(docs.includes('A synthetic or hand-written lockfile was deliberately not created'), 'documentation records that no synthetic lockfile was created');
check(rootManifest.engines?.node === '>=22.13.0', 'Node engine requirement remains explicit');

console.log(`Step60 lockfile readiness: ${checks}/${checks} checks passed.`);
console.log('The expected missing-lockfile condition is verified; dependency install and Android build remain blocked pending registry access.');
