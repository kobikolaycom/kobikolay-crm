import prisma from "@/lib/prisma";
import type { ChannelType, ConversationStatus } from "@prisma/client";
import { AgencyService } from "@/services/AgencyService";

export interface ConversationFilter {
  channelType?: ChannelType;
  status?: ConversationStatus;
  agencyId?: string;
  search?: string;
}

export class ConversationService {
  /**
   * Tüm konuşmaları filtreli olarak getirir.
   */
  static async getConversations(filter: ConversationFilter = {}) {
    try {
      const where: Record<string, any> = {};

      if (filter.channelType) {
        where.channelType = filter.channelType;
      } else {
        where.channelType = { not: "MANUAL_NOTE" };
      }
      if (filter.status) where.status = filter.status;
      if (filter.agencyId) where.agencyId = filter.agencyId;

      if (filter.search) {
        where.OR = [
          { contactName: { contains: filter.search, mode: "insensitive" } },
          { contactPhone: { contains: filter.search } },
          { agency: { companyName: { contains: filter.search, mode: "insensitive" } } },
        ];
      }

      return await prisma.conversation.findMany({
        where,
        include: {
          agency: { select: { id: true, companyName: true } },
          assignedUser: { select: { id: true, name: true } },
          createdByUser: { select: { id: true, name: true } },
          messages: {
            orderBy: { createdAt: "desc" },
            take: 1, // Sadece son mesaj
          },
          _count: {
            select: { messages: true },
          },
        },
        orderBy: { updatedAt: "desc" },
      });
    } catch (error) {
      console.warn("Database connection failed in ConversationService.getConversations");
      return [];
    }
  }

  /**
   * Bir konuşmanın detaylarını ve mesajlarını getirir.
   */
  static async getConversationDetails(id: string) {
    try {
      return await prisma.conversation.findUnique({
        where: { id },
        include: {
          agency: true,
          assignedUser: { select: { id: true, name: true } },
          createdByUser: { select: { id: true, name: true } },
          messages: {
            orderBy: { createdAt: "asc" },
          },
        },
      });
    } catch (error) {
      console.warn("Database connection failed in ConversationService.getConversationDetails");
      return null;
    }
  }

  /**
   * Yeni bir konuşma başlatır.
   */
  static async createConversation(data: {
    channelType: ChannelType;
    contactName?: string;
    contactPhone?: string;
    agencyId?: string;
    assignedUserId?: string;
    createdByUserId?: string;
  }) {
    try {
      const conversation = await prisma.conversation.create({
        data: {
          channelType: data.channelType,
          contactName: data.contactName,
          contactPhone: data.contactPhone,
          agencyId: data.agencyId,
          assignedUserId: data.assignedUserId,
          createdByUserId: data.createdByUserId,
          status: "OPEN",
        },
      });

      // Auto-assign representative if first interaction
      if (data.agencyId && data.createdByUserId) {
        await AgencyService.assignRepresentativeIfEmpty(data.agencyId, data.createdByUserId);
      }

      // Update last interaction timestamp
      if (data.agencyId) {
        await AgencyService.updateLastInteraction(data.agencyId);
      }

      return conversation;
    } catch (error) {
      console.error("[ConversationService] createConversation failed:", error);
      throw error;
    }
  }

  /**
   * Konuşmaya yeni bir mesaj veya dahili not ekler.
   */
  static async createMessage(
    conversationId: string,
    data: {
      content: string;
      isInternalNote?: boolean;
      senderType?: string; // "customer" | "agent" | "system"
      senderName?: string;
    }
  ) {
    const { content, isInternalNote = false, senderType = "agent", senderName } = data;

    const [message] = await prisma.$transaction([
      prisma.conversationMessage.create({
        data: {
          conversationId,
          content,
          isInternalNote,
          senderType,
          senderName,
        },
      }),
      prisma.conversation.update({
        where: { id: conversationId },
        data: { updatedAt: new Date() },
      }),
    ]);

    return message;
  }

  /**
   * Çözüldü olarak işaretle (Arşivle).
   */
  static async resolve(id: string) {
    return prisma.conversation.update({
      where: { id },
      data: { status: "RESOLVED" },
    });
  }

  /**
   * Tekrar aç.
   */
  static async reopen(id: string) {
    return prisma.conversation.update({
      where: { id },
      data: { status: "OPEN" },
    });
  }

  /**
   * Personele pasla (Routing).
   */
  static async assignToUser(conversationId: string, userId: string) {
    return prisma.conversation.update({
      where: { id: conversationId },
      data: { assignedUserId: userId },
    });
  }

  /**
   * Acente eşleştir (Link).
   */
  static async linkToAgency(conversationId: string, agencyId: string) {
    return prisma.conversation.update({
      where: { id: conversationId },
      data: { agencyId },
    });
  }

  /**
   * Bir acenteye bağlı tüm konuşma notlarını getir (Röntgen entegrasyonu).
   */
  static async getAgencyConversationNotes(agencyId: string) {
    return prisma.conversation.findMany({
      where: { agencyId },
      include: {
        createdByUser: { select: { name: true } },
        messages: {
          orderBy: { createdAt: "asc" },
          take: 5, // Son 5 mesaj preview
        },
        _count: { select: { messages: true } },
      },
      orderBy: { updatedAt: "desc" },
    });
  }
}
