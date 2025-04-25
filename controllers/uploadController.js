const { Document } = require('../models');

const uploadPDF = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const { user_id } = req.user;
    const fileUrl = req.file.path;
    const fileName = req.file.originalname;

    const document = await Document.create({
      user_id,
      file_url: fileUrl,
      file_name: fileName
    });

    res.status(201).json({
      message: 'Document uploaded successfully',
      document
    });
  } catch (err) {
    console.error('PDF upload error:', err);
    next(err);
  }
};

module.exports = { uploadPDF };
