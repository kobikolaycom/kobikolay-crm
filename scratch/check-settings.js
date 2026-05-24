const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const settings = await prisma.systemSetting.findMany({
    where: { category: 'meta' }
  });

  console.log('Settings count:', settings.length);
  for (const s of settings) {
    // Mask sensitive values
    let val = s.value;
    if (val && val.length > 8) {
      val = val.substring(0, 4) + '...' + val.substring(val.length - 4);
    }
    console.log(`Key: ${s.key}, Value: ${val}`);
  }
}

main().finally(() => prisma.$disconnect());
