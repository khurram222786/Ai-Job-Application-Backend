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

const storage = new CloudinaryStorage({
  cloudinary: configureCloudinary(),
  params: (req, file) => ({
    folder: 'job-portal/resumes',
    allowed_formats: ['pdf', 'doc', 'docx'],
    resource_type: 'raw',
    public_id: `${Date.now()}-${file.originalname}`
  })
});

module.exports = { configureCloudinary, storage };