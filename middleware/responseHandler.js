const generateToken = require('../config/jwt');

const responseHandler = (req, res, next) => {
  /**
   * Success response
   * @param {object} data - Response data
   * @param {string} message - Success message
   * @param {number} statusCode - HTTP status code
   */
  res.success = (data = null, message = 'Success', statusCode = 200) => {
    const response = {
      status: 'success',
      message,
      data
    };

    if (data && data.token) {
      response.token = data.token;
      delete data.token;
    }

    return res.status(statusCode).json(response);
  };

  /**
   * Error response
   * @param {string} message - Error message
   * @param {number} statusCode - HTTP status code
   * @param {object} error - Error object
   */
  res.error = (message = 'Error occurred', statusCode = 500, error = null) => {
    const response = {
      status: 'error',
      message
    };

    if (error && process.env.NODE_ENV === 'development') {
      response.error = error;
    }

    return res.status(statusCode).json(response);
  };

  next();
};

module.exports = responseHandler;