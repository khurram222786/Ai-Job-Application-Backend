const { Job, User } = require('./../models');
const asyncErrorHandler = require('./../utils/asyncErrorHandler');
const CustomError = require('./../utils/customError');

exports.createJob = asyncErrorHandler(async (req, res, next) => {
    const { title, description, requirements } = req.body;

    if (!title || !description || !requirements) {
        return next(new CustomError('All job fields are required', 400));
    }

    const newJob = await Job.create({
        user_id: req.user.user_id,
        title,
        description,
        requirements
    });

    res.status(201).json({
        status: 'success',
        message: 'Job created successfully',
        job: newJob
    });
});

exports.getMyJobs = asyncErrorHandler(async (req, res, next) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 5;
    const offset = (page - 1) * limit;

    const user = await User.findByPk(req.user.user_id);

    if (!user) {
        return next(new CustomError('User not found', 404));
    }

    let queryOptions = {
        limit,
        offset,
        order: [['createdAt', 'DESC']]
    };

    if (user.user_type_id !== 2) {
        queryOptions.where = { user_id: req.user.user_id };
    }

    const { count, rows: jobs } = await Job.findAndCountAll(queryOptions);

    res.status(200).json({
        status: 'success',
        currentPage: page,
        totalPages: Math.ceil(count / limit),
        totalJobs: count,
        jobs
    });
});

exports.updateJobById = asyncErrorHandler(async (req, res, next) => {
    const { id } = req.params;
    const { title, description, requirements } = req.body;

    const job = await Job.findByPk(id);

    if (!job) {
        return next(new CustomError('Job not found', 404));
    }

    await job.update({
        title: title ?? job.title,
        description: description ?? job.description,
        requirements: requirements ?? job.requirements
    });

    res.status(200).json({
        status: 'success',
        message: 'Job updated successfully',
        job: {
            job_id: job.job_id,
            title: job.title,
            description: job.description,
            requirements: job.requirements,
            updatedAt: job.updatedAt
        }
    });
});

exports.deleteJobById = asyncErrorHandler(async (req, res, next) => {
    const { id } = req.params;

    const job = await Job.findByPk(id);

    if (!job) {
        return next(new CustomError('Job not found', 404));
    }

    await job.destroy();

    res.status(200).json({
        status: 'success',
        message: 'Job deleted successfully'
    });
});
