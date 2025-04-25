const express = require('express');
const router = express.Router();

const { protect, authorize } = require('../middleware/authMiddleware');
const { createJob,getMyJobs ,updateJobById,deleteJobById} = require('../controllers/adminController');


router.post('/jobs', protect, authorize('admin'), createJob);
router.get('/jobs',protect , getMyJobs);
router.put('/jobs/:id', protect, authorize('admin'), updateJobById);
router.delete('/jobs/:id', protect, authorize('admin'), deleteJobById);



module.exports = router;
