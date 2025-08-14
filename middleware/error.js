import { AppError } from '../utils/error.js';

export const errorHandler = (
  err,
  req,
  res,
  next
) => {
  // Handle known error types
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      status: 'error',
      message: err.message,
      ...(process.env.NODE_ENV === 'development' && {
        stack: err.stack,
      }),
    });
  }

  // Handle Zod validation errors
  if (err.name === 'ZodError') {
    return res.status(400).json({
      status: 'fail',
      errors: err.message,
    });
  }

  // Handle JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      status: 'fail',
      message: 'Invalid token',
    });
  }

  // Handle other unexpected errors
  console.error('⚠️ Error:', err);
  return res.status(500).json({
    status: 'error',
    message: 'Something went wrong',
    ...(process.env.NODE_ENV === 'development' && {
      error: err.message,
      stack: err.stack,
    }),
  });
};