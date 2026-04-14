/**
 * Standardized API Responses
 */

const sendSuccess = (res, data = null, message = 'Success', statusCode = 200) => {
  res.status(statusCode).json({
    success: true,
    message,
    data
  });
};

const sendError = (res, message = 'Server Error', statusCode = 500, errors = null) => {
  const response = {
    success: false,
    message
  };
  
  if (errors) {
    response.errors = errors;
  }

  res.status(statusCode).json(response);
};

module.exports = {
  sendSuccess,
  sendError
};
