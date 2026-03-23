import { Request, Response } from 'express';
import { getDb, client } from '../lib/db';
import { z } from 'zod';
import { AuthRequest } from '../middlewares/authMiddleware';
import crypto from 'crypto';
import { ObjectId } from 'mongodb';

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

    const db = getDb();
    const event = await db.collection('events').findOne({ _id: new ObjectId(eventId as string) });

    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    if (event.organizerId !== (req.user!.id as any) && req.user!.role !== 'ADMIN') {
      return res.status(403).json({ message: 'Forbidden: You do not own this event' });
    }

    const result = await db.collection('ticketTypes').insertOne({
      ...parsedParams.data,
      eventId: new ObjectId(eventId as string),
      sold: 0,
      createdAt: new Date(),
    });

    res.status(201).json({ 
      message: 'Ticket type created successfully', 
      ticketType: { id: result.insertedId.toString(), ...parsedParams.data } 
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error creating ticket type' });
  }
};

export const getTicketTypes = async (req: Request, res: Response): Promise<any> => {
  try {
    const { eventId } = req.params;
    const db = getDb();
    const ticketTypes = await db.collection('ticketTypes').find({ eventId: new ObjectId(eventId as string) }).toArray();
    res.status(200).json({ ticketTypes: ticketTypes.map(tt => ({ ...tt, id: tt._id.toString() })) });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error fetching ticket types' });
  }
};

const createOrderSchema = z.object({
  eventId: z.string(),
  ticketTypeId: z.string(),
  quantity: z.number().int().positive().default(1),
});

export const createOrder = async (req: AuthRequest, res: Response): Promise<any> => {
  const session = client.startSession();
  try {
    const parsedParams = createOrderSchema.safeParse(req.body);

    if (!parsedParams.success) {
      return res.status(400).json({ message: 'Invalid input', errors: parsedParams.error.issues });
    }

    const { eventId, ticketTypeId, quantity } = parsedParams.data;
    const userId = req.user!.id;
    const db = getDb();

    let orderId: string = '';

    await session.withTransaction(async () => {
      // 1. Re-check ticket availability
      const currentTicketType = await db.collection('ticketTypes').findOne(
        { _id: new ObjectId(ticketTypeId) },
        { session }
      );

      if (!currentTicketType || currentTicketType.eventId.toString() !== eventId) {
        throw new Error('Invalid ticket type');
      }

      if ((currentTicketType.sold || 0) + quantity > currentTicketType.limit) {
        throw new Error('Not enough tickets available');
      }

      // 2. Calculate amount
      const totalAmount = currentTicketType.price * quantity;

      // 3. Create Order
      const orderResult = await db.collection('orders').insertOne({
        userId: new ObjectId(userId as string),
        eventId: new ObjectId(eventId),
        totalAmount,
        status: 'COMPLETED',
        paymentRef: `PAY-${crypto.randomBytes(4).toString('hex').toUpperCase()}`,
        createdAt: new Date(),
      }, { session });

      orderId = orderResult.insertedId.toString();

      // 4. Generate Tickets
      const ticketsData = Array.from({ length: quantity }).map(() => ({
        userId: new ObjectId(userId as string),
        eventId: new ObjectId(eventId),
        ticketTypeId: new ObjectId(ticketTypeId),
        orderId: orderResult.insertedId,
        qrCodeValue: crypto.randomBytes(16).toString('hex'),
        createdAt: new Date(),
      }));

      await db.collection('tickets').insertMany(ticketsData, { session });

      // 5. Update sold count
      await db.collection('ticketTypes').updateOne(
        { _id: new ObjectId(ticketTypeId) },
        { $inc: { sold: quantity } },
        { session }
      );
    });

    res.status(201).json({ 
      message: 'Order created and tickets generated successfully', 
      orderId
    });

  } catch (error: any) {
    console.error(error);
    res.status(400).json({ message: error.message || 'Server error creating order' });
  } finally {
    await session.endSession();
  }
};

export const getMyTickets = async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    const userId = req.user!.id;
    const db = getDb();
    
    const tickets = await db.collection('tickets').aggregate([
      { $match: { userId: new ObjectId(userId as string) } },
      {
        $lookup: {
          from: 'events',
          localField: 'eventId',
          foreignField: '_id',
          as: 'event'
        }
      },
      { $unwind: '$event' },
      {
        $lookup: {
          from: 'ticketTypes',
          localField: 'ticketTypeId',
          foreignField: '_id',
          as: 'ticketType'
        }
      },
      { $unwind: '$ticketType' },
      {
        $lookup: {
          from: 'orders',
          localField: 'orderId',
          foreignField: '_id',
          as: 'order'
        }
      },
      { $unwind: '$order' },
      {
        $project: {
          id: { $toString: "$_id" },
          qrCodeValue: 1,
          event: { title: 1, date: 1, location: 1 },
          ticketType: { name: 1, price: 1 },
          order: { status: 1, paymentRef: 1 }
        }
      },
      { $sort: { "event.date": 1 } }
    ]).toArray();
    
    res.status(200).json({ tickets });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error fetching tickets' });
  }
};

