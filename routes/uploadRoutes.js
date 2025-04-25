const express = require('express');
const router = express.Router();
const upload = require('../middleware/uploadMiddleware');
const { protect, authorize } = require('../middleware/authMiddleware');

const { uploadPDF } = require('../controllers/uploadController');

router.post('/pdf', protect,authorize('user'), upload.single('file'), uploadPDF);

module.exports = router;
