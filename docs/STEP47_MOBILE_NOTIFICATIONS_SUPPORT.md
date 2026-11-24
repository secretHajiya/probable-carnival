# Step47 — Mobile Notifications & Support Center

## Delivered
- Added `apps/mobile/src/services/member-inbox.service.ts` and `apps/mobile/src/components/MemberInboxPanel.tsx`.
- Added an `Inbox` bottom-navigation tab and Home shortcut in `apps/mobile/App.tsx`.
- Notifications: newest 50 records from `member_notifications`; unread notifications are marked read through `mark_notification_read`.
- Support: list own tickets, read own ticket messages, create tickets, and reply to eligible open/in-progress/waiting-member tickets.
- Uses the existing Migration 015 schema and functions: `create_support_ticket`, `member_reply_support_ticket`, and `mark_notification_read`.
- Subject and message lengths and ticket categories align with Migration 015 constraints.
- Member queries rely on authenticated Supabase session and existing RLS; no user-supplied user ID is used to broaden access.

## Safety boundaries
- No new migration or Production SQL was added.
- No direct wallet balance/ledger write was added.
- No push notification, email delivery, realtime subscription, or notification deep-link navigation is claimed.
- Admin replies remain controlled by the existing `is_active_admin()` checks and audit behavior in Migration 015.

## Validation
- `node tests/step47_mobile_inbox_contract.mjs`: 13/13 passed.
- Step45 referral and Step46 activity contract tests: 10/10 each passed.
- Prior Step31, 32, 40, 41, 42 and 43 checks passed; Step42 requires `node --experimental-strip-types` on Node 22.
- Full app typecheck/build and live Supabase/Android tests were not run because dependencies are not installed in `apps/mobile`.

## Next
Run dependency-backed mobile typecheck/build and validate notifications/ticket creation/replies against an isolated Supabase test environment before any Production rollout.
