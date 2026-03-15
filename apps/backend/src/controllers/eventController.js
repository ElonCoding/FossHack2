"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateEventStatus = exports.updateEvent = exports.getEventById = exports.getEvents = exports.createEvent = void 0;
const index_1 = require("../index");
const zod_1 = require("zod");
const createEventSchema = zod_1.z.object({
    title: zod_1.z.string().min(3),
    description: zod_1.z.string().min(10),
    date: zod_1.z.string(), // ISO date string
    location: zod_1.z.string().min(3),
    capacity: zod_1.z.number().int().positive(),
});
const createEvent = async (req, res) => {
    try {
        const parsedParams = createEventSchema.safeParse(req.body);
        if (!parsedParams.success) {
            return res.status(400).json({ message: 'Invalid input', errors: parsedParams.error.issues });
        }
        const { title, description, date, location, capacity } = parsedParams.data;
        const organizerId = req.user.id;
        const event = await index_1.prisma.event.create({
            data: {
                title,
                description,
                date: new Date(date),
                location,
                capacity,
                organizerId,
                status: 'DRAFT',
            },
        });
        res.status(201).json({ message: 'Event created successfully', event });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error creating event' });
    }
};
exports.createEvent = createEvent;
const getEvents = async (req, res) => {
    try {
        const status = req.query.status;
        const whereClause = status ? { status: status } : { status: 'PUBLISHED' };
        const events = await index_1.prisma.event.findMany({
            where: whereClause,
            include: {
                organizer: { select: { id: true, name: true, email: true } },
                ticketTypes: true,
            },
            orderBy: { date: 'asc' },
        });
        res.status(200).json({ events });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error fetching events' });
    }
};
exports.getEvents = getEvents;
const getEventById = async (req, res) => {
    try {
        const { id } = req.params;
        const event = await index_1.prisma.event.findUnique({
            where: { id },
            include: {
                organizer: { select: { id: true, name: true, email: true } },
                ticketTypes: true,
            },
        });
        if (!event) {
            return res.status(404).json({ message: 'Event not found' });
        }
        res.status(200).json({ event });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error fetching event' });
    }
};
exports.getEventById = getEventById;
const updateEvent = async (req, res) => {
    try {
        const { id } = req.params;
        const updateData = req.body;
        if (updateData.date) {
            updateData.date = new Date(updateData.date);
        }
        const event = await index_1.prisma.event.findUnique({ where: { id } });
        if (!event) {
            return res.status(404).json({ message: 'Event not found' });
        }
        if (event.organizerId !== req.user.id && req.user.role !== 'ADMIN') {
            return res.status(403).json({ message: 'Forbidden: You do not own this event' });
        }
        const updatedEvent = await index_1.prisma.event.update({
            where: { id },
            data: updateData,
        });
        res.status(200).json({ message: 'Event updated successfully', event: updatedEvent });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error updating event' });
    }
};
exports.updateEvent = updateEvent;
const updateStatusSchema = zod_1.z.object({
    status: zod_1.z.enum(['DRAFT', 'PUBLISHED', 'COMPLETED']),
});
const updateEventStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const parsedParams = updateStatusSchema.safeParse(req.body);
        if (!parsedParams.success) {
            return res.status(400).json({ message: 'Invalid status', errors: parsedParams.error.issues });
        }
        const event = await index_1.prisma.event.findUnique({ where: { id } });
        if (!event) {
            return res.status(404).json({ message: 'Event not found' });
        }
        if (event.organizerId !== req.user.id && req.user.role !== 'ADMIN') {
            return res.status(403).json({ message: 'Forbidden: You do not own this event' });
        }
        const updatedEvent = await index_1.prisma.event.update({
            where: { id },
            data: { status: parsedParams.data.status },
        });
        res.status(200).json({ message: `Event status updated to ${parsedParams.data.status}`, event: updatedEvent });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error updating event status' });
    }
};
exports.updateEventStatus = updateEventStatus;
//# sourceMappingURL=eventController.js.map