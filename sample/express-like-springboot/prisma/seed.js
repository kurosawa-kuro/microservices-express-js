import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  const user1 = await prisma.user.create({
    data: {
      name: 'Alice Johnson'
    }
  });

  const user2 = await prisma.user.create({
    data: {
      name: 'Bob Smith'
    }
  });

  const user3 = await prisma.user.create({
    data: {
      name: 'Carol Davis'
    }
  });

  await prisma.micropost.createMany({
    data: [
      {
        title: 'Hello World! This is my first post.',
        userId: user1.id
      },
      {
        title: 'Learning Vue 3 and loving it!',
        userId: user1.id
      },
      {
        title: 'Express.js makes backend development so easy.',
        userId: user2.id
      },
      {
        title: 'Prisma is an amazing ORM for Node.js.',
        userId: user2.id
      },
      {
        title: 'Building fullstack apps with modern tools.',
        userId: user3.id
      }
    ]
  });

  console.log('Database seeded successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
