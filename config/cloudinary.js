// config/cloudinary.js

const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');

const configureCloudinary = () => {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
  });
  return cloudinary;
};

const configuredCloudinary = configureCloudinary();

const docStorage = new CloudinaryStorage({
  cloudinary: configuredCloudinary,
  params: (req, file) => ({
    folder: 'job-portal/resumes',
    allowed_formats: ['pdf', 'doc', 'docx'],
    resource_type: 'raw',
    public_id: `${Date.now()}-${file.originalname}`
  })
});

const imageStorage = new CloudinaryStorage({
  cloudinary: configuredCloudinary,
  params: (req, file) => ({
    folder: 'job-portal/images',
    allowed_formats: ['jpg', 'jpeg', 'png', 'gif'],
    resource_type: 'image',
    public_id: `${Date.now()}-${file.originalname}`
  })
});

module.exports = {
  configureCloudinary,
  docStorage,
  imageStorage
};