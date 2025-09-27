const errorHandler = (err, req, res, next) => {
    // Log the error for debugging purposes
    console.error(err);

    // Determine the status code and message
    const statusCode = err.statusCode || 500;
    const message = err.message || 'Internal Server Error';

    // Send the standardized error response
    res.status(statusCode).json({
        success: false,
        message: message,
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack }) // Include stack trace in development
    });
};

module.exports = errorHandler;