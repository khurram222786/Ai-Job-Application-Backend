const { Application, Job, Interview } = require('../models');
const asyncErrorHandler = require('../Utils/asyncErrorHandler');
const CustomError = require('../Utils/customError');



exports.applyForJob = asyncErrorHandler(async (req, res, next) => {
  const { jobId } = req.params;
  const userId = req.user.user_id;

  const job = await Job.findByPk(jobId);
  if (!job) {
    return next(new CustomError('Job not found', 404));
  }

  const existingApplication = await Application.findOne({
    where: { user_id: userId, job_id: jobId }
  });

  if (existingApplication) {
    return next(new CustomError('You have already applied for this job', 400));
  }

  const newApplication = await Application.create({
    user_id: userId,
    job_id: jobId,
    status: 'pending'
  });

  res.status(201).json({
    status: 'success',
    message: 'Application submitted successfully',
    application: newApplication
  });
});

exports.getUserInterviews = asyncErrorHandler(async (req, res, next) => {
  const userId = req.user.user_id;

  const interviews = await Interview.findAll({
    where: { user_id: userId },
    attributes: ['id', 'start_time', 'end_time', 'interview_date', 'user_id'],
    order: [['interview_date', 'ASC']]
  });

  if (!interviews.length) {
    return next(new CustomError('No interviews scheduled yet', 404));
  }

  res.status(200).json({
    status: 'success',
    count: interviews.length,
    interviews
  });
});
