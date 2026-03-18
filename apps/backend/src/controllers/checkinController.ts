import { Response } from 'express';
import { prisma } from '../lib/prisma';
import { z } from 'zod';
import { AuthRequest } from '../middlewares/authMiddleware';

const checkInSchema = z.object({
  eventId: z.string().uuid(),
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

    // Verify event ownership or if user is admin/volunteer (assuming organizer for now)
    const event = await prisma.event.findUnique({ where: { id: eventId } });
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    if (event.organizerId !== req.user!.id && req.user!.role !== 'ADMIN') {
      return res.status(403).json({ message: 'Forbidden: You do not own this event' });
    }

    // Find ticket by QR code value and event ID
    const ticket = await prisma.ticket.findUnique({
      where: { qrCodeValue },
      include: {
        user: { select: { id: true, name: true, email: true } },
        ticketType: { select: { name: true } },
        order: { select: { status: true } }
      }
    });

    if (!ticket) {
      return res.status(404).json({ message: 'Invalid QR Code' });
    }

    if (ticket.eventId !== eventId) {
      return res.status(400).json({ message: 'Ticket does not belong to this event' });
    }

    if (ticket.order.status !== 'COMPLETED') {
      return res.status(400).json({ message: 'Payment incomplete for this ticket' });
    }

    if (ticket.isCheckedIn) {
        // Log duplicate attempt
        await prisma.checkInLog.create({
            data: {
                ticketId: ticket.id,
                scannedBy: scannerId,
                status: 'DUPLICATE'
            }
        });
        return res.status(400).json({ message: 'User already checked in', ticket });
    }

    // Update checkedIn status
    const updatedTicket = await prisma.ticket.update({
      where: { id: ticket.id },
      data: { isCheckedIn: true, checkInTime: new Date() },
    });

    // Log success
    await prisma.checkInLog.create({
        data: {
            ticketId: ticket.id,
            scannedBy: scannerId,
            status: 'SUCCESS'
        }
    });

    res.status(200).json({ 
      message: 'Check-in successful', 
      user: ticket.user,
      ticketType: ticket.ticketType.name,
      ticket: updatedTicket
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error during check-in' });
  }
};
