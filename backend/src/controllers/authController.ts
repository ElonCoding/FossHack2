import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { getDb } from '../lib/db';
import { z } from 'zod';
import { AuthRequest } from '../middlewares/authMiddleware';
import { ObjectId } from 'mongodb';

const registerSchema = z.object({
  name: z.string().min(2).max(80),
  email: z.string().email().transform((value) => value.trim().toLowerCase()),
  password: z
    .string()
    .min(8)
    .max(128)
    .regex(/[A-Z]/)
    .regex(/[a-z]/)
    .regex(/[0-9]/),
  role: z.enum(['STUDENT', 'ORGANIZER']).optional(),
});

const loginSchema = z.object({
  email: z.string().email().transform((value) => value.trim().toLowerCase()),
  password: z.string().min(1),
});

const forgotPasswordSchema = z.object({
  email: z.string().email().transform((value) => value.trim().toLowerCase()),
});

const resetPasswordSchema = z.object({
  token: z.string().min(20),
  password: z
    .string()
    .min(8)
    .max(128)
    .regex(/[A-Z]/)
    .regex(/[a-z]/)
    .regex(/[0-9]/),
});

const signToken = (id: string, role: string) =>
  jwt.sign({ id, role }, process.env.JWT_SECRET || 'dev_secret_key_123', {
    expiresIn: '24h',
  });

const authCookieOptions = () => {
  const isProduction = process.env.NODE_ENV === 'production';
  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? ('none' as const) : ('lax' as const),
    maxAge: 24 * 60 * 60 * 1000,
    path: '/',
  };
};

const mapUser = (userDoc: any) => ({
  id: userDoc._id.toString(),
  name: userDoc.name,
  email: userDoc.email,
  role: userDoc.role,
  createdAt: userDoc.createdAt,
});

export const register = async (req: Request, res: Response): Promise<any> => {
  try {
    const parsedParams = registerSchema.safeParse(req.body);
    if (!parsedParams.success) {
      return res.status(400).json({ message: 'Invalid input', errors: parsedParams.error.issues });
    }

    const { name, email, password, role } = parsedParams.data;
    const db = getDb();
    const existingUser = await db.collection('users').findOne({ email });
    if (existingUser) {
      return res.status(409).json({ message: 'User already exists' });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const result = await db.collection('users').insertOne({
      name,
      email,
      password: passwordHash,
      role: role || 'STUDENT',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const user = {
      id: result.insertedId.toString(),
      name,
      email,
      role: role || 'STUDENT',
    };
    const token = signToken(user.id, user.role);
    res.cookie('auth_token', token, authCookieOptions());

    return res.status(201).json({
      message: 'User registered successfully',
      token,
      user,
    });
  } catch (error) {
    console.error('Register error:', error);
    return res.status(500).json({ message: 'Server error during registration' });
  }
};

export const login = async (req: Request, res: Response): Promise<any> => {
  try {
    const parsedParams = loginSchema.safeParse(req.body);
    if (!parsedParams.success) {
      return res.status(400).json({ message: 'Invalid input', errors: parsedParams.error.issues });
    }

    const { email, password } = parsedParams.data;
    const db = getDb();
    const userDoc = await db.collection('users').findOne({ email });
    if (!userDoc) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const isMatch = await bcrypt.compare(password, userDoc.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const user = mapUser(userDoc);
    const token = signToken(user.id, user.role);
    res.cookie('auth_token', token, authCookieOptions());

    return res.status(200).json({
      message: 'Logged in successfully',
      token,
      user,
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ message: 'Server error during login' });
  }
};

export const logout = async (_req: Request, res: Response): Promise<any> => {
  res.clearCookie('auth_token', { path: '/' });
  return res.status(200).json({ message: 'Logged out successfully' });
};

export const getMe = async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ message: 'Not authenticated' });
    }
    const db = getDb();
    const userDoc = await db.collection('users').findOne({ _id: new ObjectId(req.user.id) });
    if (!userDoc) {
      return res.status(404).json({ message: 'User not found' });
    }
    return res.status(200).json({ user: mapUser(userDoc) });
  } catch (error) {
    console.error('GetMe error:', error);
    return res.status(500).json({ message: 'Server error fetching user profile' });
  }
};

export const forgotPassword = async (req: Request, res: Response): Promise<any> => {
  try {
    const parsedParams = forgotPasswordSchema.safeParse(req.body);
    if (!parsedParams.success) {
      return res.status(400).json({ message: 'Invalid input', errors: parsedParams.error.issues });
    }

    const { email } = parsedParams.data;
    const db = getDb();
    const userDoc = await db.collection('users').findOne({ email });
    if (!userDoc) {
      return res.status(200).json({ message: 'If the email exists, a reset link has been generated' });
    }

    const rawResetToken = crypto.randomBytes(32).toString('hex');
    const hashedResetToken = crypto.createHash('sha256').update(rawResetToken).digest('hex');
    const passwordResetExpires = new Date(Date.now() + 15 * 60 * 1000);

    await db.collection('users').updateOne(
      { _id: userDoc._id },
      { $set: { passwordResetToken: hashedResetToken, passwordResetExpires, updatedAt: new Date() } }
    );

    return res.status(200).json({
      message: 'If the email exists, a reset link has been generated',
      resetToken: process.env.NODE_ENV === 'production' ? undefined : rawResetToken,
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    return res.status(500).json({ message: 'Server error during forgot password' });
  }
};

export const resetPassword = async (req: Request, res: Response): Promise<any> => {
  try {
    const parsedParams = resetPasswordSchema.safeParse(req.body);
    if (!parsedParams.success) {
      return res.status(400).json({ message: 'Invalid input', errors: parsedParams.error.issues });
    }

    const { token, password } = parsedParams.data;
    const hashedResetToken = crypto.createHash('sha256').update(token).digest('hex');
    const db = getDb();
    const userDoc = await db.collection('users').findOne({ passwordResetToken: hashedResetToken });
    if (!userDoc || !userDoc.passwordResetExpires || new Date(userDoc.passwordResetExpires).getTime() < Date.now()) {
      return res.status(400).json({ message: 'Invalid or expired reset token' });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    await db.collection('users').updateOne(
      { _id: userDoc._id },
      {
        $set: { password: passwordHash, updatedAt: new Date() },
        $unset: { passwordResetToken: '', passwordResetExpires: '' },
      }
    );

    return res.status(200).json({ message: 'Password reset successful' });
  } catch (error) {
    console.error('Reset password error:', error);
    return res.status(500).json({ message: 'Server error during password reset' });
  }
};
