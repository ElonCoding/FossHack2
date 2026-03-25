import { MongoClient, Db, ObjectId } from 'mongodb';
import dotenv from 'dotenv';
import bcrypt from 'bcrypt';

dotenv.config();

let client: MongoClient;
let db: Db;

const demoUserId = new ObjectId('66a1a2b3c4d5e6f7a8b9c001');
const organizerUserId = new ObjectId('66a1a2b3c4d5e6f7a8b9c002');
const adminUserId = new ObjectId('66a1a2b3c4d5e6f7a8b9c003');
const seedEventId = new ObjectId('66a1a2b3c4d5e6f7a8b9d001');

const createMockDb = (): any => {
  const now = new Date();
  const data: Record<string, any[]> = {
    users: [
      {
        _id: demoUserId,
        username: 'demo',
        name: 'Demo Visitor',
        email: 'demo@openevent.dev',
        password: '$2b$10$rIiAcWJrrW8fV9T4LwKre.xA13n8nq3w3wyvWyyMokyQsrXwy2GYe',
        role: 'STUDENT',
        profile: { phone: '9999999999', college: 'MITS Gwalior', year: '3rd Year' },
        isVerified: true,
        isReadOnly: true,
        createdAt: now,
        updatedAt: now,
      },
      {
        _id: organizerUserId,
        username: 'organizer',
        name: 'Organizer One',
        email: 'organizer@openevent.dev',
        password: '$2b$10$wM6WsDG2WIo3MqA4W0E2yu7mD2X64HgQ3ySzgQ14lLHCjNL3JK5hC',
        role: 'ORGANIZER',
        profile: { phone: '9888888888', college: 'MITS Gwalior', year: 'Alumni' },
        isVerified: true,
        isReadOnly: false,
        createdAt: now,
        updatedAt: now,
      },
      {
        _id: adminUserId,
        username: 'admin',
        name: 'Platform Admin',
        email: 'admin@openevent.dev',
        password: '$2b$10$wM6WsDG2WIo3MqA4W0E2yu7mD2X64HgQ3ySzgQ14lLHCjNL3JK5hC',
        role: 'ADMIN',
        profile: { phone: '9777777777', college: 'OpenEvent', year: 'N/A' },
        isVerified: true,
        isReadOnly: false,
        createdAt: now,
        updatedAt: now,
      },
    ],
    events: [
      {
        _id: seedEventId,
        title: 'Hackathon 2026',
        slug: 'hackathon-2026',
        description: '48 hour coding event',
        bannerUrl: '/uploads/banner.png',
        organizerId: organizerUserId,
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
      },
    ],
    registrations: [],
    tickets: [],
    payments: [],
    checkins: [],
    notifications: [],
    announcements: [],
  };

  const compareValue = (a: any, b: any) => {
    if (a instanceof ObjectId || b instanceof ObjectId) {
      return String(a) === String(b);
    }
    return a === b;
  };

  const matchesQuery = (item: any, query: any): boolean => {
    if (!query || Object.keys(query).length === 0) return true;
    if (query.$or && Array.isArray(query.$or)) {
      return query.$or.some((branch: any) => matchesQuery(item, branch));
    }
    if (query.$and && Array.isArray(query.$and)) {
      return query.$and.every((branch: any) => matchesQuery(item, branch));
    }
    return Object.entries(query).every(([key, value]) => {
      const itemValue = item[key];
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        if ('$in' in value) {
          return (value as any).$in.some((candidate: any) => compareValue(itemValue, candidate));
        }
        if ('$ne' in value) {
          return !compareValue(itemValue, (value as any).$ne);
        }
      }
      return compareValue(itemValue, value);
    });
  };

  const projectDoc = (doc: any, projection: any) => {
    if (!projection) return doc;
    const entries = Object.entries(projection).filter(([, include]) => Boolean(include));
    if (!entries.length) return doc;
    const out: Record<string, any> = {};
    for (const [k] of entries) out[k] = doc[k];
    return out;
  };

  const collection = (name: string) => ({
    name,
    createIndex: async () => 'mock_index',
    findOne: async (query: any, options?: any) => {
      const list = data[name] || [];
      const found = list.find((item) => matchesQuery(item, query));
      return found ? projectDoc(found, options?.projection) : null;
    },
    find: (query: any = {}, options?: any) => {
      let current = (data[name] || []).filter((item) => matchesQuery(item, query)).map((doc) => projectDoc(doc, options?.projection));
      return {
        sort: (sortQuery: Record<string, 1 | -1>) => {
          const [[field, direction]] = Object.entries(sortQuery || { createdAt: -1 });
          current = current.sort((a, b) => {
            if (a[field] > b[field]) return direction;
            if (a[field] < b[field]) return -direction;
            return 0;
          });
          return {
            limit: (size: number) => ({ toArray: async () => current.slice(0, size) }),
            toArray: async () => current,
          };
        },
        limit: (size: number) => ({ toArray: async () => current.slice(0, size) }),
        toArray: async () => current,
      };
    },
    insertOne: async (doc: any) => {
      if (!data[name]) data[name] = [];
      const newDoc = { ...doc, _id: doc._id || new ObjectId() };
      data[name].push(newDoc);
      return { insertedId: newDoc._id, acknowledged: true };
    },
    insertMany: async (docs: any[]) => {
      if (!data[name]) data[name] = [];
      const insertedIds: Record<number, ObjectId> = {};
      docs.forEach((doc, index) => {
        const newDoc = { ...doc, _id: doc._id || new ObjectId() };
        data[name].push(newDoc);
        insertedIds[index] = newDoc._id;
      });
      return { acknowledged: true, insertedIds };
    },
    updateOne: async (query: any, update: any) => {
      const list = data[name] || [];
      const index = list.findIndex((item) => matchesQuery(item, query));
      if (index === -1) return { matchedCount: 0, modifiedCount: 0 };
      const item = list[index];
      if (update.$set) {
        Object.entries(update.$set).forEach(([key, value]) => {
          item[key] = value;
        });
      }
      if (update.$unset) {
        Object.keys(update.$unset).forEach((key) => {
          delete item[key];
        });
      }
      if (update.$inc) {
        Object.entries(update.$inc).forEach(([key, value]) => {
          item[key] = (item[key] || 0) + Number(value);
        });
      }
      list[index] = item;
      return { matchedCount: 1, modifiedCount: 1 };
    },
    deleteOne: async (query: any) => {
      const list = data[name] || [];
      const index = list.findIndex((item) => matchesQuery(item, query));
      if (index === -1) return { deletedCount: 0 };
      list.splice(index, 1);
      return { deletedCount: 1 };
    },
    aggregate: (_pipeline: any[]) => ({ toArray: async () => data[name] || [] }),
    countDocuments: async (query: any = {}) => (data[name] || []).filter((item) => matchesQuery(item, query)).length,
  });

  return {
    collection,
    admin: () => ({ serverStatus: async () => ({ ok: 1 }) }),
  };
};

const ensureIndexes = async (database: Db) => {
  await database.collection('users').createIndex({ email: 1 }, { unique: true });
  await database.collection('users').createIndex({ username: 1 }, { unique: true, sparse: true });
  await database.collection('users').createIndex({ role: 1 });
  await database.collection('users').createIndex({ createdAt: -1 });

  await database.collection('events').createIndex({ slug: 1 }, { unique: true });
  await database.collection('events').createIndex({ organizerId: 1 });
  await database.collection('events').createIndex({ status: 1 });
  await database.collection('events').createIndex({ eventDate: 1 });

  await database.collection('registrations').createIndex({ userId: 1 });
  await database.collection('registrations').createIndex({ eventId: 1 });
  await database.collection('registrations').createIndex({ ticketId: 1 }, { sparse: true });
  await database.collection('registrations').createIndex({ userId: 1, eventId: 1 }, { unique: true });

  await database.collection('tickets').createIndex({ ticketCode: 1 }, { unique: true });
  await database.collection('tickets').createIndex({ eventId: 1 });
  await database.collection('tickets').createIndex({ userId: 1 });

  await database.collection('payments').createIndex({ userId: 1 });
  await database.collection('payments').createIndex({ eventId: 1 });
  await database.collection('payments').createIndex({ gatewayPaymentId: 1 }, { unique: true, sparse: true });

  await database.collection('checkins').createIndex({ ticketId: 1 });
  await database.collection('checkins').createIndex({ eventId: 1 });
  await database.collection('checkins').createIndex({ ticketId: 1, eventId: 1 }, { unique: true });

  await database.collection('notifications').createIndex({ userId: 1 });
  await database.collection('notifications').createIndex({ createdAt: -1 });

  await database.collection('announcements').createIndex({ eventId: 1 });
  await database.collection('announcements').createIndex({ createdAt: -1 });
};

const ensureSeedData = async (database: Db) => {
  const existingDemo = await database.collection('users').findOne({ username: 'demo' });
  if (existingDemo) return;

  const now = new Date();
  const [demoPassword, organizerPassword, adminPassword] = await Promise.all([
    bcrypt.hash('demo123', 12),
    bcrypt.hash('organizer123', 12),
    bcrypt.hash('admin123', 12),
  ]);

  await database.collection('users').insertMany([
    {
      _id: demoUserId,
      username: 'demo',
      name: 'Demo Visitor',
      email: 'demo@openevent.dev',
      password: demoPassword,
      role: 'STUDENT',
      profile: { phone: '9999999999', college: 'MITS Gwalior', year: '3rd Year' },
      isVerified: true,
      isReadOnly: true,
      createdAt: now,
      updatedAt: now,
    },
    {
      _id: organizerUserId,
      username: 'organizer',
      name: 'Organizer One',
      email: 'organizer@openevent.dev',
      password: organizerPassword,
      role: 'ORGANIZER',
      profile: { phone: '9888888888', college: 'MITS Gwalior', year: 'Alumni' },
      isVerified: true,
      isReadOnly: false,
      createdAt: now,
      updatedAt: now,
    },
    {
      _id: adminUserId,
      username: 'admin',
      name: 'Platform Admin',
      email: 'admin@openevent.dev',
      password: adminPassword,
      role: 'ADMIN',
      profile: { phone: '9777777777', college: 'OpenEvent', year: 'N/A' },
      isVerified: true,
      isReadOnly: false,
      createdAt: now,
      updatedAt: now,
    },
  ]);

  await database.collection('events').insertOne({
    _id: seedEventId,
    title: 'Hackathon 2026',
    slug: 'hackathon-2026',
    description: '48 hour coding event',
    bannerUrl: '/uploads/banner.png',
    organizerId: organizerUserId,
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
};

export const connectDB = async (): Promise<Db> => {
  if (db) return db;

  const uri = process.env.DATABASE_URL;
  const dbName = process.env.DB_NAME || 'openevent';

  if (!uri) {
    db = createMockDb() as unknown as Db;
    return db;
  }

  try {
    client = new MongoClient(uri, {
      connectTimeoutMS: 5000,
      serverSelectionTimeoutMS: 5000,
    });
    await client.connect();
    db = client.db(dbName);
    await ensureIndexes(db);
    await ensureSeedData(db);
    return db;
  } catch {
    db = createMockDb() as unknown as Db;
    return db;
  }
};

export const getDb = (): Db => {
  if (!db) {
    db = createMockDb() as unknown as Db;
  }
  return db;
};

export { client };
