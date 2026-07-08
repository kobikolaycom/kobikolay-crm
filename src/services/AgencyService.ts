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
    categoryId?: string;
    pitchStatus?: string;
    campaignFilter?: string;
    dateFrom?: string;
    dateTo?: string;
    mailInteraction?: string;
    representativeId?: string;
    callStatusFilter?: string;
    btkZone?: string;
    province?: string;
    district?: string;
    sortBy?: string;
    sortOrder?: "asc" | "desc";
  }): Promise<{ data: AgencyWithRelations[], total: number }> {
    const { skip = 0, take: rawTake = 50, search, categoryId, pitchStatus, campaignFilter, dateFrom, dateTo, mailInteraction, representativeId, callStatusFilter, btkZone, province, district, sortBy, sortOrder } = params || {};
    const take = Math.min(rawTake, 200); // Pagination upper bound
    
    let where: Prisma.AgencyWhereInput = {
      status: { not: "DELETED" },  // Exclude soft-deleted agencies
    };

    if (search) {
      // Telefon araması: sadece rakamları al (son 7 hane ile eşleştir)
      const digitsOnly = search.replace(/\D/g, "");
      const phoneSearch = digitsOnly.length >= 4 ? digitsOnly.slice(-7) : "";
      
      // Telefon numarası varsa, raw SQL ile boşluk/tire'li numaralarda da ara
      let phoneAgencyIds: string[] = [];
      if (phoneSearch) {
        try {
          const phoneResults = await prisma.$queryRawUnsafe<{ agency_id: string }[]>(
            `SELECT DISTINCT agency_id FROM contacts WHERE regexp_replace(phone, '[^0-9]', '', 'g') LIKE $1`,
            `%${phoneSearch}%`
          );
          phoneAgencyIds = phoneResults.map(r => r.agency_id);
        } catch (e) {
          console.warn("[AgencyService] Phone raw search failed:", e);
        }
      }
      
      where.OR = [
        { companyName: { contains: search, mode: "insensitive" } },
        { documentNo: { contains: search } },
        ...(phoneAgencyIds.length > 0 ? [{ id: { in: phoneAgencyIds } }] : []),
      ];
    }

    if (categoryId && categoryId !== "all") {
      where.categoryId = categoryId;
    }

    if (pitchStatus === "sent") {
      const existingAnd = Array.isArray(where.AND) ? where.AND : where.AND ? [where.AND] : [];
      where.AND = [...existingAnd, { mailLogs: { some: {} } }];
    } else if (pitchStatus === "pending") {
      const existingAnd = Array.isArray(where.AND) ? where.AND : where.AND ? [where.AND] : [];
      where.AND = [...existingAnd, { mailLogs: { none: {} } }];
    }

    // Mail interaction filter — exclusive logic across ALL mails
    if (mailInteraction === "unsubscribed") {
      where.isUnsubscribed = true;
    } else if (mailInteraction === "clicked") {
      const existingAnd = Array.isArray(where.AND) ? where.AND : where.AND ? [where.AND] : [];
      where.AND = [...existingAnd, { mailLogs: { some: { clickedAt: { not: null } } } }];
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
      const existingAnd = Array.isArray(where.AND) ? where.AND : where.AND ? [where.AND] : [];
      where.AND = [...existingAnd, { mailLogs: { none: {} } }];
    }

    // Custom date range filter (overrides campaignFilter)
    if (dateFrom || dateTo) {
      const sentAtFilter: any = { status: "SENT" };
      if (dateFrom) sentAtFilter.sentAt = { ...sentAtFilter.sentAt, gte: new Date(dateFrom) };
      if (dateTo) {
        const toDate = new Date(dateTo); toDate.setHours(23,59,59,999);
        sentAtFilter.sentAt = { ...sentAtFilter.sentAt, lte: toDate };
      }
      const dateCondition = {
        OR: [
          { campaignLogs: { some: sentAtFilter } },
          { mailLogs: { some: sentAtFilter } },
        ]
      };
      // Preserve existing search filter by combining with AND
      const existingAnd = Array.isArray(where.AND) ? where.AND : where.AND ? [where.AND] : [];
      where.AND = [...existingAnd, dateCondition];
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
        const existingAnd = Array.isArray(where.AND) ? where.AND : where.AND ? [where.AND] : [];
        where.AND = [...existingAnd, { OR: [
          { campaignLogs: { some: filter } },
          { mailLogs: { some: filter } },
        ] }];
      } else if (campaignFilter === "week") {
        const todayStart = new Date(Date.UTC(nowTR.getUTCFullYear(), nowTR.getUTCMonth(), nowTR.getUTCDate()));
        todayStart.setTime(todayStart.getTime() - TR_OFFSET);
        const dayOfWeek = nowTR.getUTCDay();
        const daysToMonday = (dayOfWeek + 6) % 7;
        const weekStart = new Date(todayStart.getTime() - daysToMonday * 24 * 60 * 60 * 1000);
        const filter = { sentAt: { gte: weekStart }, status: "SENT" as const };
        const existingAnd = Array.isArray(where.AND) ? where.AND : where.AND ? [where.AND] : [];
        where.AND = [...existingAnd, { OR: [
          { campaignLogs: { some: filter } },
          { mailLogs: { some: filter } },
        ] }];
      } else if (campaignFilter === "month") {
        const monthStart = new Date(Date.UTC(nowTR.getUTCFullYear(), nowTR.getUTCMonth(), 1));
        monthStart.setTime(monthStart.getTime() - TR_OFFSET);
        const filter = { sentAt: { gte: monthStart }, status: "SENT" as const };
        const existingAnd = Array.isArray(where.AND) ? where.AND : where.AND ? [where.AND] : [];
        where.AND = [...existingAnd, { OR: [
          { campaignLogs: { some: filter } },
          { mailLogs: { some: filter } },
        ] }];
      } else if (campaignFilter.startsWith("last_")) {
        const months = parseInt(campaignFilter.split("_")[1]);
        if (isNaN(months) || months <= 0) return { data: [], total: 0 };
        const start = new Date(Date.UTC(nowTR.getUTCFullYear(), nowTR.getUTCMonth() - months, nowTR.getUTCDate()));
        start.setTime(start.getTime() - TR_OFFSET);
        const filter = { sentAt: { gte: start }, status: "SENT" as const };
        const existingAnd = Array.isArray(where.AND) ? where.AND : where.AND ? [where.AND] : [];
        where.AND = [...existingAnd, { OR: [
          { campaignLogs: { some: filter } },
          { mailLogs: { some: filter } },
        ] }];
      } else if (campaignFilter === "never") {
        where.campaignLogs = { none: {} };
        where.mailLogs = { none: {} };
        where.activities = { none: {} };
      }
    }

    // Representative filter
    if (representativeId) {
      where.representativeId = representativeId;
    }

    // BTK Zone filter
    if (btkZone && btkZone !== "all") {
      where.btkZone = btkZone;
    }

    // Province filter (via contacts relation)
    if (province && province !== "all") {
      const existingAnd = Array.isArray(where.AND) ? where.AND : where.AND ? [where.AND] : [];
      where.AND = [...existingAnd, { contacts: { some: { province } } }];
    }

    // District filter (via contacts relation)
    if (district && district !== "all") {
      const existingAnd = Array.isArray(where.AND) ? where.AND : where.AND ? [where.AND] : [];
      where.AND = [...existingAnd, { contacts: { some: { district } } }];
    }

    // Call status filter (checks the most recent CALL_LOG status)
    if (callStatusFilter && callStatusFilter !== "all") {
      const existingAnd = Array.isArray(where.AND) ? where.AND : where.AND ? [where.AND] : [];
      
      if (callStatusFilter === "none") {
        // Acentenin hiç CALL_LOG aktivitesi yok demektir
        where.AND = [
          ...existingAnd,
          {
            activities: {
              none: {
                type: "CALL_LOG"
              }
            }
          }
        ];
      } else {
        // En son yapılan aramanın durumu callStatusFilter olmalı.
        // Bunu PostgreSQL/SQLite uyumlu bir alt sorgu ile bulup agency ID listesi çıkararak filtreleyelim:
        try {
          const matchingAgencies = await prisma.$queryRawUnsafe<{ agency_id: string }[]>(
            `SELECT a1.agency_id 
             FROM activities a1
             INNER JOIN (
               SELECT agency_id, MAX(created_at) as max_created_at
               FROM activities
               WHERE type = 'CALL_LOG'
               GROUP BY agency_id
             ) a2 ON a1.agency_id = a2.agency_id AND a1.created_at = a2.max_created_at
             WHERE a1.type = 'CALL_LOG' AND a1.call_status = $1`,
            callStatusFilter
          );
          
          const matchingIds = matchingAgencies.map(a => a.agency_id);
          
          where.AND = [
            ...existingAnd,
            { id: { in: matchingIds } }
          ];
        } catch (e) {
          console.warn("[AgencyService] Call status query failed, falling back to simple query:", e);
          where.AND = [
            ...existingAnd,
            {
              activities: {
                some: {
                  type: "CALL_LOG",
                  callStatus: callStatusFilter as any
                }
              }
            }
          ];
        }
      }
    }

    // Build orderBy clause
    let orderBy: Prisma.AgencyOrderByWithRelationInput = { createdAt: "desc" };
    if (sortBy === "documentNo" && sortOrder) {
      orderBy = { documentNo: sortOrder };
    }

    try {
      const [data, total] = await prisma.$transaction([
        prisma.agency.findMany({
          where,
          skip,
          take,
          orderBy,
          include: {
            category: true,
            contacts: true,
            representative: { select: { id: true, name: true } },
            offers: { orderBy: { createdAt: "desc" } },
            activities: {
              where: { type: "CALL_LOG" },
              orderBy: { createdAt: "desc" },
              take: 1,
              select: { callStatus: true },
            },
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

      return { data: data as any, total };
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
          category: true,
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
  static async create(data: unknown): Promise<any> {
    const validData = AgencyCreateSchema.parse(data);
    
    return await prisma.agency.create({
      data: validData,
      include: { category: true },
    });
  }

  /**
   * Updates an existing agency.
   */
  static async update(id: string, data: unknown): Promise<any> {
    const validData = AgencyUpdateSchema.parse({ ...data as any, id });
    const { id: _, ...updateData } = validData;

    return await prisma.agency.update({
      where: { id },
      data: updateData,
      include: { category: true },
    });
  }

  /**
   * Soft-deletes an agency by marking it as DELETED.
   * Data is preserved for audit/recovery purposes.
   */
  static async delete(id: string): Promise<void> {
    await prisma.agency.update({
      where: { id },
      data: {
        status: "DELETED",
        isUnsubscribed: true,
      },
    });
  }

  /**
   * Permanently deletes an agency. Use with extreme caution.
   * Only for admin cleanup operations.
   */
  static async hardDelete(id: string): Promise<void> {
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
   * BTK Bölge listesini getirir (filtreleme için).
   */
  static async getDistinctBtkZones(): Promise<string[]> {
    try {
      const result = await prisma.agency.findMany({
        where: { btkZone: { not: null }, status: { not: "DELETED" } },
        select: { btkZone: true },
        distinct: ["btkZone"],
        orderBy: { btkZone: "asc" },
      });
      return result.map(r => r.btkZone!).filter(Boolean);
    } catch (error) {
      console.warn("Database connection failed in AgencyService.getDistinctBtkZones");
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
    categoryId?: string;
    mailHistory?: string; // "sent" | "not_sent" | "all"
    contactHistory?: string; // "contacted" | "not_contacted" | "all"
    page?: number;
    pageSize?: number;
  }): Promise<{ data: any[]; total: number; totalPages: number }> {
    try {
      const { search, province, district, status, categoryId, mailHistory, contactHistory } = params;
      const page = Math.max(1, params.page || 1);
      const pageSize = Math.min(Math.max(1, params.pageSize || 50), 200);
      const skip = (page - 1) * pageSize;

      const where: any = {
        isUnsubscribed: false,
        status: { not: "DELETED" },  // Exclude soft-deleted agencies
        contacts: { some: { email: { not: null } } }, // Email'i olanlar
      };

      if (search) {
        const digitsOnly = search.replace(/\D/g, "");
        const phoneSearch = digitsOnly.length >= 4 ? digitsOnly.slice(-7) : "";
        
        let phoneAgencyIds: string[] = [];
        if (phoneSearch) {
          try {
            const phoneResults = await prisma.$queryRawUnsafe<{ agency_id: string }[]>(
              `SELECT DISTINCT agency_id FROM contacts WHERE regexp_replace(phone, '[^0-9]', '', 'g') LIKE $1`,
              `%${phoneSearch}%`
            );
            phoneAgencyIds = phoneResults.map(r => r.agency_id);
          } catch (e) {
            console.warn("[AgencyService] Phone raw search failed:", e);
          }
        }
        
        where.OR = [
          { companyName: { contains: search, mode: "insensitive" } },
          { documentNo: { contains: search } },
          ...(phoneAgencyIds.length > 0 ? [{ id: { in: phoneAgencyIds } }] : []),
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

      if (categoryId && categoryId !== "all") {
        where.categoryId = categoryId;
      }

      // Mail geçmişi filtresi
      if (mailHistory === "sent") {
        const existingAnd = Array.isArray(where.AND) ? where.AND : where.AND ? [where.AND] : [];
        where.AND = [
          ...existingAnd,
          { OR: [
            { mailLogs: { some: { status: "SENT" } } },
            { campaignLogs: { some: { status: "SENT" } } },
          ]}
        ];
      } else if (mailHistory === "not_sent") {
        const existingAnd = Array.isArray(where.AND) ? where.AND : where.AND ? [where.AND] : [];
        where.AND = [
          ...existingAnd,
          { mailLogs: { none: {} } },
          { campaignLogs: { none: {} } },
        ];
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
            category: { select: { id: true, name: true } },
            mailLogs: { take: 1, orderBy: { sentAt: "desc" }, select: { sentAt: true, status: true } },
            _count: { select: { mailLogs: true, campaignLogs: true, conversations: true } },
          },
          orderBy: { companyName: "asc" },
          skip,
          take: pageSize,
        }),
        prisma.agency.count({ where }),
      ]);

      return { data, total, totalPages: Math.ceil(total / pageSize) };
    } catch (error) {
      console.warn("Database connection failed in AgencyService.getFilteredForPromotion");
      return { data: [], total: 0, totalPages: 0 };
    }
  }

  /**
   * Acente temsilcisini otomatik ata (sadece henüz atanmamışsa).
   * İlk etkileşimi gerçekleştiren kişi temsilci olur.
   */
  static async assignRepresentativeIfEmpty(agencyId: string, userId: string): Promise<void> {
    try {
      await prisma.agency.updateMany({
        where: {
          id: agencyId,
          representativeId: null,
        },
        data: {
          representativeId: userId,
        },
      });
    } catch (error) {
      console.warn(`[AgencyService] Failed to auto-assign representative for agency ${agencyId}:`, error);
    }
  }

  /**
   * Son etkileşim tarihini güncelle (her türlü işlem: not, çağrı, mail, görev).
   */
  static async updateLastInteraction(agencyId: string): Promise<void> {
    try {
      // Update interaction timestamp
      await prisma.agency.update({
        where: { id: agencyId },
        data: { lastInteractionAt: new Date() },
      });
      // Only activate if currently PASSIVE or LEAD (don't touch BLOCKED/REJECTED)
      await prisma.agency.updateMany({
        where: {
          id: agencyId,
          status: { in: ["PASSIVE", "LEAD"] },
        },
        data: { status: "ACTIVE" },
      });
    } catch (error) {
      console.warn(`[AgencyService] Failed to update lastInteractionAt for agency ${agencyId}:`, error);
    }
  }

  /**
   * Son arama tarihini güncelle (sadece CALL_LOG aktivitelerinde).
   */
  static async updateLastCall(agencyId: string): Promise<void> {
    try {
      const now = new Date();
      // Update call and interaction timestamps
      await prisma.agency.update({
        where: { id: agencyId },
        data: {
          lastCallAt: now,
          lastInteractionAt: now,
        },
      });
      // Only activate if currently PASSIVE or LEAD (don't touch BLOCKED/REJECTED)
      await prisma.agency.updateMany({
        where: {
          id: agencyId,
          status: { in: ["PASSIVE", "LEAD"] },
        },
        data: { status: "ACTIVE" },
      });
    } catch (error) {
      console.warn(`[AgencyService] Failed to update lastCallAt for agency ${agencyId}:`, error);
    }
  }
}
