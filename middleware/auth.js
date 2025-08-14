import jwt from 'jsonwebtoken';
import { prisma } from '../config/prisma.js';
import { UnauthorizedError, ForbiddenError } from '../utils/error.js';


/**
 * Verify JWT token and attach user to request
 */
export const authenticate = async (req,
  res,
  next) => {
  try {
    // 1. Extract token from header
    const token = req.header('Authorization')?.replace('Bearer ', '');

    // console.log('Authenticating token:', token);
    if (!token) throw new UnauthorizedError('Access denied. No token provided.');

    // 2. Verify token
    const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET)
    // 3. Fetch user and attach to request
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        role: true,
        artist: { select: { id: true } }, // For artist-specific routes
      },
    });

    if (!user) throw new UnauthorizedError('Invalid token: User not found');

    req.user = {
      id: user.id,
      role: user.role,
      artistId: user.artist?.id || null,
    };
    req.token = token;

    console.log('Authenticated user:', req.user);

    next();
  } catch (err) {
    if (err instanceof jwt.TokenExpiredError) {
      next(new UnauthorizedError('Token expired'));
    } else if (err instanceof jwt.JsonWebTokenError) {
      next(new UnauthorizedError('Invalid token'));
    } else {
      next(err);
    }
  }
};

/**
 * Role-based access control (RBAC)
 */
export const  requireRole = (roles) => {
  return (req, res, next) => {
    if (!req.user) throw new UnauthorizedError('Authentication required');
    if (!roles.includes(req.user.role)) {
      throw new ForbiddenError('Insufficient permissions');
    }
    next();
  };
};

/**
 * Validate refresh token (for token rotation)
 */
export const validateRefreshToken = async (
  req,
  res,
  next
) => {
  const { refreshToken } = req.body;
  if (!refreshToken) throw new UnauthorizedError('Refresh token required');

  try {
    const payload = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET)
    // Optional: Check if token is blacklisted (e.g., after logout)
    // const isBlacklisted = await redis.get(`refreshToken:${refreshToken}`);
    // if (isBlacklisted) throw new UnauthorizedError('Token revoked');

    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: { id: true },
    });

    if (!user) throw new UnauthorizedError('Invalid refresh token');

    req.user = { id: user.id, role: 'LISTENER' }; // Role doesn't matter here
    next();
  } catch (err) {
    next(new UnauthorizedError('Invalid refresh token'));
  }
};

export const optionalAuth = (req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');
  
  if (token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
      req.user = { id: decoded.userId };
    } catch (err) {
      // Token exists but invalid - proceed as guest
    }
  }
  next();
};