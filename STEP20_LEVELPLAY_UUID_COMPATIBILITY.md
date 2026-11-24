# Step 20 — LevelPlay UUID Compatibility

- Updated the LevelPlay callback Worker to accept Supabase UUIDs in canonical hyphenated form or compact 32-hex form.
- Signature verification continues to use the exact raw `applicationUserId` value received from Unity; only the value passed to the Supabase RPC is normalized.
- Added a local regression test for a canonical hyphenated UUID.
- CPX callback Worker was not modified.
- Local tests mock Supabase and do not contact Production.

Run: `node scripts/test-levelplay-worker.mjs` from the standalone project root.
