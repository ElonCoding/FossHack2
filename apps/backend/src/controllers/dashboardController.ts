import { Response } from 'express';
import { getDb } from '../lib/db';
import { AuthRequest } from '../middlewares/authMiddleware';
import { ObjectId } from 'mongodb';

export const getDashboardStats = async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    const userId = req.user!.id;
    const userRole = req.user!.role;
    const db = getDb();

    // Filter events by organizer if not admin
    const matchClause = userRole === 'ADMIN' ? {} : { organizerId: userId };

    const events = await db.collection('events').aggregate([
      { $match: matchClause },
      {
        $lookup: {
          from: 'tickets',
          localField: '_id',
          foreignField: 'eventId',
          as: 'eventTickets'
        }
      },
      {
        $addFields: {
          ticketCount: { $size: "$eventTickets" }
        }
      },
      {
        $project: {
          id: { $toString: "$_id" },
          title: 1,
          status: 1,
          date: 1,
          ticketCount: 1
        }
      }
    ]).toArray();

    const totalEvents = events.length;
    const totalTicketsSold = events.reduce((sum, event) => sum + (event.ticketCount || 0), 0);
    
    // Calculate total revenue from completed orders for these events
    const eventIds = events.map(e => new ObjectId(e.id));
    const orders = await db.collection('orders').find({
      eventId: { $in: eventIds },
      status: 'COMPLETED'
    }).toArray();

    const totalRevenue = orders.reduce((sum, order) => sum + (order.totalAmount || 0), 0);

    res.status(200).json({
      totalEvents,
      totalTicketsSold,
      totalRevenue,
      recentEvents: events.slice(0, 5),
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error fetching dashboard stats' });
  }
};

export const getEventRegistrations = async (req: AuthRequest, res: Response): Promise<any> => {
   try {
     const { eventId } = req.params;
     const db = getDb();

     const event = await db.collection('events').findOne({ _id: new ObjectId(eventId as string) });
     if (!event) {
       return res.status(404).json({ message: 'Event not found' });
     }

     if (event.organizerId !== (req.user!.id as any) && req.user!.role !== 'ADMIN') {
       return res.status(403).json({ message: 'Forbidden: You do not own this event' });
     }

     const tickets = await db.collection('tickets').aggregate([
       { $match: { eventId: new ObjectId(eventId as string) } },
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
           user: { id: { $toString: "$user._id" }, name: "$user.name", email: "$user.email" },
           ticketType: { name: "$ticketType.name", price: "$ticketType.price" },
           order: { status: "$order.status", paymentRef: "$order.paymentRef" }
         }
       },
       { $sort: { _id: -1 } }
     ]).toArray();

     res.status(200).json({ registrations: tickets });
   } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Server error fetching registrations' });
   }
};

