# Staff (Manager) Functionality Audit & Improvements (2026-07-17)

Every surface reachable by the **staff portal** (the `manager` role) was audited
against real-world operations/service-desk tools. Follow-up to
`docs/admin-improvements.md` and `docs/teacher-improvements.md`.

| Area | Route | Verdict before |
| --- | --- | --- |
| Staff Dashboard | `/admin/staff` | Queues were **display-only** — staff saw pending bookings/inquiries but had to navigate elsewhere to act; KPI cards not clickable |
| Venue Desk | `/booking` | Approval flow solid (confirm dialogs + decision notes from the admin pass), but **venues could be created and never edited or retired** — a typo, capacity change, or renovation closure was impossible |
| Contact Desk | `/contact` | Complete (status flow + resolution notes) |
| Notification Center | `/admin/notifications` | Complete (dispatch + readable, paginated delivery log) |
| Scholarship Desk | `/scholarship` | Complete for managers (notices, review queue, CSV/PDF export) |
| Access Control | `/admin/access` | Correct by design: managers get a **read-only** user directory; role/status mutations stay admin-only (backend enforces 403) |
| Operations Dashboard | `/admin` | Works for managers — all fetches role-gated |

## Improvements implemented

### 1. Venue lifecycle management (previously impossible)

The venue model always had `isActive`, and booking requests against inactive
venues are refused (`Venue is unavailable`) — but there was **no endpoint and
no UI** to edit a venue or flip that flag. Once created, a venue was frozen
forever.

- **Backend**: new `PATCH /bookings/venues/:venueId` (admin/manager), Joi
  validation (any subset of name/location/capacity/amenities/manager/isActive),
  service guard for missing venues, audit-log entry (`UPDATE_VENUE`).
- **Venue Desk**: the manager area now has a **Manage Venues** table (all
  venues, including retired ones) with:
  - **Edit** — loads the venue into the form (which switches to "Edit Venue"
    with Save/Cancel) for fixing names, locations, capacity, amenities.
  - **Retire / Reactivate** — confirm dialog explaining the consequence
    (new requests blocked; existing approved bookings stay on the calendar).

### 2. Staff Dashboard queues are now actionable

Real service-desk dashboards let operators act where they see the work. The
pending-booking and new-inquiry tables on `/admin/staff` were read-only.

- **Pending Booking Queue** — Approve/Reject buttons per row, via the shared
  `ConfirmDialog` with an optional decision note (relayed to the requester),
  with toast feedback and automatic queue refresh.
- **New Inquiry Queue** — In Progress / Resolve buttons per row with an
  optional resolution note, same pattern as the admin dashboard.

### 3. Staff Dashboard KPI cards are clickable

Each metric links to the desk where staff act on it (Pending Bookings → Venue
Desk, New Inquiries → Contact Desk, Scholarship Submissions → Scholarship
Desk, Queued Notifications → Notification Center), consistent with the admin
and teacher dashboards.

## Not changed (deliberately)

- **Venue deletion** — deliberately not offered; retiring keeps historical
  bookings meaningful (real systems archive, they don't hard-delete resources
  with history).
- **Access Control stays read-only for managers** — separation of duties;
  account/role changes remain an admin responsibility.
- Pre-existing lint debt untouched.

## Verification

- Frontend build passes (`vite build`); backend suite **19/19 pass**; changed
  files lint clean.
- Live end-to-end as `staff@example.com` (+ student/teacher for negatives):
  1. create venue → 201
  2. edit capacity/location → 200, fields updated
  3. retire → 200, `isActive:false`
  4. student booking on retired venue → **400 "Venue is unavailable"**
  5. editor tries venue update → **403** (route correctly manager/admin only)
  6. reactivate → student booking succeeds (201)
  7. staff decision endpoint (dashboard flow) → 200, status applied
  8. test venue retired again for cleanup
