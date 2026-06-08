import prisma from "@/lib/prisma";
import { ActivityType, ActivityStatus, CallStatus } from "@prisma/client";
import { AgencyService } from "@/services/AgencyService";

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
    const result = await prisma.$transaction(async (tx) => {
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
            id: { not: activity.id },
          },
          data: {
            status: ActivityStatus.COMPLETED,
            completionNote: "Otomatik Kapatıldı: Yeni Çağrı gerçekleştirildi."
          }
        });
      }

      return activity;
    });

    // Auto-assign representative if first interaction
    if (finalCreatorId) {
      await AgencyService.assignRepresentativeIfEmpty(agencyId, finalCreatorId);
    }

    // Update last interaction timestamps
    if (type === "CALL_LOG") {
      await AgencyService.updateLastCall(agencyId);
    } else {
      await AgencyService.updateLastInteraction(agencyId);
    }

    // Send notification email to info@kobikolay.com for REACHED calls & task assignments
    if (
      (type === "CALL_LOG" && callStatus === "REACHED") ||
      type === "TASK_ASSIGNMENT"
    ) {
      // Fire-and-forget: don't block the response
      ActivityService.sendNotificationEmail(agencyId, type, content, finalCreatorId!, finalAssignedToId!, callStatus).catch((err) => {
        console.error("[ActivityService] Bildirim maili gönderilemedi:", err?.message || err);
      });
    }

    // Meta Conversions API — lead event'i gönder (fire-and-forget)
    if (
      (type === "CALL_LOG" && callStatus === "REACHED") ||
      type === "TASK_ASSIGNMENT"
    ) {
      ActivityService.sendMetaConversionEvent(agencyId, type, callStatus).catch((err) => {
        console.error("[ActivityService] Meta CAPI olay gönderilemedi:", err?.message || err);
      });
    }

    return result;
  }

  /**
   * Meta Conversions API'ye lead olayı gönder
   */
  private static async sendMetaConversionEvent(
    agencyId: string,
    type: ActivityType,
    callStatus?: CallStatus | null
  ) {
    const { MetaConversionsService } = await import("@/services/MetaConversionsService");
    
    const agency = await prisma.agency.findUnique({
      where: { id: agencyId },
      select: { companyName: true, contacts: { take: 1, select: { email: true, phone: true } } },
    });
    
    if (!agency) return;
    
    const email = agency.contacts?.[0]?.email;
    const phone = agency.contacts?.[0]?.phone;
    
    if (type === "CALL_LOG" && callStatus === "REACHED") {
      await MetaConversionsService.sendContactedEvent(agency.companyName, email, phone);
    } else if (type === "TASK_ASSIGNMENT") {
      await MetaConversionsService.sendQualifiedEvent(agency.companyName, email, phone);
    }
  }

  /**
   * Ulaşılan çağrı veya görev ataması olduğunda info@kobikolay.com'a bildirim maili gönderir.
   */
  private static async sendNotificationEmail(
    agencyId: string,
    type: ActivityType,
    content: string,
    creatorId: string,
    assignedToId: string,
    callStatus?: CallStatus | null
  ) {
    const { MailService } = await import("@/services/MailService");

    // Fetch agency name
    const agency = await prisma.agency.findUnique({
      where: { id: agencyId },
      select: { companyName: true, documentNo: true },
    });
    const agencyName = agency?.companyName || "Bilinmeyen Acente";
    const docNo = agency?.documentNo || "-";

    // Fetch user names
    const [creator, assignee] = await Promise.all([
      prisma.user.findUnique({ where: { id: creatorId }, select: { name: true } }),
      prisma.user.findUnique({ where: { id: assignedToId }, select: { name: true } }),
    ]);
    const creatorName = creator?.name || "Bilinmeyen Kullanıcı";
    const assigneeName = assignee?.name || "Bilinmeyen Kullanıcı";

    const now = new Date().toLocaleString("tr-TR", { timeZone: "Europe/Istanbul" });

    let subject = "";
    let htmlBody = "";

    if (type === "CALL_LOG") {
      subject = `📞 Acente Ulaşım Bildirimi: ${agencyName}`;
      htmlBody = `
        <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f8fafc; border-radius: 12px; overflow: hidden; border: 1px solid #e2e8f0;">
          <div style="background: linear-gradient(135deg, #3b82f6, #1d4ed8); padding: 24px 32px;">
            <h2 style="margin: 0; color: #ffffff; font-size: 18px;">📞 Acenteye Ulaşım Sağlandı</h2>
          </div>
          <div style="padding: 32px;">
            <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
              <tr><td style="padding: 8px 0; color: #64748b; font-size: 13px; width: 140px;">Acente:</td><td style="padding: 8px 0; font-weight: 600; color: #0f172a; font-size: 14px;">${agencyName}</td></tr>
              <tr><td style="padding: 8px 0; color: #64748b; font-size: 13px;">Belge No:</td><td style="padding: 8px 0; color: #0f172a; font-size: 14px;">${docNo}</td></tr>
              <tr><td style="padding: 8px 0; color: #64748b; font-size: 13px;">Temsilci:</td><td style="padding: 8px 0; font-weight: 600; color: #0f172a; font-size: 14px;">${creatorName}</td></tr>
              <tr><td style="padding: 8px 0; color: #64748b; font-size: 13px;">Tarih:</td><td style="padding: 8px 0; color: #0f172a; font-size: 14px;">${now}</td></tr>
            </table>
            <div style="background: #eff6ff; border-left: 4px solid #3b82f6; padding: 16px; border-radius: 8px; margin-top: 12px;">
              <p style="margin: 0 0 4px 0; font-size: 11px; color: #3b82f6; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">Ulaşım Notu</p>
              <p style="margin: 0; color: #1e293b; font-size: 14px; line-height: 1.6; white-space: pre-wrap;">${content}</p>
            </div>
          </div>
          <div style="background: #f1f5f9; padding: 16px 32px; text-align: center; font-size: 11px; color: #94a3b8;">
            KobiKolay CRM • Otomatik Bildirim
          </div>
        </div>
      `;
    } else if (type === "TASK_ASSIGNMENT") {
      subject = `📋 Görev Atama Bildirimi: ${agencyName}`;
      htmlBody = `
        <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f8fafc; border-radius: 12px; overflow: hidden; border: 1px solid #e2e8f0;">
          <div style="background: linear-gradient(135deg, #8b5cf6, #6d28d9); padding: 24px 32px;">
            <h2 style="margin: 0; color: #ffffff; font-size: 18px;">📋 Görev Ataması Yapıldı</h2>
          </div>
          <div style="padding: 32px;">
            <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
              <tr><td style="padding: 8px 0; color: #64748b; font-size: 13px; width: 140px;">Acente:</td><td style="padding: 8px 0; font-weight: 600; color: #0f172a; font-size: 14px;">${agencyName}</td></tr>
              <tr><td style="padding: 8px 0; color: #64748b; font-size: 13px;">Belge No:</td><td style="padding: 8px 0; color: #0f172a; font-size: 14px;">${docNo}</td></tr>
              <tr><td style="padding: 8px 0; color: #64748b; font-size: 13px;">Atayan:</td><td style="padding: 8px 0; font-weight: 600; color: #0f172a; font-size: 14px;">${creatorName}</td></tr>
              <tr><td style="padding: 8px 0; color: #64748b; font-size: 13px;">Atanan Kişi:</td><td style="padding: 8px 0; font-weight: 600; color: #7c3aed; font-size: 14px;">${assigneeName}</td></tr>
              <tr><td style="padding: 8px 0; color: #64748b; font-size: 13px;">Tarih:</td><td style="padding: 8px 0; color: #0f172a; font-size: 14px;">${now}</td></tr>
            </table>
            <div style="background: #f5f3ff; border-left: 4px solid #8b5cf6; padding: 16px; border-radius: 8px; margin-top: 12px;">
              <p style="margin: 0 0 4px 0; font-size: 11px; color: #7c3aed; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">Görev Notu</p>
              <p style="margin: 0; color: #1e293b; font-size: 14px; line-height: 1.6; white-space: pre-wrap;">${content}</p>
            </div>
          </div>
          <div style="background: #f1f5f9; padding: 16px 32px; text-align: center; font-size: 11px; color: #94a3b8;">
            KobiKolay CRM • Otomatik Bildirim
          </div>
        </div>
      `;
    }

    if (subject && htmlBody) {
      await MailService.sendEmail({
        to: "info@kobikolay.com",
        subject,
        html: htmlBody,
      });
      console.log(`[ActivityService] Bildirim maili gönderildi: ${subject}`);
    }
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
