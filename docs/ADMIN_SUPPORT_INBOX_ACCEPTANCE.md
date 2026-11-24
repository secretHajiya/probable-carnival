# Admin Support Inbox — Acceptance Checklist

## Scope
The Admin app now includes a Member Support Inbox. It calls only the support RPCs already defined in `supabase/migrations/015_notifications_support.sql`; it does not query support tables directly and does not use a service-role key in the browser.

## Required staging checks
1. Apply migration `015_notifications_support.sql` after the baseline migrations, including the migration that creates `public.admin_audit_logs` and `public.is_active_admin()`.
2. Sign in as an active admin and confirm the Support Inbox loads tickets through `admin_list_support_tickets`.
3. Sign in as an ordinary authenticated member and confirm all three admin RPCs (`admin_list_support_tickets`, `admin_get_support_messages`, `admin_reply_support_ticket`) reject access with `admin_required`.
4. Confirm anonymous execution is denied for each admin RPC.
5. Open a ticket and confirm messages are ordered oldest-first and only the selected ticket's messages appear.
6. Send a reply with each allowed status (`in_progress`, `waiting_member`, `resolved`, `closed`) and confirm the ticket status, `assigned_admin_id`, updated timestamp, notification and audit log are written atomically.
7. Confirm invalid/empty messages and invalid statuses are rejected without inserting a message.
8. Confirm a reply does not expose member payout details, authentication secrets, or unrelated profile data.
9. Confirm a closed ticket cannot be replied to from this UI; reopening requires a separately authorized workflow because the current reply RPC intentionally does not accept `open` as a target status.
10. Test mobile-width layout and long message wrapping.

## Verification boundary
The UI implementation was checked at source/syntax level only. No Supabase staging or production RPC call, browser session, or end-to-end test was performed while preparing this archive. The database RPC's internal `is_active_admin()` check remains the authorization boundary; hiding UI controls is not security.
