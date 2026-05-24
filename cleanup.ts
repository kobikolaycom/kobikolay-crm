import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
const prisma = new PrismaClient();

async function main() {
  console.log("Cleaning up DB...");

  // Delete all conversations, messages, activities, mailLogs, campaignLogs
  await prisma.conversationMessage.deleteMany({});
  await prisma.conversation.deleteMany({});
  await prisma.activity.deleteMany({});
  await prisma.mailLog.deleteMany({});
  await prisma.campaignLog.deleteMany({});
  
  // Find Özdemir Bey user, change to Onurhan Şeker
  const user = await prisma.user.findFirst({
    where: {
      OR: [
        { email: "ozdemir@kobikolay.com" },
        { name: "Özdemir Bey" },
        { email: "onurhan@kobikolay.com" },
      ]
    },
    orderBy: { createdAt: "desc" }
  });

  if (user) {
    const hashedPassword = await bcrypt.hash("Amazon.90", 12);
    
    await prisma.user.update({
      where: { id: user.id },
      data: {
        name: "Onurhan Şeker",
        email: "onurhan@kobikolay.com",
        password: hashedPassword,
      }
    });
    console.log("Updated user to Onurhan Şeker.");
  } else {
    console.log("User not found, making sure Onurhan Şeker exists...");
    // Let's create it and assign it SuperAdmin role
    const role = await prisma.role.findFirst({ where: { name: "SuperAdmin" }});
    if (role) {
      const hashedPassword = await bcrypt.hash("Amazon.90", 12);
      await prisma.user.create({
        data: {
          name: "Onurhan Şeker",
          email: "onurhan@kobikolay.com",
          password: hashedPassword,
          roleId: role.id,
        }
      });
      console.log("Created Onurhan Şeker.");
    }
  }

  const deleteUsers = await prisma.user.deleteMany({
    where: {
      email: { not: "onurhan@kobikolay.com" }
    }
  });
  console.log(`Deleted ${deleteUsers.count} other users.`);

  console.log("Done.");
}

main().catch(console.error).finally(() => prisma.$disconnect());
