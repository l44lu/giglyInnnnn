import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();

export const PRACTICAL_SKILLS = [
  // Hospitality / Restaurant
  'Food Serving',
  'Table Service',
  'Kitchen Helper',
  'Dishwashing',
  'Food Preparation',
  'Restaurant Cleaning',

  // Catering / Events
  'Catering Support',
  'Buffet Service',
  'Event Setup',
  'Event Breakdown',
  'Guest Assistance',

  // Cleaning
  'General Cleaning',
  'Housekeeping',
  'Room Cleaning',
  'Deep Cleaning',

  // Warehouse / Logistics
  'Packing',
  'Loading & Unloading',
  'Stock Handling',
  'Inventory Assistance',

  // Retail
  'Shelf Stocking',
  'Store Assistance',
  'Customer Assistance',
];

export async function seedSkills(): Promise<{ count: number; skills: string[] }> {
  console.log('--- Seeding Practical Temporary-Job Skills ---');

  for (const name of PRACTICAL_SKILLS) {
    await prisma.skill.upsert({
      where: { name },
      update: {},
      create: { name },
    });
    console.log(`Synced skill: "${name}"`);
  }

  const allSkills = await prisma.skill.findMany({
    orderBy: { name: 'asc' },
    select: { id: true, name: true },
  });

  console.log(`\nSkills seeding complete. Total skills in catalog: ${allSkills.length}`);
  return {
    count: allSkills.length,
    skills: allSkills.map((s) => s.name),
  };
}

if (require.main === module) {
  seedSkills()
    .then(async () => {
      await prisma.$disconnect();
    })
    .catch(async (e) => {
      console.error('Skills Seeding error:', e);
      await prisma.$disconnect();
      process.exit(1);
    });
}
