// Known "signal" errors: controllers/middleware that throw `new Error('SomeCode')`
// as a plain string code (no res.status() set beforehand rely on this map).
const KNOWN_CODES = {
  NotFoundError: { statusCode: 404, title: 'Not Found', message: 'Resource not found' },
  BadRequestError: { statusCode: 400, title: 'Bad Request', message: 'Bad request' },
  JsonWebTokenError: { statusCode: 401, title: 'Invalid Token', message: 'Invalid token' },
  TokenExpiredError: { statusCode: 401, title: 'Token Expired', message: 'Token expired' },
  UnauthorizedError: { statusCode: 401, title: 'Unauthorized', message: 'Authentication is required for the request' },
  ForbiddenError: { statusCode: 403, title: 'Forbidden', message: 'The client does not have permission to access the resource' },
  ConflictError: { statusCode: 409, title: 'Conflict', message: 'The request conflicts with the current state of the resource' },
  TooManyRequestsError: { statusCode: 429, title: 'Too Many Requests', message: 'The user has sent too many requests in a given timeframe' },
};

export const errorHandler = (err, req, res, next) => {
  let statusCode;
  let title = 'Error';
  let message = err.message || 'Something went wrong';
  let details;

  if (KNOWN_CODES[err.message]) {
    // Custom signal error thrown by our own code, e.g. `throw new Error('ForbiddenError')`
    ({ statusCode, title, message } = KNOWN_CODES[err.message]);
  } else if (err.name === 'ValidationError') {
    // Real Mongoose validation error
    statusCode = 400;
    title = 'Validation Error';
    details = err.errors;
  } else if (err.name === 'CastError') {
    statusCode = 400;
    title = 'Cast Error';
    message = 'Invalid ID';
  } else if (err.name === 'MongoServerError' && err.code === 11000) {
    statusCode = 400;
    title = 'Duplicate Key Error';
    message = 'A record with this value already exists';
  } else if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    title = 'Invalid Token';
    message = 'Invalid token';
  } else if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    title = 'Token Expired';
    message = 'Token expired';
  } else if (err.name === 'SyntaxError') {
    statusCode = 400;
    title = 'Syntax Error';
    message = 'Invalid JSON';
  } else if (res.statusCode && res.statusCode !== 200) {
    // Controller already called res.status(xxx) before throwing — respect it
    // instead of silently downgrading it to 500. Keep the controller's own message.
    statusCode = res.statusCode;
    title = statusCode >= 500 ? 'Internal Server Error' : 'Error';
  } else {
    statusCode = 500;
    title = 'Internal Server Error';
  }

  if (statusCode >= 500) {
    console.error(err);
  }

  const errorResponse = { title, code: statusCode, message };
  if (details) errorResponse.details = details;
  if (process.env.NODE_ENV !== 'production') errorResponse.stackTrace = err.stack;

  res.status(statusCode).json(errorResponse);
};
