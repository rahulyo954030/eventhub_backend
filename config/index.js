require('dotenv').config();

module.exports = {
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT, 10) || 5000,
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
  backendUrl: process.env.BACKEND_URL || 'http://localhost:5000',
  mongodb: {
    uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/event_management',
  },
  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
    required: process.env.REDIS_REQUIRED === 'true',
  },
  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET || 'access-secret-dev',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'refresh-secret-dev',
    accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  },
  brevo: {
    apiKey: process.env.BREVO_API_KEY || '',
    senderEmail: process.env.BREVO_SENDER_EMAIL || 'noreply@example.com',
    senderName: process.env.BREVO_SENDER_NAME || 'Event Management',
  },
  qr: {
    encryptionKey: process.env.QR_ENCRYPTION_KEY || 'default-32-char-encryption-key!!',
    imageBaseUrl: process.env.QR_IMAGE_BASE_URL || process.env.BACKEND_URL || 'http://localhost:5000',
  },
  cookie: {
    secret: process.env.COOKIE_SECRET || 'cookie-secret-dev',
  },
  cloudinary: {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME || '',
    apiKey: process.env.CLOUDINARY_API_KEY || '',
    apiSecret: process.env.CLOUDINARY_API_SECRET || '',
  },
};
