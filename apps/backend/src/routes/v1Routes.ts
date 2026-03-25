import { Router, Request, Response } from 'express';
import { ObjectId } from 'mongodb';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { getDb } from '../lib/db';
import { authMiddleware, AuthRequest, requireRole, requireWritable } from '../middlewares/authMiddleware';

const router = Router();

const roleSchema = z.enum(['STUDENT', 'ORGANIZER', 'ADMIN']);
const eventStatusSchema = z.enum(['DRAFT', 'PUBLISHED', 'COMPLETED', 'CANCELLED']);
const ticketStatusSchema = z.enum(['ACTIVE', 'USED', 'CANCELLED']);
const paymentStatusSchema = z.enum(['PENDING', 'COMPLETED', 'FAILED', 'REFUNDED']);

const registerSchema = z.object({
  username: z.string().min(3).max(32).optional(),
  name: z.string().min(2).max(80),
  email: z.string().email().transform((v) => v.trim().toLowerCase()),
  password: z.string().min(8).max(128),
  role: roleSchema.optional(),
  profile: z
    .object({
      phone: z.string().optional(),
      college: z.string().optional(),
      year: z.string().optional(),
    })
    .optional(),
});

const loginSchema = z.object({
  identifier: z.string().min(1).optional(),
  email: z.string().min(1).optional(),
  password: z.string().min(1),
});

const createEventSchema = z.object({
  title: z.string().min(3),
  slug: z.string().min(3),
  description: z.string().min(10),
  bannerUrl: z.string().optional(),
  organizerId: z.string().optional(),
  location: z.object({
    venue: z.string().min(2),
    city: z.string().min(2),
    country: z.string().min(2),
  }),
  eventDate: z.string(),
  registrationDeadline: z.string(),
  ticketTypes: z
    .array(
      z.object({
        name: z.string().min(2),
        price: z.number().min(0),
        limit: z.number().int().positive(),
      })
    )
    .min(1),
  status: eventStatusSchema.optional(),
});

const updateEventSchema = createEventSchema.partial();

const createRegistrationSchema = z.object({
  userId: z.string().optional(),
  eventId: z.string(),
  ticketType: z.string(),
  registrationData: z.record(z.string(), z.any()).default({}),
});

const createTicketSchema = z.object({
  ticketCode: z.string().min(4).optional(),
  eventId: z.string(),
  userId: z.string(),
  qrCodeUrl: z.string().optional(),
  status: ticketStatusSchema.optional(),
});

const createPaymentSchema = z.object({
  userId: z.string(),
  eventId: z.string(),
  amount: z.number().nonnegative(),
  currency: z.string().default('INR'),
  gateway: z.string().default('RAZORPAY'),
  gatewayPaymentId: z.string().optional(),
  status: paymentStatusSchema.optional(),
});

const createCheckinSchema = z.object({
  ticketId: z.string(),
  eventId: z.string(),
});

const createNotificationSchema = z.object({
  userId: z.string(),
  title: z.string().min(2),
  message: z.string().min(2),
  type: z.string().default('EMAIL'),
  isRead: z.boolean().optional(),
});

const createAnnouncementSchema = z.object({
  eventId: z.string(),
  title: z.string().min(2),
  message: z.string().min(2),
});

const profileSchema = z.object({
  name: z.string().min(2).max(80).optional(),
  profile: z
    .object({
      phone: z.string().optional(),
      college: z.string().optional(),
      year: z.string().optional(),
    })
    .optional(),
});

const passwordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8).max(128),
});

const resetPasswordSchema = z.object({
  token: z.string().min(20),
  password: z.string().min(8).max(128),
});

const toParam = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] || '' : value || '');

const toObjectId = (value: string | string[] | undefined) => {
  const normalized = toParam(value);
  if (!ObjectId.isValid(normalized)) {
    throw new Error('Invalid id');
  }
  return new ObjectId(normalized);
};

const serialize = (value: any): any => {
  if (value instanceof ObjectId) return value.toString();
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return value.map(serialize);
  if (value && typeof value === 'object') {
    const out: Record<string, any> = {};
    for (const [k, v] of Object.entries(value)) out[k] = serialize(v);
    return out;
  }
  return value;
};

const sanitizeUser = (userDoc: any) => {
  const user = serialize(userDoc);
  delete user.password;
  delete user.passwordResetToken;
  delete user.passwordResetExpires;
  user.id = user._id;
  delete user._id;
  return user;
};

const sanitizeDoc = (doc: any) => {
  const serialized = serialize(doc);
  if (serialized && serialized._id) {
    serialized.id = serialized._id;
    delete serialized._id;
  }
  return serialized;
};

const signToken = (user: any) =>
  jwt.sign(
    {
      id: user._id.toString(),
      role: user.role,
      isReadOnly: Boolean(user.isReadOnly),
    },
    process.env.JWT_SECRET || 'dev_secret_key_123',
    { expiresIn: '24h' }
  );

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

const requireSelfOrAdmin = (req: AuthRequest, targetUserId: string | string[] | undefined) =>
  req.user?.role === 'ADMIN' || req.user?.id === toParam(targetUserId);

router.post('/auth/register', async (req: Request, res: Response): Promise<any> => {
  try {
    const parsed = registerSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: 'Invalid input', errors: parsed.error.issues });
    }

    const db = getDb();
    const payload = parsed.data;
    const username = (payload.username || payload.email.split('@')[0] || payload.email).trim().toLowerCase();

    const existing = await db.collection('users').findOne({
      $or: [{ email: payload.email }, { username }],
    });
    if (existing) {
      return res.status(409).json({ message: 'User already exists' });
    }

    const passwordHash = await bcrypt.hash(payload.password, 12);
    const now = new Date();
    const result = await db.collection('users').insertOne({
      username,
      name: payload.name,
      email: payload.email,
      password: passwordHash,
      role: payload.role || 'STUDENT',
      profile: payload.profile || {},
      isVerified: true,
      isReadOnly: false,
      createdAt: now,
      updatedAt: now,
    });

    const user = await db.collection('users').findOne({ _id: result.insertedId });
    const token = signToken(user);
    res.cookie('auth_token', token, authCookieOptions());

    return res.status(201).json({
      message: 'User registered successfully',
      token,
      user: sanitizeUser(user),
    });
  } catch {
    return res.status(500).json({ message: 'Server error during registration' });
  }
});

router.post('/auth/login', async (req: Request, res: Response): Promise<any> => {
  try {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: 'Invalid input', errors: parsed.error.issues });
    }
    const rawIdentifier = parsed.data.identifier || parsed.data.email;
    if (!rawIdentifier) {
      return res.status(400).json({ message: 'Identifier or email is required' });
    }
    const identifier = rawIdentifier.trim().toLowerCase();
    const db = getDb();
    const userDoc = await db.collection('users').findOne({
      $or: [{ email: identifier }, { username: identifier }],
    });
    if (!userDoc) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    const isMatch = await bcrypt.compare(parsed.data.password, userDoc.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    const token = signToken(userDoc);
    res.cookie('auth_token', token, authCookieOptions());
    return res.status(200).json({
      message: 'Logged in successfully',
      token,
      user: sanitizeUser(userDoc),
    });
  } catch {
    return res.status(500).json({ message: 'Server error during login' });
  }
});

router.post('/auth/demo-login', async (_req: Request, res: Response): Promise<any> => {
  try {
    const db = getDb();
    const userDoc = await db.collection('users').findOne({ username: 'demo' });
    if (!userDoc) {
      return res.status(404).json({ message: 'Demo account not found' });
    }
    const token = signToken(userDoc);
    res.cookie('auth_token', token, authCookieOptions());
    return res.status(200).json({
      message: 'Demo login successful',
      token,
      user: sanitizeUser(userDoc),
    });
  } catch {
    return res.status(500).json({ message: 'Server error during demo login' });
  }
});

router.post('/auth/logout', async (_req: Request, res: Response): Promise<any> => {
  res.clearCookie('auth_token', { path: '/' });
  return res.status(200).json({ message: 'Logged out successfully' });
});

router.get('/auth/me', authMiddleware, async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    const db = getDb();
    const user = await db.collection('users').findOne({ _id: toObjectId(req.user!.id) });
    if (!user) return res.status(404).json({ message: 'User not found' });
    return res.status(200).json({ user: sanitizeUser(user) });
  } catch {
    return res.status(500).json({ message: 'Server error fetching profile' });
  }
});

router.put('/auth/profile', authMiddleware, requireWritable, async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    const parsed = profileSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: 'Invalid input', errors: parsed.error.issues });
    const db = getDb();
    await db.collection('users').updateOne(
      { _id: toObjectId(req.user!.id) },
      {
        $set: {
          ...parsed.data,
          updatedAt: new Date(),
        },
      }
    );
    const updated = await db.collection('users').findOne({ _id: toObjectId(req.user!.id) });
    return res.status(200).json({ message: 'Profile updated', user: sanitizeUser(updated) });
  } catch {
    return res.status(500).json({ message: 'Server error updating profile' });
  }
});

router.put('/auth/password', authMiddleware, requireWritable, async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    const parsed = passwordSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: 'Invalid input', errors: parsed.error.issues });
    const db = getDb();
    const user = await db.collection('users').findOne({ _id: toObjectId(req.user!.id) });
    if (!user) return res.status(404).json({ message: 'User not found' });
    const match = await bcrypt.compare(parsed.data.currentPassword, user.password);
    if (!match) return res.status(401).json({ message: 'Current password is incorrect' });
    const newHash = await bcrypt.hash(parsed.data.newPassword, 12);
    await db.collection('users').updateOne({ _id: user._id }, { $set: { password: newHash, updatedAt: new Date() } });
    return res.status(200).json({ message: 'Password updated' });
  } catch {
    return res.status(500).json({ message: 'Server error updating password' });
  }
});

router.post('/auth/forgot-password', async (req: Request, res: Response): Promise<any> => {
  const email = String(req.body?.email || '').trim().toLowerCase();
  if (!email) return res.status(400).json({ message: 'Invalid input' });
  const db = getDb();
  const user = await db.collection('users').findOne({ email });
  if (!user) return res.status(200).json({ message: 'If the email exists, reset token generated' });
  const token = new ObjectId().toHexString() + new ObjectId().toHexString();
  await db.collection('users').updateOne(
    { _id: user._id },
    {
      $set: {
        passwordResetToken: token,
        passwordResetExpires: new Date(Date.now() + 15 * 60 * 1000),
        updatedAt: new Date(),
      },
    }
  );
  return res.status(200).json({
    message: 'If the email exists, reset token generated',
    resetToken: process.env.NODE_ENV === 'production' ? undefined : token,
  });
});

router.post('/auth/reset-password', async (req: Request, res: Response): Promise<any> => {
  const parsed = resetPasswordSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: 'Invalid input', errors: parsed.error.issues });
  const db = getDb();
  const user = await db.collection('users').findOne({ passwordResetToken: parsed.data.token });
  if (!user || !user.passwordResetExpires || new Date(user.passwordResetExpires).getTime() < Date.now()) {
    return res.status(400).json({ message: 'Invalid or expired reset token' });
  }
  const password = await bcrypt.hash(parsed.data.password, 12);
  await db.collection('users').updateOne(
    { _id: user._id },
    {
      $set: { password, updatedAt: new Date() },
      $unset: { passwordResetToken: '', passwordResetExpires: '' },
    }
  );
  return res.status(200).json({ message: 'Password reset successful' });
});

router.get('/users', authMiddleware, requireRole(['ADMIN']), async (_req: AuthRequest, res: Response): Promise<any> => {
  const db = getDb();
  const users = await db.collection('users').find({}).sort({ createdAt: -1 }).toArray();
  return res.status(200).json({ users: users.map(sanitizeUser) });
});

router.get('/users/:id', authMiddleware, async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    if (!requireSelfOrAdmin(req, req.params.id)) return res.status(403).json({ message: 'Forbidden' });
    const db = getDb();
    const user = await db.collection('users').findOne({ _id: toObjectId(req.params.id) });
    if (!user) return res.status(404).json({ message: 'User not found' });
    return res.status(200).json({ user: sanitizeUser(user) });
  } catch {
    return res.status(400).json({ message: 'Invalid user id' });
  }
});

router.post('/users', authMiddleware, requireRole(['ADMIN']), async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    const parsed = registerSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: 'Invalid input', errors: parsed.error.issues });
    const db = getDb();
    const username = (parsed.data.username || parsed.data.email.split('@')[0] || parsed.data.email).trim().toLowerCase();
    const existing = await db.collection('users').findOne({ $or: [{ email: parsed.data.email }, { username }] });
    if (existing) return res.status(409).json({ message: 'User already exists' });
    const password = await bcrypt.hash(parsed.data.password, 12);
    const result = await db.collection('users').insertOne({
      username,
      name: parsed.data.name,
      email: parsed.data.email,
      password,
      role: parsed.data.role || 'STUDENT',
      profile: parsed.data.profile || {},
      isVerified: true,
      isReadOnly: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    const user = await db.collection('users').findOne({ _id: result.insertedId });
    return res.status(201).json({ user: sanitizeUser(user) });
  } catch {
    return res.status(500).json({ message: 'Server error creating user' });
  }
});

router.put('/users/:id', authMiddleware, async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    if (!requireSelfOrAdmin(req, req.params.id)) return res.status(403).json({ message: 'Forbidden' });
    if (req.user!.isReadOnly) return res.status(403).json({ message: 'Demo account is read-only' });
    const db = getDb();
    const payload = {
      ...req.body,
      updatedAt: new Date(),
    };
    if (payload.role && req.user!.role !== 'ADMIN') delete payload.role;
    if (payload.isReadOnly && req.user!.role !== 'ADMIN') delete payload.isReadOnly;
    await db.collection('users').updateOne({ _id: toObjectId(req.params.id) }, { $set: payload });
    const user = await db.collection('users').findOne({ _id: toObjectId(req.params.id) });
    if (!user) return res.status(404).json({ message: 'User not found' });
    return res.status(200).json({ user: sanitizeUser(user) });
  } catch {
    return res.status(400).json({ message: 'Invalid user id' });
  }
});

router.delete('/users/:id', authMiddleware, requireRole(['ADMIN']), async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    const db = getDb();
    const result = await db.collection('users').deleteOne({ _id: toObjectId(req.params.id) });
    if (!result.deletedCount) return res.status(404).json({ message: 'User not found' });
    return res.status(200).json({ message: 'User deleted' });
  } catch {
    return res.status(400).json({ message: 'Invalid user id' });
  }
});

router.get('/events', async (req: Request, res: Response): Promise<any> => {
  const db = getDb();
  const query: Record<string, any> = {};
  if (req.query.status) query.status = req.query.status;
  if (req.query.organizerId && ObjectId.isValid(String(req.query.organizerId))) {
    query.organizerId = toObjectId(String(req.query.organizerId));
  }
  const events = await db.collection('events').find(query).sort({ eventDate: 1 }).toArray();
  return res.status(200).json({ events: events.map(sanitizeDoc) });
});

router.get('/events/:idOrSlug', async (req: Request, res: Response): Promise<any> => {
  const db = getDb();
  const idOrSlug = toParam(req.params.idOrSlug);
  const query = ObjectId.isValid(idOrSlug) ? { _id: toObjectId(idOrSlug) } : { slug: idOrSlug };
  const event = await db.collection('events').findOne(query);
  if (!event) return res.status(404).json({ message: 'Event not found' });
  return res.status(200).json({ event: sanitizeDoc(event) });
});

router.post('/events', authMiddleware, requireRole(['ORGANIZER', 'ADMIN']), requireWritable, async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    const parsed = createEventSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: 'Invalid input', errors: parsed.error.issues });
    const payload = parsed.data;
    const db = getDb();
    const slugExists = await db.collection('events').findOne({ slug: payload.slug });
    if (slugExists) return res.status(409).json({ message: 'Slug already exists' });
    const organizerId = req.user!.role === 'ADMIN' && payload.organizerId ? toObjectId(payload.organizerId) : toObjectId(req.user!.id);
    const result = await db.collection('events').insertOne({
      ...payload,
      organizerId,
      eventDate: new Date(payload.eventDate),
      registrationDeadline: new Date(payload.registrationDeadline),
      status: payload.status || 'DRAFT',
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    const event = await db.collection('events').findOne({ _id: result.insertedId });
    return res.status(201).json({ event: sanitizeDoc(event) });
  } catch {
    return res.status(500).json({ message: 'Server error creating event' });
  }
});

router.put('/events/:eventId', authMiddleware, requireRole(['ORGANIZER', 'ADMIN']), requireWritable, async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    const parsed = updateEventSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: 'Invalid input', errors: parsed.error.issues });
    const db = getDb();
    const eventId = toObjectId(req.params.eventId);
    const existing = await db.collection('events').findOne({ _id: eventId });
    if (!existing) return res.status(404).json({ message: 'Event not found' });
    if (req.user!.role !== 'ADMIN' && String(existing.organizerId) !== req.user!.id) {
      return res.status(403).json({ message: 'Forbidden' });
    }
    const updateData: Record<string, any> = { ...parsed.data, updatedAt: new Date() };
    if (updateData.eventDate) updateData.eventDate = new Date(updateData.eventDate);
    if (updateData.registrationDeadline) updateData.registrationDeadline = new Date(updateData.registrationDeadline);
    if (updateData.organizerId) updateData.organizerId = toObjectId(updateData.organizerId);
    await db.collection('events').updateOne({ _id: eventId }, { $set: updateData });
    const event = await db.collection('events').findOne({ _id: eventId });
    return res.status(200).json({ event: sanitizeDoc(event) });
  } catch {
    return res.status(400).json({ message: 'Invalid event id' });
  }
});

router.delete('/events/:eventId', authMiddleware, requireRole(['ORGANIZER', 'ADMIN']), requireWritable, async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    const db = getDb();
    const eventId = toObjectId(req.params.eventId);
    const existing = await db.collection('events').findOne({ _id: eventId });
    if (!existing) return res.status(404).json({ message: 'Event not found' });
    if (req.user!.role !== 'ADMIN' && String(existing.organizerId) !== req.user!.id) return res.status(403).json({ message: 'Forbidden' });
    await db.collection('events').deleteOne({ _id: eventId });
    return res.status(200).json({ message: 'Event deleted' });
  } catch {
    return res.status(400).json({ message: 'Invalid event id' });
  }
});

router.patch('/events/:eventId/publish', authMiddleware, requireRole(['ORGANIZER', 'ADMIN']), requireWritable, async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    const db = getDb();
    const eventId = toObjectId(req.params.eventId);
    const existing = await db.collection('events').findOne({ _id: eventId });
    if (!existing) return res.status(404).json({ message: 'Event not found' });
    if (req.user!.role !== 'ADMIN' && String(existing.organizerId) !== req.user!.id) return res.status(403).json({ message: 'Forbidden' });
    await db.collection('events').updateOne({ _id: eventId }, { $set: { status: 'PUBLISHED', updatedAt: new Date() } });
    const updated = await db.collection('events').findOne({ _id: eventId });
    return res.status(200).json({ event: sanitizeDoc(updated) });
  } catch {
    return res.status(400).json({ message: 'Invalid event id' });
  }
});

router.post('/events/:eventId/register', authMiddleware, requireWritable, async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    const parsed = createRegistrationSchema.safeParse({
      ...req.body,
      eventId: req.params.eventId,
      userId: req.user!.id,
    });
    if (!parsed.success) return res.status(400).json({ message: 'Invalid input', errors: parsed.error.issues });
    const db = getDb();
    const event = await db.collection('events').findOne({ _id: toObjectId(parsed.data.eventId) });
    if (!event) return res.status(404).json({ message: 'Event not found' });
    const existing = await db.collection('registrations').findOne({
      userId: toObjectId(parsed.data.userId!),
      eventId: toObjectId(parsed.data.eventId),
    });
    if (existing) return res.status(409).json({ message: 'Already registered' });
    const result = await db.collection('registrations').insertOne({
      userId: toObjectId(parsed.data.userId!),
      eventId: toObjectId(parsed.data.eventId),
      ticketType: parsed.data.ticketType,
      registrationData: parsed.data.registrationData || {},
      paymentStatus: 'PENDING',
      createdAt: new Date(),
    });
    const registration = await db.collection('registrations').findOne({ _id: result.insertedId });
    return res.status(201).json({ registration: sanitizeDoc(registration) });
  } catch {
    return res.status(400).json({ message: 'Invalid request' });
  }
});

router.get('/registrations/me', authMiddleware, async (req: AuthRequest, res: Response): Promise<any> => {
  const db = getDb();
  const registrations = await db.collection('registrations').find({ userId: toObjectId(req.user!.id) }).sort({ createdAt: -1 }).toArray();
  return res.status(200).json({ registrations: registrations.map(sanitizeDoc) });
});

router.get('/registrations', authMiddleware, requireRole(['ADMIN']), async (_req: AuthRequest, res: Response): Promise<any> => {
  const db = getDb();
  const registrations = await db.collection('registrations').find({}).sort({ createdAt: -1 }).toArray();
  return res.status(200).json({ registrations: registrations.map(sanitizeDoc) });
});

router.get('/registrations/:registrationId', authMiddleware, async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    const db = getDb();
    const registration = await db.collection('registrations').findOne({ _id: toObjectId(req.params.registrationId) });
    if (!registration) return res.status(404).json({ message: 'Registration not found' });
    if (req.user!.role !== 'ADMIN' && String(registration.userId) !== req.user!.id) return res.status(403).json({ message: 'Forbidden' });
    return res.status(200).json({ registration: sanitizeDoc(registration) });
  } catch {
    return res.status(400).json({ message: 'Invalid registration id' });
  }
});

router.put('/registrations/:registrationId', authMiddleware, requireWritable, async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    const db = getDb();
    const registrationId = toObjectId(req.params.registrationId);
    const registration = await db.collection('registrations').findOne({ _id: registrationId });
    if (!registration) return res.status(404).json({ message: 'Registration not found' });
    if (req.user!.role !== 'ADMIN' && String(registration.userId) !== req.user!.id) return res.status(403).json({ message: 'Forbidden' });
    await db.collection('registrations').updateOne({ _id: registrationId }, { $set: { ...req.body } });
    const updated = await db.collection('registrations').findOne({ _id: registrationId });
    return res.status(200).json({ registration: sanitizeDoc(updated) });
  } catch {
    return res.status(400).json({ message: 'Invalid registration id' });
  }
});

router.get('/events/:eventId/registrations', authMiddleware, requireRole(['ORGANIZER', 'ADMIN']), async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    const db = getDb();
    const event = await db.collection('events').findOne({ _id: toObjectId(req.params.eventId) });
    if (!event) return res.status(404).json({ message: 'Event not found' });
    if (req.user!.role !== 'ADMIN' && String(event.organizerId) !== req.user!.id) return res.status(403).json({ message: 'Forbidden' });
    const registrations = await db.collection('registrations').find({ eventId: toObjectId(req.params.eventId) }).sort({ createdAt: -1 }).toArray();
    return res.status(200).json({ registrations: registrations.map(sanitizeDoc) });
  } catch {
    return res.status(400).json({ message: 'Invalid event id' });
  }
});

router.delete('/registrations/:registrationId', authMiddleware, requireWritable, async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    const db = getDb();
    const registration = await db.collection('registrations').findOne({ _id: toObjectId(req.params.registrationId) });
    if (!registration) return res.status(404).json({ message: 'Registration not found' });
    if (req.user!.role !== 'ADMIN' && String(registration.userId) !== req.user!.id) return res.status(403).json({ message: 'Forbidden' });
    await db.collection('registrations').deleteOne({ _id: registration._id });
    return res.status(200).json({ message: 'Registration cancelled' });
  } catch {
    return res.status(400).json({ message: 'Invalid registration id' });
  }
});

router.post('/tickets/generate', authMiddleware, requireWritable, async (req: AuthRequest, res: Response): Promise<any> => {
  const parsed = createTicketSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: 'Invalid input', errors: parsed.error.issues });
  const db = getDb();
  const code = parsed.data.ticketCode || `EVT-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
  const result = await db.collection('tickets').insertOne({
    ticketCode: code,
    eventId: toObjectId(parsed.data.eventId),
    userId: toObjectId(parsed.data.userId),
    qrCodeUrl: parsed.data.qrCodeUrl || `/tickets/qr/${code}.png`,
    status: parsed.data.status || 'ACTIVE',
    issuedAt: new Date(),
  });
  const ticket = await db.collection('tickets').findOne({ _id: result.insertedId });
  return res.status(201).json({ ticket: sanitizeDoc(ticket) });
});

router.get('/tickets/:ticketCode', authMiddleware, async (req: AuthRequest, res: Response): Promise<any> => {
  const db = getDb();
  const ticket = await db.collection('tickets').findOne({ ticketCode: req.params.ticketCode });
  if (!ticket) return res.status(404).json({ message: 'Ticket not found' });
  if (req.user!.role !== 'ADMIN' && String(ticket.userId) !== req.user!.id) return res.status(403).json({ message: 'Forbidden' });
  return res.status(200).json({ ticket: sanitizeDoc(ticket) });
});

router.get('/tickets/verify/:ticketCode', authMiddleware, requireRole(['ORGANIZER', 'ADMIN']), async (req: AuthRequest, res: Response): Promise<any> => {
  const db = getDb();
  const ticket = await db.collection('tickets').findOne({ ticketCode: req.params.ticketCode });
  if (!ticket) return res.status(404).json({ message: 'Ticket not found' });
  return res.status(200).json({ ticket: sanitizeDoc(ticket), valid: ticket.status === 'ACTIVE' });
});

router.get('/tickets/me', authMiddleware, async (req: AuthRequest, res: Response): Promise<any> => {
  const db = getDb();
  const tickets = await db.collection('tickets').find({ userId: toObjectId(req.user!.id) }).sort({ issuedAt: -1 }).toArray();
  return res.status(200).json({ tickets: tickets.map(sanitizeDoc) });
});

router.get('/tickets', authMiddleware, requireRole(['ADMIN']), async (_req: AuthRequest, res: Response): Promise<any> => {
  const db = getDb();
  const tickets = await db.collection('tickets').find({}).sort({ issuedAt: -1 }).toArray();
  return res.status(200).json({ tickets: tickets.map(sanitizeDoc) });
});

router.get('/tickets/id/:id', authMiddleware, async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    const db = getDb();
    const ticket = await db.collection('tickets').findOne({ _id: toObjectId(req.params.id) });
    if (!ticket) return res.status(404).json({ message: 'Ticket not found' });
    if (req.user!.role !== 'ADMIN' && String(ticket.userId) !== req.user!.id) return res.status(403).json({ message: 'Forbidden' });
    return res.status(200).json({ ticket: sanitizeDoc(ticket) });
  } catch {
    return res.status(400).json({ message: 'Invalid ticket id' });
  }
});

router.put('/tickets/:id', authMiddleware, requireWritable, async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    const db = getDb();
    const ticketId = toObjectId(req.params.id);
    const ticket = await db.collection('tickets').findOne({ _id: ticketId });
    if (!ticket) return res.status(404).json({ message: 'Ticket not found' });
    if (req.user!.role !== 'ADMIN' && String(ticket.userId) !== req.user!.id) return res.status(403).json({ message: 'Forbidden' });
    const payload = { ...req.body };
    if (payload.eventId) payload.eventId = toObjectId(payload.eventId);
    if (payload.userId) payload.userId = toObjectId(payload.userId);
    await db.collection('tickets').updateOne({ _id: ticketId }, { $set: payload });
    const updated = await db.collection('tickets').findOne({ _id: ticketId });
    return res.status(200).json({ ticket: sanitizeDoc(updated) });
  } catch {
    return res.status(400).json({ message: 'Invalid ticket id' });
  }
});

router.delete('/tickets/:id', authMiddleware, requireWritable, async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    const db = getDb();
    const ticketId = toObjectId(req.params.id);
    const ticket = await db.collection('tickets').findOne({ _id: ticketId });
    if (!ticket) return res.status(404).json({ message: 'Ticket not found' });
    if (req.user!.role !== 'ADMIN' && String(ticket.userId) !== req.user!.id) return res.status(403).json({ message: 'Forbidden' });
    await db.collection('tickets').deleteOne({ _id: ticketId });
    return res.status(200).json({ message: 'Ticket deleted' });
  } catch {
    return res.status(400).json({ message: 'Invalid ticket id' });
  }
});

router.post('/payments/create-order', authMiddleware, requireWritable, async (req: AuthRequest, res: Response): Promise<any> => {
  const parsed = createPaymentSchema.safeParse({
    ...req.body,
    userId: req.body.userId || req.user!.id,
    status: 'PENDING',
  });
  if (!parsed.success) return res.status(400).json({ message: 'Invalid input', errors: parsed.error.issues });
  const db = getDb();
  const result = await db.collection('payments').insertOne({
    ...parsed.data,
    userId: toObjectId(parsed.data.userId),
    eventId: toObjectId(parsed.data.eventId),
    gatewayPaymentId: parsed.data.gatewayPaymentId || `pay_${new ObjectId().toHexString().slice(0, 8)}`,
    createdAt: new Date(),
  });
  const payment = await db.collection('payments').findOne({ _id: result.insertedId });
  return res.status(201).json({ payment: sanitizeDoc(payment) });
});

router.post('/payments/verify', authMiddleware, requireWritable, async (req: AuthRequest, res: Response): Promise<any> => {
  const paymentId = String(req.body?.paymentId || '');
  const status = paymentStatusSchema.safeParse(req.body?.status || 'COMPLETED');
  if (!paymentId || !status.success) return res.status(400).json({ message: 'Invalid input' });
  const db = getDb();
  const result = await db.collection('payments').updateOne(
    { _id: toObjectId(paymentId) },
    { $set: { status: status.data, updatedAt: new Date() } }
  );
  if (!result.matchedCount) return res.status(404).json({ message: 'Payment not found' });
  const payment = await db.collection('payments').findOne({ _id: toObjectId(paymentId) });
  return res.status(200).json({ payment: sanitizeDoc(payment) });
});

router.post('/payments/webhook', async (req: Request, res: Response): Promise<any> => {
  const gatewayPaymentId = String(req.body?.gatewayPaymentId || '');
  const status = paymentStatusSchema.safeParse(req.body?.status || 'COMPLETED');
  if (!gatewayPaymentId || !status.success) return res.status(400).json({ message: 'Invalid webhook payload' });
  const db = getDb();
  await db.collection('payments').updateOne(
    { gatewayPaymentId },
    { $set: { status: status.data, updatedAt: new Date() } }
  );
  return res.status(200).json({ received: true });
});

router.get('/payments/me', authMiddleware, async (req: AuthRequest, res: Response): Promise<any> => {
  const db = getDb();
  const query = req.user!.role === 'ADMIN' ? {} : { userId: toObjectId(req.user!.id) };
  const payments = await db.collection('payments').find(query).sort({ createdAt: -1 }).toArray();
  return res.status(200).json({ payments: payments.map(sanitizeDoc) });
});

router.get('/payments', authMiddleware, requireRole(['ADMIN']), async (_req: AuthRequest, res: Response): Promise<any> => {
  const db = getDb();
  const payments = await db.collection('payments').find({}).sort({ createdAt: -1 }).toArray();
  return res.status(200).json({ payments: payments.map(sanitizeDoc) });
});

router.get('/payments/:id', authMiddleware, async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    const db = getDb();
    const payment = await db.collection('payments').findOne({ _id: toObjectId(req.params.id) });
    if (!payment) return res.status(404).json({ message: 'Payment not found' });
    if (req.user!.role !== 'ADMIN' && String(payment.userId) !== req.user!.id) return res.status(403).json({ message: 'Forbidden' });
    return res.status(200).json({ payment: sanitizeDoc(payment) });
  } catch {
    return res.status(400).json({ message: 'Invalid payment id' });
  }
});

router.put('/payments/:id', authMiddleware, requireWritable, async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    const db = getDb();
    const paymentId = toObjectId(req.params.id);
    const payment = await db.collection('payments').findOne({ _id: paymentId });
    if (!payment) return res.status(404).json({ message: 'Payment not found' });
    if (req.user!.role !== 'ADMIN' && String(payment.userId) !== req.user!.id) return res.status(403).json({ message: 'Forbidden' });
    const payload = { ...req.body };
    if (payload.userId) payload.userId = toObjectId(payload.userId);
    if (payload.eventId) payload.eventId = toObjectId(payload.eventId);
    await db.collection('payments').updateOne({ _id: paymentId }, { $set: payload });
    const updated = await db.collection('payments').findOne({ _id: paymentId });
    return res.status(200).json({ payment: sanitizeDoc(updated) });
  } catch {
    return res.status(400).json({ message: 'Invalid payment id' });
  }
});

router.delete('/payments/:id', authMiddleware, requireWritable, async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    const db = getDb();
    const paymentId = toObjectId(req.params.id);
    const payment = await db.collection('payments').findOne({ _id: paymentId });
    if (!payment) return res.status(404).json({ message: 'Payment not found' });
    if (req.user!.role !== 'ADMIN' && String(payment.userId) !== req.user!.id) return res.status(403).json({ message: 'Forbidden' });
    await db.collection('payments').deleteOne({ _id: paymentId });
    return res.status(200).json({ message: 'Payment deleted' });
  } catch {
    return res.status(400).json({ message: 'Invalid payment id' });
  }
});

router.post('/checkin', authMiddleware, requireRole(['ORGANIZER', 'ADMIN']), requireWritable, async (req: AuthRequest, res: Response): Promise<any> => {
  const parsed = createCheckinSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: 'Invalid input', errors: parsed.error.issues });
  const db = getDb();
  const ticket = await db.collection('tickets').findOne({ _id: toObjectId(parsed.data.ticketId) });
  if (!ticket) return res.status(404).json({ message: 'Ticket not found' });
  if (String(ticket.eventId) !== parsed.data.eventId) return res.status(400).json({ message: 'Ticket not part of this event' });
  const exists = await db.collection('checkins').findOne({ ticketId: ticket._id, eventId: toObjectId(parsed.data.eventId) });
  if (exists) return res.status(409).json({ message: 'Ticket already checked in' });
  const result = await db.collection('checkins').insertOne({
    ticketId: ticket._id,
    eventId: toObjectId(parsed.data.eventId),
    checkedInBy: toObjectId(req.user!.id),
    checkedInAt: new Date(),
  });
  await db.collection('tickets').updateOne({ _id: ticket._id }, { $set: { status: 'USED' } });
  const checkin = await db.collection('checkins').findOne({ _id: result.insertedId });
  return res.status(201).json({ checkin: sanitizeDoc(checkin) });
});

router.get('/events/:eventId/checkins', authMiddleware, requireRole(['ORGANIZER', 'ADMIN']), async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    const db = getDb();
    const event = await db.collection('events').findOne({ _id: toObjectId(req.params.eventId) });
    if (!event) return res.status(404).json({ message: 'Event not found' });
    if (req.user!.role !== 'ADMIN' && String(event.organizerId) !== req.user!.id) return res.status(403).json({ message: 'Forbidden' });
    const checkins = await db.collection('checkins').find({ eventId: toObjectId(req.params.eventId) }).sort({ checkedInAt: -1 }).toArray();
    return res.status(200).json({ checkins: checkins.map(sanitizeDoc) });
  } catch {
    return res.status(400).json({ message: 'Invalid event id' });
  }
});

router.get('/checkins', authMiddleware, requireRole(['ADMIN']), async (_req: AuthRequest, res: Response): Promise<any> => {
  const db = getDb();
  const checkins = await db.collection('checkins').find({}).sort({ checkedInAt: -1 }).toArray();
  return res.status(200).json({ checkins: checkins.map(sanitizeDoc) });
});

router.get('/checkins/:id', authMiddleware, requireRole(['ORGANIZER', 'ADMIN']), async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    const db = getDb();
    const checkin = await db.collection('checkins').findOne({ _id: toObjectId(req.params.id) });
    if (!checkin) return res.status(404).json({ message: 'Checkin not found' });
    return res.status(200).json({ checkin: sanitizeDoc(checkin) });
  } catch {
    return res.status(400).json({ message: 'Invalid checkin id' });
  }
});

router.put('/checkins/:id', authMiddleware, requireRole(['ORGANIZER', 'ADMIN']), requireWritable, async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    const db = getDb();
    const checkinId = toObjectId(req.params.id);
    const checkin = await db.collection('checkins').findOne({ _id: checkinId });
    if (!checkin) return res.status(404).json({ message: 'Checkin not found' });
    const payload = { ...req.body };
    if (payload.ticketId) payload.ticketId = toObjectId(payload.ticketId);
    if (payload.eventId) payload.eventId = toObjectId(payload.eventId);
    if (payload.checkedInBy) payload.checkedInBy = toObjectId(payload.checkedInBy);
    await db.collection('checkins').updateOne({ _id: checkinId }, { $set: payload });
    const updated = await db.collection('checkins').findOne({ _id: checkinId });
    return res.status(200).json({ checkin: sanitizeDoc(updated) });
  } catch {
    return res.status(400).json({ message: 'Invalid checkin id' });
  }
});

router.delete('/checkins/:id', authMiddleware, requireRole(['ORGANIZER', 'ADMIN']), requireWritable, async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    const db = getDb();
    const result = await db.collection('checkins').deleteOne({ _id: toObjectId(req.params.id) });
    if (!result.deletedCount) return res.status(404).json({ message: 'Checkin not found' });
    return res.status(200).json({ message: 'Checkin deleted' });
  } catch {
    return res.status(400).json({ message: 'Invalid checkin id' });
  }
});

router.get('/notifications', authMiddleware, async (req: AuthRequest, res: Response): Promise<any> => {
  const db = getDb();
  const query = req.user!.role === 'ADMIN' ? {} : { userId: toObjectId(req.user!.id) };
  const notifications = await db.collection('notifications').find(query).sort({ createdAt: -1 }).toArray();
  return res.status(200).json({ notifications: notifications.map(sanitizeDoc) });
});

router.post('/notifications', authMiddleware, requireRole(['ORGANIZER', 'ADMIN']), requireWritable, async (req: AuthRequest, res: Response): Promise<any> => {
  const parsed = createNotificationSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: 'Invalid input', errors: parsed.error.issues });
  const db = getDb();
  const result = await db.collection('notifications').insertOne({
    userId: toObjectId(parsed.data.userId),
    title: parsed.data.title,
    message: parsed.data.message,
    type: parsed.data.type,
    isRead: parsed.data.isRead ?? false,
    createdAt: new Date(),
  });
  const notification = await db.collection('notifications').findOne({ _id: result.insertedId });
  return res.status(201).json({ notification: sanitizeDoc(notification) });
});

router.patch('/notifications/:id', authMiddleware, async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    const db = getDb();
    const notificationId = toObjectId(req.params.id);
    const notification = await db.collection('notifications').findOne({ _id: notificationId });
    if (!notification) return res.status(404).json({ message: 'Notification not found' });
    if (req.user!.role !== 'ADMIN' && String(notification.userId) !== req.user!.id) return res.status(403).json({ message: 'Forbidden' });
    await db.collection('notifications').updateOne(
      { _id: notificationId },
      { $set: { ...req.body, isRead: true } }
    );
    const updated = await db.collection('notifications').findOne({ _id: notificationId });
    return res.status(200).json({ notification: sanitizeDoc(updated) });
  } catch {
    return res.status(400).json({ message: 'Invalid notification id' });
  }
});

router.get('/notifications/:id', authMiddleware, async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    const db = getDb();
    const notification = await db.collection('notifications').findOne({ _id: toObjectId(req.params.id) });
    if (!notification) return res.status(404).json({ message: 'Notification not found' });
    if (req.user!.role !== 'ADMIN' && String(notification.userId) !== req.user!.id) return res.status(403).json({ message: 'Forbidden' });
    return res.status(200).json({ notification: sanitizeDoc(notification) });
  } catch {
    return res.status(400).json({ message: 'Invalid notification id' });
  }
});

router.put('/notifications/:id', authMiddleware, requireWritable, async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    const db = getDb();
    const notificationId = toObjectId(req.params.id);
    const notification = await db.collection('notifications').findOne({ _id: notificationId });
    if (!notification) return res.status(404).json({ message: 'Notification not found' });
    if (req.user!.role !== 'ADMIN' && String(notification.userId) !== req.user!.id) return res.status(403).json({ message: 'Forbidden' });
    await db.collection('notifications').updateOne({ _id: notificationId }, { $set: { ...req.body } });
    const updated = await db.collection('notifications').findOne({ _id: notificationId });
    return res.status(200).json({ notification: sanitizeDoc(updated) });
  } catch {
    return res.status(400).json({ message: 'Invalid notification id' });
  }
});

router.delete('/notifications/:id', authMiddleware, requireWritable, async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    const db = getDb();
    const notificationId = toObjectId(req.params.id);
    const notification = await db.collection('notifications').findOne({ _id: notificationId });
    if (!notification) return res.status(404).json({ message: 'Notification not found' });
    if (req.user!.role !== 'ADMIN' && String(notification.userId) !== req.user!.id) return res.status(403).json({ message: 'Forbidden' });
    await db.collection('notifications').deleteOne({ _id: notificationId });
    return res.status(200).json({ message: 'Notification deleted' });
  } catch {
    return res.status(400).json({ message: 'Invalid notification id' });
  }
});

router.post('/events/:eventId/announcements', authMiddleware, requireRole(['ORGANIZER', 'ADMIN']), requireWritable, async (req: AuthRequest, res: Response): Promise<any> => {
  const parsed = createAnnouncementSchema.safeParse({ ...req.body, eventId: req.params.eventId });
  if (!parsed.success) return res.status(400).json({ message: 'Invalid input', errors: parsed.error.issues });
  const db = getDb();
  const event = await db.collection('events').findOne({ _id: toObjectId(parsed.data.eventId) });
  if (!event) return res.status(404).json({ message: 'Event not found' });
  if (req.user!.role !== 'ADMIN' && String(event.organizerId) !== req.user!.id) return res.status(403).json({ message: 'Forbidden' });
  const result = await db.collection('announcements').insertOne({
    eventId: toObjectId(parsed.data.eventId),
    title: parsed.data.title,
    message: parsed.data.message,
    createdBy: toObjectId(req.user!.id),
    createdAt: new Date(),
  });
  const announcement = await db.collection('announcements').findOne({ _id: result.insertedId });
  return res.status(201).json({ announcement: sanitizeDoc(announcement) });
});

router.get('/events/:eventId/announcements', async (req: Request, res: Response): Promise<any> => {
  try {
    const db = getDb();
    const announcements = await db.collection('announcements').find({ eventId: toObjectId(req.params.eventId) }).sort({ createdAt: -1 }).toArray();
    return res.status(200).json({ announcements: announcements.map(sanitizeDoc) });
  } catch {
    return res.status(400).json({ message: 'Invalid event id' });
  }
});

router.get('/announcements', authMiddleware, requireRole(['ADMIN']), async (_req: AuthRequest, res: Response): Promise<any> => {
  const db = getDb();
  const announcements = await db.collection('announcements').find({}).sort({ createdAt: -1 }).toArray();
  return res.status(200).json({ announcements: announcements.map(sanitizeDoc) });
});

router.get('/announcements/:id', authMiddleware, requireRole(['ADMIN']), async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    const db = getDb();
    const announcement = await db.collection('announcements').findOne({ _id: toObjectId(req.params.id) });
    if (!announcement) return res.status(404).json({ message: 'Announcement not found' });
    return res.status(200).json({ announcement: sanitizeDoc(announcement) });
  } catch {
    return res.status(400).json({ message: 'Invalid announcement id' });
  }
});

router.put('/announcements/:id', authMiddleware, requireRole(['ORGANIZER', 'ADMIN']), requireWritable, async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    const db = getDb();
    const id = toObjectId(req.params.id);
    const existing = await db.collection('announcements').findOne({ _id: id });
    if (!existing) return res.status(404).json({ message: 'Announcement not found' });
    if (req.user!.role !== 'ADMIN' && String(existing.createdBy) !== req.user!.id) return res.status(403).json({ message: 'Forbidden' });
    await db.collection('announcements').updateOne({ _id: id }, { $set: { ...req.body } });
    const updated = await db.collection('announcements').findOne({ _id: id });
    return res.status(200).json({ announcement: sanitizeDoc(updated) });
  } catch {
    return res.status(400).json({ message: 'Invalid announcement id' });
  }
});

router.delete('/announcements/:id', authMiddleware, requireRole(['ORGANIZER', 'ADMIN']), requireWritable, async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    const db = getDb();
    const id = toObjectId(req.params.id);
    const existing = await db.collection('announcements').findOne({ _id: id });
    if (!existing) return res.status(404).json({ message: 'Announcement not found' });
    if (req.user!.role !== 'ADMIN' && String(existing.createdBy) !== req.user!.id) return res.status(403).json({ message: 'Forbidden' });
    await db.collection('announcements').deleteOne({ _id: id });
    return res.status(200).json({ message: 'Announcement deleted' });
  } catch {
    return res.status(400).json({ message: 'Invalid announcement id' });
  }
});

export default router;
