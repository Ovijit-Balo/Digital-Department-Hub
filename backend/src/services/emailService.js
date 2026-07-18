const nodemailer = require('nodemailer');
const logger = require('../config/logger');
const env = require('../config/env');
const { renderBrandedEmail, htmlToText } = require('../utils/emailTemplate');

// Real SMTP delivery is only enabled when credentials are configured. Without
// them the service falls back to logging (dev placeholder) so nothing breaks.
const isSmtpConfigured = () => Boolean(env.SMTP_USER && env.SMTP_PASS);

let cachedTransporter = null;
const getTransporter = () => {
  if (!cachedTransporter) {
    cachedTransporter = nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: env.SMTP_SECURE, // true for 465, false for 587 (STARTTLS)
      auth: { user: env.SMTP_USER, pass: env.SMTP_PASS }
    });
  }
  return cachedTransporter;
};

// Compose a branded HTML message plus a plain-text alternative in one step.
const buildMessage = (options) => {
  const html = renderBrandedEmail(options);
  return { html, text: htmlToText(html) };
};

class EmailService {
  /**
   * Send an email. Uses SMTP (nodemailer) when SMTP_USER/SMTP_PASS are set;
   * otherwise logs the message (development placeholder). When only HTML is
   * supplied a plain-text alternative is derived automatically.
   */
  static async sendEmail(options) {
    const { to, subject, html } = options;
    const text = options.text || (html ? htmlToText(html) : undefined);

    if (!isSmtpConfigured()) {
      // Placeholder path — no provider configured.
      logger.info(`[EMAIL] To: ${to}, Subject: ${subject}`);
      return { success: true, messageId: `placeholder-${Date.now()}` };
    }

    const info = await getTransporter().sendMail({
      from: env.EMAIL_FROM,
      to,
      subject,
      html,
      text
    });
    logger.info(`[EMAIL] Sent to ${to} (messageId: ${info.messageId})`);
    return { success: true, messageId: info.messageId };
  }

  /**
   * Send welcome email to new user
   */
  static async sendWelcomeEmail(user) {
    const subject = 'Welcome to Digital Department Hub';
    const { html, text } = buildMessage({
      title: `Welcome, ${user.name}!`,
      intro: 'Your account has been successfully created.',
      bodyHtml:
        '<p style="margin:0 0 12px;">You can now access all features of the Digital Department Hub — news, scholarships, events, and campus services.</p>' +
        '<p style="margin:0;">If you have any questions, feel free to contact the department office.</p>',
      cta: { label: 'Go to the Hub', url: String(env.FRONTEND_URL).split(',')[0].trim() }
    });

    return this.sendEmail({ to: user.email, subject, html, text });
  }

  /**
   * Send scholarship deadline reminder
   */
  static async sendScholarshipReminder(scholarship, userEmail) {
    const subject = `Scholarship Deadline Reminder: ${scholarship.title}`;
    const { html, text } = buildMessage({
      title: 'Scholarship Deadline Reminder',
      intro: `The scholarship "${scholarship.title}" is due on ${scholarship.deadline}.`,
      bodyHtml:
        '<p style="margin:0;">Please ensure you submit your application before the deadline.</p>',
      cta: {
        label: 'View Scholarship',
        url: `${String(env.FRONTEND_URL).split(',')[0].trim()}/scholarship`
      }
    });

    return this.sendEmail({ to: userEmail, subject, html, text });
  }

  /**
   * Send event registration confirmation
   */
  static async sendEventRegistrationConfirmation(event, userEmail) {
    const subject = `Event Registration Confirmed: ${event.title}`;
    const { html, text } = buildMessage({
      title: 'Registration Confirmed',
      intro: `You have successfully registered for "${event.title}".`,
      bodyHtml:
        `<p style="margin:0 0 6px;"><strong>Date:</strong> ${event.date}</p>` +
        `<p style="margin:0;"><strong>Location:</strong> ${event.location}</p>`,
      cta: {
        label: 'View Event Details',
        url: `${String(env.FRONTEND_URL).split(',')[0].trim()}/events`
      }
    });

    return this.sendEmail({ to: userEmail, subject, html, text });
  }

  /**
   * Send event reminder
   */
  static async sendEventReminder(event, userEmail) {
    const subject = `Event Reminder: ${event.title}`;
    const { html, text } = buildMessage({
      title: 'Event Reminder',
      intro: `This is a reminder that "${event.title}" is coming up soon.`,
      bodyHtml:
        `<p style="margin:0 0 6px;"><strong>Date:</strong> ${event.date}</p>` +
        `<p style="margin:0;"><strong>Location:</strong> ${event.location}</p>`,
      cta: {
        label: 'View Event Details',
        url: `${String(env.FRONTEND_URL).split(',')[0].trim()}/events`
      }
    });

    return this.sendEmail({ to: userEmail, subject, html, text });
  }

  /**
   * Send new content notification
   */
  static async sendNewContentNotification(contentType, contentTitle, userEmail) {
    const subject = `New ${contentType}: ${contentTitle}`;
    const { html, text } = buildMessage({
      title: 'New Content Published',
      intro: `A new ${contentType} has been published: "${contentTitle}".`,
      cta: { label: 'View on the Hub', url: String(env.FRONTEND_URL).split(',')[0].trim() }
    });

    return this.sendEmail({ to: userEmail, subject, html, text });
  }

  /**
   * Send booking confirmation
   */
  static async sendBookingConfirmation(booking, userEmail) {
    const subject = 'Booking Confirmation';
    const { html, text } = buildMessage({
      title: 'Booking Confirmed',
      intro: 'Your venue booking has been confirmed.',
      bodyHtml:
        `<p style="margin:0 0 6px;"><strong>Date:</strong> ${booking.date}</p>` +
        `<p style="margin:0 0 6px;"><strong>Time:</strong> ${booking.time}</p>` +
        `<p style="margin:0;"><strong>Purpose:</strong> ${booking.purpose}</p>`
    });

    return this.sendEmail({ to: userEmail, subject, html, text });
  }

  /**
   * Send password reset email
   */
  static async sendPasswordResetEmail(email, resetToken) {
    // FRONTEND_URL may be a comma-separated CORS allowlist; use the first origin.
    const frontendOrigin = String(env.FRONTEND_URL).split(',')[0].trim().replace(/\/$/, '');
    const resetUrl = `${frontendOrigin}/reset-password?token=${resetToken}`;

    // Dev convenience: with the placeholder mailer there is no inbox, so surface
    // the reset link in the logs. Never do this in production (would leak live
    // reset links into log storage).
    if (env.NODE_ENV !== 'production') {
      logger.info(`[EMAIL:dev] Password reset link: ${resetUrl}`);
    }

    const subject = 'Password Reset Request';
    const { html, text } = buildMessage({
      title: 'Password Reset',
      intro: 'You requested a password reset. Use the button below to choose a new password.',
      bodyHtml:
        `<p style="margin:0 0 12px;">This link will expire in <strong>1 hour</strong>.</p>` +
        `<p style="margin:0;font-size:13px;color:#6b7280;">If the button does not work, copy and paste this URL into your browser:<br>${resetUrl}</p>`,
      cta: { label: 'Reset Password', url: resetUrl },
      footerNote: 'If you did not request this, you can safely ignore this email — your password will not change.'
    });

    return this.sendEmail({ to: email, subject, html, text });
  }

  /**
   * Send an account invitation email. The recipient uses the link to create
   * their own account, pre-assigned to the invited role(s).
   */
  static async sendInvitationEmail(email, inviteToken, roles = []) {
    // FRONTEND_URL may be a comma-separated CORS allowlist; use the first origin.
    const frontendOrigin = String(env.FRONTEND_URL).split(',')[0].trim().replace(/\/$/, '');
    const acceptUrl = `${frontendOrigin}/accept-invite?token=${inviteToken}`;
    const roleText = roles.length ? roles.join(', ') : 'member';

    // Dev convenience: surface the invite link in logs when there is no inbox.
    if (env.NODE_ENV !== 'production') {
      logger.info(`[EMAIL:dev] Invitation link: ${acceptUrl}`);
    }

    const subject = 'You have been invited to Digital Department Hub';
    const { html, text } = buildMessage({
      title: 'Account Invitation',
      intro: `You have been invited to join the Digital Department Hub as: ${roleText}.`,
      bodyHtml:
        '<p style="margin:0 0 12px;">Use the button below to set up your account — you will choose your own name and password.</p>' +
        `<p style="margin:0 0 12px;">This invitation will expire in <strong>72 hours</strong>.</p>` +
        `<p style="margin:0;font-size:13px;color:#6b7280;">If the button does not work, copy and paste this URL into your browser:<br>${acceptUrl}</p>`,
      cta: { label: 'Accept Invitation', url: acceptUrl },
      footerNote: 'If you were not expecting this invitation, you can safely ignore this email.'
    });

    return this.sendEmail({ to: email, subject, html, text });
  }

  /**
   * Acknowledge a contact inquiry to the person who submitted it, so they get
   * confirmation their message was received (not just a silent in-app record).
   */
  static async sendContactAcknowledgement(inquiry) {
    const subject = `We received your inquiry: ${inquiry.subject}`;
    const { html, text } = buildMessage({
      title: `Thanks for reaching out, ${inquiry.name}`,
      intro: 'Your message has reached the department office. We will get back to you soon.',
      bodyHtml:
        `<p style="margin:0 0 6px;"><strong>Subject:</strong> ${inquiry.subject}</p>` +
        `<p style="margin:0 0 12px;"><strong>Your message:</strong></p>` +
        `<p style="margin:0;white-space:pre-line;color:#374151;">${inquiry.message}</p>`,
      footerNote: 'This is an automated confirmation — there is no need to reply to this email.'
    });

    return this.sendEmail({ to: inquiry.email, subject, html, text });
  }

  /**
   * Alert a staff member by email that a new contact inquiry arrived, mirroring
   * the in-app notification so the desk is reachable even without the console.
   */
  static async sendContactAlert(inquiry, staffEmail) {
    const subject = `New contact inquiry: ${inquiry.subject}`;
    const { html, text } = buildMessage({
      title: 'New Contact Inquiry',
      intro: `${inquiry.name} (${inquiry.email}) submitted a new inquiry.`,
      bodyHtml:
        `<p style="margin:0 0 6px;"><strong>Subject:</strong> ${inquiry.subject}</p>` +
        `<p style="margin:0;white-space:pre-line;color:#374151;">${inquiry.message}</p>`,
      cta: {
        label: 'Open Contact Desk',
        url: `${String(env.FRONTEND_URL).split(',')[0].trim().replace(/\/$/, '')}/contact`
      }
    });

    return this.sendEmail({ to: staffEmail, subject, html, text });
  }

  /**
   * Send bulk email to multiple recipients
   */
  static async sendBulkEmail(recipients, subject, html) {
    const results = [];

    for (const recipient of recipients) {
      try {
        const result = await this.sendEmail({
          to: recipient.email,
          subject,
          html
        });
        results.push({ email: recipient.email, success: true, messageId: result.messageId });
      } catch (error) {
        logger.error(`Failed to send email to ${recipient.email}:`, error);
        results.push({ email: recipient.email, success: false, error: error.message });
      }
    }

    return results;
  }
}

module.exports = EmailService;
