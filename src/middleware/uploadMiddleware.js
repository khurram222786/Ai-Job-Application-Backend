// middlewares/upload.js
const multer = require("multer");
const path = require("path");
const { imageStorage } = require("../config/cloudinary");

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/");
  },
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}-${file.originalname}`;
    cb(null, uniqueName);
  }
});

const docFileFilter = (req, file, cb) => {
  const allowedTypes = [
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  ];
  allowedTypes.includes(file.mimetype) ? cb(null, true) : cb(new Error("Only PDF, DOC, and DOCX files are allowed"), false);
};

const imageFileFilter = (req, file, cb) => {
  const allowedTypes = ["image/jpeg", "image/png", "image/jpg", "image/gif"];
  allowedTypes.includes(file.mimetype) ? cb(null, true) : cb(new Error("Only image files are allowed"), false);
};


const videoFileFilter = (req, file, cb) => {
  const allowedTypes = ["video/mp4", "video/mpeg", "video/quicktime", "video/avi", "video/webm"];
  allowedTypes.includes(file.mimetype) ? cb(null, true) : cb(new Error("Only video files are allowed"), false);
};


const uploadDocs = multer({
  storage,
  fileFilter: docFileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
});

const uploadImages = multer({
  storage: imageStorage,
  fileFilter: imageFileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
});

const uploadVideos = multer({
  storage,
  fileFilter: videoFileFilter,
  limits: { fileSize: 100 * 1024 * 1024 }, // 50MB
});

module.exports = {
  uploadDocs,
  uploadImages,
  uploadVideos
};
