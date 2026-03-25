import dotenv from 'dotenv';
dotenv.config();

import { prisma } from '../src/lib/prisma';
import bcrypt from 'bcrypt';

const DEMO_USERS = [
  {
    name: 'Demo Student',
    email: 'student@demo.com',
    password: 'student123',
    role: 'STUDENT' as const,
  },
  {
    name: 'Demo Organizer',
    email: 'organizer@demo.com',
    password: 'organizer123',
    role: 'ORGANIZER' as const,
  },
];

async function main() {
  console.log('🌱 Seeding demo users...\n');

  for (const user of DEMO_USERS) {
    const existing = await prisma.user.findUnique({ where: { email: user.email } });

    if (existing) {
      console.log(`  ⏭️  User "${user.email}" already exists. Skipping.`);
      continue;
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(user.password, salt);

    await prisma.user.create({
      data: {
        name: user.name,
        email: user.email,
        password: passwordHash,
        role: user.role,
      },
    });

    console.log(`  ✅ Created ${user.role}: ${user.email} / ${user.password}`);
  }

  console.log('\n🎉 Seeding complete!');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
