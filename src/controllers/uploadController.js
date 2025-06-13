const { cloudinary } = require("../config/cloudinary");
const documentRepository = require("../repositories/documentRepository");
const mediaRepository = require("../repositories/mediaRepository");
const asyncErrorHandler = require("../Utils/asyncErrorHandler");
const interviewRepository = require("../repositories/interviewRepository");
const CustomError = require("../Utils/customError");
const { uploadFile } = require("../config/cloudinary");
const fs = require("fs");
const path = require("path");

exports.uploadPDF = asyncErrorHandler(async (req, res, next) => {
  if (!req.file) {
    return next(new CustomError("No file uploaded", 400));
  }

  const { user_id } = req.user;
  
  // Updated Cloudinary upload part
  const cloudinaryResponse = await uploadFile(req.file, 'document');
  const fileUrl = cloudinaryResponse.secure_url;
  const fileName = req.file.originalname;

  // Rest remains exactly the same
  const existingDocument = await documentRepository.findDocumentByUserId(user_id);
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


exports.uploadVideo = asyncErrorHandler(async (req, res, next) => {
  if (!req.file) {
    return next(new CustomError("No file uploaded", 400));
  }

  const { user_id } = req.user;
  const { interview_id } = req.params;

  const interview = await interviewRepository.findInterviewById(interview_id);
  if(!interview){
    return next(new CustomError("Interview not found", 404));
  }
  

  // Upload video using centralized upload function
  const cloudinaryResponse = await uploadFile(req.file, 'video');
  const interviewUrl = cloudinaryResponse.secure_url;

  // Check for existing media
  const existingMedia = await mediaRepository.findMediaByInterviewAndUser(interview_id, user_id);
  if (existingMedia) {
    throw new CustomError("Media already exists", 400);
  }

  // Create new media record
  const media = await mediaRepository.createMedia({
    interview_url: interviewUrl,
    user_id,
    interview_id
  });

  res.success(
    media,
    "Interview video uploaded successfully",
    201
  );
});


