# Step64 — EAI_AGAIN Case Studies and Remediation Runbook

## Scope and finding

The Step62/63 diagnostic in this workspace recorded `EAI_AGAIN` for npm, GitHub and Google hostnames. That pattern is consistent with a DNS resolver/network path failure in the execution environment, not proof of a bad Vyra dependency or an npm package-version conflict. A hostname lookup fails before npm can fetch package metadata.

This step records external cases and a safe, evidence-led recovery procedure. It does not claim that the current execution environment has been repaired.

## Published cases reviewed

1. **npm CLI issue #4515 (2022):** the maintainer explained that `EAI_AGAIN` is a DNS resolution problem outside npm itself. The reporter later said changing DNS and switching networks resolved their case. This is a user-reported resolution, not a universal fix.
   - https://github.com/npm/cli/issues/4515
2. **Stack Overflow: npm install / EAI_AGAIN:** historical reports include changing networks and DNS resolvers; another report attributes a Hyper-V case to a network-adapter setting. These are environment-specific anecdotes.
   - https://stackoverflow.com/questions/42021318/error-npm-install
3. **GitLab CI forum report:** discussion describes a runner/container DNS lookup failure and suggests identifying the resolver and investigating DNS caching/upstream reliability.
   - https://forum.gitlab.com/t/gitlab-runner-npm-ci-getaddrinfo-eai-again-registry-npmjs-org/47319
4. **CI runner reproduction (2026):** a runner case reproduced a bad resolver inside a namespace/container; after the resolver was corrected, the registry hostname resolved. This demonstrates that a CI/container resolver can fail independently of the package manifest.
   - https://latchkey.dev/learn/failures/eai-again-could-not-resolve-host-in-ci

## Recommended order for Vyra

### A. Test from the same machine/environment that will create the lockfile

Run these commands from the project root. Do not infer that the user's phone, this ChatGPT execution environment, and Codemagic share one DNS configuration.

```bash
node -e "require('node:dns').lookup('registry.npmjs.org', (e, a) => { console.log(e || a); process.exitCode = e ? 1 : 0; })"
npm config get registry
npm config get proxy
npm config get https-proxy
npm ping --verbose
```

If DNS fails, test a second network (for example, a mobile hotspot) and compare. If the second network works, investigate the first network's DNS, VPN, captive portal, firewall or proxy. On a computer, an administrator may test a trusted alternate DNS resolver (for example Cloudflare `1.1.1.1` / `1.0.0.1` or Google `8.8.8.8` / `8.8.4.4`) and then repeat the lookup. Do not change DNS settings on a managed device/network without authorization.

### B. Check proxy configuration

If the environment is not meant to use a proxy but npm has stale proxy values, inspect them first. Only after confirming they are incorrect, clear them:

```bash
npm config delete proxy
npm config delete https-proxy
```

Do not delete valid corporate/managed proxy settings. Do not disable TLS verification or set `strict-ssl=false` as a workaround.

### C. If the failure occurs only in Docker or CI

Inspect the resolver from inside the exact container/job that runs npm, not only from the host. Compare `/etc/resolv.conf`, run `getent hosts registry.npmjs.org` (Linux), and test HTTPS with `curl -I https://registry.npmjs.org/-/ping`. Ask the CI provider/admin to repair runner DNS/firewall/proxy if the container has no usable resolver. A retry with backoff can help a transient resolver outage, but cannot repair a permanently unreachable DNS server.

### D. Once registry access works

From the repository root, use the project's intended npm version and flags. First inspect npm configuration and workspace manifests. Then generate the lockfile with npm, review the diff, and run a clean install:

```bash
npm install --package-lock-only
npm ci
npm run check:lockfile
npm run preflight:dependencies
```

If the repository uses dependency-tree flags such as `legacy-peer-deps` or `install-links`, use the same project-level configuration for both lockfile creation and `npm ci`. Do not fabricate a lockfile, manually guess integrity hashes, or switch registries merely to bypass a DNS failure.

## Why we should not switch registry blindly

The documented error occurs at hostname resolution. A mirror is only useful if the current network can resolve and reach that mirror and it reliably contains the required package metadata/tarballs. Step62's diagnostic also reported DNS failures for other unrelated domains, so switching only the npm registry would not address the broad environment-level symptom.

## Project status after Step64

- Research/runbook documentation added.
- No dependency versions changed.
- No `package-lock.json` fabricated or generated.
- No npm install, Android build, Supabase production mutation, or Cloudflare deployment performed by this documentation-only step.
- Next action: run the diagnostics from a computer or CI environment with working DNS/HTTPS, then generate and validate the real lockfile.

## Primary technical references

- npm `npm doctor`: https://docs.npmjs.com/cli/v10/commands/npm-doctor/
- npm `npm ci`: https://docs.npmjs.com/cli/npm-ci/
- npm common troubleshooting: https://docs.npmjs.com/troubleshooting/if-your-npm-is-broken/
