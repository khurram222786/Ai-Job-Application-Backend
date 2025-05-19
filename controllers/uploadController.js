const documentRepository = require("../repositories/documentRepository");
const asyncErrorHandler = require("../Utils/asyncErrorHandler");
const CustomError = require("../Utils/customError");
const userRepository = require("../repositories/userRepository");
const path = require('path');
const fs = require('fs');

exports.uploadPDF = asyncErrorHandler(async (req, res, next) => {
  if (!req.file) {
    return next(new CustomError("No file uploaded", 400));
  }
  
  const { user_id } = req.user;
  const fileUrl = req.file.path;
  const fileName = req.file.originalname;

  const existingDocument = await documentRepository.findDocumentByUserId(
    user_id
  );

  let document;
  let isNew = false;

  if (existingDocument) {
    document = await existingDocument.update({
      file_url: fileUrl,
      file_name: fileName,
    });
  } else {
    document = await documentRepository.createDocument({
      user_id,
      file_url: fileUrl,
      file_name: fileName,
    });
    isNew = true;
  }

  res.success(
    document,
    isNew ? "Document uploaded successfully" : "Document updated successfully",
    201
  );
});
