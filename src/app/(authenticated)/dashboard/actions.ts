"use server";

import prisma from "@/lib/prisma";
import { auth } from "@/auth";
import { revalidatePath } from "next/cache";

export async function completeTaskAction(taskId: string, note?: string) {
  const session = await auth();
  if (!session?.user) {
    return { success: false, error: "Yetkisiz erişim." };
  }

  try {
    const task = await prisma.activity.findUnique({
      where: { id: taskId },
    });

    if (!task) {
      return { success: false, error: "Görev bulunamadı." };
    }

    if (task.assignedToId !== session.user.id && task.creatorId !== session.user.id) {
      return { success: false, error: "Bu görevi tamamlama yetkiniz yok." };
    }

    await prisma.$transaction(async (tx) => {
      // 1. Mark task as completed
      await tx.activity.update({
        where: { id: taskId },
        data: { status: "COMPLETED" },
      });

      // 2. If a note is provided, create a CRM Log (CALL_LOG)
      if (note && note.trim().length > 0) {
        await tx.activity.create({
          data: {
            agencyId: task.agencyId,
            type: "CALL_LOG",
            content: note,
            status: "COMPLETED",
            creatorId: session.user.id,
            assignedToId: session.user.id,
            callStatus: "NORMAL"
          }
        });
      }
    });

    revalidatePath("/dashboard");
    revalidatePath("/");
    revalidatePath("/agents/[id]", "page");
    
    return { success: true };
  } catch (error: any) {
    console.error("completeTaskAction Error:", error);
    return { success: false, error: "Görev tamamlanırken bir hata oluştu." };
  }
}
