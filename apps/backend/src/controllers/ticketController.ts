import { Request, Response } from 'express';
import { prisma } from '../index';
import { z } from 'zod';
import { AuthRequest } from '../middlewares/authMiddleware';
import crypto from 'crypto';

const ticketTypeSchema = z.object({
  name: z.string().min(2),
  price: z.number().min(0),
  quantity: z.number().int().positive(),
  description: z.string().optional(),
});

export const createTicketType = async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    const { eventId } = req.params;
    const parsedParams = ticketTypeSchema.safeParse(req.body);

    if (!parsedParams.success) {
      return res.status(400).json({ message: 'Invalid input', errors: parsedParams.error.issues });
    }

    const event = await prisma.event.findUnique({ where: { id: eventId } });

    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    if (event.organizerId !== req.user!.id && req.user!.role !== 'ADMIN') {
      return res.status(403).json({ message: 'Forbidden: You do not own this event' });
    }

    const ticketType = await prisma.ticketType.create({
      data: {
        ...parsedParams.data,
        eventId,
      },
    });

    res.status(201).json({ message: 'Ticket type created successfully', ticketType });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error creating ticket type' });
  }
};

export const getTicketTypes = async (req: Request, res: Response): Promise<any> => {
  try {
    const { eventId } = req.params;
    const ticketTypes = await prisma.ticketType.findMany({ where: { eventId } });
    res.status(200).json({ ticketTypes });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error fetching ticket types' });
  }
};

const registerSchema = z.object({
  eventId: z.string().uuid(),
  ticketTypeId: z.string().uuid(),
});

export const registerForEvent = async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    const parsedParams = registerSchema.safeParse(req.body);

    if (!parsedParams.success) {
      return res.status(400).json({ message: 'Invalid input', errors: parsedParams.error.issues });
    }

    const { eventId, ticketTypeId } = parsedParams.data;
    const userId = req.user!.id;

    // Check if event exists and is published
    const event = await prisma.event.findUnique({ where: { id: eventId } });
    if (!event || event.status !== 'PUBLISHED') {
      return res.status(404).json({ message: 'Valid event not found' });
    }

    // Check if user is already registered for this event
    const existingRegistration = await prisma.registration.findFirst({
      where: { userId, eventId, paymentStatus: { in: ['PENDING', 'COMPLETED'] } },
    });
    if (existingRegistration) {
      return res.status(400).json({ message: 'You already have an active registration for this event' });
    }

    // Check capacity and ticket type
    const ticketType = await prisma.ticketType.findUnique({ where: { id: ticketTypeId } });
    if (!ticketType || ticketType.eventId !== eventId) {
      return res.status(400).json({ message: 'Invalid ticket type' });
    }

    const currentRegistrations = await prisma.registration.count({
      where: { eventId, paymentStatus: 'COMPLETED' },
    });

    if (currentRegistrations >= event.capacity) {
      return res.status(400).json({ message: 'Event is at full capacity' });
    }

    // Create registration (PENDING status by default)
    const registration = await prisma.registration.create({
      data: {
        userId,
        eventId,
        ticketTypeId,
        paymentStatus: ticketType.price === 0 ? 'COMPLETED' : 'PENDING',
        qrCodeData: crypto.randomBytes(16).toString('hex'), // Initial QR data, to be finalized after payment
      },
      include: {
        event: { select: { title: true, date: true } },
        ticketType: { select: { name: true, price: true } }
      }
    });

    res.status(201).json({ 
      message: ticketType.price === 0 ? 'Registered successfully' : 'Registration initiated, please complete payment',
      registration 
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error during registration' });
  }
};

const verifyPaymentSchema = z.object({
  paymentId: z.string().min(1),
  status: z.enum(['COMPLETED', 'FAILED']),
});

export const verifyPayment = async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    const { id } = req.params;
    const parsedParams = verifyPaymentSchema.safeParse(req.body);

    if (!parsedParams.success) {
      return res.status(400).json({ message: 'Invalid input', errors: parsedParams.error.issues });
    }

    const registration = await prisma.registration.findUnique({ where: { id } });

    if (!registration) {
      return res.status(404).json({ message: 'Registration not found' });
    }

    if (registration.userId !== req.user!.id && req.user!.role !== 'ADMIN') {
      return res.status(403).json({ message: 'Forbidden' });
    }

    // In a real app, verify with Stripe/Razorpay API here using paymentId.
    // For this prototype, we accept the mock status.

    const updatedRegistration = await prisma.registration.update({
      where: { id },
      data: {
        paymentStatus: parsedParams.data.status,
        paymentId: parsedParams.data.paymentId,
      },
    });

    res.status(200).json({ message: 'Payment status updated', registration: updatedRegistration });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error processing payment' });
  }
};

export const getUserRegistrations = async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    const registrations = await prisma.registration.findMany({
      where: { userId: req.user!.id },
      include: {
        event: { select: { id: true, title: true, date: true, location: true } },
        ticketType: { select: { name: true, price: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.status(200).json({ registrations });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error fetching registrations' });
  }
};
