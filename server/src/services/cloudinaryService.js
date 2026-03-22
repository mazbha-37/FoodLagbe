const cloudinary = require('../config/cloudinary');

/**
 * Upload a file buffer to Cloudinary.
 * @param {Buffer} fileBuffer
 * @param {string} folder  e.g. "restaurants", "menu-items", "reviews"
 * @returns {Promise<{ url: string, publicId: string }>}
 */
const uploadImage = (fileBuffer, folder) =>
  new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: `foodlagbe/${folder}`,
        transformation: [{ quality: 'auto', fetch_format: 'auto' }],
      },
      (error, result) => {
        if (error) return reject(error);
        resolve({ url: result.secure_url, publicId: result.public_id });
      }
    );
    uploadStream.end(fileBuffer);
  });

/**
 * Delete an image from Cloudinary by publicId.
 * Silently swallows errors so a missing image never crashes a request.
 * @param {string} publicId
 */
const deleteImage = async (publicId) => {
  try {
    await cloudinary.uploader.destroy(publicId);
  } catch {
    // intentionally silent
  }
};

module.exports = { uploadImage, deleteImage };
