const cloudinary = require('cloudinary').v2;

const getCloudinaryConfig = (settings) => {
  return {
    cloud_name: settings?.cloudinaryCloudName || process.env.CLOUDINARY_CLOUD_NAME,
    api_key: settings?.cloudinaryApiKey || process.env.CLOUDINARY_API_KEY,
    api_secret: settings?.cloudinaryApiSecret || process.env.CLOUDINARY_API_SECRET,
  };
};

const uploadToCloudinary = async (buffer, options = {}, settings = null) => {
  const config = getCloudinaryConfig(settings);
  cloudinary.config(config);

  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: 'cardpro',
        resource_type: 'auto',
        ...options,
      },
      (error, result) => {
        if (error) reject(error);
        else resolve(result);
      }
    );
    uploadStream.end(buffer);
  });
};

const deleteFromCloudinary = async (publicId, resourceType = 'image', settings = null) => {
  const config = getCloudinaryConfig(settings);
  cloudinary.config(config);
  return cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
};

module.exports = { uploadToCloudinary, deleteFromCloudinary, getCloudinaryConfig };
