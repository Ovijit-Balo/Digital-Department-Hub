# Scholarship Applications — PDF Export (FR-PA-026)

Admins/reviewers can now export a scholarship notice's applications as a
formatted **PDF report**, alongside the existing CSV export. This closes
FR-PA-026 ("Should" — reporting/export), which previously only had CSV.

---

## How it works

A new endpoint renders the applications for a notice into an on-brand,
paginated PDF (Cardinal Red header, department name, zebra-striped table,
page numbers) and streams it back as a download.

| Item | Value |
|------|-------|
| Endpoint | `GET /api/v1/scholarships/applications/export/pdf` |
| Auth | Admin / Manager / Reviewer (`canReviewScholarship`) |
| Query | `noticeId` (required), `status` (optional filter) |
| Response | `application/pdf` attachment |

The PDF header shows the notice title, a summary line (total applications,
approved count, scholarship type) and one row per applicant: name, email,
department, GPA, category, awarded amount, status, and submission date.

---

## How to use it

### In the UI
1. Sign in as a reviewer/admin and open the **Scholarship** desk.
2. Select a notice so the **Review Queue** loads.
3. Click **Export PDF** (next to **Export CSV**). The file downloads as
   `scholarship-applications-<noticeId>.pdf`.

### With curl
```bash
curl -L -H "Authorization: Bearer <token>" \
  "http://localhost:5000/api/v1/scholarships/applications/export/pdf?noticeId=<id>" \
  -o applications.pdf
```

---

## Files changed / added

### Backend
- **`src/utils/pdf.js`** *(new)* — `renderTablePdf({ title, subtitle, meta, columns, rows })`
  returns a `Promise<Buffer>`. Handles branded header, auto-scaled columns,
  row pagination, zebra striping, and page numbers. Built on **pdfkit**.
- **`src/modules/scholarship/scholarship.service.js`** — added
  `exportApplicationsPdf({ noticeId, status })` → `{ buffer, filename }`
  (mirrors the CSV query, populates student/reviewer).
- **`src/modules/scholarship/scholarship.controller.js`** — `exportApplicationsPdf`
  handler (sets `application/pdf` + `Content-Disposition`).
- **`src/modules/scholarship/scholarship.routes.js`** — `GET /applications/export/pdf`
  (reuses the `exportApplications` validation).

### Frontend
- **`src/api/modules/scholarshipApi.js`** — `exportApplicationsPdf(params)`
  (`responseType: 'blob'`).
- **`src/pages/public/ScholarshipPage.jsx`** — `exportPdf()` handler + **Export PDF**
  button in the Review Queue header.

### Dependency
- **`pdfkit`** added to `backend` dependencies.

---

## Tests
`backend/tests/modules/scholarshipReport.test.js` seeds a notice + applications
in an in-memory MongoDB and asserts the export returns a real PDF (`%PDF` magic
bytes) and honours the `status` filter. Run:

```bash
cd backend
npx jest tests/modules/scholarshipReport.test.js
```
