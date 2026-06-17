const crypto = require('crypto');
const config = require('../config');

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;
const PAYLOAD_VERSION = 'g1';

const getKey = () => {
  return crypto.createHash('sha256').update(config.qr.encryptionKey).digest();
};

const encrypt = (text) => {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, getKey(), iv);
  const encrypted = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  const payload = Buffer.concat([iv, authTag, encrypted]).toString('base64url');
  return `${PAYLOAD_VERSION}.${payload}`;
};

const decrypt = (encryptedText) => {
  if (typeof encryptedText !== 'string' || !encryptedText.trim()) {
    throw new Error('Invalid encrypted data format');
  }

  if (encryptedText.startsWith(`${PAYLOAD_VERSION}.`)) {
    const encoded = encryptedText.slice(PAYLOAD_VERSION.length + 1);
    const buffer = Buffer.from(encoded, 'base64url');

    if (buffer.length <= IV_LENGTH + AUTH_TAG_LENGTH) {
      throw new Error('Invalid encrypted payload length');
    }

    const iv = buffer.subarray(0, IV_LENGTH);
    const authTag = buffer.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
    const encrypted = buffer.subarray(IV_LENGTH + AUTH_TAG_LENGTH);
    const decipher = crypto.createDecipheriv(ALGORITHM, getKey(), iv);
    decipher.setAuthTag(authTag);
    const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
    return decrypted.toString('utf8');
  }

  const parts = encryptedText.split(':');
  if (parts.length !== 3) {
    throw new Error('Invalid encrypted data format');
  }
  const iv = Buffer.from(parts[0], 'hex');
  const authTag = Buffer.from(parts[1], 'hex');
  const encrypted = parts[2];
  const decipher = crypto.createDecipheriv(ALGORITHM, getKey(), iv);
  decipher.setAuthTag(authTag);
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
};

module.exports = { encrypt, decrypt };
