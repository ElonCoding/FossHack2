import { Response } from 'express';
import { prisma } from '../index';
import { AuthRequest } from '../middlewares/authMiddleware';

export const getDashboardStats = async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    const userId = req.user!.id;
    const userRole = req.user!.role;

    // Filter events by organizer if not admin
    const whereClause = userRole === 'ADMIN' ? {} : { organizerId: userId };

    const events = await prisma.event.findMany({
      where: whereClause,
      include: {
        _count: { select: { tickets: true } },
      },
    });

    const totalEvents = events.length;
    
    // Calculate total revenue from completed orders for these events
    // This is a bit complex with Prisma across relations, so we can aggregate differently
    // Or fetch orders for these events
    const eventIds = events.map(e => e.id);
    
    const orders = await prisma.order.findMany({
      where: { 
        eventId: { in: eventIds },
        status: 'COMPLETED'
      },
      select: { totalAmount: true }
    });

    const totalRevenue = orders.reduce((sum, order) => sum + order.totalAmount, 0);
    const totalTicketsSold = events.reduce((sum, event) => sum + event._count.tickets, 0);

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

     const event = await prisma.event.findUnique({ where: { id: eventId } });
     if (!event) {
       return res.status(404).json({ message: 'Event not found' });
     }

     if (event.organizerId !== req.user!.id && req.user!.role !== 'ADMIN') {
       return res.status(403).json({ message: 'Forbidden: You do not own this event' });
     }

     const tickets = await prisma.ticket.findMany({
       where: { eventId },
       include: {
         user: { select: { id: true, name: true, email: true } },
         ticketType: { select: { name: true, price: true } },
         order: { select: { status: true, paymentRef: true } }
       },
       orderBy: { id: 'desc' } // tickets don't have createdAt, use id or join order
     });

     res.status(200).json({ registrations: tickets });
   } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Server error fetching registrations' });
   }
};
