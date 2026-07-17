# Student Functionality Audit & Improvements (2026-07-17)

Every surface reachable by the **student portal** (the `student` role, shared
with `reviewer`) was audited against real-world student portals and
self-service apps. Completes the role-by-role series:
`docs/admin-improvements.md`, `docs/teacher-improvements.md`,
`docs/staff-improvements.md`.

| Area | Route | Verdict before |
| --- | --- | --- |
| Student Dashboard | `/student` | Good overview, but metric cards were dead ends and the notifications panel used the **admin log endpoint** with unread flags the user could never clear |
| Events | `/events` | Register + QR worked, but the QR pass lived **only in component state** — close the tab and your check-in ticket is gone forever; no registration list, no cancellation |
| Venue Booking | `/booking` | Students could request but **never withdraw** a pending request |
| Scholarship Desk | `/scholarship` | Complete (apply, track status incl. decision notes, reopen-aware windows) |
| Contact | `/contact` | Complete (submit + "My Inquiries" tracking with reference codes) |
| Profile | `/profile` | Read-only; **no way to change your password while signed in** (the endpoint existed, unexposed) |
| In-app notifications | *(backend only)* | A complete user-notification system (`/notifications/user*`: inbox, unread count, mark read, mark all read) existed and every workflow event feeds it — **zero frontend code called it** |

## Improvements implemented

### 1. In-app notifications activated (flagship)

Every workflow event (application received/decided, event registration,
booking decision) creates an in-app notification — invisible until now.

- **`notificationApi`** gained `getUserNotifications`, `markUserNotificationRead`,
  `markAllUserNotificationsRead`, `getUnreadCount`.
- **Student Dashboard**: the notifications metric now shows the **unread
  count**; the panel became **My Notifications** with unread accent styling,
  per-item **Mark read**, **Mark all read (n)**, and a **View** link when the
  notification carries a deep link. Marking read refreshes in place without
  reloading the whole dashboard.

### 2. My Event Passes: QR retrievable any time + cancellation

- **Backend**: new `GET /events/my-registrations` (own registrations with
  populated event details — the QR pass was already persisted, just
  unreachable) and `PATCH /events/registrations/:id/cancel` (owner-only,
  active registrations, blocked once the event has started; the seat is
  released automatically).
- **Registration revival fix**: the unique `{event, attendee}` index meant a
  cancelled registration **permanently blocked re-registering**; found during
  live verification. Registering again now revives the cancelled document
  with a **fresh QR token** (old pass invalidated), subject to the same
  capacity/deadline checks.
- **Events page**: new **My Event Passes** table (event, time, status,
  feedback state) with **Show QR** — reopening the existing QR/feedback panel
  for any pass — and **Cancel** behind a confirm dialog. The Register button
  now correctly disables for any event you already hold a pass for (it
  previously only knew about the most recent in-memory registration).

### 3. Withdraw a pending booking request

- **Backend**: `PATCH /bookings/my-requests/:bookingId/cancel` — requester
  ownership enforced, pending-only (decided requests are immutable),
  audit-logged.
- **Booking page**: "My Booking Requests" gained a **Cancel** action with a
  confirm dialog; the slot is released for others.

### 4. Change password from Profile

`POST /auth/reset-password` (verify current password, set new one, revoke all
refresh tokens) existed since the first SRS pass but no UI ever called it —
a signed-in user's only path was the email-token forgot-password flow.

- **Profile page** gained a **Change Password** card (current + new + confirm,
  client-side match/length validation, busy state) with a note that other
  sessions are signed out.

### 5. Clickable dashboard metric cards

Open Scholarships / My Applications → Scholarship Desk, Published Events →
Events, Bookable Venues → Booking — consistent with the other three
dashboards. (The unread-notifications card stays put since the inbox lives on
the same page.)

## Not changed (deliberately)

- **No notification bell in the header** — the dashboard inbox covers the
  requirement at department scale; a global bell + polling is the natural
  next step if desired.
- **Scholarship applications cannot be withdrawn** — status flow is
  reviewer-owned per the SRS; left as a product decision.
- Pre-existing lint debt untouched.

## Verification

- Frontend build passes (`vite build`); backend suite **19/19 pass**; all
  changed files lint clean (front + back).
- Live end-to-end as `student@example.com` (teacher used for negative tests):
  - Inbox 200 with unread count → mark one read (count drops) → mark all read
    (count 0).
  - Register 201 → duplicate register 409 → `my-registrations` returns the QR
    pass + event title → foreign cancel 403 → own cancel 200 (seat freed) →
    cancel again 409 → **re-register 201 with a fresh QR token**.
  - Booking request 201 → foreign cancel 403 → own cancel 200 → cancel again
    409.
  - Change password: wrong current 400 → change 200 → login with new password
    OK → reverted to the demo password (login re-verified).
- A real upcoming demo event ("Department Seminar: Modern Web Engineering",
  Seminar Hall 1) was created and the student left registered — visible on
  `/events` under My Event Passes.
