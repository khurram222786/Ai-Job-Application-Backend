const express = require('express');
const router = express.Router();
const { protect,authorize } = require('../middleware/authMiddleware');
const { applyForJob } = require('../controllers/applicationController');

router.post('/applications/:jobId', protect,authorize('user'), applyForJob);

module.exports = router;
