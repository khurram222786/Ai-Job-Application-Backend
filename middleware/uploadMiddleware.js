// middlewares/upload.js

const multer = require("multer");
const { docStorage, imageStorage } = require("../config/cloudinary");

const docFileFilter = (req, file, cb) => {
  const allowedTypes = [
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  ];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Only PDF, DOC, and DOCX files are allowed"), false);
  }
};

const imageFileFilter = (req, file, cb) => {
  const allowedTypes = ["image/jpeg", "image/png", "image/jpg", "image/gif"];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Only image files are allowed (JPG, PNG, GIF)"), false);
  }
};

const uploadDocs = multer({
  storage: docStorage,
  fileFilter: docFileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
});

const uploadImages = multer({
  storage: imageStorage,
  fileFilter: imageFileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
});
// middlewares/upload.js

module.exports = {
  uploadDocs,
  uploadImages
};
