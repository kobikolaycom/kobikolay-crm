const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const settings = await prisma.systemSetting.findMany({
    where: { category: 'smtp' }
  });

  console.log('SMTP Settings count:', settings.length);
  for (const s of settings) {
    let val = s.value;
    if (s.key === 'pass') {
      console.log(`Key: ${s.key}, Length: ${val ? val.length : 0}, Value: ${val ? JSON.stringify(val) : 'null'}`);
    } else {
      console.log(`Key: ${s.key}, Value: ${val ? JSON.stringify(val) : 'null'}`);
    }
  }
}

main().finally(() => prisma.$disconnect());
