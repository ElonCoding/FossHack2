import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { getDb } from '../lib/db';
import { z } from 'zod';
import { AuthRequest } from '../middlewares/authMiddleware';
import { ObjectId } from 'mongodb';

const registerSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
  role: z.enum(['STUDENT', 'ORGANIZER']).optional(),
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
      return res.status(400).json({ message: 'User already exists' });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

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

    const token = jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET || 'dev_secret_key_123', {
      expiresIn: '24h',
    });

    res.status(201).json({
      message: 'User registered successfully',
      token,
      user,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error during registration' });
  }
};

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

export const login = async (req: Request, res: Response): Promise<any> => {
  try {
    const parsedParams = loginSchema.safeParse(req.body);

    if (!parsedParams.success) {
      return res.status(400).json({ message: 'Invalid input', errors: parsedParams.error.issues });
    }

    const { email, password } = parsedParams.data;
    console.log('Login attempt for:', email);
    const db = getDb();

    const userDoc = await db.collection('users').findOne({ email });
    console.log('User looked up:', !!userDoc);
    if (!userDoc) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    const isMatch = await bcrypt.compare(password, userDoc.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    const user = {
      id: userDoc._id.toString(),
      name: userDoc.name,
      email: userDoc.email,
      role: userDoc.role,
    };

    const token = jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET || 'dev_secret_key_123', {
      expiresIn: '24h',
    });

    res.status(200).json({
      message: 'Logged in successfully',
      token,
      user,
    });
  } catch (error) {
    console.error('Login error detail:', error);
    console.error('Full stack trace of catch:', new Error().stack);
    res.status(500).json({ message: 'Server error during login' });
  }
};

export const getMe = async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    const db = getDb();
    const userDoc = await db.collection('users').findOne(
      { _id: new ObjectId(req.user?.id) }
    );

    if (!userDoc) {
      return res.status(404).json({ message: 'User not found' });
    }

    const user = {
      id: userDoc._id.toString(),
      name: userDoc.name,
      email: userDoc.email,
      role: userDoc.role,
      createdAt: userDoc.createdAt,
    };

    res.status(200).json({ user });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error fetching user profile' });
  }
};
