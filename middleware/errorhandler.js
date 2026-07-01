export const errorHandler = (err, req, res, next) => {

    let statusCode = 500; // Default to internal server error
    let errorResponse = {
        title: err.title ||'Error',
        code: err.code || 'UNKNOWN_ERROR',
        message: err.message || 'Something went wrong',
        StakeTrace: err.stack || "null"
    };
    if(err.name == 'MongoServerError'){
        errorResponse.message = 'MongoError';
    }
    else if(err.name == 'MongooseError'){
        errorResponse.message = 'MongooseError';
    }


    switch (errorResponse.message) {
        case 'MongooseError':
            statusCode = 400;
            errorResponse.title = 'Mongoose Error';
            errorResponse.message = 'Database Not Connected';
            break;
        case 'NotFoundError':
            statusCode = 404;
            errorResponse.title = 'Not Found';
            break;
        case 'MongoError':
            if (err.code === 11000) { // MongoDB duplicate key error
                statusCode = 400;
                errorResponse.title = 'Duplicate Key Error';
                errorResponse.message = 'Duplicate key error';
            }
            break;
        case 'BadRequestError':
            statusCode = 400;
            errorResponse.title = 'Bad Request';
            errorResponse.message = 'Bad request';
            break;
        case 'JsonWebTokenError':
            statusCode = 401;
            errorResponse.title = 'Invalid Token';
            errorResponse.message = 'Invalid token';
            break;
        case 'TokenExpiredError':
            statusCode = 401;
            errorResponse.title = 'Token Expired';
            errorResponse.message = 'Token expired';
            break;
        case 'SyntaxError':
            statusCode = 400;
            errorResponse.title = 'Syntax Error';
            errorResponse.message = 'Invalid JSON';
            break;
        case 'CastError':
            statusCode = 400;
            errorResponse.title = 'Cast Error';
            errorResponse.message = 'Invalid ID';
            break;
        case 'ValidationError':
            statusCode = 400;
            errorResponse.title = 'Validation Error';
            errorResponse.message = err.message;
            errorResponse.details = err.errors;
            break;
        case 'UnauthorizedError':
            statusCode = 401;
            errorResponse.title = 'Unauthorized';
            errorResponse.message = 'Authentication is required for the request';
            break;
        case 'ForbiddenError':
            statusCode = 403;
            errorResponse.title = 'Forbidden';
            errorResponse.message = 'The client does not have permission to access the resource';
            break;
        case 'ConflictError':
            statusCode = 409;
            errorResponse.title = 'Conflict';
            errorResponse.message = 'The request conflicts with the current state of the resource';
            break;
        case 'TooManyRequestsError':
            statusCode = 429;
            errorResponse.title = 'Too Many Requests';
            errorResponse.message = 'The user has sent too many requests in a given timeframe';
            break;
        default:
            statusCode = 500;
            errorResponse.title = 'Internal Server Error';
            errorResponse.message = 'Something went wrong';
            break;
    }
    errorResponse.code = statusCode;

    res.status(statusCode).json(errorResponse);
};