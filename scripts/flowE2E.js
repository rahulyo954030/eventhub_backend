/* eslint-disable no-console */
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const connectDB = require('../config/database');
const User = require('../models/User');
const authService = require('../services/authService');
const qrService = require('../services/qrService');

const API_BASE = 'http://localhost:5000/api';

const parseSetCookie = (headers) => {
  const setCookie = headers.get('set-cookie');
  if (!setCookie) return [];
  const raw = setCookie.split(/,(?=[^;]+=[^;]+)/g);
  return raw.map((c) => c.split(';')[0].trim()).filter(Boolean);
};

const createClient = () => {
  let cookieJar = '';

  const request = async (method, url, body, extraHeaders = {}) => {
    const headers = { ...extraHeaders };
    if (cookieJar) {
      headers.cookie = cookieJar;
    }

    const res = await fetch(url, { method, headers, body });
    const cookies = parseSetCookie(res.headers);
    if (cookies.length > 0) {
      const current = new Map();
      cookieJar.split('; ').filter(Boolean).forEach((pair) => {
        const [k, ...rest] = pair.split('=');
        current.set(k, rest.join('='));
      });
      cookies.forEach((pair) => {
        const [k, ...rest] = pair.split('=');
        current.set(k, rest.join('='));
      });
      cookieJar = Array.from(current.entries())
        .map(([k, v]) => `${k}=${v}`)
        .join('; ');
    }

    let data = null;
    const text = await res.text();
    if (text) {
      try {
        data = JSON.parse(text);
      } catch {
        data = text;
      }
    }

    return { ok: res.ok, status: res.status, data };
  };

  return {
    get: (url) => request('GET', url),
    postJson: (url, payload) =>
      request('POST', url, JSON.stringify(payload), { 'content-type': 'application/json' }),
    patch: (url) => request('PATCH', url),
    postForm: (url, form) => request('POST', url, form),
  };
};

const assertOk = (res, context) => {
  if (!res.ok) {
    throw new Error(`${context} failed (${res.status}): ${JSON.stringify(res.data)}`);
  }
  return res.data;
};

const main = async () => {
  const client = createClient();
  const suffix = Date.now();
  const email = `flowtest_${suffix}@example.com`;
  const password = 'Test@12345';

  console.log(`Using email: ${email}`);

  const register = await client.postJson(`${API_BASE}/auth/register`, {
    name: 'Flow Test User',
    email,
    password,
    confirmPassword: password,
    role: 'Admin',
  });
  assertOk(register, 'Register');
  console.log(`Register: ${register.data.message}`);

  const loginBeforeVerify = await client.postJson(`${API_BASE}/auth/login`, { email, password });
  if (loginBeforeVerify.ok) {
    throw new Error('Login succeeded before verification');
  }
  console.log('Login before verify blocked as expected');

  await connectDB();
  const user = await User.findOne({ email });
  if (!user) {
    throw new Error('User not found for verification token generation');
  }
  const verificationToken = await authService.generateEmailVerification(user);

  const verify = await client.postJson(`${API_BASE}/auth/verify-email`, { token: verificationToken });
  assertOk(verify, 'Verify email');
  console.log(`Verify email: ${verify.data.message}`);

  const login = await client.postJson(`${API_BASE}/auth/login`, { email, password });
  assertOk(login, 'Login');
  console.log(`Login after verify: ${login.data.message}`);

  let event = await client.postJson(`${API_BASE}/events`, {
    name: `Flow Event ${suffix}`,
    description: 'Automated flow test',
    venue: 'Main Hall',
    eventDate: '2026-12-30',
    eventTime: '10:00',
    organizerName: 'Flow QA',
    organizerEmail: email,
    status: 'draft',
  });

  if (!event.ok && event.status === 403) {
    console.log('Create event blocked by role; promoting test user to Admin for full-flow test');
    await User.updateOne({ email }, { $set: { role: 'Admin', active: true, emailVerified: true } });
    const relogin = await client.postJson(`${API_BASE}/auth/login`, { email, password });
    assertOk(relogin, 'Re-login after role promotion');
    event = await client.postJson(`${API_BASE}/events`, {
      name: `Flow Event ${suffix}`,
      description: 'Automated flow test',
      venue: 'Main Hall',
      eventDate: '2026-12-30',
      eventTime: '10:00',
      organizerName: 'Flow QA',
      organizerEmail: email,
      status: 'draft',
    });
  }

  const eventData = assertOk(event, 'Create event').data;
  const eventId = eventData._id;
  console.log(`Event created: ${eventId}`);

  assertOk(await client.patch(`${API_BASE}/events/${eventId}/publish`), 'Publish event');
  console.log('Event published');

  const attendee = assertOk(
    await client.postJson(`${API_BASE}/events/${eventId}/attendees`, {
      fullName: 'Guest One',
      email: `guest1_${suffix}@example.com`,
      mobile: '9999999999',
      company: 'Acme',
    }),
    'Create attendee'
  ).data;
  console.log(`Manual attendee created: ${attendee._id}`);

  const csvPath = path.join(process.cwd(), `tmp_flow_${suffix}.csv`);
  fs.writeFileSync(
    csvPath,
    `fullName,email,mobile,company\nBulk Guest,bulk_${suffix}@example.com,8888888888,Globex\n`,
    'utf8'
  );

  const csvBuffer = fs.readFileSync(csvPath);
  const form = new FormData();
  form.append('file', new Blob([csvBuffer], { type: 'text/csv' }), path.basename(csvPath));
  const bulk = assertOk(await client.postForm(`${API_BASE}/events/${eventId}/attendees/bulk-upload`, form), 'Bulk upload');
  console.log(`Bulk upload created=${bulk.data.created} duplicates=${bulk.data.duplicates}`);

  const attendeesList = assertOk(await client.get(`${API_BASE}/events/${eventId}/attendees`), 'Get attendees').data;
  const targetAttendee = attendeesList.find((a) => a._id === attendee._id);
  if (!targetAttendee) {
    throw new Error('Target attendee missing in attendee list');
  }
  if (!targetAttendee.registrationToken) {
    throw new Error('Attendee response missing registrationToken');
  }

  const attendeeDetails = assertOk(
    await client.get(`${API_BASE}/attendees/${targetAttendee._id}`),
    'Get attendee details'
  ).data;
  const attendeeQrToken = attendeeDetails.qrToken || targetAttendee.qrToken;
  if (!attendeeQrToken) {
    throw new Error('Attendee response missing qrToken');
  }

  assertOk(await client.get(`${API_BASE}/register/${targetAttendee.registrationToken}`), 'Get registration link');
  console.log('Registration page data fetched');

  assertOk(
    await client.postJson(`${API_BASE}/register/${targetAttendee.registrationToken}/confirm`, {
      fullName: 'Guest One Confirmed',
      email: targetAttendee.email,
      mobile: '9999999999',
      company: 'Acme Confirmed',
    }),
    'Confirm registration'
  );
  console.log('Registration confirmed');

  const qrPayload = JSON.stringify({
    data: qrService.generateQRData(targetAttendee._id, eventId, attendeeQrToken),
    v: 1,
  });
  const checkin = assertOk(await client.postJson(`${API_BASE}/checkin`, { qrData: qrPayload }), 'Check-in');
  console.log(`Check-in status: ${checkin.data.status}`);

  const bulkInvites = assertOk(
    await client.postJson(`${API_BASE}/events/${eventId}/attendees/send-invitations`),
    'Send bulk invitations'
  );
  console.log(`Bulk invites: sent=${bulkInvites.data.sent} failed=${bulkInvites.data.failed}`);

  const bulkReminders = assertOk(
    await client.postJson(`${API_BASE}/events/${eventId}/attendees/send-reminders`),
    'Send bulk reminders'
  );
  console.log(`Bulk reminders: sent=${bulkReminders.data.sent} failed=${bulkReminders.data.failed}`);

  const bulkThankYou = assertOk(
    await client.postJson(`${API_BASE}/events/${eventId}/attendees/send-thank-you`),
    'Send bulk thank-you'
  );
  console.log(`Bulk thank-you: sent=${bulkThankYou.data.sent} failed=${bulkThankYou.data.failed}`);

  const refresh = assertOk(await client.postJson(`${API_BASE}/auth/refresh`), 'Refresh token');
  console.log(`Token refresh: ${refresh.message}`);

  const validate = assertOk(await client.get(`${API_BASE}/auth/validate`), 'Validate session');
  if (!validate.data.valid) {
    throw new Error('Session validation failed after refresh');
  }
  console.log('Session validated after refresh');

  const dashboard = assertOk(await client.get(`${API_BASE}/dashboard`), 'Dashboard');
  console.log(`Dashboard fetched: totalEvents=${dashboard.data.totalEvents}`);

  const reportEvents = assertOk(await client.get(`${API_BASE}/reports/events?format=json`), 'Events report');
  const reportAttendees = assertOk(
    await client.get(`${API_BASE}/reports/attendees?format=json&eventId=${eventId}`),
    'Attendees report'
  );
  const reportRegistrations = assertOk(
    await client.get(`${API_BASE}/reports/registrations?format=json&eventId=${eventId}`),
    'Registrations report'
  );
  const reportAttendance = assertOk(
    await client.get(`${API_BASE}/reports/attendance?format=json&eventId=${eventId}`),
    'Attendance report'
  );
  console.log(
    `Reports: events=${reportEvents.data.length} attendees=${reportAttendees.data.length} registrations=${reportRegistrations.data.length} attendance=${reportAttendance.data.length}`
  );

  fs.unlinkSync(csvPath);
  console.log('FLOW_TEST_SUCCESS');
};

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error.message);
    process.exit(1);
  });
