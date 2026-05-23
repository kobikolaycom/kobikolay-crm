const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const agencyId = "cmoh68azt0mu8uzv83fcd9p94";
  const fallbackUser = await prisma.user.findFirst();
  
  if (!fallbackUser) {
    console.log("NO USERS IN DB");
    return;
  }
  
  try {
    const activity = await prisma.activity.create({
      data: {
        agencyId,
        type: "CALL_LOG",
        content: "Server action test",
        status: "COMPLETED",
        creatorId: fallbackUser.id,
        assignedToId: fallbackUser.id,
        callStatus: "GOOD"
      }
    });
    console.log("Successfully created:", activity.id);
  } catch (error) {
    console.error("DB Error:", error.message);
  }
}

main().finally(() => prisma.$disconnect());
