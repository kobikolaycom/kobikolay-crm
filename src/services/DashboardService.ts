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
  contactName: string | null;
  agencyName: string | null;
  lastMessage: string | null;
  updatedAt: Date;
}

export class DashboardService {
  /**
   * Dashboard istatistik kartları için özet veriler.
   */
  static async getStats(): Promise<DashboardStats> {
    const [totalAgencies, activeConversations, sentCampaigns, totalCampaigns] = await Promise.all([
      prisma.agency.count(),
      prisma.conversation.count({ where: { status: "OPEN" } }),
      prisma.campaign.count({ where: { status: "COMPLETED" } }),
      prisma.campaign.count(),
    ]);

    return { totalAgencies, activeConversations, sentCampaigns, totalCampaigns };
  }

  /**
   * Son toplu tanıtım kampanyaları.
   */
  static async getRecentCampaigns(limit = 6): Promise<RecentCampaign[]> {
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
  }

  /**
   * Son aktif sohbetler (inbox).
   */
  static async getRecentConversations(limit = 6): Promise<RecentConversation[]> {
    const convos = await prisma.conversation.findMany({
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
      contactName: c.contactName,
      agencyName: c.agency?.companyName ?? null,
      lastMessage: c.messages[0]?.content ?? null,
      updatedAt: c.updatedAt,
    }));
  }

  /**
   * Geçmiş (overdue) görevler - tarihi geçmiş ama hâlâ PENDING.
   */
  static async getOverdueTasks() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const tasks = await prisma.activity.findMany({
      where: {
        status: "PENDING",
        dueDate: { lt: today },
      },
      orderBy: { dueDate: "asc" },
      take: 30,
      include: {
        agency: { select: { id: true, companyName: true } },
        assignedTo: { select: { name: true } },
        creator: { select: { name: true } },
      },
    });

    return tasks;
  }

  /**
   * Bugünkü görevler (tarihi bugün veya tarihsiz).
   */
  static async getTodayTasks() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const tasks = await prisma.activity.findMany({
      where: {
        status: "PENDING",
        OR: [
          { dueDate: null },
          { dueDate: { gte: today, lt: tomorrow } },
        ],
      },
      orderBy: { createdAt: "desc" },
      take: 20,
      include: {
        agency: { select: { id: true, companyName: true } },
        assignedTo: { select: { name: true } },
        creator: { select: { name: true } },
      },
    });

    return tasks;
  }

  /**
   * Yaklaşan görevler (tarihi yarın ve sonrası).
   */
  static async getUpcomingTasks() {
    const tomorrow = new Date();
    tomorrow.setHours(0, 0, 0, 0);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const tasks = await prisma.activity.findMany({
      where: {
        status: "PENDING",
        dueDate: { gte: tomorrow },
      },
      orderBy: { dueDate: "asc" },
      take: 20,
      include: {
        agency: { select: { id: true, companyName: true } },
        assignedTo: { select: { name: true } },
        creator: { select: { name: true } },
      },
    });

    return tasks;
  }
}
