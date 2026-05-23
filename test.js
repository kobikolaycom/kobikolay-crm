const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const acts = await prisma.activity.findMany({ include: { agency: true } });
  console.log(JSON.stringify(acts, null, 2));
}
main().catch(console.error).finally(() => prisma.$disconnect());
