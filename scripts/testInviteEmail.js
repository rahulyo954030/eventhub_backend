/* eslint-disable no-console */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const { invitationTemplate } = require('../services/emailTemplates');

const FAKE_QR = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

const attendee = { _id: 'testattendee123', fullName: 'Test Guest', email: 'test@example.com' };
const event = {
  _id: 'testevent123',
  name: 'Test Event',
  organizerName: 'EventHub',
  venue: 'Main Hall',
  eventDate: new Date('2026-12-30'),
};

const html = invitationTemplate(attendee, event, 'https://example.com/register/abc');

const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

assert(!html.includes('<img'), 'Template should not contain inline QR image');
assert(!html.includes('cid:'), 'Template should not reference CID inline images');
assert(!html.includes('YOUR CHECK-IN QR CODE'), 'Template should not show QR image section header');
assert(html.toLowerCase().includes('attached to this email'), 'Template should mention QR attachment');

let capturedPayload = null;
global.fetch = async (_url, options) => {
  capturedPayload = JSON.parse(options.body);
  return { ok: true, json: async () => ({}) };
};

delete require.cache[require.resolve('../services/emailService')];
const { sendInvitationEmail } = require('../services/emailService');

sendInvitationEmail(
  attendee,
  event,
  'https://example.com/register/abc',
  'https://ignored.example.com/qr',
  FAKE_QR
).then((result) => {
  assert(result.success, `sendInvitationEmail failed: ${result.error || 'unknown'}`);
  assert(capturedPayload, 'Brevo payload was not captured');
  assert(!capturedPayload.inlineImage, 'Payload should not include inlineImage');
  assert(Array.isArray(capturedPayload.attachment) && capturedPayload.attachment.length === 1, 'Payload should include one attachment');
  assert(capturedPayload.attachment[0].name === 'qr-testattendee123.png', 'Attachment filename mismatch');
  assert(capturedPayload.attachment[0].content, 'Attachment should include base64 content');
  assert(!capturedPayload.htmlContent.includes('<img'), 'Email HTML should not include img tag');

  console.log('INVITE_EMAIL_TEST_SUCCESS');
  console.log('- No inline QR image in template or payload');
  console.log('- QR PNG attachment included');
  process.exit(0);
}).catch((error) => {
  console.error('INVITE_EMAIL_TEST_FAILED:', error.message);
  process.exit(1);
});
