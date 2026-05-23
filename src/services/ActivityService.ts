import prisma from "@/lib/prisma";
import { ActivityType, ActivityStatus, CallStatus } from "@prisma/client";

export class ActivityService {
  /**
   * Zeka Eklentisi (Auto-Resolution): 
   * Yeni bir CALL_LOG girildiğinde, o acentenin 
   * geçmiş PENDING durumundaki görev/hatırlatıcılarını otomatik COMPLETED yapar.
   */
  static async createActivity(
    agencyId: string, 
    type: ActivityType, 
    content: string, 
    dueDate?: Date,
    creatorId?: string,
    assignedToId?: string,
    callStatus?: CallStatus
  ) {
    // 1. Resolve users if missing or invalid (Bypass mode)
    let finalCreatorId = creatorId;
    let finalAssignedToId = assignedToId;

    // Verify creatorId exists to prevent Foreign Key constraints
    if (finalCreatorId) {
      const creatorExists = await prisma.user.findUnique({ where: { id: finalCreatorId }, select: { id: true } });
      if (!creatorExists) finalCreatorId = undefined;
    }

    // Verify assignedToId exists
    if (finalAssignedToId) {
      const assignedExists = await prisma.user.findUnique({ where: { id: finalAssignedToId }, select: { id: true } });
      if (!assignedExists) finalAssignedToId = undefined;
    }

    if (!finalCreatorId || !finalAssignedToId) {
      const fallbackUser = await prisma.user.findFirst({ select: { id: true } });
      if (!fallbackUser) throw new Error("Aktivite oluşturmak için sistemde en az bir kullanıcı bulunmalıdır.");
      finalCreatorId = finalCreatorId || fallbackUser.id;
      finalAssignedToId = finalAssignedToId || fallbackUser.id;
    }

    // 2. Transaction to ensure Atomicity
    return prisma.$transaction(async (tx) => {
      // Create new activity
      const activity = await tx.activity.create({
        data: {
          agencyId,
          type,
          content,
          dueDate, // UTC directly stored in DB
          status: (type === "TASK_ASSIGNMENT" || type === "SELF_REMINDER") ? ActivityStatus.PENDING : ActivityStatus.COMPLETED,
          creatorId: finalCreatorId!,
          assignedToId: finalAssignedToId!,
          callStatus: callStatus || null
        }
      });

      // 2. Auto-Resolution logic
      if (type === "CALL_LOG") {
        await tx.activity.updateMany({
          where: {
            agencyId,
            status: ActivityStatus.PENDING,
          },
          data: {
            status: ActivityStatus.COMPLETED,
            content: "Otomatik Kapatıldı: Yeni Çağrı gerçekleştirildi."
          }
        });
      }

      return activity;
    });
  }

  static async getUpcomingTasks(agencyId: string) {
    return prisma.activity.findMany({
      where: {
        agencyId,
        status: ActivityStatus.PENDING,
      },
      orderBy: {
        dueDate: 'asc',
      }
    });
  }

  static async completeTask(taskId: string, completionNote?: string) {
    return prisma.activity.update({
      where: { id: taskId },
      data: { 
        status: ActivityStatus.COMPLETED,
        completionNote: completionNote || null,
      },
    });
  }

  static async cancelTask(taskId: string) {
    return prisma.activity.update({
      where: { id: taskId },
      data: { status: ActivityStatus.CANCELLED },
    });
  }
}
