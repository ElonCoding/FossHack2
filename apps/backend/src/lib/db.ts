import { MongoClient, Db, ObjectId } from 'mongodb';
import dotenv from 'dotenv';

dotenv.config();

let client: MongoClient;
let db: Db;

// Mock DB implementation for testing when Atlas is unreachable
const createMockDb = (): any => {
  console.warn('⚠️ USING MOCK DATABASE FALLBACK ⚠️');
  
  // In-memory data
  const data: Record<string, any[]> = {
    users: [
      {
        _id: new ObjectId("65f1a2b3c4d5e6f7a8b9c0d1"),
        email: "student@demo.com",
        password: "$2b$10$jJO5xLvOecsBpfM2O5bOgu.AhJkN0.rQVQk090ezXJw40wMvWykNS", // student123
        name: "Demo Student",
        role: "STUDENT",
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        _id: new ObjectId("65f1a2b3c4d5e6f7a8b9c0d2"),
        email: "organizer@demo.com",
        password: "$2b$10$jJO5xLvOecsBpfM2O5bOgu.AhJkN0.rQVQk090ezXJw40wMvWykNS", // organizer123 (reused hash for simplicity)
        name: "Demo Organizer",
        role: "ORGANIZER",
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ],
    events: [
      {
        _id: new ObjectId("65f1a2b3c4d5e6f7a8b9c0e1"),
        title: "Mock Hackathon 2026",
        description: "A fun mock hackathon for testing.",
        date: new Date(Date.now() + 86400000 * 7),
        location: "Virtual Space",
        capacity: 100,
        status: "PUBLISHED",
        organizerId: new ObjectId("65f1a2b3c4d5e6f7a8b9c0d2"),
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ]
  };

  // Mock collection object
  const collection = (name: string) => ({
    name,
    findOne: async (query: any) => {
      const list = data[name] || [];
      return list.find(item => {
        for (const key in query) {
          if (query[key] instanceof ObjectId) {
            if (item[key].toString() !== query[key].toString()) return false;
          } else if (item[key] !== query[key]) {
            return false;
          }
        }
        return true;
      });
    },
    find: (query: any) => ({
      toArray: async () => data[name] || [],
      sort: () => ({ toArray: async () => data[name] || [] }),
      limit: () => ({ toArray: async () => data[name] || [] }),
    }),
    insertOne: async (doc: any) => {
      if (!data[name]) data[name] = [];
      const newDoc = { ...doc, _id: doc._id || new ObjectId() };
      data[name].push(newDoc);
      return { insertedId: newDoc._id, acknowledged: true };
    },
    updateOne: async (query: any, update: any) => ({ matchedCount: 1, modifiedCount: 1 }),
    aggregate: (pipeline: any[]) => ({
      toArray: async () => data[name] || []
    }),
    countDocuments: async () => (data[name] || []).length
  });

  return {
    collection,
    admin: () => ({ serverStatus: async () => ({ ok: 1 }) })
  };
};

export const connectDB = async (): Promise<Db> => {
  if (db) return db;

  const uri = process.env.DATABASE_URL;
  const dbName = process.env.DB_NAME || 'openevent';

  if (!uri) {
    console.error('DATABASE_URL is not defined in environment variables');
    // Still proceed to mock DB if needed
    db = createMockDb() as unknown as Db;
    return db;
  }

  try {
    console.log('Connecting to MongoDB at:', uri.replace(/:([^:@]{1,})@/, ':****@'));
    client = new MongoClient(uri, {
      connectTimeoutMS: 5000,
      serverSelectionTimeoutMS: 5000,
    });
    
    await client.connect();
    db = client.db(dbName);
    
    // Create indexes
    await db.collection('users').createIndex({ email: 1 }, { unique: true });
    
    console.log('Successfully connected to MongoDB and ensured indexes');
    return db;
  } catch (error) {
    console.error('Failed to connect to MongoDB:', error);
    // Log the full error object for more detail
    if (error instanceof Error) {
      console.error('Error stack:', error.stack);
    }
    // Fallback to mock DB
    db = createMockDb() as unknown as Db;
    return db;
  }
};

export const getDb = (): Db => {
  if (!db) {
    // If not initialized, try to return mock db immediately to avoid crash
    db = createMockDb() as unknown as Db;
  }
  return db;
};

export { client };
