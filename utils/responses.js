const successResponse = (res, data, message = 'Success', statusCode = 200) => {
    return res.status(statusCode).json({
        success: true,
        message,
        data,
    });
};

const errorResponse = (res, error, message = 'An error occurred', statusCode = 500) => {
    return res.status(statusCode).json({
        success: false,
        message,
        error: error instanceof Error ? error.message : error,
    });
};

const paginationResponse = (res, data, total, page, limit) => {
    return res.status(200).json({
        success: true,
        data,
        pagination: {
            total,
            page,
            limit,
        },
    });
};

export { successResponse, errorResponse, paginationResponse };