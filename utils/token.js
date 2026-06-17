const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');

const generateSecureToken = () => {
  return crypto.randomBytes(32).toString('hex');
};

const generateRegistrationToken = () => {
  return uuidv4();
};

const hashToken = (token) => {
  return crypto.createHash('sha256').update(token).digest('hex');
};

module.exports = {
  generateSecureToken,
  generateRegistrationToken,
  hashToken,
};
