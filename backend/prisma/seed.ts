import { PrismaClient } from '@prisma/client';
import { SEED_USERS } from '../src/database/seed.data.js';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting seed for Monk\'s Dream Jazz Bar on Supabase Cloud Postgres...');

  // Seed Staff Users
  for (const user of SEED_USERS) {
    await prisma.user.upsert({
      where: { id: user.id },
      update: user,
      create: user,
    });
  }
  console.log(`✅ Seeded ${SEED_USERS.length} staff users for authentication.`);

  console.log('🎉 Seed completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Error during seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
