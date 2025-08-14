import jwt from 'jsonwebtoken';

export const generateAccessToken = (userId) => {
  return jwt.sign(
    { userId },
    process.env.JWT_ACCESS_SECRET,
    { expiresIn: '7d' } // Short-lived for security
  );
};

export const generateRefreshToken = (userId) => {
  return jwt.sign(
    { userId },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: '7d' } // Long-lived for session persistence
  );
};

export const verifyRefreshToken = (token) => {
  return jwt.verify(token, process.env.JWT_REFRESH_SECRET)
};