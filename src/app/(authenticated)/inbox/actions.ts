"use server";

import { auth } from "@/auth";
import { ConversationService } from "@/services/ConversationService";
import { revalidatePath } from "next/cache";
import prisma from "@/lib/prisma";
import type { ChannelType, ConversationStatus } from "@prisma/client";

// ─── Inbox Actions ───

export async function getConversationsAction(filter?: {
  channelType?: ChannelType;
  status?: ConversationStatus;
  search?: string;
}) {
  const session = await auth();
  if (!session?.user) throw new Error("Yetkisiz erişim");
  return ConversationService.getConversations(filter);
}

export async function getConversationByIdAction(id: string) {
  const session = await auth();
  if (!session?.user) throw new Error("Yetkisiz erişim");
  return ConversationService.getConversationDetails(id);
}

export async function addMessageAction(
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
        select: { channelType: true, contactPhone: true },
      });

      if (conversation?.channelType === "INSTAGRAM" && conversation.contactPhone) {
        try {
          const { InstagramService } = await import("@/services/InstagramService");
          await InstagramService.sendMessage(conversation.contactPhone, content);
        } catch (error: any) {
          console.error("[Inbox] Instagram send failed:", error);
          return { success: false, error: `Instagram mesaj gönderilemedi: ${error.message}` };
        }
      }
    }

    const message = await ConversationService.createMessage(conversationId, {
      content,
      isInternalNote,
      senderType,
      senderName: session.user.name || "Personel",
    });

    revalidatePath("/inbox");
    return { success: true, message };
  } catch (err: any) {
    console.error("[Inbox] addMessageAction general error:", err);
    return { success: false, error: err.message || "Bilinmeyen bir hata oluştu" };
  }
}

export async function resolveConversationAction(id: string) {
  const session = await auth();
  if (!session?.user) throw new Error("Yetkisiz erişim");

  await ConversationService.resolve(id);
  revalidatePath("/inbox");
}

export async function searchAgenciesForLinkAction(term: string) {
  const session = await auth();
  if (!session?.user) throw new Error("Yetkisiz erişim");

  return prisma.agency.findMany({
    where: {
      OR: [
        { companyName: { contains: term, mode: "insensitive" } },
        { documentNo: { contains: term } },
      ],
    },
    select: { id: true, companyName: true, documentNo: true },
    take: 10,
  });
}

export async function linkAgencyAction(conversationId: string, agencyId: string) {
  const session = await auth();
  if (!session?.user) throw new Error("Yetkisiz erişim");

  await ConversationService.linkToAgency(conversationId, agencyId);
  revalidatePath("/inbox");
}

export async function getActiveUsersAction() {
  const session = await auth();
  if (!session?.user) throw new Error("Yetkisiz erişim");

  return prisma.user.findMany({
    where: { isActive: true },
    select: { id: true, name: true, role: { select: { name: true } } },
    orderBy: { name: "asc" },
  });
}

export async function assignConversationAction(conversationId: string, userId: string) {
  const session = await auth();
  if (!session?.user) throw new Error("Yetkisiz erişim");

  await ConversationService.assignToUser(conversationId, userId);
  revalidatePath("/inbox");
}

export async function sendDirectEmailAction(
  agencyId: string,
  subject: string,
  content: string
) {
  const session = await auth();
  if (!session?.user) throw new Error("Yetkisiz erişim");

  // Placeholder - would integrate with actual email service
  await prisma.mailLog.create({
    data: {
      agencyId,
      subject,
      content,
      status: "SENT",
      sentAt: new Date(),
    },
  });

  revalidatePath("/inbox");
  return { success: true };
}

export async function getSectorsAction() {
  const session = await auth();
  if (!session?.user) throw new Error("Yetkisiz erişim");

  return prisma.sector.findMany({
    orderBy: { name: "asc" },
  });
}

export async function getAgencyConversationNotesAction(agencyId: string) {
  const session = await auth();
  if (!session?.user) throw new Error("Yetkisiz erişim");

  // Get Manual Note Conversations
  const notes = await prisma.conversation.findMany({
    where: { agencyId, channelType: "MANUAL_NOTE" },
    include: {
      createdByUser: { select: { name: true } },
      messages: { orderBy: { createdAt: "asc" } },
    },
    orderBy: { updatedAt: "desc" },
  });

  // Get Activities (Call logs, assignments, etc)
  const activities = await prisma.activity.findMany({
    where: { agencyId },
    include: {
      creator: { select: { name: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const typeLabels: Record<string, string> = {
    CALL_LOG: "📞 Çağrı Notu",
    TASK_ASSIGNMENT: "🎯 Görev/Atama",
    SELF_REMINDER: "⏰ Hatırlatıcı",
  };

  const mappedActivities = activities.map((act) => {
    const title = typeLabels[act.type] || act.type;
    return {
      id: `act-${act.id}`,
      updatedAt: act.createdAt,
      createdByUser: act.creator,
      messages: [
        {
          id: `msg-${act.id}`,
          content: `[${title}]\n${act.content}`,
          createdAt: act.createdAt,
          senderType: "agent",
          senderName: act.creator?.name,
        },
      ],
    };
  });

  // Merge and sort
  const combined = [...notes, ...mappedActivities].sort((a, b) => {
    const dateA = new Date(a.updatedAt).getTime();
    const dateB = new Date(b.updatedAt).getTime();
    return dateB - dateA;
  });

  return combined;
}
