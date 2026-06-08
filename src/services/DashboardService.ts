import prisma from "@/lib/prisma";

export interface DashboardStats {
  totalAgencies: number;
  activeConversations: number;
  sentCampaigns: number;
  totalCampaigns: number;
}

export interface RecentCampaign {
  id: string;
  subject: string;
  agencyCount: number;
  createdAt: Date;
  status: string;
}

export interface RecentConversation {
  id: string;
  channelType: string;
  status: string;
  contactName: string | null;
  agencyName: string | null;
  lastMessage: string | null;
  updatedAt: Date;
}

export interface RecentNote {
  id: string;
  agencyId: string | null;
  agencyName: string | null;
  agencyProvince: string | null;
  agencySector: string | null;
  agencyStatus: string | null;
  representativeName: string | null;
  createdByName: string | null;
  lastMessage: string | null;
  updatedAt: Date;
}

export class DashboardService {
  // Turkey timezone helper (UTC+3)
  private static getTurkeyToday(): Date {
    const TR_OFFSET = 3 * 60 * 60 * 1000;
    const nowTR = new Date(Date.now() + TR_OFFSET);
    const todayStart = new Date(Date.UTC(nowTR.getUTCFullYear(), nowTR.getUTCMonth(), nowTR.getUTCDate()));
    todayStart.setTime(todayStart.getTime() - TR_OFFSET);
    return todayStart;
  }

  /**
   * Dashboard istatistik kartları için özet veriler.
   */
  static async getStats(): Promise<DashboardStats> {
    try {
      const [totalAgencies, activeConversations, sentCampaigns, totalCampaigns, sentMailLogs] = await Promise.all([
        prisma.agency.count(),
        prisma.conversation.count({ where: { status: "OPEN", channelType: { not: "MANUAL_NOTE" }, messages: { some: {} } } }),
        prisma.campaign.count({ where: { status: "COMPLETED" } }),
        prisma.campaign.count(),
        prisma.mailLog.count({ where: { status: "SENT" } }),
      ]);

      return {
        totalAgencies,
        activeConversations,
        sentCampaigns: sentCampaigns + sentMailLogs,
        totalCampaigns,
      };
    } catch (error) {
      console.warn("Database connection failed in DashboardService.getStats");
      return { totalAgencies: 0, activeConversations: 0, sentCampaigns: 0, totalCampaigns: 0 };
    }
  }

  /**
   * Son toplu tanıtım kampanyaları.
   */
  static async getRecentCampaigns(limit = 6): Promise<RecentCampaign[]> {
    try {
      const campaigns = await prisma.campaign.findMany({
        orderBy: { createdAt: "desc" },
        take: limit,
        include: {
          _count: { select: { logs: true } },
        },
      });

      return campaigns.map(c => ({
        id: c.id,
        subject: c.subject ?? "Tanıtım",
        agencyCount: c.targetCount ?? 0,
        createdAt: c.createdAt,
        status: c.status,
      }));
    } catch (error) {
      console.warn("Database connection failed in DashboardService.getRecentCampaigns");
      return [];
    }
  }

  /**
   * Son aktif sohbetler (inbox).
   */
  static async getRecentConversations(limit = 6): Promise<RecentConversation[]> {
    try {
      const convos = await prisma.conversation.findMany({
        where: {
          channelType: { not: "MANUAL_NOTE" },
        },
        orderBy: { updatedAt: "desc" },
        take: limit,
        include: {
          agency: { select: { companyName: true } },
          messages: {
            orderBy: { createdAt: "desc" },
            take: 1,
            select: { content: true },
          },
        },
      });

      return convos.map(c => ({
        id: c.id,
        channelType: c.channelType,
        status: c.status,
        contactName: c.contactName,
        agencyName: c.agency?.companyName ?? null,
        lastMessage: c.messages[0]?.content ?? null,
        updatedAt: c.updatedAt,
      }));
    } catch (error) {
      console.warn("Database connection failed in DashboardService.getRecentConversations");
      return [];
    }
  }

  /**
   * Son acente notları (MANUAL_NOTE).
   */
  static async getRecentNotes(limit = 8): Promise<RecentNote[]> {
    try {
      const notes = await prisma.conversation.findMany({
        where: {
          channelType: "MANUAL_NOTE",
          agencyId: { not: null },
        },
        orderBy: { updatedAt: "desc" },
        take: limit,
        include: {
          agency: {
            select: {
              id: true,
              companyName: true,
              status: true,
              representative: { select: { name: true } },
              contacts: {
                take: 1,
                select: { province: true },
              },
              sectors: {
                take: 1,
                select: { name: true },
              },
            },
          },
          createdByUser: { select: { name: true } },
          messages: {
            orderBy: { createdAt: "desc" },
            take: 1,
            select: { content: true },
          },
        },
      });

      return notes.map(n => ({
        id: n.id,
        agencyId: n.agencyId,
        agencyName: n.agency?.companyName ?? null,
        agencyProvince: n.agency?.contacts?.[0]?.province ?? null,
        agencySector: n.agency?.sectors?.[0]?.name ?? null,
        agencyStatus: n.agency?.status ?? null,
        representativeName: n.agency?.representative?.name ?? null,
        createdByName: n.createdByUser?.name ?? null,
        lastMessage: n.messages[0]?.content ?? null,
        updatedAt: n.updatedAt,
      }));
    } catch (error) {
      console.warn("Database connection failed in DashboardService.getRecentNotes");
      return [];
    }
  }

  /**
   * Son aktiviteler (tüm tipler) + MANUAL_NOTE notları birleşik.
   */
  static async getRecentActivities(limit = 50, dateFilter?: string): Promise<any[]> {
    try {
      const TR_OFFSET = 3 * 60 * 60 * 1000;
      const nowTR = new Date(Date.now() + TR_OFFSET);
      const todayStart = new Date(Date.UTC(nowTR.getUTCFullYear(), nowTR.getUTCMonth(), nowTR.getUTCDate()));
      todayStart.setTime(todayStart.getTime() - TR_OFFSET);

      let dateWhere: any = {};
      if (dateFilter === "today") {
        dateWhere = { createdAt: { gte: todayStart } };
      } else if (dateFilter === "week") {
        const weekAgo = new Date(todayStart.getTime() - 7 * 24 * 60 * 60 * 1000);
        dateWhere = { createdAt: { gte: weekAgo } };
      } else if (dateFilter === "month") {
        const monthAgo = new Date(todayStart.getTime() - 30 * 24 * 60 * 60 * 1000);
        dateWhere = { createdAt: { gte: monthAgo } };
      }

      // Fetch activities
      const [activities, notes] = await Promise.all([
        prisma.activity.findMany({
          where: dateWhere,
          orderBy: { createdAt: "desc" },
          take: limit,
          include: {
            agency: {
              select: {
                id: true,
                companyName: true,
                status: true,
                representative: { select: { name: true } },
                contacts: { take: 1, select: { province: true } },
                sectors: { take: 1, select: { name: true } },
              },
            },
            creator: { select: { id: true, name: true } },
            assignedTo: { select: { id: true, name: true } },
          },
        }),
        // Fetch MANUAL_NOTE conversations
        prisma.conversation.findMany({
          where: {
            channelType: "MANUAL_NOTE",
            agencyId: { not: null },
            ...(dateWhere.createdAt ? { createdAt: dateWhere.createdAt } : {}),
          },
          orderBy: { createdAt: "desc" },
          take: limit,
          include: {
            agency: {
              select: {
                id: true,
                companyName: true,
                status: true,
                representative: { select: { name: true } },
                contacts: { take: 1, select: { province: true } },
                sectors: { take: 1, select: { name: true } },
              },
            },
            createdByUser: { select: { id: true, name: true } },
            messages: {
              orderBy: { createdAt: "desc" },
              take: 1,
              select: { content: true },
            },
          },
        }),
      ]);

      // Normalize notes to activity-like shape
      const normalizedNotes = notes.map((n: any) => ({
        id: n.id,
        type: "MANUAL_NOTE",
        content: n.messages[0]?.content || "Not eklendi",
        status: "COMPLETED",
        callStatus: null,
        completionNote: null,
        createdAt: n.createdAt,
        agency: n.agency,
        creator: n.createdByUser ? { id: n.createdByUser.id, name: n.createdByUser.name } : null,
        assignedTo: null,
      }));

      // Merge and sort by createdAt desc
      const combined = [...activities, ...normalizedNotes]
        .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, limit);

      return combined;
    } catch (error) {
      console.warn("Database connection failed in DashboardService.getRecentActivities");
      return [];
    }
  }

  /**
   * Geçmiş (overdue) görevler - tarihi geçmiş ama hâlâ PENDING.
   * userId verilirse sadece o kullanıcıya atanmış veya oluşturduğu görevleri getirir.
   */
  static async getOverdueTasks(userId?: string) {
    try {
      const today = DashboardService.getTurkeyToday();

      const where: any = {
        status: "PENDING",
        dueDate: { lt: today },
      };

      if (userId) {
        where.OR = [
          { assignedToId: userId },
          { creatorId: userId },
        ];
      }

      const tasks = await prisma.activity.findMany({
        where,
        orderBy: { dueDate: "asc" },
        take: 30,
        include: {
          agency: { select: { id: true, companyName: true } },
          assignedTo: { select: { name: true } },
          creator: { select: { name: true } },
        },
      });

      return tasks;
    } catch (error) {
      console.warn("Database connection failed in DashboardService.getOverdueTasks");
      return [];
    }
  }

  /**
   * Bugünkü görevler (tarihi bugün veya tarihsiz).
   * userId verilirse sadece o kullanıcıya atanmış veya oluşturduğu görevleri getirir.
   */
  static async getTodayTasks(userId?: string) {
    try {
      const today = DashboardService.getTurkeyToday();
      const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);

      const where: any = {
        status: "PENDING",
        dueDate: { gte: today, lt: tomorrow },
      };

      if (userId) {
        where.OR = [
          { assignedToId: userId },
          { creatorId: userId },
        ];
      }

      const tasks = await prisma.activity.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: 20,
        include: {
          agency: { select: { id: true, companyName: true } },
          assignedTo: { select: { name: true } },
          creator: { select: { name: true } },
        },
      });

      return tasks;
    } catch (error) {
      console.warn("Database connection failed in DashboardService.getTodayTasks");
      return [];
    }
  }

  /**
   * Yaklaşan görevler (tarihi yarın ve sonrası).
   * userId verilirse sadece o kullanıcıya atanmış veya oluşturduğu görevleri getirir.
   */
  static async getUpcomingTasks(userId?: string) {
    try {
      const today = DashboardService.getTurkeyToday();
      const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);

      const where: any = {
        status: "PENDING",
        dueDate: { gte: tomorrow },
      };

      if (userId) {
        where.OR = [
          { assignedToId: userId },
          { creatorId: userId },
        ];
      }

      const tasks = await prisma.activity.findMany({
        where,
        orderBy: { dueDate: "asc" },
        take: 20,
        include: {
          agency: { select: { id: true, companyName: true } },
          assignedTo: { select: { name: true } },
          creator: { select: { name: true } },
        },
      });

      return tasks;
    } catch (error) {
      console.warn("Database connection failed in DashboardService.getUpcomingTasks");
      return [];
    }
  }
}
