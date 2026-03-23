import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
dotenv.config();

const prismaClientSingleton = () => {
  return new PrismaClient();
};

const prisma = (global as any).prisma || prismaClientSingleton();

if (process.env.NODE_ENV !== 'production') {
  (global as any).prisma = prisma;
}

export { prisma };