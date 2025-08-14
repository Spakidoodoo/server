import { Router } from 'express';
import {
  registerUser,
  loginUser,
  refreshToken,
  getCurrentUser,
  requestPasswordReset,
  resetPassword,
} from '../controllers/auth.js';
import { authenticate } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import {
  registerSchema,
  loginSchema,
  refreshTokenSchema,
  requestPasswordResetSchema,
  resetPasswordSchema,
} from '../validations/auth.js';

const router = Router();
 
// Public routes
router.post('/register', validate(registerSchema), registerUser);
router.post('/login', validate(loginSchema), loginUser);
router.post('/refresh-token', validate(refreshTokenSchema), refreshToken);
router.post('/request-password-reset', validate(requestPasswordResetSchema), requestPasswordReset);
router.post('/reset-password', validate(resetPasswordSchema), resetPassword);

// Protected route (requires JWT)
router.get('/me', authenticate, getCurrentUser);

export default router;