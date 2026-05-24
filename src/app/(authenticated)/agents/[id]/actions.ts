"use server";

import { auth } from "@/auth";
import { AgencyService } from "@/services/AgencyService";
import { ActivityService } from "@/services/ActivityService";
import { ConversationService } from "@/services/ConversationService";
import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import type { ActivityType, CallStatus, ChannelType } from "@prisma/client";

export async function getAgencyDetailAction(id: string) {
  const session = await auth();
  if (!session?.user) throw new Error("Yetkisiz");
  return AgencyService.getById(id);
}

export async function createActivityAction(data: {
  agencyId: string;
  type: ActivityType;
  content: string;
  dueDate?: string;
  assignedToId?: string;
  callStatus?: CallStatus;
}) {
  const session = await auth();
  if (!session?.user) throw new Error("Yetkisiz");

  const result = await ActivityService.createActivity(
    data.agencyId,
    data.type,
    data.content,
    data.dueDate ? new Date(data.dueDate) : undefined,
    (session.user as any).id,
    data.assignedToId || (session.user as any).id,
    data.callStatus
  );

  revalidatePath(`/agents/${data.agencyId}`);
  return result;
}

export async function completeTaskAction(taskId: string, agencyId: string, completionNote?: string) {
  const session = await auth();
  if (!session?.user) throw new Error("Yetkisiz");

  await ActivityService.completeTask(taskId, completionNote);
  revalidatePath(`/agents/${agencyId}`);
}

export async function addNoteAction(agencyId: string, content: string) {
  const session = await auth();
  if (!session?.user) throw new Error("Yetkisiz");

  // Create a MANUAL_NOTE conversation
  const conversation = await ConversationService.createConversation({
    channelType: "MANUAL_NOTE",
    agencyId,
    createdByUserId: (session.user as any).id,
  });

  await ConversationService.createMessage(conversation.id, {
    content,
    senderType: "agent",
    senderName: session.user.name || "Personel",
  });

  revalidatePath(`/agents/${agencyId}`);
  return conversation;
}

export async function updateAgencyStatusAction(id: string, status: string) {
  const session = await auth();
  if (!session?.user) throw new Error("Yetkisiz");

  await prisma.agency.update({
    where: { id },
    data: { status: status as any },
  });

  revalidatePath(`/agents/${id}`);
}

export async function getActiveUsersForAssignAction() {
  const session = await auth();
  if (!session?.user) throw new Error("Yetkisiz");

  return prisma.user.findMany({
    where: { isActive: true },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });
}

// ─── Omnichannel Hub Actions ───

export async function createAgencyConversationAction(data: {
  agencyId: string;
  channelType: ChannelType;
  contactName?: string;
  contactPhone?: string;
}) {
  const session = await auth();
  if (!session?.user) throw new Error("Yetkisiz erişim");

  // Instagram API politikası: Yeni konuşma başlatılamaz
  // Sadece müşteri tarafından başlatılan konuşmalara yanıt verilebilir
  if (data.channelType === "INSTAGRAM") {
    return {
      success: false,
      error: "Instagram API Kısıtlaması: Instagram'da yeni konuşma başlatamazsınız. Instagram DM politikası gereği, yalnızca müşterinin size önce mesaj göndermesi halinde yanıt verebilirsiniz. Müşterinizin size Instagram üzerinden mesaj göndermesini bekleyin, ardından Gelen Kutusu'ndan yanıtlayın.",
    };
  }

  try {
    const conversation = await ConversationService.createConversation({
      channelType: data.channelType,
      agencyId: data.agencyId,
      contactName: data.contactName || undefined,
      contactPhone: data.contactPhone || undefined,
      createdByUserId: (session.user as any).id,
    });

    revalidatePath(`/agents/${data.agencyId}`);
    return { success: true, conversation };
  } catch (err: any) {
    console.error("[AgencyDetail] createAgencyConversationAction error:", err);
    return { success: false, error: err.message || "Konuşma oluşturulamadı" };
  }
}

export async function addAgencyMessageAction(
  conversationId: string,
  content: string,
  senderType: string = "agent",
  isInternalNote: boolean = false
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return { success: false, error: "Yetkisiz erişim" };
    }

    // Konuşma kanalını kontrol et - Instagram ise API üzerinden de gönder
    if (!isInternalNote && senderType === "agent") {
      const conversation = await prisma.conversation.findUnique({
        where: { id: conversationId },
        select: { channelType: true, contactPhone: true, agencyId: true },
      });

      if (conversation?.channelType === "INSTAGRAM" && conversation.contactPhone) {
        try {
          const { InstagramService } = await import("@/services/InstagramService");
          await InstagramService.sendMessage(conversation.contactPhone, content);
        } catch (error: any) {
          console.error("[AgencyDetail] Instagram send failed:", error);
          // Instagram API hata mesajını aynen göster
          const apiError = error.message || "Bilinmeyen Instagram API hatası";
          return {
            success: false,
            error: `Instagram API Hatası: ${apiError}`,
          };
        }
      }

      // WhatsApp kanalı için gelecekte burada WA API entegrasyonu yapılacak
      if (conversation?.channelType === "WHATSAPP" && conversation.contactPhone) {
        // TODO: WhatsApp Business API entegrasyonu
      }
    }

    const message = await ConversationService.createMessage(conversationId, {
      content,
      isInternalNote,
      senderType,
      senderName: session.user.name || "Personel",
    });

    // Find agencyId for revalidation
    const convo = await prisma.conversation.findUnique({
      where: { id: conversationId },
      select: { agencyId: true },
    });
    if (convo?.agencyId) {
      revalidatePath(`/agents/${convo.agencyId}`);
    }
    revalidatePath("/inbox");

    return { success: true, message };
  } catch (err: any) {
    console.error("[AgencyDetail] addAgencyMessageAction error:", err);
    return { success: false, error: err.message || "Mesaj gönderilemedi" };
  }
}

export async function resolveAgencyConversationAction(conversationId: string, agencyId: string) {
  const session = await auth();
  if (!session?.user) throw new Error("Yetkisiz erişim");

  await ConversationService.resolve(conversationId);
  revalidatePath(`/agents/${agencyId}`);
  revalidatePath("/inbox");
}

export async function reopenAgencyConversationAction(conversationId: string, agencyId: string) {
  const session = await auth();
  if (!session?.user) throw new Error("Yetkisiz erişim");

  await ConversationService.reopen(conversationId);
  revalidatePath(`/agents/${agencyId}`);
  revalidatePath("/inbox");
}

export async function getAgencyConversationsAction(agencyId: string) {
  const session = await auth();
  if (!session?.user) throw new Error("Yetkisiz erişim");

  return prisma.conversation.findMany({
    where: { agencyId },
    include: {
      createdByUser: { select: { id: true, name: true } },
      assignedUser: { select: { id: true, name: true } },
      messages: { orderBy: { createdAt: "asc" } },
    },
    orderBy: { updatedAt: "desc" },
  });
}

// ─── Faaliyet Alanı Tanıtım Gönderim Aksiyonları ───

export async function getAllSectorsAction() {
  const session = await auth();
  if (!session?.user) throw new Error("Yetkisiz erişim");

  return prisma.sector.findMany({
    orderBy: { name: "asc" },
    include: {
      references: { orderBy: { createdAt: "asc" } },
    },
  });
}

export async function sendAgencyPitchAction(data: {
  agencyId: string;
  sectorIds: string[];
  emailBody: string;
  emailSubject: string;
}) {
  const session = await auth();
  if (!session?.user) throw new Error("Yetkisiz erişim");

  const { agencyId, sectorIds, emailBody, emailSubject } = data;

  // Fetch agency with contacts
  const agency = await prisma.agency.findUnique({
    where: { id: agencyId },
    include: { contacts: true },
  });

  if (!agency) throw new Error("Acente bulunamadı");

  const toEmail = agency.contacts?.[0]?.email;
  if (!toEmail) throw new Error("Bu acentenin e-posta adresi tanımlı değil. Lütfen iletişim bilgilerini güncelleyin.");

  // Fetch selected sectors for PDF attachments
  const sectors = await prisma.sector.findMany({
    where: { id: { in: sectorIds } },
    include: { references: true },
  });

  // Build HTML email body
  const html = `
    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 24px; color: #333; max-width: 640px; margin: 0 auto; background: #ffffff; border: 1px solid #f0f0f0; border-radius: 12px;">
      <div style="line-height: 1.8; font-size: 14px; white-space: pre-wrap;">
${emailBody}
      </div>
      <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;">
      <p style="font-size: 11px; color: #999; text-align: center;">
        Bu e-posta KobiKolay B2B CRM sistemi üzerinden otomatik olarak gönderilmiştir.
      </p>
    </div>
  `;

  // Prepare PDF attachments from sectors
  const attachments: { filename: string; path: string }[] = [];
  for (const sector of sectors) {
    if (sector.pdfUrl) {
      // If it's a relative URL, convert to absolute file path
      const pdfPath = sector.pdfUrl.startsWith("/")
        ? `${process.cwd()}/public${sector.pdfUrl}`
        : sector.pdfUrl;
      attachments.push({
        filename: `${sector.name.replace(/[^a-zA-Z0-9ÇçĞğıİÖöŞşÜü\s]/g, "").trim()}_brosur.pdf`,
        path: pdfPath,
      });
    }
  }

  try {
    // Send email via SMTP
    const { MailService } = await import("@/services/MailService");
    await MailService.sendEmail({
      to: toEmail,
      subject: emailSubject,
      html,
      attachments,
    });

    // Log to MailLog
    const sectorNames = sectors.map(s => s.name).join(", ");
    await prisma.mailLog.create({
      data: {
        agencyId,
        subject: emailSubject,
        content: `Tanıtım Gönderildi.\nFaaliyet Alanları: ${sectorNames}\nEk PDF: ${attachments.length} adet\n\n${emailBody}`,
        status: "SENT",
        sentAt: new Date(),
      },
    });

    revalidatePath(`/agents/${agencyId}`);
    return { success: true };
  } catch (error: any) {
    console.error("[sendAgencyPitchAction] SMTP error:", error);

    // Log failed attempt
    await prisma.mailLog.create({
      data: {
        agencyId,
        subject: emailSubject,
        content: `Gönderim Hatası: ${error.message}`,
        status: "FAILED",
      },
    }).catch(() => {});

    throw new Error(`E-posta gönderilemedi: ${error.message}`);
  }
}
