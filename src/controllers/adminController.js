const { Job, User, Application, Document, Interview } = require("./../models");
const asyncErrorHandler = require("../Utils/asyncErrorHandler");
const CustomError = require("../Utils/customError");
const { Op } = require("sequelize");
const jobRepository = require("../repositories/jobRepository");
const interviewRepository= require('../repositories/interviewRepository')
const userRepository=require('../repositories/userRepository')
const applicationRepository = require('../repositories/applicationRepository');
const { APPLICATION_STATUS } = require('../validators/index');
const interviewConversationRepository = require('../repositories/interviewConversationRepository');
const sendEmail = require('../Utils/mailer');
const { json } = require("body-parser");


exports.getMyJobs = asyncErrorHandler(async (req, res, next) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 26;
  const offset = (page - 1) * limit;

  const user = await jobRepository.findUserById(req.user.user_id);
  const userType = await userRepository.findUserByUserId(user.user_type_id);

  if (!user) {
    return next(new CustomError("User not found", 404));
  }

  const queryOptions = {
    limit,
    offset,
    order: [["createdAt", "DESC"]],
  };

  if (userType.role === "admin") {
    queryOptions.where = { user_id: req.user.user_id };
  } else {
    const appliedJobIds = await jobRepository.findAppliedJobIds(req.user.user_id);
    
    if (appliedJobIds.length > 0) {
      queryOptions.where = {
        id: { [Op.notIn]: appliedJobIds }
      };
    } 
  }

  const { count, rows: jobs } = await jobRepository.findAndCountJobs(
    queryOptions
  );

  res.success({
    currentPage: page,
    totalPages: Math.ceil(count / limit),
    totalJobs: count,
    jobs,
  } ,"Job Retrived successfully", 200);
});


exports.createJob = asyncErrorHandler(async (req, res, next) => {
  const { title, description, requirements, skills,location,salary,responsibilities,employment_type,job_type,working_hours} = req.body;

  if (!title || !description || !requirements) {
    return next(new CustomError("Title, description and requirements are required", 400));
  }

  if (skills && !Array.isArray(skills)) {
    return next(new CustomError("Skills must be an array of strings", 400));
  }

  const newJob = await jobRepository.createJob({
    user_id: req.user.user_id,
    title,
    description,
    requirements,
    skills: skills || [],
    responsibilities,
    salary,
    location ,
    employment_type,
    job_type,
    working_hours
  });

  res.success(newJob, "Job created successfully", 201);
});


exports.updateJobById = asyncErrorHandler(async (req, res, next) => {
  const { id } = req.params;
  const { title, description, requirements } = req.body;

  const job = await jobRepository.findJobById(id);
  if (!job) {
    return next(new CustomError("Job not found", 404));
  }

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

  res.success(responseData, "Job updated successfully",200);
});



exports.deleteJobById = asyncErrorHandler(async (req, res, next) => {
  const { id } = req.params;

  const job = await jobRepository.findJobById(id);
  if (!job) {
    return next(new CustomError("Job not found", 404));
  }

  await jobRepository.deleteJob(job);

  res.success(null, "Job deleted successfully", 200);
});



exports.getJobApplications = asyncErrorHandler(async (req, res, next) => {
  const { jobId } = req.params;

  const job = await applicationRepository.findJobWithOwner(jobId, req.user.user_id);
  if (!job) {
    return next(
      new CustomError('Job not found or you are not authorized to view its applications', 404)
    );
  }

  const applications = await applicationRepository.findApplicationsForJob(jobId);

  res.success({
    totalApplications: applications.count,
    applications: applications.rows
    
  }, "Application  fetched successfully", 201);
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
  const acceptedApplications = await applicationRepository.findApplicationsByStatusAndJobOwner(
    'accepted', 
    req.user.user_id
  );

  if (!acceptedApplications || acceptedApplications.length === 0) {
    return next(new CustomError('No accepted applications found', 404));
  }

  const formattedApplications = acceptedApplications.map((app) => ({
    application_id: app.id,
    user: {
      user_id: app.User.user_id,
      username: app.User.username,
      email: app.User.email,
    },
    applied_at: app.createdAt,
  }));

  res.success(
   formattedApplications, "All accepted candidates"
  );
});




exports.scheduleUserInterview = asyncErrorHandler(async (req, res, next) => {
  const { userId } = req.params;
  const interviewData = req.body;

  const user = await userRepository.findUserWithApplications(userId, interviewData.application_id);
  if (!user) return next(new CustomError('User not found', 404));

  if (!user.Applications || user.Applications.length === 0) {
    return next(new CustomError('Application not found or does not belong to this user', 404));
  }

  const conflict = await interviewRepository.findConflictingInterview(
    userId,
    interviewData.interview_date,
    interviewData.start_time,
    interviewData.end_time
  );
  if (conflict) return next(new CustomError('User already has an interview scheduled during this time', 409));

  const interview = await interviewRepository.createInterview({
    user_id: userId,
    ...interviewData,
    media_id: interviewData.media_id || null
  });

  res.success(interview, 'Interview scheduled successfully', 201);
});


exports.getInterviewConversation = asyncErrorHandler(async (req, res, next) => {
  const { interviewId } = req.params;

  const interview = await interviewRepository.findInterviewById(interviewId);
  if (!interview) return next(new CustomError('Interview not found', 404));

  const conversation = await interviewConversationRepository.findConversationByInterviewId(interviewId);

  if(!conversation) return next(new CustomError("no conversation Found", 404))

  const videofeed= await interviewConversationRepository.findVideoFeedByInterviewId(interviewId)
  const parsedConversation = JSON.parse(conversation.conversation);

  res.success({parsedConversation,videofeed} , 'Interview conversation retrieved successfully', 200);
  
});
