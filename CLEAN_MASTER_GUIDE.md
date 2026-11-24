# Vyra Rewards Global — Clean Master Step65

This is the consolidated project source, arranged as one repository-ready folder.
It contains the canonical standalone project tree from Master Step65.

## Main folders
- `apps/mobile` — Expo / React Native Android app
- `apps/web` — member web app
- `apps/admin` — admin dashboard
- `supabase` — migrations and verification SQL
- `cloudflare` — Worker source
- `tests`, `scripts`, `docs` — checks, scripts and documentation

## GitHub / Codemagic
Upload the CONTENTS of this folder to the root of one GitHub repository.
Keep `codemagic.yaml` and `package.json` at repository root.
Codemagic's configured Android workflow builds the mobile app; it does not deploy
the web app, admin dashboard, Supabase SQL, or Cloudflare Workers.

## Important
- Historical step folders and nested ZIP archives are intentionally not included.
- Their current canonical source is consolidated in this project tree.
- Do not commit real `.env` files or private provider/service-role keys.
- No actual Codemagic build, Supabase deployment, or Cloudflare deployment is
  claimed by this archive.
- Review `docs/OWNER_REPORTED_STATUS_AND_REMAINING_WORK.md` and `STEP65_DELIVERY_REPORT.md`
  before production operations.
