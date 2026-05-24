const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const convs = await prisma.conversation.findMany({
    where: { channelType: 'INSTAGRAM' }
  });

  console.log('All Instagram Conversations Count:', convs.length);
  for (const c of convs) {
    console.log(`ID: ${c.id}, Name: ${c.contactName}, Phone (senderId): ${c.contactPhone}, Status: ${c.status}`);
  }
}

main().finally(() => prisma.$disconnect());
