const BRAND = {
  name: 'EventHub',
  primary: '#2f7062',
  primaryLight: '#3d8b7a',
  primaryDark: '#1f3e38',
  ink: '#1a1816',
  muted: '#5c5650',
  faint: '#8a837b',
  surface: '#f4f1ec',
  card: '#ffffff',
  border: '#e3dfd8',
  reminder: '#c27803',
  success: '#2f7062',
  thankYou: '#5b4d8a',
};

const escapeHtml = (value) => {
  if (value === null || value === undefined) return '';
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
};

const formatDate = (date) =>
  new Date(date).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

const fontSans = "Helvetica,Arial,'Segoe UI',sans-serif";
const fontSerif = "Georgia,'Times New Roman',serif";

const preheader = (text) =>
  `<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;mso-hide:all;">${escapeHtml(text)}&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;</div>`;

const ctaButton = (href, label, variant = 'primary') => {
  const bg = variant === 'primary' ? BRAND.primary : BRAND.ink;
  return `
  <table role="presentation" cellpadding="0" cellspacing="0" style="margin:28px 0 4px;">
    <tr>
      <td style="border-radius:12px;background:${bg};box-shadow:0 4px 14px rgba(47,112,98,0.28);">
        <a href="${href}" style="display:inline-block;padding:15px 30px;font-family:${fontSans};font-size:14px;font-weight:700;color:#ffffff;text-decoration:none;border-radius:12px;letter-spacing:0.03em;">
          ${escapeHtml(label)} &rarr;
        </a>
      </td>
    </tr>
  </table>`;
};

const detailRow = (label, value) => {
  if (!value) return '';
  return `
    <tr>
      <td style="padding:11px 0;border-bottom:1px solid ${BRAND.border};font-family:${fontSans};font-size:11px;font-weight:700;color:${BRAND.faint};text-transform:uppercase;letter-spacing:0.1em;width:92px;vertical-align:top;">
        ${escapeHtml(label)}
      </td>
      <td style="padding:11px 0 11px 18px;border-bottom:1px solid ${BRAND.border};font-family:${fontSans};font-size:15px;line-height:1.5;color:${BRAND.ink};vertical-align:top;">
        ${escapeHtml(value)}
      </td>
    </tr>`;
};

const eventDetailsCard = (event, { showName = false, showDescription = false } = {}) => `
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:24px 0;background:${BRAND.surface};border:1px solid ${BRAND.border};border-radius:14px;overflow:hidden;">
    <tr>
      <td style="width:4px;background:${BRAND.primary};"></td>
      <td style="padding:22px 24px;">
        ${showName ? `<p style="margin:0 0 16px;font-family:${fontSerif};font-size:24px;font-weight:600;line-height:1.2;color:${BRAND.ink};letter-spacing:-0.03em;">${escapeHtml(event.name)}</p>` : ''}
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
          ${detailRow('Date', formatDate(event.eventDate))}
          ${detailRow('Time', event.eventTime)}
          ${detailRow('Venue', event.venue)}
        </table>
        ${showDescription && event.description ? `<p style="margin:18px 0 0;padding-top:16px;border-top:1px solid ${BRAND.border};font-family:${fontSans};font-size:14px;line-height:1.65;color:${BRAND.muted};">${escapeHtml(event.description)}</p>` : ''}
      </td>
    </tr>
  </table>`;

const highlightBox = (text, accent = BRAND.primary) => `
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:20px 0;">
    <tr>
      <td style="padding:16px 18px;background:rgba(47,112,98,0.08);border:1px solid rgba(47,112,98,0.16);border-radius:12px;font-family:${fontSans};font-size:14px;line-height:1.6;color:${BRAND.muted};">
        ${text}
      </td>
    </tr>
  </table>`;

const buildEmailLayout = ({ preheaderText, eyebrow, title, bodyHtml, headerTone = 'primary' }) => {
  const tones = {
    primary: { bg: BRAND.primaryDark, accent: BRAND.primaryLight },
    reminder: { bg: '#5c3d0d', accent: BRAND.reminder },
    success: { bg: '#1a3d36', accent: '#5da896' },
    thankYou: { bg: '#2e2648', accent: '#8b7cb8' },
  };
  const tone = tones[headerTone] || tones.primary;

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="color-scheme" content="light" />
  <meta name="supported-color-schemes" content="light" />
  <title>${escapeHtml(title)}</title>
</head>
<body style="margin:0;padding:0;background:${BRAND.surface};-webkit-font-smoothing:antialiased;">
  ${preheader(preheaderText || title)}
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${BRAND.surface};padding:36px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:580px;">
          <tr>
            <td style="padding:0 0 22px;text-align:center;">
              <table role="presentation" cellpadding="0" cellspacing="0" align="center">
                <tr>
                  <td style="width:36px;height:36px;border-radius:10px;background:${BRAND.primary};text-align:center;vertical-align:middle;font-family:${fontSerif};font-size:18px;font-weight:700;color:#fff;line-height:36px;">E</td>
                  <td style="padding-left:10px;font-family:${fontSerif};font-size:21px;font-weight:600;color:${BRAND.ink};letter-spacing:-0.02em;vertical-align:middle;">${BRAND.name}</td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="background:${BRAND.card};border:1px solid ${BRAND.border};border-radius:18px;overflow:hidden;box-shadow:0 10px 40px rgba(26,24,22,0.08);">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="background:${tone.bg};padding:32px 34px 28px;">
                    <p style="margin:0 0 10px;font-family:${fontSans};font-size:11px;font-weight:700;color:rgba(255,255,255,0.7);text-transform:uppercase;letter-spacing:0.2em;">
                      ${escapeHtml(eyebrow)}
                    </p>
                    <h1 style="margin:0;font-family:${fontSerif};font-size:30px;font-weight:600;line-height:1.15;color:#ffffff;letter-spacing:-0.03em;">
                      ${escapeHtml(title)}
                    </h1>
                    <div style="margin-top:18px;width:48px;height:3px;background:${tone.accent};border-radius:99px;"></div>
                  </td>
                </tr>
                <tr>
                  <td style="padding:34px 34px 30px;">
                    ${bodyHtml}
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:26px 10px 0;text-align:center;">
              <p style="margin:0 0 6px;font-family:${fontSans};font-size:12px;font-weight:600;color:${BRAND.faint};letter-spacing:0.04em;">
                ${BRAND.name}
              </p>
              <p style="margin:0;font-family:${fontSans};font-size:12px;line-height:1.6;color:${BRAND.faint};">
                Event registration, QR check-in &amp; attendance reports
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
};

const paragraph = (text) =>
  `<p style="margin:0 0 16px;font-family:${fontSans};font-size:15px;line-height:1.7;color:${BRAND.muted};">${text}</p>`;

const greeting = (name) => paragraph(`Dear <strong style="color:${BRAND.ink};font-weight:600;">${escapeHtml(name)}</strong>,`);

const signOff = (name) =>
  `<p style="margin:28px 0 0;padding-top:20px;border-top:1px solid ${BRAND.border};font-family:${fontSans};font-size:15px;line-height:1.65;color:${BRAND.muted};">Warm regards,<br/><strong style="color:${BRAND.ink};font-weight:600;">${escapeHtml(name)}</strong></p>`;

const invitationTemplate = (attendee, event, registrationUrl) =>
  buildEmailLayout({
    preheaderText: `You're invited to ${event.name}. Confirm your spot and get your QR code.`,
    eyebrow: "You're invited",
    title: 'We would love to see you there',
    headerTone: 'primary',
    bodyHtml: `
      ${greeting(attendee.fullName)}
      ${paragraph('You have been invited to join us. Review the event details below and confirm your attendance to receive your personal check-in QR code.')}
      ${eventDetailsCard(event, { showName: true, showDescription: true })}
      ${ctaButton(registrationUrl, 'Confirm my registration')}
      ${highlightBox('Your check-in QR code is attached to this email. Open the attachment on your phone and show it at the venue entrance.')}
      ${signOff(event.organizerName)}
    `,
  });

const registrationConfirmationTemplate = (attendee, event) =>
  buildEmailLayout({
    preheaderText: `You're confirmed for ${event.name}. See you there!`,
    eyebrow: 'Registration confirmed',
    title: "You're officially on the guest list",
    headerTone: 'success',
    bodyHtml: `
      ${greeting(attendee.fullName)}
      ${paragraph(`Great news — your registration for <strong style="color:${BRAND.ink};font-weight:600;">${escapeHtml(event.name)}</strong> is confirmed.`)}
      ${highlightBox('<strong style="color:' + BRAND.ink + ';">✓ Confirmed</strong> — We have saved your details and you are ready for check-in.')}
      ${eventDetailsCard(event)}
      ${paragraph('Please keep your QR code handy. Show it at the entrance for a fast, contactless check-in.')}
      ${signOff(event.organizerName)}
    `,
  });

const reminderTemplate = (attendee, event) =>
  buildEmailLayout({
    preheaderText: `Reminder: ${event.name} is coming up soon.`,
    eyebrow: 'Event reminder',
    title: 'Your event is almost here',
    headerTone: 'reminder',
    bodyHtml: `
      ${greeting(attendee.fullName)}
      ${paragraph(`Just a friendly reminder that <strong style="color:${BRAND.ink};font-weight:600;">${escapeHtml(event.name)}</strong> is around the corner.`)}
      ${highlightBox(`<strong style="color:${BRAND.ink};">${escapeHtml(formatDate(event.eventDate))}</strong> at <strong style="color:${BRAND.ink};">${escapeHtml(event.eventTime)}</strong>`)}
      ${eventDetailsCard(event)}
      ${paragraph('Bring your QR code — it makes check-in quick and smooth at the door.')}
      ${paragraph('We look forward to welcoming you.')}
    `,
  });

const thankYouTemplate = (attendee, event) =>
  buildEmailLayout({
    preheaderText: `Thank you for attending ${event.name}.`,
    eyebrow: 'Thank you',
    title: 'It was wonderful having you',
    headerTone: 'thankYou',
    bodyHtml: `
      ${greeting(attendee.fullName)}
      ${paragraph(`Thank you for being part of <strong style="color:${BRAND.ink};font-weight:600;">${escapeHtml(event.name)}</strong>.`)}
      ${highlightBox('Your participation made a real difference. We hope you enjoyed the experience as much as we enjoyed hosting you.')}
      ${paragraph('We would love to see you again at our future events. Stay tuned for upcoming invitations.')}
      ${signOff(event.organizerName)}
    `,
  });

const emailVerificationTemplate = (user, verificationUrl) =>
  buildEmailLayout({
    preheaderText: 'Verify your email to activate your EventHub account.',
    eyebrow: 'Account setup',
    title: 'Confirm your email address',
    headerTone: 'primary',
    bodyHtml: `
      ${paragraph(`Hi <strong style="color:${BRAND.ink};font-weight:600;">${escapeHtml(user.name || 'there')}</strong>,`)}
      ${paragraph(`Welcome to <strong style="color:${BRAND.ink};font-weight:600;">${BRAND.name}</strong>. Verify your email to activate your account and start managing events.`)}
      ${ctaButton(verificationUrl, 'Verify email address')}
      <p style="margin:20px 0 8px;font-family:${fontSans};font-size:13px;line-height:1.6;color:${BRAND.faint};">
        Or paste this link into your browser:
      </p>
      <p style="margin:0 0 16px;padding:12px 14px;background:${BRAND.surface};border:1px solid ${BRAND.border};border-radius:10px;font-family:${fontSans};font-size:12px;line-height:1.5;word-break:break-all;">
        <a href="${verificationUrl}" style="color:${BRAND.primary};text-decoration:none;font-weight:600;">${verificationUrl}</a>
      </p>
      ${paragraph('<span style="font-size:13px;color:' + BRAND.faint + ';">This link expires in 24 hours.</span>')}
    `,
  });

const passwordResetTemplate = (resetUrl) =>
  buildEmailLayout({
    preheaderText: 'Reset your EventHub password securely.',
    eyebrow: 'Security',
    title: 'Reset your password',
    headerTone: 'primary',
    bodyHtml: `
      ${paragraph('We received a request to reset the password for your EventHub account. Click below to choose a new password.')}
      ${ctaButton(resetUrl, 'Create new password')}
      <p style="margin:20px 0 8px;font-family:${fontSans};font-size:13px;line-height:1.6;color:${BRAND.faint};">
        Or paste this link into your browser:
      </p>
      <p style="margin:0 0 16px;padding:12px 14px;background:${BRAND.surface};border:1px solid ${BRAND.border};border-radius:10px;font-family:${fontSans};font-size:12px;line-height:1.5;word-break:break-all;">
        <a href="${resetUrl}" style="color:${BRAND.primary};text-decoration:none;font-weight:600;">${resetUrl}</a>
      </p>
      ${paragraph('<span style="font-size:13px;color:' + BRAND.faint + ';">This link expires in 1 hour. If you did not request a reset, you can safely ignore this email.</span>')}
    `,
  });

module.exports = {
  invitationTemplate,
  registrationConfirmationTemplate,
  reminderTemplate,
  thankYouTemplate,
  emailVerificationTemplate,
  passwordResetTemplate,
  escapeHtml,
};
