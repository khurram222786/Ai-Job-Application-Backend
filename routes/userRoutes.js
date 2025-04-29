const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/authMiddleware');
const applicationController = require('../controllers/applicationController');
const responseHandler = require('../middleware/responseHandler');
const interviewConversationController = require('../controllers/interviewController');

// Apply response middleware to all user routes

router.use(responseHandler);

router.post(
  '/applications/:jobId',
  protect,
  authorize('user'),
  applicationController.applyForJob
);

router.get(
  '/interviews/my-interviews',
  protect,
  applicationController.getUserInterviews
);

router.post(
  '/:interviewId/conversation',
  protect,
  interviewConversationController.saveInterviewConversation
);

module.exports = router;