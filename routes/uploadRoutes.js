const express = require("express");
const router = express.Router();
const { uploadDocs, uploadImages } = require("../middleware/uploadMiddleware");
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


module.exports = router;
