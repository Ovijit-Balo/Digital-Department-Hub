# Branded HTML Email Templates

All transactional emails (welcome, password reset, event/booking/scholarship
notifications, new-content alerts) now render inside a **single branded HTML
shell** instead of raw `<h2>`/`<p>` fragments — a Cardinal Red header with the
department name, a white content card, an optional call-to-action button, and a
footer. Every message also ships a **plain-text alternative** for non-HTML
clients.

---

## How it works

A reusable template builder wraps message content:

```js
const { renderBrandedEmail, htmlToText } = require('../utils/emailTemplate');

const html = renderBrandedEmail({
  title: 'Password Reset',
  intro: 'You requested a password reset…',
  bodyHtml: '<p>This link expires in 1 hour.</p>',
  cta: { label: 'Reset Password', url: resetUrl },
  footerNote: 'If you did not request this, ignore this email.'
});
```

- **All styles are inlined** — email clients strip `<style>` blocks and never
  load external CSS. The palette mirrors the frontend Cardinal Red theme.
- **User-supplied values are HTML-escaped** to avoid broken/injected markup.
- `EmailService.sendEmail` now **auto-derives a plain-text body** from the HTML
  when one isn't supplied (`htmlToText`), improving deliverability.

Delivery itself is unchanged: real SMTP when `SMTP_USER`/`SMTP_PASS` are set,
otherwise the dev log placeholder (see [`password-reset.md`](./password-reset.md)).

---

## Files changed / added

- **`src/utils/emailTemplate.js`** *(new)* — `renderBrandedEmail(options)`,
  `htmlToText(html)`, and the `BRAND` palette/labels.
- **`src/services/emailService.js`** — every builder
  (`sendWelcomeEmail`, `sendScholarshipReminder`,
  `sendEventRegistrationConfirmation`, `sendEventReminder`,
  `sendNewContentNotification`, `sendBookingConfirmation`,
  `sendPasswordResetEmail`) now composes via `renderBrandedEmail` and passes a
  plain-text alternative; `sendEmail` derives text from HTML when missing.

No API, route, or env changes. To rebrand, edit `BRAND` in `emailTemplate.js`.

---

## Verifying
With SMTP configured, trigger any email (e.g. request a password reset) and
confirm the received message shows the Cardinal header, card, and button. In
dev without SMTP, the mailer logs `[EMAIL] To: …` and the reset link line — the
HTML is still generated and passed to the transport.
