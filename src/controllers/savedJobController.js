const asyncErrorHandler = require("../Utils/asyncErrorHandler");
const CustomError = require("../Utils/customError");
const savedJobRepository = require("../repositories/savedJobRepository");
const jobRepository = require("../repositories/jobRepository");

// Save a job for a user
exports.saveJob = asyncErrorHandler(async (req, res, next) => {
  const { jobId } = req.params;
  const userId = req.user.user_id;

  // Check if job exists
  const job = await jobRepository.findJobById(jobId);
  if (!job) {
    return next(new CustomError("Job not found", 404));
  }

  // Check if already saved
  const existingSavedJob = await savedJobRepository.findSavedJob(userId, jobId);
  if (existingSavedJob) {
    return next(new CustomError("Job is already saved", 400));
  }

  // Save the job
  const savedJob = await savedJobRepository.saveJob(userId, jobId);

  res.success({
    savedJob: {
      id: savedJob.id,
      job_id: savedJob.job_id,
      user_id: savedJob.user_id,
      saved_at: savedJob.saved_at
    }
  }, "Job saved successfully", 201);
});

// Unsave a job for a user
exports.unsaveJob = asyncErrorHandler(async (req, res, next) => {
  const { jobId } = req.params;
  const userId = req.user.user_id;

  // Check if job exists
  const job = await jobRepository.findJobById(jobId);
  if (!job) {
    return next(new CustomError("Job not found", 404));
  }

  // Check if job is saved
  const savedJob = await savedJobRepository.findSavedJob(userId, jobId);
  if (!savedJob) {
    return next(new CustomError("Job is not saved", 404));
  }

  // Unsave the job
  await savedJobRepository.unsaveJob(userId, jobId);

  res.success(null, "Job unsaved successfully", 200);
});

// Get all saved jobs for a user
exports.getSavedJobs = asyncErrorHandler(async (req, res, next) => {
  const userId = req.user.user_id;
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;

  const appliedID = await savedJobRepository.getAllUserAppliedJobIds(userId)
  const { count, rows: savedJobs } = await savedJobRepository.getUserSavedJobs(appliedID,userId, page, limit);

  res.success({
    currentPage: page,
    totalPages: Math.ceil(count / limit),
    totalSavedJobs: count,
    savedJobs: savedJobs
  }, "Saved jobs retrieved successfully", 200);
});

// Check if a job