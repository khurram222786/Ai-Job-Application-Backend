const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { applyForJob } = require('../controllers/applicationController');

router.post('/applications/:jobId', protect, applyForJob);

module.exports = router;
