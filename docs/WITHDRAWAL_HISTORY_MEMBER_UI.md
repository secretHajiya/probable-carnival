# Member withdrawal history UI

Added a read-only withdrawal history page to the standalone member app. It obtains the current authenticated user with `auth.getUser()`, filters `withdrawal_requests` by that user ID, orders newest first, and caps the display at 50 rows. Database RLS remains mandatory; the browser never receives a service-role key.

The page deliberately does not submit new requests. The current SQL RPC accepts a `p_payout_details_token` string, but the project does not yet contain a verified secure payout-details tokenization service or a member-facing payout-method/details workflow. Accepting arbitrary text from the browser as a token would be unsafe. New request submission remains disabled until that secure service is implemented and tested.

Verification: ZIP integrity and source-level review only. No live Supabase test or dependency-backed Vite build was run.
