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
  }): Promise<{ data: AgencyWithRelations[], total: number }> {
    const { skip = 0, take = 50, search, sector, pitchStatus, campaignFilter, dateFrom, dateTo } = params || {};
    
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
      if (campaignFilter === "today") {
        const todayStart = new Date(now); todayStart.setHours(0,0,0,0);
        const filter = { sentAt: { gte: todayStart }, status: "SENT" as const };
        where.OR = [
          { campaignLogs: { some: filter } },
          { mailLogs: { some: filter } },
        ];
      } else if (campaignFilter === "week") {
        const weekStart = new Date(now);
        weekStart.setHours(0,0,0,0);
        weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1);
        const filter = { sentAt: { gte: weekStart }, status: "SENT" as const };
        where.OR = [
          { campaignLogs: { some: filter } },
          { mailLogs: { some: filter } },
        ];
      } else if (campaignFilter === "month") {
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const filter = { sentAt: { gte: monthStart }, status: "SENT" as const };
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
              take: 5,
              select: {
                id: true,
                status: true,
                sentAt: true,
                openedAt: true,
                clickedAt: true,
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
}
