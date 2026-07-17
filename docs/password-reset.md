# Password Reset (Forgot Password) — FR-PA-047

A public, token-based password-reset flow: a user who is **locked out** can request a
reset link by email, then set a new password without being signed in.

This replaces the previous dead-end "Forgot password?" link (it pointed at `/contact`)
and complements — does **not** replace — the existing authenticated *change password*
endpoint (`POST /auth/reset-password`), which still requires the current password.

---

## How it works (flow)

```
User → /forgot-password → enter email
     → backend issues a one-hour token, emails a link:
       https://<frontend>/reset-password?token=<raw-token>
User → opens link → /reset-password → sets a new password
     → all existing sessions are revoked → sign in with the new password
```

Two steps, two endpoints:

| Step | Endpoint | Auth | Body | Response |
|------|----------|------|------|----------|
| 1. Request link | `POST /api/v1/auth/password/forgot` | public | `{ "email": "user@example.com" }` | `200 { "message": "If an account exists…" }` |
| 2. Set new password | `POST /api/v1/auth/password/reset` | public | `{ "token": "<raw>", "newPassword": "min 8 chars" }` | `200 { "message": "Password has been reset…" }` / `400` if invalid or expired |

Both endpoints are behind the existing `authLimiter` rate limiter.

---

## How to use it

### As an end user
1. On the **Sign In** page, click **Forgot password?**.
2. Enter your account email and submit. You always see the same confirmation
   (whether or not the email has an account — this is intentional, see Security).
3. Open the reset link from the email. It lands on `/reset-password?token=…`.
4. Enter and confirm a new password (min 8 characters) and submit.
5. Sign in with the new password. Any other active sessions were signed out.

### In local development (no real email provider)
Email sending is a **placeholder** — `src/services/emailService.js` logs instead of
sending. So in dev the full reset link is printed to the backend logs (this line is
emitted only when `NODE_ENV !== 'production'`):

```
[EMAIL:dev] Password reset link: http://localhost:5173/reset-password?token=<raw-token>
```

Open that URL in the browser (or copy the token onto `/reset-password?token=<raw-token>`).
The dev link line is suppressed in production so live reset links never land in logs.

### Enabling real email delivery (Gmail example)

`EmailService.sendEmail` uses **nodemailer** over SMTP when `SMTP_USER` and `SMTP_PASS`
are set; without them it falls back to the log placeholder above. To send real mail via
Gmail:

1. Turn on **2-Step Verification** on the Google account.
2. Create an **App Password**: Google Account → Security → App passwords → generate a
   16-character password (Gmail rejects your normal password over SMTP).
3. Add to `backend/.env` (host/port/secure already default to Gmail, so the last three
   are the essentials):

   ```env
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_SECURE=false
   SMTP_USER=your-gmail@gmail.com
   SMTP_PASS=your-16-char-app-password
   EMAIL_FROM=your-gmail@gmail.com
   ```

   > Set `EMAIL_FROM` to the **same** Gmail address as `SMTP_USER` — Gmail won't send
   > "from" an address you don't own.

4. Restart the backend. The reset email now arrives in the recipient's inbox; the
   console shows `[EMAIL] Sent to … (messageId: …)` instead of the placeholder line.

Any SMTP provider works — just point `SMTP_HOST`/`SMTP_PORT`/`SMTP_SECURE` at it
(e.g. `587` + `SMTP_SECURE=false` for STARTTLS, or `465` + `SMTP_SECURE=true` for SSL).

> Note: the reset link is built from `FRONTEND_URL`. That variable can be a
> comma-separated CORS allowlist; the email service uses the **first** origin.

---

## Files changed

### Backend (`backend/src`)
- **`modules/auth/user.model.js`** — added `passwordResetTokenHash` and
  `passwordResetExpires` (both `select: false`). Only the **hash** of the token is
  stored, never the raw token.
- **`modules/auth/auth.service.js`** — added:
  - `requestPasswordReset({ email })` — issues a random 32-byte token, stores its
    SHA-256 hash + a 1-hour expiry, emails the raw token. Returns a generic message.
  - `confirmPasswordReset({ token, newPassword })` — looks the user up by token hash
    with a non-expired `passwordResetExpires`, re-hashes the new password, clears the
    reset fields, and revokes all refresh tokens.
- **`modules/auth/auth.controller.js`** — `forgotPassword`, `confirmPasswordReset`.
- **`modules/auth/auth.validation.js`** — Joi schemas `forgotPassword`,
  `confirmPasswordReset`.
- **`modules/auth/auth.routes.js`** — `POST /password/forgot`, `POST /password/reset`
  (public, rate-limited).
- **`services/emailService.js`** — hardened the existing `sendPasswordResetEmail` link
  builder to use the first origin when `FRONTEND_URL` is a comma-separated list, and (in
  non-production only) log the reset link so the dev placeholder mailer is usable.

### Frontend (`frontend/src`)
- **`api/modules/authApi.js`** — `forgotPassword(email)`, `resetPassword({ token, newPassword })`.
- **`pages/auth/ForgotPasswordPage.jsx`** — email request form (new).
- **`pages/auth/ResetPasswordPage.jsx`** — new-password form; reads `?token=` from the URL (new).
- **`routes/AppRouter.jsx`** — routes `/forgot-password` and `/reset-password`.
- **`pages/auth/LoginPage.jsx`** — "Forgot password?" now links to `/forgot-password`.

### Tests
- **`backend/tests/modules/passwordReset.test.js`** — DB-free unit tests (mocked
  models + email) covering token issuance, enumeration protection, deactivated-account
  skip, successful reset + session revocation, and invalid/expired-token rejection.

---

## Security notes (why it's built this way)

- **No user enumeration.** `POST /password/forgot` returns the *same* response for
  existing and non-existing emails, and never surfaces email-delivery errors.
- **Token at rest is a hash.** The DB stores `sha256(token)`; the raw token exists only
  in the emailed link. A database leak cannot be used to reset anyone's password.
- **Time-limited.** Tokens expire one hour after issue (`PASSWORD_RESET_TTL_MS`).
- **Single use in effect.** On success the reset fields are cleared, so the link can't
  be replayed.
- **Session invalidation.** All of the user's refresh tokens are revoked on reset, so a
  stolen-then-reset account boots any attacker sessions.
- **Rate limited.** Both endpoints sit behind `authLimiter`.

---

## Try it with curl (backend running on :5000)

```bash
# 1. Request a link (check backend logs for the token)
curl -s -X POST http://localhost:5000/api/v1/auth/password/forgot \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@example.com"}'

# 2. Reset using the token from the logged link
curl -s -X POST http://localhost:5000/api/v1/auth/password/reset \
  -H 'Content-Type: application/json' \
  -d '{"token":"<raw-token-from-logs>","newPassword":"NewPassw0rd"}'
```

## Run the tests

```bash
cd backend
npx jest tests/modules/passwordReset.test.js
```
