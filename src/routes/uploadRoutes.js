const express = require("express");
const router = express.Router();
const { uploadDocs, uploadVideos } = require("../middleware/uploadMiddleware");
const { protect, authorize } = require("../middleware/authMiddleware");
const uploadController = require("../controllers/uploadController");
const responseHandler = require("../middleware/responseHandler");

router.use(responseHandler); 

router.route("/pdf").post(
  protect,
  authorize("user"),
  uploadDocs.single("file"),
  uploadController.uploadPDF
);

// New video upload endpoint
router.route("/video/:interview_id").post(
  protect,
  authorize("user"),
  uploadVideos.single("video"),
  uploadController.uploadVideo
);

module.exports = router;
