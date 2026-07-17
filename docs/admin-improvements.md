# Admin Functionality Audit & Improvements (2026-07-17)

Every admin-facing surface was audited against what real-world admin panels
(WordPress, Django admin, typical SaaS dashboards) provide. The audit covered:

| Area | Route | Verdict before |
| --- | --- | --- |
| Admin Operations Dashboard | `/admin` | Good metrics, but browser popups + dead-end cards |
| Access Control | `/admin/access` | Role editing OK, **no way to disable an account** |
| Notification Center | `/admin/notifications` | Log showed raw MongoDB IDs, no pagination |
| CMS Studio | `/admin/cms` | Already complete (see `docs/cms-studio.md`) |
| Teacher / Staff dashboards | `/admin/teacher`, `/admin/staff` | Fine (metrics + queues + quick links) |
| Scholarship / Events / Booking / Contact desks | `/scholarship` etc. | Functional, but browser popups for decisions |

## Improvements implemented

### 1. In-app confirmation dialogs everywhere (no more browser popups)

`window.confirm()` / `window.prompt()` were used for approve/reject and status
decisions. Real applications never use native browser popups: they can't be
styled, can't be cancelled cleanly, and look untrustworthy.

- **`components/ui/ConfirmDialog.jsx` extended** with an optional note textarea
  (`noteLabel`, `notePlaceholder` props; the typed note is passed to
  `onConfirm(note)`). Fully backward-compatible with existing usages.
- Replaced in:
  - **AdminPanelPage** — booking approve/reject (with decision note), inquiry
    status updates (with resolution note)
  - **BookingPage** (venue desk) — booking decisions with decision note
  - **ContactPage** (contact desk) — inquiry status with status note
  - **ScholarshipPage** — "reopen application window" confirmation
- Buttons show busy state ("Working…") while the API call runs.

### 2. Access Control: account activation control (previously impossible)

The backend endpoint `PATCH /auth/users/:id/status` and the API client method
existed but were never exposed in the UI — an admin could not disable a
compromised or departed user's account.

- Added **Deactivate / Reactivate** button per user in `/admin/access`,
  guarded by a confirmation dialog that explains the consequence
  (deactivation revokes all of the user's refresh tokens immediately —
  already implemented server-side).
- The button is hidden for the admin's **own** row (the backend also blocks
  self-deactivation with a 400, verified).
- Verified end-to-end: deactivated user gets 401 on login; reactivation
  restores access.

### 3. Notification Center: readable delivery log + pagination

- **Backend**: `listNotifications` now populates `recipient` with
  `fullName`/`email` (was returning a raw ObjectId that the UI displayed
  verbatim).
- **Frontend**: the Delivery Log shows the recipient's name + email and a new
  **Subject** column, and is paginated (10/page via the shared
  `PaginationBar`; filters reset to page 1).

### 4. Dashboard metric cards are now clickable

Each KPI card on the Admin Operations Dashboard links to the place where the
admin acts on that number (Pending Bookings → Venue Desk, New Inquiries →
Contact Desk, Published News → CMS Studio, etc.), matching standard admin
dashboard UX. Hover state added (`.feature-card--link`).

## Not changed (deliberately)

- **Broadcast notifications** still fan out client-side (one dispatch per
  user). Acceptable at department scale; a server-side broadcast endpoint is
  the future improvement if user counts grow.
- **REVIEWER role can apply to scholarships** — flagged previously as a mild
  conflict of interest; left as a product decision.
- Pre-existing lint debt (unused vars, duplicate CSS selectors) untouched.

## Verification

- Frontend build passes (`vite build`).
- Backend test suite: **19/19 pass**.
- Changed files lint clean (only pre-existing baseline issues remain).
- Live API round-trip tests: user deactivate → login blocked (401) →
  reactivate → login OK; self-deactivation blocked (400); notification list
  returns populated recipient names.
