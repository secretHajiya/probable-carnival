# Admin Dashboard Entry Authorization

The Admin app now checks `public.is_active_admin()` after a Supabase session is established and before rendering any Admin feature view. Only an active `support`, `finance_reviewer`, `admin`, or `super_admin` role passes this gate, matching the helper definition in migration 001.

The gate fails closed: an RPC error, missing function, false result, or non-boolean result denies entry. This is a UI entry gate, not a replacement for database authorization. Each feature continues to call its own server-side RPCs, which enforce their specific permissions (for example, finance operations require finance-admin authorization). A support-only admin may enter the Admin app but must still be denied finance operations.

No SQL migration is required because the existing `is_active_admin()` helper is reused. Before deployment, verify the authenticated role can execute this helper in the target Supabase project and test active/inactive support, finance reviewer, admin, super-admin, and ordinary member accounts. No live Production test or dependency-backed build is claimed.
