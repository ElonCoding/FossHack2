import { Request, Response } from 'express';
import { prisma } from '../index';
import { z } from 'zod';
import { AuthRequest } from '../middlewares/authMiddleware';
import crypto from 'crypto';

const ticketTypeSchema = z.object({
  name: z.string().min(2),
  price: z.number().min(0),
  limit: z.number().int().positive(),
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

const createOrderSchema = z.object({
  eventId: z.string().uuid(),
  ticketTypeId: z.string().uuid(),
  quantity: z.number().int().positive().default(1),
});

export const createOrder = async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    const parsedParams = createOrderSchema.safeParse(req.body);

    if (!parsedParams.success) {
      return res.status(400).json({ message: 'Invalid input', errors: parsedParams.error.issues });
    }

    const { eventId, ticketTypeId, quantity } = parsedParams.data;
    const userId = req.user!.id;

    // Check if event exists and is published
    const event = await prisma.event.findUnique({ where: { id: eventId } });
    if (!event || event.status !== 'PUBLISHED') {
      return res.status(404).json({ message: 'Valid event not found' });
    }

    // Check ticket type availability
    const ticketType = await prisma.ticketType.findUnique({ where: { id: ticketTypeId } });
    if (!ticketType || ticketType.eventId !== eventId) {
      return res.status(400).json({ message: 'Invalid ticket type' });
    }

    if (ticketType.sold + quantity > ticketType.limit) {
      return res.status(400).json({ message: 'Not enough tickets available' });
    }

    // Calculate total amount
    const totalAmount = ticketType.price * quantity;

    // Create Order
    // In a real app, we would initiate payment here (Stripe/Razorpay)
    // For now, we simulate a successful payment immediately
    const order = await prisma.order.create({
      data: {
        userId,
        eventId,
        totalAmount,
        status: 'COMPLETED', // Simulating successful payment
        paymentRef: `PAY-${crypto.randomBytes(4).toString('hex').toUpperCase()}`,
      },
    });

    // Generate Tickets
    const ticketsData = [];
    for (let i = 0; i < quantity; i++) {
      ticketsData.push({
        userId,
        eventId,
        ticketTypeId,
        orderId: order.id,
        qrCodeValue: crypto.randomBytes(16).toString('hex'), // Unique QR value
      });
    }

    await prisma.ticket.createMany({
      data: ticketsData,
    });

    // Update sold count
    await prisma.ticketType.update({
      where: { id: ticketTypeId },
      data: { sold: { increment: quantity } },
    });

    res.status(201).json({ 
      message: 'Order created and tickets generated successfully', 
      orderId: order.id 
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error creating order' });
  }
};

export const getMyTickets = async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    const userId = req.user!.id;
    const tickets = await prisma.ticket.findMany({
      where: { userId },
      include: {
        event: { select: { title: true, date: true, location: true } },
        ticketType: { select: { name: true, price: true } },
        order: { select: { status: true, paymentRef: true } }
      },
      orderBy: { event: { date: 'asc' } }
    });
    
    res.status(200).json({ tickets });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error fetching tickets' });
  }
};
