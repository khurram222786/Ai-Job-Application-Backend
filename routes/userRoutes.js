const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/authMiddleware');
const applicationController = require('../controllers/applicationController');

router
  .route('/applications/:jobId')
  .post(protect, authorize('user'), applicationController.applyForJob);

router
  .route('/interviews/my-interviews')
  .get(protect, applicationController.getUserInterviews);

module.exports = router;
