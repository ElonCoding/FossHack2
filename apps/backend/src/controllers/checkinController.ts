import { Response } from 'express';
import { getDb } from '../lib/db';
import { z } from 'zod';
import { AuthRequest } from '../middlewares/authMiddleware';
import { ObjectId } from 'mongodb';

const checkInSchema = z.object({
  eventId: z.string(),
  qrCodeValue: z.string(),
});

export const checkInUser = async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    const parsedParams = checkInSchema.safeParse(req.body);

    if (!parsedParams.success) {
      return res.status(400).json({ message: 'Invalid input', errors: parsedParams.error.issues });
    }

    const { eventId, qrCodeValue } = parsedParams.data;
    const scannerId = req.user!.id;
    const db = getDb();

    // Verify event ownership or if user is admin/volunteer (assuming organizer for now)
    const event = await db.collection('events').findOne({ _id: new ObjectId(eventId) });
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    if (event.organizerId.toString() !== scannerId && req.user!.role !== 'ADMIN') {
      return res.status(403).json({ message: 'Forbidden: You do not own this event' });
    }

    // Find ticket by QR code value and event ID
    const ticketArr = await db.collection('tickets').aggregate([
      { $match: { qrCodeValue, eventId: new ObjectId(eventId) } },
      {
        $lookup: {
          from: 'users',
          localField: 'userId',
          foreignField: '_id',
          as: 'user'
        }
      },
      { $unwind: '$user' },
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
          eventId: 1,
          isCheckedIn: 1,
          user: { id: { $toString: "$user._id" }, name: "$user.name", email: "$user.email" },
          ticketType: { name: "$ticketType.name" },
          order: { status: "$order.status" }
        }
      }
    ]).toArray();

    const ticket = ticketArr[0];

    if (!ticket) {
      return res.status(404).json({ message: 'Invalid QR Code' });
    }

    if (ticket.order.status !== 'COMPLETED') {
      return res.status(400).json({ message: 'Payment incomplete for this ticket' });
    }

    if (ticket.isCheckedIn) {
        // Log duplicate attempt
        await db.collection('checkInLogs').insertOne({
          ticketId: new ObjectId(ticket.id),
          scannedBy: new ObjectId(scannerId as string),
          status: 'DUPLICATE',
          createdAt: new Date(),
        });
        return res.status(400).json({ message: 'User already checked in', ticket });
    }

    // Update checkedIn status
    await db.collection('tickets').updateOne(
      { _id: new ObjectId(ticket.id) },
      { $set: { isCheckedIn: true, checkInTime: new Date() } }
    );

    // Log success
    await db.collection('checkInLogs').insertOne({
      ticketId: new ObjectId(ticket.id),
      scannedBy: new ObjectId(scannerId as string),
      status: 'SUCCESS',
      createdAt: new Date(),
    });

    res.status(200).json({ 
      message: 'Check-in successful', 
      user: ticket.user,
      ticketType: ticket.ticketType.name,
      ticket: { ...ticket, isCheckedIn: true }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error during check-in' });
  }
};

