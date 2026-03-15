"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getEventRegistrations = exports.getDashboardStats = void 0;
const index_1 = require("../index");
const getDashboardStats = async (req, res) => {
    try {
        const organizerId = req.user.id;
        const events = await index_1.prisma.event.findMany({
            where: req.user.role === 'ADMIN' ? {} : { organizerId },
            include: {
                _count: { select: { registrations: { where: { paymentStatus: 'COMPLETED' } } } },
            },
        });
        const totalEvents = events.length;
        let totalRevenue = 0;
        const totalRegistrations = events.reduce((acc, event) => acc + event._count.registrations, 0);
        const eventIds = events.map((e) => e.id);
        const completedRegistrations = await index_1.prisma.registration.findMany({
            where: { eventId: { in: eventIds }, paymentStatus: 'COMPLETED' },
            include: { ticketType: true }
        });
        completedRegistrations.forEach((reg) => {
            totalRevenue += reg.ticketType.price;
        });
        res.status(200).json({
            totalEvents,
            totalRegistrations,
            totalRevenue,
            recentEvents: events.slice(0, 5), // top 5
        });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error fetching dashboard stats' });
    }
};
exports.getDashboardStats = getDashboardStats;
const getEventRegistrations = async (req, res) => {
    try {
        const { eventId } = req.params;
        const event = await index_1.prisma.event.findUnique({ where: { id: eventId } });
        if (!event) {
            return res.status(404).json({ message: 'Event not found' });
        }
        if (event.organizerId !== req.user.id && req.user.role !== 'ADMIN') {
            return res.status(403).json({ message: 'Forbidden: You do not own this event' });
        }
        const registrations = await index_1.prisma.registration.findMany({
            where: { eventId },
            include: {
                user: { select: { id: true, name: true, email: true } },
                ticketType: { select: { name: true, price: true } }
            },
            orderBy: { createdAt: 'desc' }
        });
        res.status(200).json({ registrations });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error fetching registrations' });
    }
};
exports.getEventRegistrations = getEventRegistrations;
//# sourceMappingURL=dashboardController.js.map