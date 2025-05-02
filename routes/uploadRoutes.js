const express = require("express");
const router = express.Router();
const { uploadDocs, uploadImages } = require("../middleware/uploadMiddleware");
const { protect, authorize } = require("../middleware/authMiddleware");
const uploadController = require("../controllers/uploadController");
const responseHandler = require("../middleware/responseHandler");

router.use(responseHandler);  // for setting the proper response

router.route("/pdf").post(
  protect,
  authorize("user"),
  uploadDocs.single("file"), // field name must be 'file' in Postman
  uploadController.uploadPDF
);


router.route("/profile-picture")
  .post(
    protect,
    uploadImages.single("Picture"), // field name must be 'profilePicture' in Postman
    uploadController.uploadProfilePicture
  )

module.exports = router;
