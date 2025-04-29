const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/authMiddleware');
const applicationController = require('../controllers/applicationController');
const responseHandler = require('../middleware/responseHandler');

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

module.exports = router;