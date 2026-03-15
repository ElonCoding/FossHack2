import { Response } from 'express';
import { prisma } from '../index';
import { z } from 'zod';
import { AuthRequest } from '../middlewares/authMiddleware';

const checkInSchema = z.object({
  eventId: z.string().uuid(),
  qrCodeData: z.string(),
});

export const checkInUser = async (req: AuthRequest, res: Response): Promise<any> => {
  try {
    const parsedParams = checkInSchema.safeParse(req.body);

    if (!parsedParams.success) {
      return res.status(400).json({ message: 'Invalid input', errors: parsedParams.error.issues });
    }

    const { eventId, qrCodeData } = parsedParams.data;

    // Verify event ownership
    const event = await prisma.event.findUnique({ where: { id: eventId } });
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    if (event.organizerId !== req.user!.id && req.user!.role !== 'ADMIN') {
      return res.status(403).json({ message: 'Forbidden: You do not own this event' });
    }

    // Find registration by QR code data and event ID
    const registration = await prisma.registration.findFirst({
      where: { qrCodeData, eventId },
      include: {
        user: { select: { id: true, name: true, email: true } },
        ticketType: { select: { name: true } }
      }
    });

    if (!registration) {
      return res.status(404).json({ message: 'Invalid QR Code or not associated with this event' });
    }

    if (registration.paymentStatus !== 'COMPLETED') {
      return res.status(400).json({ message: 'Payment incomplete for this registration' });
    }

    if (registration.checkedIn) {
      return res.status(400).json({ message: 'User already checked in', registration });
    }

    // Update checkedIn status
    const updatedRegistration = await prisma.registration.update({
      where: { id: registration.id },
      data: { checkedIn: true },
    });

    res.status(200).json({ 
      message: 'Check-in successful', 
      user: registration.user,
      ticketType: registration.ticketType.name,
      registration: updatedRegistration
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error during check-in' });
  }
};
