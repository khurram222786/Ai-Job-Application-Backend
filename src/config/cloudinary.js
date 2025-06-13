// config/cloudinary.js
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const fs = require('fs');
const path = require('path');

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Upload configurations
const uploadConfigs = {
  video: {
    folder: "job-portal/videos",
    resource_type: "video",
    access_mode: "public",
    chunk_size: 6000000,
    eager: [{ format: "mp4", quality: "auto" }]
  },
  document: {
    folder: "job-portal/documents",
    resource_type: "auto",
    access_mode: "public"
  },
  image: {
    folder: "job-portal/images",
    resource_type: "image",
    access_mode: "public"
  }
};

// Storage configurations
const imageStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: (req, file) => ({
    folder: 'job-portal/images',
    allowed_formats: ['jpg', 'jpeg', 'png', 'gif'],
    resource_type: 'image',
    public_id: `${Date.now()}-${file.originalname}`
  })
});

// Utility function to handle uploads
const uploadFile = async (file, type) => {
  const localFilePath = path.resolve(file.path);
  const options = {
    ...uploadConfigs[type],
    public_id: `${Date.now()}-${file.originalname}`
  };

  try {
    const result = await cloudinary.uploader.upload(localFilePath, options);
    fs.unlinkSync(localFilePath);
    return result;
  } catch (error) {
    fs.unlinkSync(localFilePath);
    throw error;
  }
};


module.exports = {
  cloudinary,
  imageStorage,
  uploadFile,
  uploadConfigs
};