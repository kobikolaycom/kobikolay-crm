const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { ActivityService } = require('./.next/server/app/agents/[id]/actions.js') || {}; // Just mock it

async function main() {
  const fallbackUser = await prisma.user.findFirst();
  const agency = await prisma.agency.findFirst();
  
  if (!agency || !fallbackUser) return;

  const activity = await prisma.$transaction(async (tx) => {
      // Create new activity
      const activity = await tx.activity.create({
        data: {
          agencyId: agency.id,
          type: "CALL_LOG",
          content: "Test from script",
          status: "COMPLETED",
          creatorId: fallbackUser.id,
          assignedToId: fallbackUser.id,
          callStatus: "GOOD"
        }
      });

      // 2. Auto-Resolution logic
      await tx.activity.updateMany({
        where: {
          agencyId: agency.id,
          status: "PENDING",
        },
        data: {
          status: "COMPLETED",
          content: "Otomatik Kapatıldı: Yeni Çağrı gerçekleştirildi."
        }
      });

      return activity;
    });
    console.log("Success!", activity.id);
}

main().finally(() => prisma.$disconnect());
