const { Job } = require('../models'); 

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
    const limit = parseInt(req.query.limit) || 2;
    const offset = (page - 1) * limit;

    const { count, rows: jobs } = await Job.findAndCountAll({
      where: { user_id: req.user.user_id },
      attributes: ['title', 'description', 'requirements', 'createdAt'], // select only fields you want
      limit,
      offset,
      order: [['createdAt', 'DESC']],
    });

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


module.exports = { createJob ,getMyJobs};
