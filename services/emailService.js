const config = require('../config');
const EmailLog = require('../models/EmailLog');
const {
  invitationTemplate,
  registrationConfirmationTemplate,
  reminderTemplate,
  thankYouTemplate,
  emailVerificationTemplate,
  passwordResetTemplate,
} = require('./emailTemplates');

const BREVO_API_URL = 'https://api.brevo.com/v3/smtp/email';

const sendEmail = async ({ to, subject, htmlContent, attachments = [] }) => {
  if (!config.brevo.apiKey) {
    console.warn('Brevo API key not configured, email not sent');
    return { success: false, error: 'Email service not configured' };
  }

  try {
    const payload = {
      sender: {
        name: config.brevo.senderName,
        email: config.brevo.senderEmail,
      },
      to: [{ email: to }],
      subject,
      htmlContent,
    };

    if (attachments.length > 0) {
      payload.attachment = attachments;
    }

    const response = await fetch(BREVO_API_URL, {
      method: 'POST',
      headers: {
        'api-key': config.brevo.apiKey,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `Brevo API error: ${response.status}`);
    }

    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

const logEmail = async (attendeeId, eventId, emailType, status, errorMessage = '') => {
  try {
    await EmailLog.create({
      attendeeId,
      eventId,
      emailType,
      status,
      errorMessage,
      sentAt: new Date(),
    });
  } catch (error) {
    console.error('Email log failed:', error.message);
  }
};

const sendInvitationEmail = async (attendee, event, registrationUrl, _qrImageUrl, qrDataUrl) => {
  const attachments = [];

  if (typeof qrDataUrl === 'string' && qrDataUrl.startsWith('data:image/png;base64,')) {
    const base64 = qrDataUrl.replace('data:image/png;base64,', '');
    attachments.push({
      name: `qr-${attendee._id}.png`,
      content: base64,
    });
  }

  const result = await sendEmail({
    to: attendee.email,
    subject: `You're invited — ${event.name}`,
    htmlContent: invitationTemplate(attendee, event, registrationUrl),
    attachments,
  });
  await logEmail(
    attendee._id,
    event._id,
    'invitation',
    result.success ? 'sent' : 'failed',
    result.error || ''
  );
  return result;
};

const sendRegistrationConfirmation = async (attendee, event) => {
  const result = await sendEmail({
    to: attendee.email,
    subject: `Registration confirmed — ${event.name}`,
    htmlContent: registrationConfirmationTemplate(attendee, event),
  });
  await logEmail(
    attendee._id,
    event._id,
    'registration_confirmation',
    result.success ? 'sent' : 'failed',
    result.error || ''
  );
  return result;
};

const sendReminderEmail = async (attendee, event) => {
  const result = await sendEmail({
    to: attendee.email,
    subject: `Reminder — ${event.name}`,
    htmlContent: reminderTemplate(attendee, event),
  });
  await logEmail(
    attendee._id,
    event._id,
    'reminder',
    result.success ? 'sent' : 'failed',
    result.error || ''
  );
  return result;
};

const sendThankYouEmail = async (attendee, event) => {
  const result = await sendEmail({
    to: attendee.email,
    subject: `Thank you for attending — ${event.name}`,
    htmlContent: thankYouTemplate(attendee, event),
  });
  await logEmail(
    attendee._id,
    event._id,
    'thank_you',
    result.success ? 'sent' : 'failed',
    result.error || ''
  );
  return result;
};

const sendEmailVerification = async (user, verificationUrl) => {
  const result = await sendEmail({
    to: user.email,
    subject: 'Verify your EventHub email',
    htmlContent: emailVerificationTemplate(user, verificationUrl),
  });
  return result;
};

const sendPasswordResetEmail = async (email, resetUrl) => {
  const result = await sendEmail({
    to: email,
    subject: 'Reset your EventHub password',
    htmlContent: passwordResetTemplate(resetUrl),
  });
  return result;
};

module.exports = {
  sendEmail,
  sendInvitationEmail,
  sendRegistrationConfirmation,
  sendReminderEmail,
  sendThankYouEmail,
  sendEmailVerification,
  sendPasswordResetEmail,
  logEmail,
};
