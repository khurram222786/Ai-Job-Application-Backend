const express = require('express');
const router = express.Router();

const { protect, authorize } = require('../middleware/authMiddleware');
const { createJob,getMyJobs } = require('../controllers/adminController');


router.post('/jobs', protect, authorize('admin'), createJob);
router.get('/jobs',protect ,authorize('admin'), getMyJobs);




module.exports = router;
