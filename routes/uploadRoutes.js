const express = require('express');
const router = express.Router();
const upload = require('../middleware/uploadMiddleware');
const { protect } = require('../middleware/authMiddleware');
const { uploadPDF } = require('../controllers/uploadController');

router.post('/pdf', protect, upload.single('file'), uploadPDF);

module.exports = router;
