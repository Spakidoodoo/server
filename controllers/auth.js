import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../config/prisma.js';
import {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
} from '../utils/jwt.js';
import { sendPasswordResetEmail } from '../services/email.js';

// Register a new user
export const registerUser = async (req, res) => {

  // console.log("endpoint hit: registerUser");
  const { email, password, displayName } = req.body;
// console.log( "email, password, displayName", email, password, displayName);
  try {
    // Check if user exists
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ error: 'Email already in use' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create user
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash: hashedPassword,
        displayName,
        role: 'LISTENER', // Default role
      },
    });

    // Generate tokens
    const accessToken = generateAccessToken(user.id);
    const refreshToken = generateRefreshToken(user.id);

    res.status(201).json({
      user: {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        role: user.role,
      },
      tokens: { accessToken, refreshToken },
    });
  } catch (err) {
    console.log("Error in registerUser:", err);
    res.status(500).json({ error: 'Registration failed' });
  }
};

// Login user
export const loginUser = async (req, res) => {
  console.log("endpoint hit: loginUser");
  const { email, password } = req.body;

  try {
    // Find user
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Generate tokens
    const accessToken = generateAccessToken(user.id);
    const refreshToken = generateRefreshToken(user.id);

    res.json({
      user: {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        role: user.role,
      },
      tokens: { accessToken, refreshToken },
    });
  } catch (err) {
    console.log("Error in loginUser:", err);
    res.status(500).json({ error: 'Login failed' });
  }
};

// Refresh access token
export const refreshToken = async (req, res) => {
  const { refreshToken } = req.body;
console.log("endpoint hit: refreshToken", refreshToken);
  try {
    const payload = verifyRefreshToken(refreshToken);
    const user = await prisma.user.findUnique({ where: { id: payload.userId } });

    if (!user) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    const newAccessToken = generateAccessToken(user.id);
    res.json({ accessToken: newAccessToken });
  } catch (err) {
    console.log("Error in refreshToken:", err);
    res.status(401).json({ error: 'Token expired or invalid' });
  }
};

// Get current user profile
export const getCurrentUser = async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user.id },
    select: {
      id: true,
      email: true,
      displayName: true,
      role: true,
      avatarUrl: true,
      artist: { select: { stageName: true } },
    },
  });

  res.json(user);
};

// Request password reset
export const requestPasswordReset = async (req, res) => {
  const { email } = req.body;

  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(404).json({ error: 'Email not found' });
    }

    const resetToken = jwt.sign(
      { userId: user.id },
      process.env.JWT_ACCESS_SECRET,
      { expiresIn: '1h' }
    );

    await sendPasswordResetEmail(user.email, resetToken);
    res.json({ message: 'Password reset email sent' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to send reset email' });
  }
};

// Reset password
export const resetPassword = async (req, res) => {
  const { token, newPassword } = req.body;

  try {
    const payload = jwt.verify(token, process.env.JWT_ACCESS_SECRET) 

    const hashedPassword = await bcrypt.hash(newPassword, 12);
    await prisma.user.update({
      where: { id: payload.userId },
      data: { passwordHash: hashedPassword },
    });

    res.json({ message: 'Password updated successfully' });
  } catch (err) {
    res.status(400).json({ error: 'Invalid or expired token' });
  }
};