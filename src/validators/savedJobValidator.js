const Joi = require('joi');

const saveJobSchema = Joi.object({
  jobId: Joi.number().integer().positive().required()
    .messages({
      'number.base': 'Job ID must be a number',
      'number.integer': 'Job ID must be an integer',
      'number.positive': 'Job ID must be positive',
      'any.required': 'Job ID is required'
    })
});

const getSavedJobsSchema = Joi.object({
  page: Joi.number().integer().min(1).optional()
    .messages({
      'number.base': 'Page must be a number',
      'number.integer': 'Page must be an integer',
      'number.min': 'Page must be at least 1'
    }),
  limit: Joi.number().integer().min(1).max(100).optional()
    .messages({
      'number.base': 'Limit must be a number',
      'number.integer': 'Limit must be an integer',
      'number.min': 'Limit must be at least 1',
      'number.max': 'Limit cannot exceed 100'
    })
});

const validateSaveJob = (req, res, next) => {
  const { error } = saveJobSchema.validate({ jobId: parseInt(req.params.jobId) });
  
  if (error) {
    return res.status(400).json({
      success: false,
      message: error.details[0].message
    });
  }
  
  next();
};

const validateGetSavedJobs = (req, res, next) => {
  const { error } = getSavedJobsSchema.validate(req.query);
  
  if (error) {
    return res.status(400).json({
      success: false,
      message: error.details[0].message
    });
  }
  
  next();
};

module.exports = {
  validateSaveJob,
  validateGetSavedJobs
}; 