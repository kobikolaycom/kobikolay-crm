const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const userId = "cmpfbhfjb0002uzn8pnz7cd3u";
  const tasks = await prisma.activity.findMany({
    where: {
      assignedToId: userId,
      type: { in: ["TASK_ASSIGNMENT", "SELF_REMINDER"] },
      status: "PENDING",
      dueDate: { not: null },
    },
    orderBy: { dueDate: "asc" }
  });
  console.log("Tasks found:", tasks.length);
  console.log(tasks);
}
main().finally(() => prisma.$disconnect());
