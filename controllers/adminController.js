const { Job,User } = require('../models'); 

const createJob = async (req, res, next) => {
  try {
    const { title, description, requirements } = req.body;

    if (!title || !description || !requirements) {
      return res.status(400).json({ message: 'All job fields are required' });
    }

    const newJob = await Job.create({
      user_id: req.user.user_id,
      title,
      description,
      requirements
    });

    res.status(201).json({
      message: 'Job created successfully',
      job: newJob
    });
  } catch (err) {
    console.error('Job creation error:', err);
    next(err);
  }
};

const getMyJobs = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 5;
    const offset = (page - 1) * limit;

    const user = await User.findByPk(req.user.user_id);

    let count, jobs;
    // here 2 is the user type & 1 is the admin type
    if (user.user_type_id == 2) {
      ({ count, rows: jobs } = await Job.findAndCountAll({
        limit,
        offset,
        order: [['createdAt', 'DESC']],
      }));
    } else {
      ({ count, rows: jobs } = await Job.findAndCountAll({
        where: { user_id: req.user.user_id },
        limit,
        offset,
        order: [['createdAt', 'DESC']],
      }));
    }

    res.status(200).json({
      currentPage: page,
      totalPages: Math.ceil(count / limit),
      totalJobs: count,
      jobs,
    });
  } catch (err) {
    console.error('Error fetching jobs:', err);
    res.status(500).json({ message: 'Server error' });
  }
};



const updateJobById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { title, description, requirements } = req.body;

    const job = await Job.findByPk(id);

    if (!job) {
      return res.status(404).json({ message: 'Job not found' });
    }

    await job.update({
      title: title ?? job.title,
      description: description ?? job.description,
      requirements: requirements ?? job.requirements,
    });

    res.status(200).json({
      message: 'Job updated successfully',
      job: {
        job_id: job.job_id,
        title: job.title,
        description: job.description,
        requirements: job.requirements,
        updatedAt: job.updatedAt,
      }
    });
  } catch (err) {
    console.error('Update job error:', err);
    next(err);
  }
};

const deleteJobById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const job = await Job.findByPk(id);

    if (!job) {
      return res.status(404).json({ message: 'Job not found' });
    }

    await job.destroy();

    res.status(200).json({ message: 'Job deleted successfully' });
  } catch (err) {
    console.error('Delete job error:', err);
    next(err);
  }
};


module.exports = { createJob ,getMyJobs,updateJobById,deleteJobById};
