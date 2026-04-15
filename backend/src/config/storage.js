const cloudinary = require('cloudinary').v2;
const env = require('./env');

if (env.STORAGE_PROVIDER === 'cloudinary') {
  cloudinary.config({
    cloud_name: env.CLOUDINARY_CLOUD_NAME,
    api_key: env.CLOUDINARY_API_KEY,
    api_secret: env.CLOUDINARY_API_SECRET
  });
}

const isCloudinaryConfigured = () =>
  Boolean(env.CLOUDINARY_CLOUD_NAME && env.CLOUDINARY_API_KEY && env.CLOUDINARY_API_SECRET);

const createCloudinaryUploadSignature = ({ folder = 'digital-department-hub/cms' } = {}) => {
  if (!isCloudinaryConfigured()) {
    throw new Error('Cloudinary credentials are not fully configured');
  }

  const timestamp = Math.floor(Date.now() / 1000);
  const signature = cloudinary.utils.api_sign_request(
    {
      timestamp,
      folder
    },
    env.CLOUDINARY_API_SECRET
  );

  return {
    provider: 'cloudinary',
    cloudName: env.CLOUDINARY_CLOUD_NAME,
    apiKey: env.CLOUDINARY_API_KEY,
    timestamp,
    signature,
    folder
  };
};

module.exports = {
  createCloudinaryUploadSignature
};
