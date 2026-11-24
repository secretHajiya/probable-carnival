import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const doc = readFileSync(new URL('../docs/STEP64_EAI_AGAIN_CASE_STUDIES_AND_REMEDIATION.md', import.meta.url), 'utf8');

test('Step64 records npm CLI maintainer explanation and user-reported DNS/network resolution', () => {
  assert.match(doc, /npm\/cli\/issues\/4515/);
  assert.match(doc, /changing DNS and switching networks resolved their case/);
});

test('Step64 records independent Stack Overflow and GitLab CI cases', () => {
  assert.match(doc, /stackoverflow\.com\/questions\/42021318/);
  assert.match(doc, /forum\.gitlab\.com\/t\/gitlab-runner/);
});

test('Step64 distinguishes CI/container DNS from package manifest defects', () => {
  assert.match(doc, /inside the exact container\/job/);
  assert.match(doc, /not proof of a bad Vyra dependency/);
});

test('Step64 requires registry reachability before lockfile generation', () => {
  assert.match(doc, /npm ping --verbose/);
  assert.match(doc, /npm install --package-lock-only/);
  assert.match(doc, /npm ci/);
});

test('Step64 forbids fabricated lockfiles and unsafe TLS bypasses', () => {
  assert.match(doc, /Do not fabricate a lockfile/);
  assert.match(doc, /strict-ssl=false/);
});

test('Step64 preserves production and deployment boundaries', () => {
  assert.match(doc, /No npm install, Android build, Supabase production mutation, or Cloudflare deployment performed/);
});
