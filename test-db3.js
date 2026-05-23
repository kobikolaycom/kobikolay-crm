const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const acts = await prisma.activity.findMany({
    where: { content: { contains: 'V2 Deneme' } }
  });
  console.log('Found acts:', acts.length);
}

main().finally(() => prisma.$disconnect());
