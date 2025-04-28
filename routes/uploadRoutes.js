const express = require('express');
const router = express.Router();
const upload = require('../middleware/uploadMiddleware');
const { protect, authorize } = require('../middleware/authMiddleware');
const uploadController = require('../controllers/uploadController');

router
  .route('/pdf')
  .post(
    protect,
    authorize('user'),
    upload.single('file'), // field name must be 'file' in Postman
    uploadController.uploadPDF
  );

module.exports = router;
