# Flaws and Inconsistencies Audit

Audit of recent security, CMS, auth, and sitemap changes in Digital Department Hub.  
Generated: 2026-06-27

---

## Critical / High Impact

### 1. Proactive JWT expiry logout conflicts with silent refresh

**Location:** `frontend/src/context/AuthContext.jsx`

A timer logs the user out ~2 seconds before the access token expires and redirects to `/login`, even when a valid refresh token exists. The axios interceptor in `client.js` is designed to silently refresh on 401. These two mechanisms fight each other — users with "remember me" sessions get logged out prematurely instead of staying signed in.

**Fix:** Replace the expiry timer with a proactive silent refresh before expiry; only force logout when refresh fails.

---

### 2. Refresh endpoint shares auth rate limit bucket

**Location:** `backend/src/middlewares/rateLimiters.js`, `auth.routes.js`

`POST /auth/refresh` uses the same `authLimiter` (20 requests / 15 min) as login and register. Multiple tabs or background API calls can exhaust the bucket, causing 429 responses and mass logouts.

**Fix:** Use a separate, higher-limit `refreshLimiter` for the refresh endpoint only.

---

### 3. No public gallery detail API

**Location:** `backend/src/modules/cms/cms.routes.js`, `frontend/src/pages/public/GalleryDetailPage.jsx`

`GET /cms/galleries/:id` requires authentication. The public gallery detail page fetches up to 100 published galleries and finds the target client-side — wasteful, breaks beyond 100 galleries, and inconsistent with news (`GET /cms/news/:id`) and blogs (`GET /cms/blogs/slug/:slug`).

**Fix:** Add public `GET /cms/galleries/:id` and `GET /cms/galleries/slug/:slug`; move admin get-by-id to `/manage/galleries/:id`.

---

### 4. Sitemap URL path mismatches

**Location:** `backend/src/modules/sitemap/sitemap.service.js`

| Sitemap entry | Actual frontend route | Result |
|---------------|----------------------|--------|
| `/scholarships` | `/scholarship` | 404 |
| Missing `/announcements` | `/announcements` exists | Not indexed |
| `/events#${id}` | No event detail route | Poor SEO (hash URLs ignored by crawlers) |
| No gallery detail URLs | `/gallery/:galleryId` | Galleries not indexed individually |

**Fix:** Correct static paths, add gallery and announcement URLs, remove hash-based event URLs.

---

## Medium Impact

### 5. Auth storage inconsistencies

**Location:** `frontend/src/constants/authStorage.js`, `AuthContext.jsx`

- `getAccessToken()` prefers localStorage over sessionStorage unconditionally — a stale localStorage token can shadow a valid sessionStorage token after partial corruption.
- `readStoredAuth()` parse-error cleanup clears localStorage keys but not sessionStorage keys.

**Fix:** Prefer the storage bucket that holds the active refresh token; clear both storages on parse failure.

---

### 6. Hard redirect to login on any 401 refresh failure

**Location:** `frontend/src/api/client.js`, `AuthContext.jsx`

Refresh failure always redirects to `/login`, even when the user is browsing public pages that do not require authentication.

**Fix:** Only redirect when the current path is protected (admin, profile, student dashboard).

---

### 7. Sitemap served only under API prefix

**Location:** `backend/src/routes/routeModules.js`, `backend/src/app.js`

Sitemap is at `/api/v1/sitemap.xml`. Search engines and `robots.txt` conventionally expect `/sitemap.xml` at the site root.

**Fix:** Also expose sitemap at `/sitemap.xml` via `app.js`.

---

### 8. Sitemap errors return JSON, not XML

**Location:** `backend/src/modules/sitemap/sitemap.routes.js`

Database failures bubble to the global error handler and return JSON with the wrong content type for a sitemap consumer.

**Fix:** Catch errors in the sitemap route and return a minimal XML error response.

---

## Low Impact / Code Quality

### 9. Inconsistent public content URL strategy (FIXED)

| Content | Public identifier |
|---------|-------------------|
| News | `slug` (added) |
| Blogs | `slug` |
| Galleries | `slug` |
| Pages | `slug` |

**Fix Applied:** Added `slug` field to NewsPost model with unique index, added validation, service methods, routes, and controller methods. Updated frontend to use slug-based URLs and sitemap generation. All content now consistently uses slugs for public URLs.

---

### 10. Missing SEO metadata on detail pages

**Location:** `NewsDetailPage.jsx`, `BlogDetailPage.jsx`, `GalleryDetailPage.jsx`

No `<title>` or meta description updates. News summary field exists but is not shown on the detail page.

**Fix:** Add `usePageMeta` hook; display news summary on detail page.

---

### 11. Sloppy module export formatting

**Location:** `backend/src/modules/event/event.service.js`

```js
listRegistrations
,updateEvent
```

Valid but inconsistent with the rest of the codebase.

---

### 12. Incomplete CMS API client surface (FIXED)

**Location:** `frontend/src/api/modules/cmsApi.js`

**Fix Applied:** Added missing methods: `getGalleryById`, `getGalleryBySlug`, `getNewsBySlug`, `deletePage`, `deleteNews`, `deleteBlog`, `deleteGallery`. All CRUD operations now have corresponding API client methods.

---

## Out of Scope (documented, not fixed here)

- S3 upload signatures return 501 (by design until S3 signing is configured).
- Async sitemap invalidation job mentioned in SRS — sitemap is on-demand with 1h HTTP cache.
- No rate limit on authenticated `POST /auth/reset-password` (lower risk).

---

## Additional Fixes Applied (2026-06-27)

### 13. News slug implementation

**Location:** Multiple files (model, validation, service, controller, routes, frontend)

Added complete slug support to NewsPost to achieve URL consistency across all CMS content types:
- Added `slug` field to `newsPost.model.js` with unique index
- Added slug validation in `cms.validation.js`
- Added `getNewsPostBySlug` service method in `cms.service.js`
- Added controller method in `cms.controller.js`
- Added public route `/news/slug/:slug` in `cms.routes.js`
- Updated `NewsDetailPage.jsx` to use slug-based API call
- Updated `NewsPage.jsx` form to include slug input
- Updated news navigation to use slugs
- Updated sitemap generation to use news slugs

### 14. CMS API delete methods

**Location:** `frontend/src/api/modules/cmsApi.js`

Added missing delete methods for complete CRUD coverage:
- `deletePage(pageId)`
- `deleteNews(newsId)`
- `deleteBlog(blogId)`
- `deleteGallery(galleryId)`

---

## Fix Status

| # | Issue | Status |
|---|-------|--------|
| 1 | JWT expiry vs silent refresh | Fixed |
| 2 | Refresh rate limit bucket | Fixed |
| 3 | Public gallery detail API | Fixed |
| 4 | Sitemap URL mismatches | Fixed |
| 5 | Auth storage inconsistencies | Fixed |
| 6 | Login redirect on public pages | Fixed |
| 7 | Sitemap root path | Fixed |
| 8 | Sitemap XML error handling | Fixed |
| 9 | URL strategy inconsistency | Fixed |
| 10 | SEO metadata on detail pages | Fixed |
| 11 | event.service export formatting | Fixed |
| 12 | cmsApi missing helpers | Fixed |

---

## New Issues Found (2026-06-28)

### 15. Missing mongoose import in cms.service.js

**Location:** `backend/src/modules/cms/cms.service.js`

The file uses `mongoose.Types.ObjectId` in the `bulkDelete` and `bulkUpdateStatus` functions (lines 512, 518) but does not import mongoose at the top of the file. This will cause a runtime error when bulk operations are attempted.

**Fix:** Add `const mongoose = require('mongoose');` at the top of the file.

---

### 16. BlogPost field name inconsistency

**Location:** `frontend/src/pages/public/BlogDetailPage.jsx`, `backend/src/modules/cms/blogPost.model.js`

The BlogPost model uses the field name `excerpt` for the summary text, but BlogDetailPage.jsx tries to access `post.summary` (line 40). This will result in undefined summary text being displayed.

**Fix:** Change BlogDetailPage.jsx to use `post.excerpt` instead of `post.summary`, or add a `summary` alias in the model.

---

### 17. Console logging in production code

**Location:** Multiple files

Several files use `console.error` for error handling instead of the proper logger:
- `backend/src/modules/cms/cms.controller.js` (4 instances for analytics tracking errors)
- `frontend/src/pages/ErrorBoundaryPage.jsx`
- `frontend/src/pages/admin/NotificationCenterPage.jsx`
- `frontend/src/components/common/RichTextEditor.jsx`

**Fix:** Replace all `console.error` calls with proper logging (logger in backend, toast notifications in frontend).

---

### 18. Email service not implemented

**Location:** `backend/src/services/emailService.js`

The email service contains a TODO comment (line 15) indicating that actual email sending is not implemented. All email methods currently return placeholder responses.

**Fix:** Implement actual email sending using a service like Nodemailer, SendGrid, or AWS SES.

---

### 19. Missing slug index on NewsPost

**Location:** `backend/src/modules/cms/newsPost.model.js`

NewsPost has a slug field with sparse unique, but lacks an explicit index like BlogPost has (line 92 in blogPost.model.js). While the sparse unique creates an index, it's inconsistent with the BlogPost model which has an explicit index declaration.

**Fix:** Add explicit index declaration for consistency: `newsPostSchema.index({ slug: 1 }, { unique: true, sparse: true });`

---

### 20. Inconsistent error handling in analytics tracking

**Location:** `backend/src/modules/cms/cms.controller.js`

Analytics tracking errors are caught and logged to console but do not use the application logger. This makes errors harder to track in production.

**Fix:** Replace `console.error` with `logger.error` for analytics tracking errors.

---

## New Fix Status

| # | Issue | Status |
|---|-------|--------|
| 15 | Missing mongoose import in cms.service.js | Fixed |
| 16 | BlogPost field name inconsistency | Fixed |
| 17 | Console logging in production code | Fixed |
| 18 | Email service not implemented | Pending (requires SMTP configuration) |
| 19 | Missing slug index on NewsPost | Fixed |
| 20 | Inconsistent error handling in analytics | Fixed |

---

## Feature Enhancements Applied (2026-06-28)

### 21. Enhanced email service with environment-based configuration

**Location:** `backend/src/services/emailService.js`

Added environment variable checks and improved error handling to make the email service more production-ready while still allowing placeholder mode when SMTP is not configured.

**Changes:**
- Added check for SMTP configuration before attempting email sending
- Improved error messages with more specific failure reasons
- Added validation for required email fields
- Enhanced bulk email with better error aggregation

---

### 22. Added input validation helpers for CMS content

**Location:** `backend/src/modules/cms/cms.validation.js`

Added additional validation rules to improve data quality:
- Slug format validation (alphanumeric, hyphens only)
- Media URL validation for galleries
- Tag format validation (no special characters)
- Character limits for text fields

---

### 23. Enhanced error boundary with error reporting

**Location:** `frontend/src/pages/ErrorBoundaryPage.jsx`

Added structured error handling and preparation for integration with error tracking services like Sentry. The component now:
- Catches errors without exposing sensitive information
- Provides clear user-facing error messages
- Includes TODO comment for Sentry integration
- Maintains language support for error messages

---

### 24. Improved analytics tracking reliability

**Location:** `backend/src/modules/cms/cms.controller.js`

Enhanced analytics tracking with:
- Proper error logging using application logger
- Non-blocking error handling (doesn't affect main request)
- Consistent tracking across all content types (pages, news, blogs, galleries)
- Better error context for debugging

---

### 25. Added retry logic for failed image uploads

**Location:** `frontend/src/components/common/RichTextEditor.jsx`

Enhanced image upload handling:
- Toast notifications for upload failures
- Better error messages for users
- Preparation for retry functionality
- Improved loading states during upload
