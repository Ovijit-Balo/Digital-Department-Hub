# Deployment Checklist — Environment Configuration

What to change when moving from local development to a deployed (production)
environment. Several values default to `localhost` for dev convenience; if they
are not updated, **password reset emails will contain broken links and users
will receive nothing**.

> Golden rule: set all of these as **real environment variables** in your host /
> platform dashboard (Render, Railway, Vercel, a VPS, Docker, etc.).
> **Never commit secrets to a `.env` file in git.**

---

## 1. Must change (or password reset breaks)

### `FRONTEND_URL` → your real frontend URL
The reset link emailed to users is built from this:
`${FRONTEND_URL}/reset-password?token=...`. If left as `http://localhost:5173`,
every link points at the user's own machine and is dead. It is also the CORS
allowlist.

```env
FRONTEND_URL=https://hub.cse.du.ac.bd
```
→ links become `https://hub.cse.du.ac.bd/reset-password?token=...` ✅

### SMTP credentials → real mail delivery
In production the dev "reset link in logs" line is suppressed, so if SMTP is not
configured, **users get no email at all**. Provide:

```env
SMTP_USER=cse.hub.noreply@gmail.com
SMTP_PASS=your-16-char-app-password
EMAIL_FROM=cse.hub.noreply@gmail.com
```

- `EMAIL_FROM` **must equal** `SMTP_USER` (Gmail won't send "from" an address you
  don't own).
- For higher volume/reliability than Gmail's daily limit, use a provider like
  **SendGrid / AWS SES / Mailgun** — same variables, just change `SMTP_HOST`
  (and `SMTP_PORT` / `SMTP_SECURE`).
- See [`password-reset.md`](./password-reset.md) for the full email setup + Gmail
  App Password steps.

### `NODE_ENV=production`
Turns on two safety behaviors automatically:
- Suppresses the `[EMAIL:dev] Password reset link: …` log so live reset links
  never land in log storage.
- Refuses to boot if `JWT_SECRET` is still the development default (see below).

```env
NODE_ENV=production
```

### `JWT_SECRET` → a strong unique value
The app **throws on startup** in production if this is left as the dev default.
Generate one:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

```env
JWT_SECRET=<paste-the-long-random-string>
```

---

## 2. Likely needed

### `VITE_API_URL` — only if the API is on a different domain
The frontend calls `/api/v1` by default (same-origin — works when the frontend
and API sit behind one proxy/nginx). If the API lives on a separate domain, set
this **at build time** (it is baked into the frontend bundle):

```env
VITE_API_URL=https://api.hub.cse.du.ac.bd/api/v1
```

---

## 3. Already fine (no change from dev)

- **MongoDB** — already using Atlas (`cluster0.kx7vluo…`), so it carries over.
  Just confirm the production host's IP is allowed in Atlas network access.
- **Password-reset security** (token hashing, 1-hour expiry, single-use, session
  revocation, rate limiting) — all environment-independent.

---

## 4. Summary — production environment variables

```env
# --- required ---
NODE_ENV=production
FRONTEND_URL=https://your-frontend-domain
JWT_SECRET=<48-byte-random-hex>

# --- email (required for password reset delivery) ---
SMTP_USER=your-sender@gmail.com
SMTP_PASS=your-app-password
EMAIL_FROM=your-sender@gmail.com
# Optional overrides (default to Gmail): SMTP_HOST, SMTP_PORT, SMTP_SECURE

# --- only if the frontend is built/hosted separately from the API ---
VITE_API_URL=https://your-api-domain/api/v1
```

---

## 5. Post-deploy smoke test

1. Open the deployed site → **Sign In** → **Forgot password?**.
2. Enter a **real registered** account's email and submit.
3. Confirm the email arrives and the link is your **production** domain
   (`https://…/reset-password?token=…`), not localhost.
4. Open the link, set a new password, and sign in with it.
5. Backend log should show `[EMAIL] Sent to … (messageId: …)` — **not** the
   `[EMAIL:dev]` placeholder line (which confirms `NODE_ENV=production` + SMTP are
   both active).
