const express = require("express");
const router = express.Router();
const { protect, authorize } = require("../middleware/authMiddleware");
const applicationController = require("../controllers/applicationController");
const responseHandler = require("../middleware/responseHandler");
const interviewConversationController = require("../controllers/interviewController");
const validateConversation = require("../middleware/interviewConversationValidator");
const { uploadImages } = require("../middleware/uploadMiddleware"); // assuming you’ve configured Cloudinary multer
const userController = require("../controllers/applicationController");

router.use(responseHandler);  // for setting the proper response

router.post(
  "/applications/:jobId",
  protect,
  authorize("user"),
  applicationController.applyForJob
);

router.get(
  "/interviews/my-interviews",
  protect,
  applicationController.getUserInterviews
);

router.post(
  "/:interviewId/conversation",
  protect,
  validateConversation,
  interviewConversationController.saveInterviewConversation
);


router.patch(
  "/profile",
  protect,
  uploadImages.single("profile"), // field name must match frontend
  userController.updateProfile
);

router.get(
  "/profile",
  protect,
  userController.getUserProfile
);



module.exports = router;
