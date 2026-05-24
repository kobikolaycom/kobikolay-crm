const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const c = await prisma.conversation.findUnique({
    where: { id: 'cmpiabgxo000fuzh4ke1nryqx' },
    include: { messages: true }
  });

  console.log('Conversation:', JSON.stringify(c, null, 2));
}

main().finally(() => prisma.$disconnect());
