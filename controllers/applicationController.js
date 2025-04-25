const { Application, Job, Media } = require('../models');

const applyForJob = async (req, res) => {
  try {
    const jobId = req.params.jobId;
    const userId = req.user.user_id;

    const job = await Job.findByPk(jobId);
    if (!job) {
      return res.status(404).json({ message: 'Job not found' });
    }

    const existingApplication = await Application.findOne({
      where: { user_id: userId, job_id: jobId }
    });
    if (existingApplication) {
      return res.status(400).json({ message: 'Already applied for this job' });
    }

    
    const newApplication = await Application.create({
      status: 'pending',
      user_id: userId,
      job_id: jobId,
      
    });

    res.status(201).json({
      message: 'Application submitted successfully',
      application: newApplication
    });

  } catch (err) {
    console.error('Error applying for job:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = { applyForJob };
