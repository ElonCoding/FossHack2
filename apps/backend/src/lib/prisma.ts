import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
dotenv.config();
=======
const { PrismaClient } = require('@prisma/client');


const prismaClientSingleton = () => {
  return new PrismaClient({
    datasourceUrl: "postgresql://dev_user:dev_password@localhost:5432/dev_event_db?schema=public"
  });
};

const prisma = (global as any).prisma || prismaClientSingleton();

if (process.env.NODE_ENV !== 'production') {
  (global as any).prisma = prisma;
}

module.exports = { prisma };
