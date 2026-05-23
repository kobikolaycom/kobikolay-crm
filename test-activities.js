const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const activities = await prisma.activity.findMany({
    orderBy: { createdAt: 'desc' },
    take: 10
  });
  console.log(activities);
}
main().finally(() => prisma.$disconnect());
