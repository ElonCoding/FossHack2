import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
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

    const event = await prisma.event.findUnique({ where: { id: eventId as string } });

    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    if (event.organizerId !== req.user!.id && req.user!.role !== 'ADMIN') {
      return res.status(403).json({ message: 'Forbidden: You do not own this event' });
    }

    const ticketType = await prisma.ticketType.create({
      data: {
        ...parsedParams.data,
        eventId: eventId as string,
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
    const ticketTypes = await prisma.ticketType.findMany({ where: { eventId: eventId as string } });
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

    // Use a transaction to ensure atomicity
    const result = await prisma.$transaction(async (tx) => {
      // 1. Re-check ticket availability inside transaction
      const currentTicketType = await tx.ticketType.findUnique({
        where: { id: ticketTypeId },
      });

      if (!currentTicketType || currentTicketType.eventId !== eventId) {
        throw new Error('Invalid ticket type');
      }

      if (currentTicketType.sold + quantity > currentTicketType.limit) {
        throw new Error('Not enough tickets available');
      }

      // 2. Calculate amount
      const totalAmount = currentTicketType.price * quantity;

      // 3. Create Order
      const order = await tx.order.create({
        data: {
          userId,
          eventId,
          totalAmount,
          status: 'COMPLETED',
          paymentRef: `PAY-${crypto.randomBytes(4).toString('hex').toUpperCase()}`,
        },
      });

      // 4. Generate Tickets
      const ticketsData = Array.from({ length: quantity }).map(() => ({
        userId,
        eventId,
        ticketTypeId,
        orderId: order.id,
        qrCodeValue: crypto.randomBytes(16).toString('hex'),
      }));

      await tx.ticket.createMany({
        data: ticketsData,
      });

      // 5. Update sold count
      await tx.ticketType.update({
        where: { id: ticketTypeId },
        data: { sold: { increment: quantity } },
      });

      return order;
    });

    res.status(201).json({ 
      message: 'Order created and tickets generated successfully', 
      orderId: result.id 
    });

  } catch (error: any) {
    console.error(error);
    res.status(400).json({ message: error.message || 'Server error creating order' });
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
