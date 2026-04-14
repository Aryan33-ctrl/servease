const { sendError } = require('../utils/response');

const errorHandler = (err, req, res, next) => {
  console.error(err.stack);

  let message = err.message || 'Server Error';
  let statusCode = err.statusCode || 500;
  let errors = null;

  // MongoDB Bad ObjectId
  if (err.name === 'CastError') {
    message = 'Resource not found';
    statusCode = 404;
  }

  // MongoDB Duplicate Key (e.g. creating user with existing email)
  if (err.code === 11000) {
    message = 'Duplicate field value entered';
    statusCode = 400;
  }

  // MongoDB Validation Error
  if (err.name === 'ValidationError') {
    message = Object.values(err.errors).map(val => val.message).join(', ');
    statusCode = 400;
  }

  // JWT Errors
  if (err.name === 'JsonWebTokenError') {
    message = 'Invalid token. Please log in again.';
    statusCode = 401;
  }

  if (err.name === 'TokenExpiredError') {
    message = 'Your token has expired. Please log in again.';
    statusCode = 401;
  }

  // express-validator custom error passing if passed via next(err)
  if (err.array) {
    message = 'Validation Failed';
    statusCode = 400;
    errors = err.array();
  }

  sendError(res, message, statusCode, errors);
};

module.exports = errorHandler;
