"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkInUser = void 0;
const index_1 = require("../index");
const zod_1 = require("zod");
const checkInSchema = zod_1.z.object({
    eventId: zod_1.z.string().uuid(),
    qrCodeData: zod_1.z.string(),
});
const checkInUser = async (req, res) => {
    try {
        const parsedParams = checkInSchema.safeParse(req.body);
        if (!parsedParams.success) {
            return res.status(400).json({ message: 'Invalid input', errors: parsedParams.error.issues });
        }
        const { eventId, qrCodeData } = parsedParams.data;
        // Verify event ownership
        const event = await index_1.prisma.event.findUnique({ where: { id: eventId } });
        if (!event) {
            return res.status(404).json({ message: 'Event not found' });
        }
        if (event.organizerId !== req.user.id && req.user.role !== 'ADMIN') {
            return res.status(403).json({ message: 'Forbidden: You do not own this event' });
        }
        // Find registration by QR code data and event ID
        const registration = await index_1.prisma.registration.findFirst({
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
        const updatedRegistration = await index_1.prisma.registration.update({
            where: { id: registration.id },
            data: { checkedIn: true },
        });
        res.status(200).json({
            message: 'Check-in successful',
            user: registration.user,
            ticketType: registration.ticketType.name,
            registration: updatedRegistration
        });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error during check-in' });
    }
};
exports.checkInUser = checkInUser;
//# sourceMappingURL=checkinController.js.map