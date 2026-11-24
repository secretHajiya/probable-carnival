# Member Notifications & Support — Acceptance Plan

## Scope
- Members can read only notifications addressed to their authenticated user.
- Members can mark only their own notifications as read through `mark_notification_read`.
- Members can create a ticket and its first message atomically through `create_support_ticket`.
- Members can read messages only for tickets they own (RLS policy).
- Members can reply only to their own tickets while status is `open`, `in_progress`, or `waiting_member`.
- A member reply reopens the ticket as `open`; members cannot set priority, assign admins, or change ticket status directly.
- Admin queue, message read and reply RPCs require `is_active_admin()`.
- Admin replies create an in-app notification and an audit-log record.

## Staging tests required
1. Apply migration `015_notifications_support.sql` after migrations 001–014.
2. As member A, create a support ticket with valid subject/category/message; confirm ticket and first message exist.
3. As member B, attempt to select member A's ticket and messages; expect no rows.
4. As member B, call `member_reply_support_ticket` with A's ticket ID; expect `ticket_not_available`.
5. As member A, reply to own open ticket; confirm message is stored and status becomes `open`.
6. Attempt a reply to a `resolved` or `closed` ticket; expect `ticket_not_available`.
7. As member A, mark own notification read; confirm `read_at` is set.
8. As member B, attempt to mark A's notification read; expect false and no data change.
9. As non-admin authenticated user, call each `admin_*support*` RPC; expect `admin_required`.
10. As active admin, list tickets, read messages, reply with a valid status; confirm notification and audit log are created.
11. Confirm anon cannot select any of the three tables or execute member/admin RPCs.
12. Test malformed subject/message/category and invalid status inputs; expect rejection.

## Limitations
- Source and migration are prepared; this archive does not apply the migration to Supabase.
- The member UI reads only the signed-in user's rows. Admin operations remain in the admin RPC layer and are not exposed in this member page.
- No email, push notification or realtime delivery is claimed; this increment is in-app notifications only.
