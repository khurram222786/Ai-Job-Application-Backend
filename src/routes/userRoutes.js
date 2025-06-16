const express = require("express");
const router = express.Router();
const { protect, authorize } = require("../middleware/authMiddleware");
const applicationController = require("../controllers/applicationController");
const responseHandler = require("../middleware/responseHandler");
const interviewConversationController = require("../controllers/interviewController");
const validateConversation = require("../middleware/interviewConversationValidator");
const { uploadImages } = require("../middleware/uploadMiddleware"); 

router.use(responseHandler);  
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
  uploadImages.single("profile"),  
  applicationController.updateProfile
);

router.get(
  "/profile",
  protect,
  applicationController.getUserProfile
);



router.get(
  "/statistics",
  protect,
  authorize("user"),
  applicationController.getUserStats
)


module.exports = router;
