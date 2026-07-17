// Branded, self-contained HTML email layout. All styles are inlined because
// email clients strip <style> blocks and never load external CSS. The palette
// mirrors the frontend Cardinal Red theme so mail feels part of the product.

const BRAND = {
  primary: '#8c1515',
  primaryDark: '#6f1010',
  ink: '#1f2933',
  muted: '#6b7280',
  border: '#e5e2e1',
  bg: '#f4f2f1',
  department: 'Digital Department Hub',
  faculty: 'Department of Computer Science & Engineering'
};

const escapeHtml = (value) =>
  String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

/**
 * Wrap message content in the branded shell.
 *
 * @param {Object} options
 * @param {string} options.title       Headline shown at the top of the card.
 * @param {string} [options.intro]     Lead paragraph (plain text).
 * @param {string} [options.bodyHtml]  Extra HTML placed after the intro.
 * @param {{label:string,url:string}} [options.cta] Optional call-to-action button.
 * @param {string} [options.footerNote] Small print above the standard footer.
 * @returns {string} Full HTML document.
 */
const renderBrandedEmail = ({ title, intro, bodyHtml = '', cta, footerNote }) => {
  const ctaBlock = cta
    ? `<tr><td style="padding:8px 0 4px;">
         <a href="${escapeHtml(cta.url)}"
            style="display:inline-block;background:${BRAND.primary};color:#ffffff;
                   text-decoration:none;font-weight:600;font-size:15px;
                   padding:12px 22px;border-radius:8px;">${escapeHtml(cta.label)}</a>
       </td></tr>`
    : '';

  const introBlock = intro
    ? `<tr><td style="font-size:15px;line-height:1.6;color:${BRAND.ink};padding-bottom:12px;">
         ${escapeHtml(intro)}
       </td></tr>`
    : '';

  const footerNoteBlock = footerNote
    ? `<p style="margin:0 0 8px;font-size:12px;line-height:1.5;color:${BRAND.muted};">
         ${escapeHtml(footerNote)}
       </p>`
    : '';

  return `<!doctype html>
<html>
  <body style="margin:0;padding:0;background:${BRAND.bg};font-family:Georgia,'Times New Roman',serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${BRAND.bg};padding:24px 0;">
      <tr>
        <td align="center">
          <table role="presentation" width="600" cellpadding="0" cellspacing="0"
                 style="max-width:600px;width:100%;background:#ffffff;border:1px solid ${BRAND.border};
                        border-radius:12px;overflow:hidden;">
            <tr>
              <td style="background:${BRAND.primary};padding:22px 28px;">
                <div style="color:#ffffff;font-size:18px;font-weight:700;letter-spacing:0.3px;">
                  ${escapeHtml(BRAND.department)}
                </div>
                <div style="color:#f3d9d9;font-size:12px;margin-top:2px;">
                  ${escapeHtml(BRAND.faculty)}
                </div>
              </td>
            </tr>
            <tr>
              <td style="padding:28px;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="font-size:20px;font-weight:700;color:${BRAND.primaryDark};padding-bottom:14px;">
                      ${escapeHtml(title)}
                    </td>
                  </tr>
                  ${introBlock}
                  <tr><td style="font-size:15px;line-height:1.6;color:${BRAND.ink};">${bodyHtml}</td></tr>
                  ${ctaBlock}
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:18px 28px 24px;border-top:1px solid ${BRAND.border};">
                ${footerNoteBlock}
                <p style="margin:0;font-size:12px;line-height:1.5;color:${BRAND.muted};">
                  This is an automated message from ${escapeHtml(BRAND.department)}.
                  Please do not reply to this email.
                </p>
              </td>
            </tr>
          </table>
          <div style="color:${BRAND.muted};font-size:11px;margin-top:14px;font-family:Arial,sans-serif;">
            &copy; ${new Date().getFullYear()} ${escapeHtml(BRAND.department)}
          </div>
        </td>
      </tr>
    </table>
  </body>
</html>`;
};

// Best-effort plain-text alternative so non-HTML clients still get a readable body.
const htmlToText = (html) =>
  String(html)
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<a[^>]*href="([^"]*)"[^>]*>(.*?)<\/a>/gi, '$2 ($1)')
    .replace(/<\/(p|div|tr|h[1-6]|li)>/gi, '\n')
    .replace(/<br\s*\/?>(?=)/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&nbsp;/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .split('\n')
    .map((line) => line.trim())
    .join('\n')
    .trim();

module.exports = { renderBrandedEmail, htmlToText, BRAND };
