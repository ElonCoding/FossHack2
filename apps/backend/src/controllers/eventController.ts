import { Request, Response } from 'express';
import { getDb } from '../lib/db';
import { z } from 'zod';
import { AuthRequest } from '../middlewares/authMiddleware';
import { ObjectId } from 'mongodb';

const createEventSchema = z.object({
  title: z.string().min(3),
  description: z.string().min(10),
  date: z.string(), // ISO date string
  location: z.string().min(3),
  capacity: z.number().int().positive(),
});

const updateEventSchema = z.object({
  title: z.string().min(3).optional(),
  description: z.string().min(10).optional(),
  date: z.string().optional(),
  location: z.string().min(3).optional(),
  capacity: z.number().int().positive().optional(),
});

export const createEvent = async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    const parsedParams = createEventSchema.safeParse(req.body);

    if (!parsedParams.success) {
      return res.status(400).json({ message: 'Invalid input', errors: parsedParams.error.issues });
    }

    const { title, description, date, location, capacity } = parsedParams.data;
    const organizerId = req.user!.id;
    const db = getDb();

    const result = await db.collection('events').insertOne({
      title,
      description,
      date: new Date(date),
      location,
      capacity,
      organizerId,
      status: 'DRAFT',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    res.status(201).json({ 
      message: 'Event created successfully', 
      event: { id: result.insertedId.toString(), title, status: 'DRAFT' } 
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error creating event' });
  }
};

export const getEvents = async (req: Request, res: Response): Promise<any> => {
  try {
    const status = req.query.status as string;
    const db = getDb();
    
    // Simplification of complex include: we can use aggregation or separate queries
    const events = await db.collection('events').aggregate([
      { $match: { status: status || 'PUBLISHED' } },
      { $sort: { date: 1 } },
      {
        $addFields: {
          organizerObjectId: { $toObjectId: "$organizerId" }
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: 'organizerObjectId',
          foreignField: '_id',
          as: 'organizer'
        }
      },
      { $unwind: '$organizer' },
      {
        $project: {
          id: { $toString: "$_id" },
          _id: 0,
          title: 1,
          description: 1,
          date: 1,
          location: 1,
          capacity: 1,
          status: 1,
          organizer: {
            id: { $toString: "$organizer._id" },
            name: "$organizer.name",
            email: "$organizer.email"
          }
        }
      }
    ]).toArray();

    res.status(200).json({ events });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error fetching events' });
  }
};

export const getEventById = async (req: Request, res: Response): Promise<any> => {
  try {
    const { id } = req.params;
    const db = getDb();

    const eventArr = await db.collection('events').aggregate([
      { $match: { _id: new ObjectId(id as string) } },
      {
        $addFields: {
          organizerObjectId: { $toObjectId: "$organizerId" }
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: 'organizerObjectId',
          foreignField: '_id',
          as: 'organizer'
        }
      },
      { $unwind: '$organizer' },
      {
        $lookup: {
          from: 'ticketTypes',
          localField: '_id',
          foreignField: 'eventId',
          as: 'ticketTypes'
        }
      },
      {
        $project: {
          id: { $toString: "$_id" },
          _id: 0,
          title: 1,
          description: 1,
          date: 1,
          location: 1,
          capacity: 1,
          status: 1,
          organizer: {
            id: { $toString: "$organizer._id" },
            name: "$organizer.name",
            email: "$organizer.email"
          },
          ticketTypes: 1
        }
      }
    ]).toArray();

    const event = eventArr[0];

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
    const db = getDb();
    const parsedUpdate = updateEventSchema.safeParse(req.body);
    if (!parsedUpdate.success) {
      return res.status(400).json({ message: 'Invalid update data', errors: parsedUpdate.error.issues });
    }

    const updateData = { ...parsedUpdate.data, updatedAt: new Date() };
    
    if (updateData.date) {
      (updateData as any).date = new Date(updateData.date);
    }

    const event = await db.collection('events').findOne({ _id: new ObjectId(id as string) });

    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    if (event.organizerId.toString() !== req.user!.id && req.user!.role !== 'ADMIN') {
      return res.status(403).json({ message: 'Forbidden: You do not own this event' });
    }

    await db.collection('events').updateOne(
      { _id: new ObjectId(id as string) },
      { $set: updateData }
    );

    const updatedEvent = await db.collection('events').findOne({ _id: new ObjectId(id as string) });

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
    const db = getDb();
    const parsedParams = updateStatusSchema.safeParse(req.body);

    if (!parsedParams.success) {
      return res.status(400).json({ message: 'Invalid status', errors: parsedParams.error.issues });
    }

    const event = await db.collection('events').findOne({ _id: new ObjectId(id as string) });

    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    if (event.organizerId.toString() !== req.user!.id && req.user!.role !== 'ADMIN') {
      return res.status(403).json({ message: 'Forbidden: You do not own this event' });
    }

    await db.collection('events').updateOne(
      { _id: new ObjectId(id as string) },
      { $set: { status: parsedParams.data.status, updatedAt: new Date() } }
    );

    const updatedEvent = await db.collection('events').findOne({ _id: new ObjectId(id as string) });

    res.status(200).json({ message: `Event status updated to ${parsedParams.data.status}`, event: updatedEvent });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error updating event status' });
  }
};

