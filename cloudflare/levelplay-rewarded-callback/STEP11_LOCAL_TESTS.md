# Step 11 — LevelPlay Worker local verification

The Worker passed local contract tests with a mocked Supabase RPC. The tests exercise:

- GET callback parsing
- Form-encoded POST parsing
- JSON POST parsing
- Valid MD5 signature and `EVENT_ID:OK` acknowledgement
- Invalid signature rejection before the RPC call
- Stale timestamp rejection before the RPC call
- Duplicate-event acknowledgement
- Database/RPC failure without acknowledgement
- Missing-secret fail-closed behavior

Run from the repository root:

```sh
node scripts/test-levelplay-worker.mjs
```

These are local tests only. They do not deploy the Worker, contact Supabase, create a real wallet credit, or verify the Unity dashboard configuration.

## Deployment preparation (not yet performed)

1. In Cloudflare, create/deploy the separate Worker named `vyra-levelplay-rewarded-callback` from `cloudflare/levelplay-rewarded-callback`.
2. Set `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, and `LEVELPLAY_S2S_PRIVATE_KEY` as Worker secrets. Never commit or paste their values into chat.
3. Keep the Worker separate from `cloudflare/cpx-callback`; do not edit or redeploy the CPX Worker as part of this task.
4. Configure the LevelPlay S2S callback URL and macros according to the README in this directory.
5. Keep the Supabase LevelPlay config disabled until a controlled end-to-end test is complete.
6. Do not set `EXPO_PUBLIC_LEVELPLAY_S2S_READY=true` until the deployed callback and server-side credit path have been verified.

No deployment or production callback has been performed in this step.
