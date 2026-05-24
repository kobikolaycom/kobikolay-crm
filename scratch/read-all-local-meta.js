const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const settings = await prisma.systemSetting.findMany({
    where: { category: 'meta' }
  });

  console.log('--- ACTUAL LOCAL META CREDENTIALS ---');
  for (const s of settings) {
    console.log(`${s.key}: ${s.value}`);
  }
}

main().finally(() => prisma.$disconnect());
