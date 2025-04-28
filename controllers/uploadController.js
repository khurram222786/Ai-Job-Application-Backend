const { Document } = require('../models');
const asyncErrorHandler = require('../Utils/asyncErrorHandler');
const CustomError = require('../Utils/customError');

exports.uploadPDF = asyncErrorHandler(async (req, res, next) => {
  if (!req.file) {
    return next(new CustomError('No file uploaded', 400));
  }

  const { user_id } = req.user; // ✅ Fix here
  const fileUrl = req.file.path;
  const fileName = req.file.originalname;

  const document = await Document.create({
    user_id,
    file_url: fileUrl,
    file_name: fileName
  });

  res.status(201).json({
    status: 'success',
    message: 'Document uploaded successfully',
    document
  });
});
