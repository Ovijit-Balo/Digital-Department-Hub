# Admin Dashboard — Insight Widgets

Two new widgets on the **Admin Operations Dashboard** (`/admin` → Admin Panel)
turn raw counts into at-a-glance operational insight:

1. **Applications by Status** — a horizontal distribution bar for each
   scholarship-application status (submitted, under review, shortlisted,
   approved, rejected) with counts and proportions.
2. **Upcoming Scholarship Deadlines** — the next five open notices sorted by
   closing date, each with a colour-coded "days left" chip
   (red ≤ 3 days, amber ≤ 7 days, neutral otherwise).

---

## How it works

### Applications by Status
A new aggregation endpoint returns counts grouped by status in a single call
(instead of five separate list requests):

| Item | Value |
|------|-------|
| Endpoint | `GET /api/v1/scholarships/applications/stats` |
| Auth | Admin / Manager / Reviewer |
| Query | `noticeId` (optional — scopes to one notice) |
| Response | `{ total, pending, byStatus: { submitted, under_review, shortlisted, approved, rejected } }` |

`pending` is a convenience sum of submitted + under_review + shortlisted.

### Upcoming Deadlines
Computed on the client from the existing public
`GET /scholarships/notices?status=open` list — mapped to
`applicationWindowEnd || deadline`, sorted ascending, top 5. No new endpoint.

The stats call and deadline list are added to the dashboard's existing
`Promise.all`, so the dashboard still loads in one round-trip batch. The stats
widget only renders for roles that can review scholarships.

---

## Files changed / added

### Backend
- **`src/modules/scholarship/scholarship.service.js`** —
  `getApplicationStatusStats({ noticeId })` (Mongo `$group` aggregation, casts
  `noticeId` to `ObjectId`).
- **`src/modules/scholarship/scholarship.controller.js`** — `applicationStats`.
- **`src/modules/scholarship/scholarship.validation.js`** — `applicationStats`
  schema (`noticeId` optional).
- **`src/modules/scholarship/scholarship.routes.js`** — `GET /applications/stats`.

### Frontend
- **`src/api/modules/scholarshipApi.js`** — `applicationStats(params)`.
- **`src/pages/admin/AdminPanelPage.jsx`** — fetches stats + deadlines, renders
  the two widgets (`.insight-grid`), plus `deadlineUrgencyClass` / `deadlineLabel`
  helpers.
- **`src/styles/pages/discovery.css`** — `.insight-grid`, `.status-bars`,
  `.deadline-*` styles (theme-aware).

---

## Tests
`backend/tests/modules/scholarshipReport.test.js` covers
`getApplicationStatusStats`: it verifies the totals/`byStatus`/`pending`
breakdown and that `noticeId` scoping (ObjectId casting) works.
