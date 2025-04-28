const { Job, User, Application, Document, Interview } = require("./../models");
const asyncErrorHandler = require("./../utils/asyncErrorHandler");
const CustomError = require("./../utils/customError");
const { Op } = require("sequelize"); // Add this line
const jobRepository = require("../repositories/jobRepository");
const applicationRepository = require('../repositories/applicationRepository');
const { APPLICATION_STATUS } = require('../constants/index');


exports.createJob = asyncErrorHandler(async (req, res, next) => {
  const { title, description, requirements } = req.body;

  if (!title || !description || !requirements) {
    return next(new CustomError("All job fields are required", 400));
  }

  const newJob = await jobRepository.createJob({
    user_id: req.user.user_id,
    title,
    description,
    requirements,
  });

  res.success({ job: newJob }, "Job created successfully", 201);
});

exports.getMyJobs = asyncErrorHandler(async (req, res, next) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 5;
  const offset = (page - 1) * limit;

  const user = await jobRepository.findUserById(req.user.user_id);
  if (!user) {
    return next(new CustomError("User not found", 404));
  }

  const queryOptions = {
    limit,
    offset,
    order: [["createdAt", "DESC"]],
  };

  if (user.user_type_id !== 2) {
    // Assuming 2 is admin role
    queryOptions.where = { user_id: req.user.user_id };
  }

  const { count, rows: jobs } = await jobRepository.findAndCountJobs(
    queryOptions
  );

  res.success({
    currentPage: page,
    totalPages: Math.ceil(count / limit),
    totalJobs: count,
    jobs,
  });
});



exports.updateJobById = asyncErrorHandler(async (req, res, next) => {
  const { id } = req.params;
  const { title, description, requirements } = req.body;

  // Find job
  const job = await jobRepository.findJobById(id);
  if (!job) {
    return next(new CustomError("Job not found", 404));
  }

  // Update job
  const updatedJob = await jobRepository.updateJob(job, {
    title: title ?? job.title,
    description: description ?? job.description,
    requirements: requirements ?? job.requirements,
  });

  const responseData = {
    job_id: updatedJob.job_id,
    title: updatedJob.title,
    description: updatedJob.description,
    requirements: updatedJob.requirements,
    updatedAt: updatedJob.updatedAt,
  };

  res.success({ job: responseData }, "Job updated successfully");
});



exports.deleteJobById = asyncErrorHandler(async (req, res, next) => {
  const { id } = req.params;

  // Find job
  const job = await jobRepository.findJobById(id);
  if (!job) {
    return next(new CustomError("Job not found", 404));
  }

  // Delete job
  await jobRepository.deleteJob(job);

  // Send response
  res.success(null, "Job deleted successfully");
});








// In adminController.js

exports.getJobApplications = asyncErrorHandler(async (req, res, next) => {
  const { jobId } = req.params;

  // Verify job ownership
  const job = await applicationRepository.findJobWithOwner(jobId, req.user.user_id);
  if (!job) {
    return next(
      new CustomError('Job not found or you are not authorized to view its applications', 404)
    );
  }

  // Get applications
  const applications = await applicationRepository.findApplicationsForJob(jobId);

  // Send response
  res.success({
    totalApplications: applications.count,
    applications: applications.rows
  });
});



exports.updateApplicationStatus = asyncErrorHandler(async (req, res, next) => {
  const { applicationId } = req.params;
  const { status } = req.body;

  // Validate status
  if (!status || !Object.values(APPLICATION_STATUS).includes(status.toLowerCase())) {
    return next(
      new CustomError(`Status must be one of: ${Object.values(APPLICATION_STATUS).join(', ')}`, 400)
    );
  }

  // Find and verify application
  const application = await applicationRepository.findApplicationWithJobOwner(
    applicationId,
    req.user.user_id
  );
  if (!application) {
    return next(
      new CustomError('Application not found or you are not authorized to update it', 404)
    );
  }

  // Update status
  const updatedApplication = await applicationRepository.updateApplicationStatus(
    application,
    status
  );

  // Send response
  res.success({
    application: {
      id: updatedApplication.id,
      status: updatedApplication.status,
      job_id: updatedApplication.job_id,
      user_id: updatedApplication.user_id
    }
  }, 'Application status updated successfully');
});














exports.getAcceptedApplications = asyncErrorHandler(async (req, res, next) => {
  // Step 1: Find all accepted applications for jobs belonging to this admin
  const acceptedApplications = await Application.findAll({
    where: {
      status: "rejected",
    },
    include: [
      {
        model: Job,
        where: { user_id: req.user.user_id },
        attributes: [],
      },
      {
        model: User,
        attributes: ["user_id", "username", "email"],
        // Removed UserType include since it's not needed for this endpoint
      },
    ],
    order: [["createdAt", "DESC"]],
  });

  if (!acceptedApplications || acceptedApplications.length === 0) {
    return next(new CustomError("No accepted applications found", 404));
  }

  // Step 2: Format the response (simplified without UserType)
  const response = acceptedApplications.map((app) => ({
    application_id: app.id,
    user: {
      user_id: app.User.user_id,
      username: app.User.username,
      email: app.User.email,
    },
    applied_at: app.createdAt,
  }));

  res.status(200).json({
    status: "success",
    count: response.length,
    data: response,
  });
});

exports.scheduleUserInterview = asyncErrorHandler(async (req, res, next) => {
  const { userId } = req.params;
  const { application_id, interview_date, start_time, end_time, media_id } =
    req.body;

  // Validate required fields
  if (!application_id || !interview_date || !start_time || !end_time) {
    return next(
      new CustomError(
        "application_id, interview_date, start_time and end_time are required",
        400
      )
    );
  }

  // Validate date format (YYYY-MM-DD)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(interview_date)) {
    return next(
      new CustomError("interview_date must be in YYYY-MM-DD format", 400)
    );
  }

  // Validate time format (HH:MM:SS)
  if (
    !/^\d{2}:\d{2}:\d{2}$/.test(start_time) ||
    !/^\d{2}:\d{2}:\d{2}$/.test(end_time)
  ) {
    return next(new CustomError("Time must be in HH:MM:SS format", 400));
  }

  try {
    // Check if the user exists
    const user = await User.findByPk(userId);
    if (!user) {
      return next(new CustomError("User not found", 404));
    }

    // Check if the application exists and belongs to this user
    const application = await Application.findOne({
      where: {
        id: application_id,
        user_id: userId,
      },
    });

    if (!application) {
      return next(
        new CustomError(
          "Application not found or does not belong to this user",
          404
        )
      );
    }

    // Check for scheduling conflicts
    const existingInterview = await Interview.findOne({
      where: {
        user_id: userId,
        interview_date,
        [Op.or]: [
          {
            start_time: { [Op.lt]: end_time },
            end_time: { [Op.gt]: start_time },
          },
        ],
      },
    });

    if (existingInterview) {
      return next(
        new CustomError(
          "User already has an interview scheduled during this time",
          409
        )
      );
    }

    // Create the interview
    const interview = await Interview.create({
      user_id: userId,
      application_id,
      interview_date,
      start_time,
      end_time,
      media_id: media_id || null,
    });

    // Return the created interview with associated data
    const newInterview = await Interview.findByPk(interview.id, {
      include: [
        { model: User, attributes: ["user_id", "username", "email"] },
        { model: Application, attributes: ["id", "status"] },
      ],
    });

    res.status(201).json({
      status: "success",
      message: "Interview scheduled successfully",
      data: newInterview,
    });
  } catch (error) {
    console.error("Error scheduling interview:", error);
    next(new CustomError("Failed to schedule interview", 500));
  }
});
