import prisma from "@/lib/prisma";
import { AgencyCreateSchema, AgencyUpdateSchema } from "@/lib/validations";
import { AgencyWithRelations } from "@/types";
import { Prisma } from "@prisma/client";

/**
 * The Bridge: Agency Service
 * Centralizes all Agency-related database operations.
 * UI components and API routes MUST NOT call Prisma directly.
 */
export class AgencyService {

  static async list(params?: { 
    skip?: number; 
    take?: number; 
    search?: string;
    sector?: string;
    pitchStatus?: string;
    campaignFilter?: string;
    dateFrom?: string;
    dateTo?: string;
    mailInteraction?: string;
  }): Promise<{ data: AgencyWithRelations[], total: number }> {
    const { skip = 0, take = 50, search, sector, pitchStatus, campaignFilter, dateFrom, dateTo, mailInteraction } = params || {};
    
    let where: Prisma.AgencyWhereInput = {};

    if (search) {
      where.OR = [
        { companyName: { contains: search, mode: "insensitive" } },
        { documentNo: { contains: search } },
      ];
    }

    if (sector && sector !== "all") {
      where.sectors = { some: { id: sector } };
    }

    if (pitchStatus === "sent") {
      where.mailLogs = { some: {} };
    } else if (pitchStatus === "pending") {
      where.mailLogs = { none: {} };
    }

    // Mail interaction filter — exclusive logic across ALL mails
    if (mailInteraction === "unsubscribed") {
      where.isUnsubscribed = true;
    } else if (mailInteraction === "clicked") {
      // En az bir mailde tıklama var
      where.mailLogs = { some: { clickedAt: { not: null } } };
    } else if (mailInteraction === "opened") {
      // En az bir mail açıldı AMA hiçbir mailde tıklama yok
      const existingAnd = Array.isArray(where.AND) ? where.AND : where.AND ? [where.AND] : [];
      where.AND = [
        ...existingAnd,
        { mailLogs: { some: { openedAt: { not: null } } } },
        { mailLogs: { none: { clickedAt: { not: null } } } },
      ];
    } else if (mailInteraction === "sent_only") {
      // En az bir mail gönderildi AMA hiçbir mail açılmadı
      const existingAnd = Array.isArray(where.AND) ? where.AND : where.AND ? [where.AND] : [];
      where.AND = [
        ...existingAnd,
        { mailLogs: { some: { status: "SENT" } } },
        { mailLogs: { none: { openedAt: { not: null } } } },
      ];
    } else if (mailInteraction === "no_mail") {
      where.mailLogs = { none: {} };
    }

    // Custom date range filter (overrides campaignFilter)
    if (dateFrom || dateTo) {
      const sentAtFilter: any = { status: "SENT" };
      if (dateFrom) sentAtFilter.sentAt = { ...sentAtFilter.sentAt, gte: new Date(dateFrom) };
      if (dateTo) {
        const toDate = new Date(dateTo); toDate.setHours(23,59,59,999);
        sentAtFilter.sentAt = { ...sentAtFilter.sentAt, lte: toDate };
      }
      where.OR = [
        { campaignLogs: { some: sentAtFilter } },
        { mailLogs: { some: sentAtFilter } },
      ];
    }
    // Campaign send period filter — checks both campaignLogs AND mailLogs
    else if (campaignFilter && campaignFilter !== "all") {
      const now = new Date();
      // Turkey UTC+3
      const TR_OFFSET = 3 * 60 * 60 * 1000;
      const nowTR = new Date(now.getTime() + TR_OFFSET);

      if (campaignFilter === "today") {
        const todayStart = new Date(Date.UTC(nowTR.getUTCFullYear(), nowTR.getUTCMonth(), nowTR.getUTCDate()));
        todayStart.setTime(todayStart.getTime() - TR_OFFSET);
        const filter = { sentAt: { gte: todayStart }, status: "SENT" as const };
        where.OR = [
          { campaignLogs: { some: filter } },
          { mailLogs: { some: filter } },
        ];
      } else if (campaignFilter === "week") {
        const todayStart = new Date(Date.UTC(nowTR.getUTCFullYear(), nowTR.getUTCMonth(), nowTR.getUTCDate()));
        todayStart.setTime(todayStart.getTime() - TR_OFFSET);
        const dayOfWeek = nowTR.getUTCDay();
        const daysToMonday = (dayOfWeek + 6) % 7;
        const weekStart = new Date(todayStart.getTime() - daysToMonday * 24 * 60 * 60 * 1000);
        const filter = { sentAt: { gte: weekStart }, status: "SENT" as const };
        where.OR = [
          { campaignLogs: { some: filter } },
          { mailLogs: { some: filter } },
        ];
      } else if (campaignFilter === "month") {
        const monthStart = new Date(Date.UTC(nowTR.getUTCFullYear(), nowTR.getUTCMonth(), 1));
        monthStart.setTime(monthStart.getTime() - TR_OFFSET);
        const filter = { sentAt: { gte: monthStart }, status: "SENT" as const };
        where.OR = [
          { campaignLogs: { some: filter } },
          { mailLogs: { some: filter } },
        ];
      } else if (campaignFilter.startsWith("last_")) {
        const months = parseInt(campaignFilter.split("_")[1]);
        const start = new Date(Date.UTC(nowTR.getUTCFullYear(), nowTR.getUTCMonth() - months, nowTR.getUTCDate()));
        start.setTime(start.getTime() - TR_OFFSET);
        const filter = { sentAt: { gte: start }, status: "SENT" as const };
        where.OR = [
          { campaignLogs: { some: filter } },
          { mailLogs: { some: filter } },
        ];
      } else if (campaignFilter === "never") {
        where.campaignLogs = { none: {} };
        where.mailLogs = { none: {} };
        where.activities = { none: {} };
      }
    }

    try {
      const [data, total] = await prisma.$transaction([
        prisma.agency.findMany({
          where,
          skip,
          take,
          include: {
            sectors: true,
            contacts: true,
            offers: { orderBy: { createdAt: "desc" } },
            mailLogs: {
              orderBy: { createdAt: "desc" },
              take: 10,
              select: {
                id: true,
                status: true,
                sentAt: true,
                openedAt: true,
                clickedAt: true,
                sentBy: { select: { name: true } },
              },
            },
          },
        }),
        prisma.agency.count({ where }),
      ]);

      return { data: data as AgencyWithRelations[], total };
    } catch (error) {
      console.warn("Database connection failed, returning empty list.");
      return { data: [], total: 0 };
    }
  }

  /**
   * Retrieves a single agency by ID.
   */
  static async getById(id: string): Promise<AgencyWithRelations | null> {
    try {
      return await prisma.agency.findUnique({
        where: { id },
        include: {
          sectors: true,
          contacts: true,
          taxInfo: true,
          offers: { orderBy: { createdAt: "desc" } },
          mailLogs: { orderBy: { createdAt: "desc" } },
          activities: { 
            include: {
              creator: { select: { id: true, name: true, role: { select: { name: true } } } },
              assignedTo: { select: { id: true, name: true, role: { select: { name: true } } } }
            },
            orderBy: { createdAt: "desc" } 
          },
        },
      });
    } catch (error) {
      console.warn("Database connection failed, returning null.");
      return null;
    }
  }

  /**
   * Creates a new agency. Validates data using Zod schema.
   */
  static async create(data: unknown): Promise<AgencyWithRelations> {
    const validData = AgencyCreateSchema.parse(data);
    
    return await prisma.agency.create({
      data: validData,
      include: { sectors: true },
    });
  }

  /**
   * Updates an existing agency.
   */
  static async update(id: string, data: unknown): Promise<AgencyWithRelations> {
    const validData = AgencyUpdateSchema.parse({ ...data as any, id });
    const { id: _, ...updateData } = validData;

    return await prisma.agency.update({
      where: { id },
      data: updateData,
      include: { sectors: true },
    });
  }

  /**
   * Deletes an agency. Cascades to contacts and tax info.
   */
  static async delete(id: string): Promise<void> {
    await prisma.agency.delete({
      where: { id },
    });
  }

  /**
   * İl listesini getirir (filtreleme için).
   */
  static async getDistinctProvinces(): Promise<string[]> {
    try {
      const result = await prisma.contact.findMany({
        where: { province: { not: null } },
        select: { province: true },
        distinct: ["province"],
        orderBy: { province: "asc" },
      });
      return result.map(r => r.province!).filter(Boolean);
    } catch (error) {
      console.warn("Database connection failed in AgencyService.getDistinctProvinces");
      return [];
    }
  }

  /**
   * Seçili ile göre ilçe listesini getirir.
   */
  static async getDistrictsByProvince(province: string): Promise<string[]> {
    try {
      const result = await prisma.contact.findMany({
        where: { province, district: { not: null } },
        select: { district: true },
        distinct: ["district"],
        orderBy: { district: "asc" },
      });
      return result.map(r => r.district!).filter(Boolean);
    } catch (error) {
      console.warn("Database connection failed in AgencyService.getDistrictsByProvince");
      return [];
    }
  }

  /**
   * Tanıtım sayfası için gelişmiş filtreleme ile acente listesi.
   */
  static async getFilteredForPromotion(params: {
    search?: string;
    province?: string;
    district?: string;
    status?: string;
    sectorId?: string;
    mailHistory?: string; // "sent" | "not_sent" | "all"
    contactHistory?: string; // "contacted" | "not_contacted" | "all"
  }): Promise<{ data: any[]; total: number }> {
    try {
      const { search, province, district, status, sectorId, mailHistory, contactHistory } = params;
      const where: any = {
        isUnsubscribed: false,
        contacts: { some: { email: { not: null } } }, // Email'i olanlar
      };

      if (search) {
        where.OR = [
          { companyName: { contains: search, mode: "insensitive" } },
          { documentNo: { contains: search } },
        ];
      }

      if (province) {
        where.contacts = { ...where.contacts, some: { ...where.contacts?.some, province } };
      }
      if (district) {
        where.contacts = { ...where.contacts, some: { ...where.contacts?.some, district } };
      }

      if (status && status !== "all") {
        where.status = status;
      }

      if (sectorId && sectorId !== "all") {
        where.sectors = { some: { id: sectorId } };
      }

      // Mail geçmişi filtresi
      if (mailHistory === "sent") {
        where.OR = [
          { mailLogs: { some: { status: "SENT" } } },
          { campaignLogs: { some: { status: "SENT" } } },
        ];
      } else if (mailHistory === "not_sent") {
        where.mailLogs = { none: {} };
        where.campaignLogs = { none: {} };
      }

      // İletişim geçmişi filtresi
      if (contactHistory === "contacted") {
        where.conversations = { some: {} };
      } else if (contactHistory === "not_contacted") {
        where.conversations = { none: {} };
      }

      const [data, total] = await prisma.$transaction([
        prisma.agency.findMany({
          where,
          include: {
            contacts: { select: { email: true, province: true, district: true } },
            sectors: { select: { id: true, name: true } },
            mailLogs: { take: 1, orderBy: { sentAt: "desc" }, select: { sentAt: true, status: true } },
            _count: { select: { mailLogs: true, campaignLogs: true, conversations: true } },
          },
          orderBy: { companyName: "asc" },
          take: 500, // Güvenlik limiti
        }),
        prisma.agency.count({ where }),
      ]);

      return { data, total };
    } catch (error) {
      console.warn("Database connection failed in AgencyService.getFilteredForPromotion");
      return { data: [], total: 0 };
    }
  }
}
