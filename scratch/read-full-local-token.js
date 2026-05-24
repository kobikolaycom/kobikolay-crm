const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const setting = await prisma.systemSetting.findUnique({
    where: { category_key: { category: 'meta', key: 'pageToken' } }
  });

  if (setting) {
    console.log('REAL PAGE TOKEN LENGTH:', setting.value.length);
    console.log('REAL PAGE TOKEN:', setting.value);
  } else {
    console.log('No pageToken found in local DB!');
  }
}

main().finally(() => prisma.$disconnect());
