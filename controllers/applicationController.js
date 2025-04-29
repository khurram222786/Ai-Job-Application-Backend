const applicationRepository = require('../repositories/applicationRepository');
const interviewRepository = require('../repositories/interviewRepository');
const asyncErrorHandler = require('../Utils/asyncErrorHandler');
const CustomError = require('../Utils/customError');

exports.applyForJob = asyncErrorHandler(async (req, res, next) => {
  const { jobId } = req.params;
  const userId = req.user.user_id;

  // Check if job exists
  const job = await applicationRepository.findJobById(jobId);
  if (!job) {
    return next(new CustomError('Job not found', 404));
  }

  // Check for existing application
  const existingApplication = await applicationRepository.findUserApplication(userId, jobId);
  if (existingApplication) {
    return next(new CustomError('You have already applied for this job', 400));
  }

  // Create new application
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