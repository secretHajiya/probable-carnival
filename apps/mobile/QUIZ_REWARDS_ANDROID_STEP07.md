# Step 07 — Native Quiz Rewards

## Implementation
- Adds a native quiz panel and typed service for the existing `get_quiz_question()` and `submit_quiz_answer(uuid,text)` RPCs from Migration 025.
- Correct answers are checked on the server. The client never reads `correct_option` and never writes to wallet tables.
- Wallet refresh is requested only after a successful answer response with a positive reward.
- Daily attempt limits, account status, question selection, duplicate submission protection, and coin credit remain enforced by the existing SQL functions.

## Production safeguards
- Migration 025 is already applied in Production; this step adds no SQL migration and must not ask the operator to run Migration 025 again.
- Quiz config was created with `is_enabled=false`. The UI reports disabled status returned by the RPC; it does not enable the feature.
- Do not insert sample questions or enable the quiz without explicit Admin action and approved question content.
- No withdrawal configuration or payout code is changed.

## Validation boundary
This ZIP was checked for archive integrity and expected source files. No npm install, TypeScript check, Expo prebuild, Android build, live Supabase call, or device test was run.
