# Quiz Rewards implementation — Migration 025

## Production database status
The project owner reports Migration 025 was run successfully in Supabase Production. Verification returned:
- `quiz_config`, `quiz_questions`, `quiz_attempts`: RLS enabled.
- `get_quiz_question`, `submit_quiz_answer`, `admin_update_quiz_config`: EXECUTE granted to `authenticated`; denied to `anon` and `public`.

## Member experience
- Quiz Rewards card is part of the member dashboard.
- Questions are requested only through `get_quiz_question`; the member UI does not directly read the admin-restricted quiz configuration or question bank.
- The client submits only the attempt ID and selected option to `submit_quiz_answer`.
- Correctness and coin credit are determined server-side. The client never receives the correct answer before submission.
- Member balance refreshes after a correct answer.
- Quiz is expected to remain disabled until explicitly enabled by an administrator.

## Admin experience
- Quiz Rewards is available from the Admin Dashboard navigation.
- Admin can configure enabled state, daily attempts, reward coins, and question bank entries.
- Saves use `admin_update_quiz_config`.
- Enabling requires an explicit confirmation prompt.
- Withdrawal settings are not modified by this feature.

## Important validation limitation
The source archive did not include installed npm dependencies, and no browser or Supabase live UI test was performed for this feature. TypeScript build could not run because `react` and `@supabase/supabase-js` packages are not installed in this workspace. Confirm the deployed SQL function return field names and run member/admin UI tests during the final integration stage.
