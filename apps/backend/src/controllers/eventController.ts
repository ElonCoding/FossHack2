import { Request, Response } from 'express';
import { prisma } from '../index';
import { z } from 'zod';
import { AuthRequest } from '../middlewares/authMiddleware';

const createEventSchema = z.object({
  title: z.string().min(3),
  description: z.string().min(10),
  date: z.string(), // ISO date string
  location: z.string().min(3),
  capacity: z.number().int().positive(),
});

export const createEvent = async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    const parsedParams = createEventSchema.safeParse(req.body);

    if (!parsedParams.success) {
      return res.status(400).json({ message: 'Invalid input', errors: parsedParams.error.issues });
    }

    const { title, description, date, location, capacity } = parsedParams.data;
    const organizerId = req.user!.id;

    const event = await prisma.event.create({
      data: {
        title,
        description,
        date: new Date(date),
        location,
        capacity,
        organizerId,
        status: 'DRAFT',
      },
    });

    res.status(201).json({ message: 'Event created successfully', event });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error creating event' });
  }
};

export const getEvents = async (req: Request, res: Response): Promise<any> => {
  try {
    const status = req.query.status as string;
    const whereClause = status ? { status: status as any } : { status: 'PUBLISHED' };

    const events = await prisma.event.findMany({
      where: whereClause,
      include: {
        organizer: { select: { id: true, name: true, email: true } },
        ticketTypes: true,
      },
      orderBy: { date: 'asc' },
    });

    res.status(200).json({ events });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error fetching events' });
  }
};

export const getEventById = async (req: Request, res: Response): Promise<any> => {
  try {
    const { id } = req.params;
    const event = await prisma.event.findUnique({
      where: { id },
      include: {
        organizer: { select: { id: true, name: true, email: true } },
        ticketTypes: true,
      },
    });

    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    res.status(200).json({ event });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error fetching event' });
  }
};

export const updateEvent = async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    const { id } = req.params;
    const updateData = req.body;
    
    if (updateData.date) {
      updateData.date = new Date(updateData.date);
    }

    const event = await prisma.event.findUnique({ where: { id } });

    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    if (event.organizerId !== req.user!.id && req.user!.role !== 'ADMIN') {
      return res.status(403).json({ message: 'Forbidden: You do not own this event' });
    }

    const updatedEvent = await prisma.event.update({
      where: { id },
      data: updateData,
    });

    res.status(200).json({ message: 'Event updated successfully', event: updatedEvent });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error updating event' });
  }
};

const updateStatusSchema = z.object({
  status: z.enum(['DRAFT', 'PUBLISHED', 'COMPLETED']),
});

export const updateEventStatus = async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    const { id } = req.params;
    const parsedParams = updateStatusSchema.safeParse(req.body);

    if (!parsedParams.success) {
      return res.status(400).json({ message: 'Invalid status', errors: parsedParams.error.issues });
    }

    const event = await prisma.event.findUnique({ where: { id } });

    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    if (event.organizerId !== req.user!.id && req.user!.role !== 'ADMIN') {
      return res.status(403).json({ message: 'Forbidden: You do not own this event' });
    }

    const updatedEvent = await prisma.event.update({
      where: { id },
      data: { status: parsedParams.data.status },
    });

    res.status(200).json({ message: `Event status updated to ${parsedParams.data.status}`, event: updatedEvent });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error updating event status' });
  }
};
