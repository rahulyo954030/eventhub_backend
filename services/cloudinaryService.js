const { Readable } = require('stream');
const ApiError = require('../utils/ApiError');
const { cloudinary, isConfigured } = require('../config/cloudinary');

const AVATAR_FOLDER = 'eventhub/avatars';

const bufferToStream = (buffer) => {
  const stream = new Readable();
  stream.push(buffer);
  stream.push(null);
  return stream;
};

const getPublicIdFromUrl = (url) => {
  if (!url || !url.includes('res.cloudinary.com')) return null;

  try {
    const withoutQuery = url.split('?')[0];
    const uploadIndex = withoutQuery.indexOf('/upload/');
    if (uploadIndex === -1) return null;

    const pathAfterUpload = withoutQuery.slice(uploadIndex + '/upload/'.length);
    const parts = pathAfterUpload.split('/');
    const startIndex = parts[0]?.startsWith('v') && /^\d+$/.test(parts[0].slice(1)) ? 1 : 0;
    const publicIdWithExt = parts.slice(startIndex).join('/');
    if (!publicIdWithExt) return null;

    const lastDot = publicIdWithExt.lastIndexOf('.');
    return lastDot > -1 ? publicIdWithExt.slice(0, lastDot) : publicIdWithExt;
  } catch {
    return null;
  }
};

const uploadAvatar = async (buffer, userId) =>
  new Promise((resolve, reject) => {
    const upload = cloudinary.uploader.upload_stream(
      {
        folder: AVATAR_FOLDER,
        public_id: `user_${userId}`,
        overwrite: true,
        invalidate: true,
        resource_type: 'image',
        transformation: [
          { width: 400, height: 400, crop: 'fill', gravity: 'auto' },
          { quality: 'auto', fetch_format: 'auto' },
        ],
      },
      (error, result) => {
        if (error) reject(error);
        else resolve(result);
      }
    );

    bufferToStream(buffer).pipe(upload);
  });

const deleteImage = async (publicId) => {
  if (!publicId) return;
  await cloudinary.uploader.destroy(publicId, { resource_type: 'image', invalidate: true });
};

const uploadUserAvatar = async (userId, buffer) => {
  if (!isConfigured) {
    throw ApiError.internal('Image upload is not configured');
  }

  try {
    return await uploadAvatar(buffer, userId);
  } catch (error) {
    throw ApiError.badRequest(error.message || 'Failed to upload image');
  }
};

const removeUserAvatar = async (avatarUrl) => {
  if (!isConfigured || !avatarUrl) return;

  const publicId = getPublicIdFromUrl(avatarUrl);
  if (publicId) {
    try {
      await deleteImage(publicId);
    } catch {
      // Best-effort cleanup
    }
  }
};

module.exports = {
  uploadUserAvatar,
  removeUserAvatar,
  getPublicIdFromUrl,
  isConfigured,
};
