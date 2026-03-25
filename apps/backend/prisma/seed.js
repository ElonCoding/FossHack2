"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const db_1 = require("../src/lib/db");
const mongodb_1 = require("mongodb");
const bcrypt_1 = __importDefault(require("bcrypt"));
async function main() {
    const db = await (0, db_1.connectDB)();
    const now = new Date();
    const demoExists = await db.collection('users').findOne({ username: 'demo' });
    if (!demoExists) {
        await db.collection('users').insertMany([
            {
                _id: new mongodb_1.ObjectId('66a1a2b3c4d5e6f7a8b9c001'),
                username: 'demo',
                name: 'Demo Visitor',
                email: 'demo@openevent.dev',
                password: await bcrypt_1.default.hash('demo123', 12),
                role: 'STUDENT',
                profile: { phone: '9999999999', college: 'MITS Gwalior', year: '3rd Year' },
                isVerified: true,
                isReadOnly: true,
                createdAt: now,
                updatedAt: now,
            },
            {
                _id: new mongodb_1.ObjectId('66a1a2b3c4d5e6f7a8b9c002'),
                username: 'organizer',
                name: 'Organizer One',
                email: 'organizer@openevent.dev',
                password: await bcrypt_1.default.hash('organizer123', 12),
                role: 'ORGANIZER',
                profile: { phone: '9888888888', college: 'MITS Gwalior', year: 'Alumni' },
                isVerified: true,
                isReadOnly: false,
                createdAt: now,
                updatedAt: now,
            },
            {
                _id: new mongodb_1.ObjectId('66a1a2b3c4d5e6f7a8b9c003'),
                username: 'admin',
                name: 'Platform Admin',
                email: 'admin@openevent.dev',
                password: await bcrypt_1.default.hash('admin123', 12),
                role: 'ADMIN',
                profile: { phone: '9777777777', college: 'OpenEvent', year: 'N/A' },
                isVerified: true,
                isReadOnly: false,
                createdAt: now,
                updatedAt: now,
            },
        ]);
    }
    const eventExists = await db.collection('events').findOne({ slug: 'hackathon-2026' });
    if (!eventExists) {
        await db.collection('events').insertOne({
            _id: new mongodb_1.ObjectId('66a1a2b3c4d5e6f7a8b9d001'),
            title: 'Hackathon 2026',
            slug: 'hackathon-2026',
            description: '48 hour coding event',
            bannerUrl: '/uploads/banner.png',
            organizerId: new mongodb_1.ObjectId('66a1a2b3c4d5e6f7a8b9c002'),
            location: { venue: 'MITS Gwalior', city: 'Gwalior', country: 'India' },
            eventDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 15),
            registrationDeadline: new Date(Date.now() + 1000 * 60 * 60 * 24 * 10),
            ticketTypes: [
                { name: 'General', price: 0, limit: 500 },
                { name: 'VIP', price: 500, limit: 50 },
            ],
            status: 'PUBLISHED',
            createdAt: now,
            updatedAt: now,
        });
    }
}
main()
    .catch((e) => {
    console.error('Seed failed:', e);
    process.exit(1);
});
//# sourceMappingURL=seed.js.map