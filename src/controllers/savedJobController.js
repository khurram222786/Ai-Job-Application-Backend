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

  const { count, rows: savedJobs } = await savedJobRepository.getUserSavedJobs(userId, page, limit);

  // Transform the data to include job details
  const transformedSavedJobs = savedJobs.map(savedJob => ({
    saved_at: savedJob.saved_at,
    job: {
      id: savedJob.Job.id,
      title: savedJob.Job.title,
      description: savedJob.Job.description,
      requirements: savedJob.Job.requirements,
      location: savedJob.Job.location,
      salary: savedJob.Job.salary,
      skills: savedJob.Job.skills,
      job_type: savedJob.Job.job_type,
      employment_type: savedJob.Job.employment_type,
      working_hours: savedJob.Job.working_hours,
      responsibilities: savedJob.Job.responsibilities,
      created_at: savedJob.Job.createdAt,
      employer: {
        username: savedJob.Job.User.username,
        email: savedJob.Job.User.email
      }
    }
  }));

  res.success({
    currentPage: page,
    totalPages: Math.ceil(count / limit),
    totalSavedJobs: count,
    savedJobs: transformedSavedJobs
  }, "Saved jobs retrieved successfully", 200);
});

// Check if a job is saved by the user
exports.checkIfJobSaved = asyncErrorHandler(async (req, res, next) => {
  const { jobId } = req.params;
  const userId = req.user.user_id;

  // Check if job exists
  const job = await jobRepository.findJobById(jobId);
  if (!job) {
    return next(new CustomError("Job not found", 404));
  }

  const isSaved = await savedJobRepository.checkIfJobSaved(userId, jobId);

  res.success({
    job_id: jobId,
    is_saved: isSaved
  }, "Job saved status checked successfully", 200);
});

// Get saved job IDs for a user (useful for filtering jobs)
exports.getSavedJobIds = asyncErrorHandler(async (req, res, next) => {
  const userId = req.user.user_id;
  
  const savedJobIds = await savedJobRepository.getSavedJobIds(userId);

  res.success({
    saved_job_ids: savedJobIds
  }, "Saved job IDs retrieved successfully", 200);
}); 