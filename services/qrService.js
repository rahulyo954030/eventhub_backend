const QRCode = require('qrcode');
const { encrypt, decrypt } = require('../utils/encryption');
const { generateSecureToken } = require('../utils/token');
const cacheService = require('./cacheService');
const config = require('../config');

const generateQRData = (attendeeId, eventId, qrToken) => {
  const payload = JSON.stringify({
    a: attendeeId.toString(),
    e: eventId.toString(),
    t: qrToken,
    ts: Date.now(),
  });
  return encrypt(payload);
};

const parseQRData = (encryptedData) => {
  const decrypted = decrypt(encryptedData);
  return JSON.parse(decrypted);
};

const generateQRCodeImage = async (qrData) => {
  return QRCode.toDataURL(qrData, {
    errorCorrectionLevel: 'M',
    type: 'image/png',
    width: 420,
    margin: 1,
  });
};

const createAttendeeQR = async (attendeeId, eventId, existingToken) => {
  const qrToken = existingToken || generateSecureToken();
  const qrData = generateQRData(attendeeId, eventId, qrToken);
  const qrCodeUrl = await generateQRCodeImage(qrData);
  return { qrToken, qrData, qrCodeUrl };
};

const validateQRCode = async (scannedData) => {
  let encryptedPayload = '';
  try {
    if (typeof scannedData === 'string') {
      const trimmed = scannedData.trim();
      if (trimmed.startsWith('{')) {
        const parsed = JSON.parse(trimmed);
        encryptedPayload = parsed?.data || '';
      } else {
        encryptedPayload = trimmed;
      }
    } else if (typeof scannedData === 'object' && scannedData !== null) {
      encryptedPayload = scannedData.data || '';
    }
  } catch {
    throw new Error('Invalid QR code format');
  }

  if (!encryptedPayload) {
    throw new Error('Invalid QR code structure');
  }

  const cached = await cacheService.getQRValidation(encryptedPayload);
  if (cached) {
    return cached;
  }

  const qrPayload = parseQRData(encryptedPayload);
  const result = {
    attendeeId: qrPayload.a,
    eventId: qrPayload.e,
    qrToken: qrPayload.t,
    timestamp: qrPayload.ts,
  };

  await cacheService.cacheQRValidation(encryptedPayload, result);
  return result;
};

const getRegistrationUrl = (registrationToken) => {
  return `${config.frontendUrl}/register/${registrationToken}`;
};

module.exports = {
  generateQRData,
  parseQRData,
  generateQRCodeImage,
  createAttendeeQR,
  validateQRCode,
  getRegistrationUrl,
};
