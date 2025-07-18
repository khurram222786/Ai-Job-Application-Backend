const applicationRepository = require('../repositories/applicationRepository');
const interviewRepository = require('../repositories/interviewRepository');
const userRepository= require('../repositories/userRepository')
const documentRepository = require('../repositories/documentRepository')
const asyncErrorHandler = require('../Utils/asyncErrorHandler');
const CustomError = require('../Utils/customError');
const { User } = require("../models");
const resume_parser= require('../validators/pdf_parser')
const PROMPT = require('../socket/prompts')
const { callGemini } = require('../validators/geminiHook');


exports.applyForJob = asyncErrorHandler(async (req, res, next) => {
  const { jobId } = req.params;
  const userId = req.user.user_id;
  resume_text= await resume_parser(userId);
  const document = await documentRepository.findDocumentByUserId(userId) 
    

  if (document.parsed_data===null) {

    parsing_prompt=PROMPT.createResumePrompt(resume_text)
    let parsedResumeData = null;
    const geminiResponse = await callGemini(parsing_prompt, 0.1);
    const firstBrace = geminiResponse.indexOf('{');
    const lastBrace = geminiResponse.lastIndexOf('}');
    const jsonString = geminiResponse.slice(firstBrace, lastBrace + 1);
    parsedResumeData = JSON.parse(jsonString);
    document.parsed_data = parsedResumeData;
    await document.save();

  }

  const job = await applicationRepository.findJobById(jobId);
  if (!job) {
    return next(new CustomError('Job not found', 404));
  }

  const existingApplication = await applicationRepository.findUserApplication(userId, jobId);
  if (existingApplication) {
    return next(new CustomError('You have already applied for this job', 400));
  }

  const newApplication = await applicationRepository.createApplication({
    user_id: userId,
    job_id: jobId,
    status: 'pending'
  });

  res.success(
    { application: newApplication },
    'Application submitted successfully',
    201
  );
});

exports.getUserInterviews = asyncErrorHandler(async (req, res, next) => {
  const userId = req.user.user_id;

  const interviews = await interviewRepository.getUserInterviews(userId);
  if (!interviews.length) {
    return next(new CustomError('No interviews scheduled yet', 404));
  }

  res.success(
    interviews,
    "All schedulled interviews"
  );
});



exports.updateProfile = asyncErrorHandler(async (req, res, next) => {
  const { username } = req.body;
  const userId = req.user.user_id;

  const user = await userRepository.findUserById(userId);
  if (!user) {
    return next(new CustomError("User not found", 404));
  }

  if (username) {
    user.username = username;
  }

  if (req.file && req.file.path) {
    user.profile_picture = req.file.path;
  }

  await user.save();

  res.status(200).json({
    success: true,
    message: "Profile updated successfully",
    data: {
      username: user.username,
      profile_picture: user.profile_picture
    }
  });
});

exports.getUserProfile = asyncErrorHandler(async (req, res, next) => {
  const userId = req.user.user_id;

  const user = await userRepository.findUserDetailsById(userId);
  if (!user) {
    return next(new CustomError("User not found", 404));
  }

  res.status(200).json({
    success: true,
    data: {
      ...user.toJSON()
    }
  });
});


exports.getUserStats= asyncErrorHandler(async (req, res, next) => {
  const userId = req.user.user_id;
  const statistics= await userRepository.getUserStatistics(userId)
  res.success(statistics, "user stats", 201);
})
