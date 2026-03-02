/**
 * Standard Success Response
 */
const sendSuccess = (res, message, data = null, statusCode = 200) => {
  res.status(statusCode).json({
    success: true,
    message,
    data
  });
};

/**
 * Standard Error Response
 */
const sendError = (res, message, statusCode = 500, details = null) => {
  res.status(statusCode).json({
    success: false,
    error: message,
    details: process.env.NODE_ENV === 'development' ? details : undefined
  });
};

module.exports = { sendSuccess, sendError };
