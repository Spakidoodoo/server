import { z } from 'zod';

export const registerSchema = z.object({
  body: z.object({
    email: z.string().email("Invalid email address"),
    password: z.string().min(8, "Password must be at least 8 characters"),
    displayName: z.string().min(2, "Display name too short"),
  })
});

export const loginSchema = z.object({
  body: z.object({
    email: z.string().email(),
    password: z.string().min(8),
  })
});

export const refreshTokenSchema = z.object({
  body: z.object({
    refreshToken: z.string(),
  })
});

export const requestPasswordResetSchema = z.object({
  body: z.object({
    email: z.string().email(),
  })
});

export const resetPasswordSchema = z.object({
  body: z.object({
    token: z.string(),
    newPassword: z.string().min(8),
  })
});