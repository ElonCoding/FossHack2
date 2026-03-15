import { Response } from 'express';
import { prisma } from '../index';
import { AuthRequest } from '../middlewares/authMiddleware';

export const getDashboardStats = async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    const organizerId = req.user!.id;

    const events = await prisma.event.findMany({
      where: req.user!.role === 'ADMIN' ? {} : { organizerId },
      include: {
        _count: { select: { registrations: { where: { paymentStatus: 'COMPLETED' } } } },
      },
    });

    const totalEvents = events.length;
    let totalRevenue = 0;
    const totalRegistrations = events.reduce((acc: number, event: any) => acc + event._count.registrations, 0);

    const eventIds = events.map((e: any) => e.id);

    const completedRegistrations = await prisma.registration.findMany({
      where: { eventId: { in: eventIds }, paymentStatus: 'COMPLETED' },
      include: { ticketType: true }
    });

    completedRegistrations.forEach((reg: any) => {
      totalRevenue += reg.ticketType.price;
    });

    res.status(200).json({
      totalEvents,
      totalRegistrations,
      totalRevenue,
      recentEvents: events.slice(0, 5), // top 5
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

     const registrations = await prisma.registration.findMany({
       where: { eventId },
       include: {
         user: { select: { id: true, name: true, email: true } },
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
