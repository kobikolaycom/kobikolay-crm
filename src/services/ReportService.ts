import prisma from "@/lib/prisma";
import { MailService } from "./MailService";

// ═══════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════

interface UserStats {
  userId: string;
  userName: string;
  mailsSent: number;
  mailsOpened: number;
  mailsClicked: number;
  callsTotal: number;
  callsReached: number;
  callsNoAnswer: number;
  callsBusy: number;
  messagesTotal: number;
  messagesWhatsapp: number;
  messagesInstagram: number;
  messagesMessenger: number;
  tasksCompleted: number;
  tasksCreated: number;
  notesAdded: number;
  overdueTaskCount: number;
  score: number;
}

interface HotLead {
  agencyName: string;
  clickedAt: Date;
  lastCallDate: Date | null;
  hasNote: boolean;
}

interface OverdueTask {
  content: string;
  assigneeName: string;
  dueDate: Date;
  daysOverdue: number;
}

interface UnansweredMessage {
  agencyName: string;
  channel: string;
  lastMessage: string;
  waitingHours: number;
}

interface ReportData {
  period: { start: Date; end: Date };
  type: "daily" | "weekly" | "monthly";
  totalMailsSent: number;
  totalMailsOpened: number;
  totalMailsClicked: number;
  totalCalls: number;
  totalMessages: number;
  totalTasksCompleted: number;
  newAgencies: number;
  openRate: number;
  clickRate: number;
  userStats: UserStats[];
  hotLeads: HotLead[];
  overdueTasks: OverdueTask[];
  unansweredMessages: UnansweredMessage[];
  // Period comparison (weekly/monthly only)
  prevPeriod?: {
    mailsSent: number;
    mailsOpened: number;
    calls: number;
    tasksCompleted: number;
    newAgencies: number;
  };
}

// Score weights
const SCORE = {
  MAIL_SENT: 1,
  MAIL_OPENED: 2,
  MAIL_CLICKED: 5,
  CALL_REACHED: 3,
  CALL_NOANSWER: 1,
  TASK_COMPLETED: 3,
  NOTE_ADDED: 1,
  MESSAGE_SENT: 2,
  OVERDUE_TASK: -2,
};

// ═══════════════════════════════════════════════════════
// SERVICE
// ═══════════════════════════════════════════════════════

export class ReportService {

  // ─── MAIN ENTRY POINTS ───

  static async sendDailyReport(): Promise<{ success: boolean; error?: string }> {
    return this.sendReport("daily");
  }

  static async sendWeeklyReport(): Promise<{ success: boolean; error?: string }> {
    return this.sendReport("weekly");
  }

  static async sendMonthlyReport(): Promise<{ success: boolean; error?: string }> {
    return this.sendReport("monthly");
  }

  // ─── CORE SEND LOGIC ───

  private static async sendReport(type: "daily" | "weekly" | "monthly"): Promise<{ success: boolean; error?: string }> {
    try {
      const recipients = await this.getRecipients();
      if (recipients.length === 0) {
        return { success: false, error: "Rapor alıcısı bulunamadı" };
      }

      const { start, end } = this.getPeriod(type);
      const data = await this.collectData(start, end, type);
      const html = this.renderHTML(data);
      const subject = this.getSubject(type, end);

      // Send to each recipient
      for (const email of recipients) {
        await MailService.sendEmail({
          to: email,
          subject,
          html,
        });
      }

      return { success: true };
    } catch (error: any) {
      console.error(`Report [${type}] send error:`, error);
      return { success: false, error: error.message };
    }
  }

  // ─── DEMO REPORT (with fake data) ───

  static async sendDemoReport(type: "daily" | "weekly" | "monthly", recipientEmail: string): Promise<{ success: boolean; error?: string }> {
    try {
      const data = this.getDemoData(type);
      const html = this.renderHTML(data);
      const subject = `[TEST] ${this.getSubject(type, new Date())}`;

      await MailService.sendEmail({
        to: recipientEmail,
        subject,
        html,
      });

      return { success: true };
    } catch (error: any) {
      console.error(`Demo report [${type}] error:`, error);
      return { success: false, error: error.message };
    }
  }

  // ─── RECIPIENTS ───

  private static async getRecipients(): Promise<string[]> {
    const users = await prisma.user.findMany({
      where: { receivesReports: true, isActive: true },
      select: { email: true },
    });
    return users.map((u) => u.email);
  }

  // ─── PERIOD CALCULATION ───

  private static getPeriod(type: "daily" | "weekly" | "monthly"): { start: Date; end: Date } {
    const now = new Date();
    const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    if (type === "daily") {
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
      return { start, end };
    }
    if (type === "weekly") {
      const start = new Date(end);
      start.setDate(start.getDate() - 6);
      start.setHours(0, 0, 0, 0);
      return { start, end };
    }
    // monthly
    const start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
    return { start, end };
  }

  // ─── SUBJECT ───

  private static getSubject(type: "daily" | "weekly" | "monthly", date: Date): string {
    const dateStr = date.toLocaleDateString("tr-TR", { day: "numeric", month: "long", year: "numeric" });
    const map = {
      daily: `📊 KobiKolay Günlük Rapor — ${dateStr}`,
      weekly: `📊 KobiKolay Haftalık Rapor — ${dateStr}`,
      monthly: `📊 KobiKolay Aylık Rapor — ${date.toLocaleDateString("tr-TR", { month: "long", year: "numeric" })}`,
    };
    return map[type];
  }

  // ═══════════════════════════════════════════════════════
  // DATA COLLECTION
  // ═══════════════════════════════════════════════════════

  private static async collectData(start: Date, end: Date, type: "daily" | "weekly" | "monthly"): Promise<ReportData> {
    const dateFilter = { gte: start, lte: end };

    // Get all active users
    const users = await prisma.user.findMany({
      where: { isActive: true },
      select: { id: true, name: true },
    });

    // ─── Per-user stats ───
    const userStats: UserStats[] = [];

    for (const user of users) {
      // Mails
      const mails = await prisma.mailLog.findMany({
        where: { sentById: user.id, sentAt: dateFilter, status: "SENT" },
        select: { openedAt: true, clickedAt: true },
      });

      // Calls
      const calls = await prisma.activity.findMany({
        where: { creatorId: user.id, type: "CALL_LOG", createdAt: dateFilter },
        select: { callStatus: true },
      });

      // Messages sent (conversations where user sent messages)
      const messages = await prisma.conversationMessage.findMany({
        where: {
          senderType: "agent",
          senderName: user.name,
          createdAt: dateFilter,
          conversation: { channelType: { not: "MANUAL_NOTE" } },
        },
        select: { conversation: { select: { channelType: true } } },
      });

      // Tasks completed (status changed to COMPLETED within this period)
      const tasksCompleted = await prisma.activity.count({
        where: {
          OR: [{ assignedToId: user.id }, { creatorId: user.id }],
          type: "TASK_ASSIGNMENT",
          status: "COMPLETED",
          updatedAt: dateFilter,
        },
      });

      // Tasks created
      const tasksCreated = await prisma.activity.count({
        where: { creatorId: user.id, type: "TASK_ASSIGNMENT", createdAt: dateFilter },
      });

      // Notes added (manual notes are conversations with channelType MANUAL_NOTE)
      const notesAdded = await prisma.conversation.count({
        where: {
          createdByUserId: user.id,
          channelType: "MANUAL_NOTE",
          createdAt: dateFilter,
        },
      });

      // Overdue tasks
      const overdueTaskCount = await prisma.activity.count({
        where: {
          assignedToId: user.id,
          type: "TASK_ASSIGNMENT",
          status: "PENDING",
          dueDate: { lt: new Date() },
        },
      });

      const mailsSent = mails.length;
      const mailsOpened = mails.filter((m) => m.openedAt).length;
      const mailsClicked = mails.filter((m) => m.clickedAt).length;
      const callsReached = calls.filter((c) => c.callStatus === "REACHED").length;
      const callsNoAnswer = calls.filter((c) => c.callStatus === "NO_ANSWER").length;
      const callsBusy = calls.filter((c) => c.callStatus === "BUSY").length;
      const messagesWhatsapp = messages.filter((m) => m.conversation.channelType === "WHATSAPP").length;
      const messagesInstagram = messages.filter((m) => m.conversation.channelType === "INSTAGRAM").length;
      const messagesMessenger = messages.filter((m) => m.conversation.channelType === "MESSENGER").length;

      const score =
        mailsSent * SCORE.MAIL_SENT +
        mailsOpened * SCORE.MAIL_OPENED +
        mailsClicked * SCORE.MAIL_CLICKED +
        callsReached * SCORE.CALL_REACHED +
        callsNoAnswer * SCORE.CALL_NOANSWER +
        tasksCompleted * SCORE.TASK_COMPLETED +
        notesAdded * SCORE.NOTE_ADDED +
        (messagesWhatsapp + messagesInstagram + messagesMessenger) * SCORE.MESSAGE_SENT +
        overdueTaskCount * SCORE.OVERDUE_TASK;

      userStats.push({
        userId: user.id,
        userName: user.name || "İsimsiz",
        mailsSent,
        mailsOpened,
        mailsClicked,
        callsTotal: calls.length,
        callsReached,
        callsNoAnswer,
        callsBusy,
        messagesTotal: messages.length,
        messagesWhatsapp,
        messagesInstagram,
        messagesMessenger,
        tasksCompleted,
        tasksCreated,
        notesAdded,
        overdueTaskCount,
        score,
      });
    }

    // Sort by score descending
    userStats.sort((a, b) => b.score - a.score);

    // ─── Aggregates ───
    const totalMailsSent = userStats.reduce((s, u) => s + u.mailsSent, 0);
    const totalMailsOpened = userStats.reduce((s, u) => s + u.mailsOpened, 0);
    const totalMailsClicked = userStats.reduce((s, u) => s + u.mailsClicked, 0);
    const totalCalls = userStats.reduce((s, u) => s + u.callsTotal, 0);
    const totalMessages = userStats.reduce((s, u) => s + u.messagesTotal, 0);
    const totalTasksCompleted = userStats.reduce((s, u) => s + u.tasksCompleted, 0);

    const newAgencies = await prisma.agency.count({ where: { createdAt: dateFilter } });

    // ─── Hot Leads ───
    const hotLeads: HotLead[] = [];
    const clickedMails = await prisma.mailLog.findMany({
      where: { clickedAt: dateFilter, status: "SENT" },
      select: {
        clickedAt: true,
        agency: {
          select: {
            id: true,
            companyName: true,
            activities: {
              where: { type: "CALL_LOG" },
              orderBy: { createdAt: "desc" },
              take: 1,
              select: { createdAt: true },
            },
          },
        },
      },
      orderBy: { clickedAt: "desc" },
      distinct: ["agencyId"],
      take: 20,
    });

    for (const ml of clickedMails) {
      const lastCall = ml.agency.activities[0];
      const hasRecentNote = await prisma.activity.count({
        where: { agencyId: ml.agency.id, createdAt: dateFilter },
      });
      hotLeads.push({
        agencyName: ml.agency.companyName,
        clickedAt: ml.clickedAt!,
        lastCallDate: lastCall?.createdAt || null,
        hasNote: hasRecentNote > 0,
      });
    }

    // ─── Overdue Tasks ───
    const overdueTasks: OverdueTask[] = [];
    const overdueActivities = await prisma.activity.findMany({
      where: { type: "TASK_ASSIGNMENT", status: "PENDING", dueDate: { lt: new Date() } },
      include: { assignedTo: { select: { name: true } } },
      orderBy: { dueDate: "asc" },
      take: 15,
    });
    for (const a of overdueActivities) {
      const diffMs = Date.now() - new Date(a.dueDate!).getTime();
      overdueTasks.push({
        content: a.content,
        assigneeName: a.assignedTo?.name || "Atanmamış",
        dueDate: a.dueDate!,
        daysOverdue: Math.floor(diffMs / 86400000),
      });
    }

    // ─── Unanswered Messages ───
    const unansweredMessages: UnansweredMessage[] = [];
    const openConvos = await prisma.conversation.findMany({
      where: {
        status: "OPEN",
        channelType: { not: "MANUAL_NOTE" },
      },
      include: {
        agency: { select: { companyName: true } },
        messages: { orderBy: { createdAt: "desc" }, take: 1 },
      },
    });
    for (const convo of openConvos) {
      const lastMsg = convo.messages[0];
      if (lastMsg && lastMsg.senderType === "customer") {
        const hoursDiff = (Date.now() - new Date(lastMsg.createdAt).getTime()) / 3600000;
        if (hoursDiff > 24) {
          unansweredMessages.push({
            agencyName: convo.agency?.companyName || "Bilinmeyen",
            channel: convo.channelType,
            lastMessage: lastMsg.content.substring(0, 80),
            waitingHours: Math.floor(hoursDiff),
          });
        }
      }
    }

    // ─── Period Comparison (weekly/monthly) ───
    let prevPeriod = undefined;
    if (type === "weekly" || type === "monthly") {
      const periodLength = end.getTime() - start.getTime();
      const prevStart = new Date(start.getTime() - periodLength);
      const prevEnd = new Date(start.getTime() - 1);

      const [prevMails, prevCalls, prevTasks, prevNewAgencies] = await Promise.all([
        prisma.mailLog.count({ where: { sentAt: { gte: prevStart, lte: prevEnd }, status: "SENT" } }),
        prisma.activity.count({ where: { type: "CALL_LOG", createdAt: { gte: prevStart, lte: prevEnd } } }),
        prisma.activity.count({ where: { type: "TASK_ASSIGNMENT", status: "COMPLETED", updatedAt: { gte: prevStart, lte: prevEnd } } }),
        prisma.agency.count({ where: { createdAt: { gte: prevStart, lte: prevEnd } } }),
      ]);

      const prevMailsOpened = await prisma.mailLog.count({
        where: { sentAt: { gte: prevStart, lte: prevEnd }, status: "SENT", openedAt: { not: null } },
      });

      prevPeriod = {
        mailsSent: prevMails,
        mailsOpened: prevMailsOpened,
        calls: prevCalls,
        tasksCompleted: prevTasks,
        newAgencies: prevNewAgencies,
      };
    }

    return {
      period: { start, end },
      type,
      totalMailsSent,
      totalMailsOpened,
      totalMailsClicked,
      totalCalls,
      totalMessages,
      totalTasksCompleted,
      newAgencies,
      openRate: totalMailsSent > 0 ? Math.round((totalMailsOpened / totalMailsSent) * 100) : 0,
      clickRate: totalMailsOpened > 0 ? Math.round((totalMailsClicked / totalMailsOpened) * 100) : 0,
      userStats,
      hotLeads,
      overdueTasks,
      unansweredMessages,
      prevPeriod,
    };
  }

  // ═══════════════════════════════════════════════════════
  // DEMO DATA
  // ═══════════════════════════════════════════════════════

  private static getDemoData(type: "daily" | "weekly" | "monthly"): ReportData {
    const now = new Date();
    const mult = type === "daily" ? 1 : type === "weekly" ? 5 : 20;

    const users: UserStats[] = [
      {
        userId: "1", userName: "Onurhan Şeker",
        mailsSent: 28 * mult, mailsOpened: 19 * mult, mailsClicked: 7 * mult,
        callsTotal: 8 * mult, callsReached: 6 * mult, callsNoAnswer: 1 * mult, callsBusy: 1 * mult,
        messagesTotal: 5 * mult, messagesWhatsapp: 3 * mult, messagesInstagram: 1 * mult, messagesMessenger: 1 * mult,
        tasksCompleted: 4 * mult, tasksCreated: 2 * mult, notesAdded: 3 * mult, overdueTaskCount: 0,
        score: 142 * mult,
      },
      {
        userId: "2", userName: "Özdemir Bey",
        mailsSent: 17 * mult, mailsOpened: 9 * mult, mailsClicked: 2 * mult,
        callsTotal: 4 * mult, callsReached: 2 * mult, callsNoAnswer: 2 * mult, callsBusy: 0,
        messagesTotal: 3 * mult, messagesWhatsapp: 2 * mult, messagesInstagram: 1 * mult, messagesMessenger: 0,
        tasksCompleted: 2 * mult, tasksCreated: 1 * mult, notesAdded: 1 * mult, overdueTaskCount: 2,
        score: 78 * mult,
      },
      {
        userId: "3", userName: "Ayşe Korkmaz",
        mailsSent: 22 * mult, mailsOpened: 15 * mult, mailsClicked: 5 * mult,
        callsTotal: 6 * mult, callsReached: 5 * mult, callsNoAnswer: 1 * mult, callsBusy: 0,
        messagesTotal: 7 * mult, messagesWhatsapp: 4 * mult, messagesInstagram: 2 * mult, messagesMessenger: 1 * mult,
        tasksCompleted: 5 * mult, tasksCreated: 3 * mult, notesAdded: 4 * mult, overdueTaskCount: 1,
        score: 125 * mult,
      },
    ];

    users.sort((a, b) => b.score - a.score);

    const totalMailsSent = users.reduce((s, u) => s + u.mailsSent, 0);
    const totalMailsOpened = users.reduce((s, u) => s + u.mailsOpened, 0);
    const totalMailsClicked = users.reduce((s, u) => s + u.mailsClicked, 0);

    const data: ReportData = {
      period: { start: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0), end: now },
      type,
      totalMailsSent,
      totalMailsOpened,
      totalMailsClicked,
      totalCalls: users.reduce((s, u) => s + u.callsTotal, 0),
      totalMessages: users.reduce((s, u) => s + u.messagesTotal, 0),
      totalTasksCompleted: users.reduce((s, u) => s + u.tasksCompleted, 0),
      newAgencies: 3 * mult,
      openRate: Math.round((totalMailsOpened / totalMailsSent) * 100),
      clickRate: Math.round((totalMailsClicked / totalMailsOpened) * 100),
      userStats: users,
      hotLeads: [
        { agencyName: "Solar Tur", clickedAt: new Date(), lastCallDate: null, hasNote: false },
        { agencyName: "Royal Turizm", clickedAt: new Date(Date.now() - 86400000), lastCallDate: new Date(Date.now() - 3 * 86400000), hasNote: true },
        { agencyName: "Atlas Travel", clickedAt: new Date(), lastCallDate: null, hasNote: false },
        { agencyName: "Güneş Seyahat", clickedAt: new Date(Date.now() - 7200000), lastCallDate: null, hasNote: false },
      ],
      overdueTasks: [
        { content: "Royal Turizm - teklif hazırla", assigneeName: "Özdemir Bey", dueDate: new Date(Date.now() - 3 * 86400000), daysOverdue: 3 },
        { content: "Atlas Travel - sözleşme gönder", assigneeName: "Özdemir Bey", dueDate: new Date(Date.now() - 86400000), daysOverdue: 1 },
      ],
      unansweredMessages: [
        { agencyName: "Sun Travel", channel: "WHATSAPP", lastMessage: "fiyat bilgisi alabilir miyim?", waitingHours: 36 },
      ],
    };

    if (type !== "daily") {
      data.prevPeriod = {
        mailsSent: Math.round(totalMailsSent * 0.82),
        mailsOpened: Math.round(totalMailsOpened * 0.85),
        calls: Math.round(data.totalCalls * 0.9),
        tasksCompleted: Math.round(data.totalTasksCompleted * 1.15),
        newAgencies: Math.round(data.newAgencies * 0.6),
      };
    }

    return data;
  }

  // ═══════════════════════════════════════════════════════
  // HTML RENDERING (email-compatible inline CSS)
  // ═══════════════════════════════════════════════════════

  private static renderHTML(data: ReportData): string {
    const typeLabel = data.type === "daily" ? "Günlük" : data.type === "weekly" ? "Haftalık" : "Aylık";
    const dateStr = data.period.end.toLocaleDateString("tr-TR", { day: "numeric", month: "long", year: "numeric" });
    const periodStr = data.type === "daily"
      ? dateStr
      : `${data.period.start.toLocaleDateString("tr-TR", { day: "numeric", month: "short" })} — ${dateStr}`;

    const medal = (i: number) => i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i + 1}.`;
    const pct = (a: number, b: number) => b > 0 ? Math.round((a / b) * 100) : 0;
    const trend = (curr: number, prev: number) => {
      if (prev === 0) return '<span style="color:#6b7280;">—</span>';
      const diff = Math.round(((curr - prev) / prev) * 100);
      if (diff > 0) return `<span style="color:#16a34a;font-weight:700;">↑ +${diff}%</span>`;
      if (diff < 0) return `<span style="color:#dc2626;font-weight:700;">↓ ${diff}%</span>`;
      return '<span style="color:#6b7280;">→ 0%</span>';
    };

    // ─── STYLES ───
    const s = {
      card: 'background:#ffffff;border:1px solid #e2e8f0;border-radius:16px;overflow:hidden;margin-bottom:24px;',
      cardHeader: 'background:linear-gradient(135deg,#4f46e5,#7c3aed);padding:20px 24px;',
      cardHeaderText: 'color:#ffffff;font-size:16px;font-weight:800;margin:0;',
      th: 'padding:10px 16px;text-align:left;font-size:11px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.5px;border-bottom:2px solid #e2e8f0;',
      td: 'padding:10px 16px;font-size:13px;color:#334155;border-bottom:1px solid #f1f5f9;',
      tdBold: 'padding:10px 16px;font-size:13px;color:#0f172a;font-weight:700;border-bottom:1px solid #f1f5f9;',
      badge: (bg: string, fg: string) => `display:inline-block;padding:3px 10px;border-radius:8px;font-size:11px;font-weight:700;background:${bg};color:${fg};`,
      statBox: (bg: string) => `background:${bg};border-radius:12px;padding:16px 20px;text-align:center;width:16%;min-width:110px;`,
    };

    let html = `
<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:'Segoe UI',Roboto,Arial,sans-serif;">
<div style="max-width:720px;margin:0 auto;padding:24px 16px;">

<!-- HEADER -->
<div style="text-align:center;margin-bottom:32px;">
  <h1 style="font-size:28px;font-weight:900;color:#0f172a;margin:0;">📊 ${typeLabel} Performans Raporu</h1>
  <p style="font-size:14px;color:#64748b;margin:8px 0 0;">${periodStr}</p>
</div>

<!-- ═══ BÖLÜM 1: YÖNETİCİ ÖZETİ ═══ -->
<table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
  <tr>
    <td style="${s.statBox('#eff6ff')}">
      <div style="font-size:28px;font-weight:900;color:#2563eb;">${data.totalMailsSent}</div>
      <div style="font-size:11px;color:#3b82f6;font-weight:700;margin-top:4px;">📧 Mail Gönderim</div>
    </td>
    <td style="width:8px;"></td>
    <td style="${s.statBox('#f0fdf4')}">
      <div style="font-size:28px;font-weight:900;color:#16a34a;">${data.totalCalls}</div>
      <div style="font-size:11px;color:#22c55e;font-weight:700;margin-top:4px;">📞 Arama</div>
    </td>
    <td style="width:8px;"></td>
    <td style="${s.statBox('#faf5ff')}">
      <div style="font-size:28px;font-weight:900;color:#7c3aed;">${data.totalMessages}</div>
      <div style="font-size:11px;color:#8b5cf6;font-weight:700;margin-top:4px;">💬 Mesaj</div>
    </td>
    <td style="width:8px;"></td>
    <td style="${s.statBox('#fefce8')}">
      <div style="font-size:28px;font-weight:900;color:#ca8a04;">${data.totalTasksCompleted}</div>
      <div style="font-size:11px;color:#eab308;font-weight:700;margin-top:4px;">✅ Görev</div>
    </td>
    <td style="width:8px;"></td>
    <td style="${s.statBox('#fdf2f8')}">
      <div style="font-size:28px;font-weight:900;color:#db2777;">${data.newAgencies}</div>
      <div style="font-size:11px;color:#ec4899;font-weight:700;margin-top:4px;">🆕 Yeni Acente</div>
    </td>
  </tr>
</table>

<!-- Open/Click Rate -->
<table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
  <tr>
    <td style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:12px 20px;text-align:center;width:50%;">
      <span style="font-size:22px;font-weight:900;color:#2563eb;">%${data.openRate}</span>
      <span style="font-size:12px;color:#64748b;margin-left:8px;">👁 Açılma Oranı</span>
    </td>
    <td style="width:8px;"></td>
    <td style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:12px 20px;text-align:center;width:50%;">
      <span style="font-size:22px;font-weight:900;color:#7c3aed;">%${data.clickRate}</span>
      <span style="font-size:12px;color:#64748b;margin-left:8px;">🎯 Tıklama Oranı</span>
    </td>
  </tr>
</table>`;

    // ═══ BÖLÜM 2: AKTİVİTE KIRILIMI ═══

    // Mail breakdown
    html += `
<div style="${s.card}">
  <div style="${s.cardHeader}">
    <h2 style="${s.cardHeaderText}">📧 Mail Gönderim Detayı</h2>
  </div>
  <table width="100%" cellpadding="0" cellspacing="0">
    <tr style="background:#f8fafc;">
      <th style="${s.th}">Personel</th>
      <th style="${s.th}">Gönderilen</th>
      <th style="${s.th}">Açılan</th>
      <th style="${s.th}">Açılma %</th>
      <th style="${s.th}">Tıklanan</th>
      <th style="${s.th}">Tıklama %</th>
    </tr>`;

    for (const u of data.userStats) {
      if (u.mailsSent === 0 && data.type === "daily") continue;
      const openPct = pct(u.mailsOpened, u.mailsSent);
      const clickPct = pct(u.mailsClicked, u.mailsOpened);
      html += `
    <tr>
      <td style="${s.tdBold}">${u.userName}</td>
      <td style="${s.td}">${u.mailsSent}</td>
      <td style="${s.td}">${u.mailsOpened}</td>
      <td style="${s.td}"><span style="${s.badge(openPct >= 50 ? '#dcfce7' : '#fef9c3', openPct >= 50 ? '#16a34a' : '#ca8a04')}">%${openPct}</span></td>
      <td style="${s.td}">${u.mailsClicked}</td>
      <td style="${s.td}"><span style="${s.badge(clickPct >= 15 ? '#ede9fe' : '#fef9c3', clickPct >= 15 ? '#7c3aed' : '#ca8a04')}">%${clickPct}</span></td>
    </tr>`;
    }

    html += `
    <tr style="background:#f8fafc;font-weight:700;">
      <td style="${s.tdBold}">TOPLAM</td>
      <td style="${s.tdBold}">${data.totalMailsSent}</td>
      <td style="${s.tdBold}">${data.totalMailsOpened}</td>
      <td style="${s.tdBold}"><span style="${s.badge('#dbeafe', '#2563eb')}">%${data.openRate}</span></td>
      <td style="${s.tdBold}">${data.totalMailsClicked}</td>
      <td style="${s.tdBold}"><span style="${s.badge('#ede9fe', '#7c3aed')}">%${data.clickRate}</span></td>
    </tr>
  </table>
</div>`;

    // Call breakdown
    html += `
<div style="${s.card}">
  <div style="background:linear-gradient(135deg,#059669,#10b981);padding:20px 24px;">
    <h2 style="${s.cardHeaderText}">📞 Arama Detayı</h2>
  </div>
  <table width="100%" cellpadding="0" cellspacing="0">
    <tr style="background:#f8fafc;">
      <th style="${s.th}">Personel</th>
      <th style="${s.th}">Toplam</th>
      <th style="${s.th}">✅ Ulaşıldı</th>
      <th style="${s.th}">📵 Cevap Yok</th>
      <th style="${s.th}">⏳ Meşgul</th>
    </tr>`;

    for (const u of data.userStats) {
      if (u.callsTotal === 0 && data.type === "daily") continue;
      html += `
    <tr>
      <td style="${s.tdBold}">${u.userName}</td>
      <td style="${s.td}">${u.callsTotal}</td>
      <td style="${s.td}"><span style="${s.badge('#dcfce7', '#16a34a')}">${u.callsReached}</span></td>
      <td style="${s.td}"><span style="${s.badge('#fef9c3', '#ca8a04')}">${u.callsNoAnswer}</span></td>
      <td style="${s.td}"><span style="${s.badge('#fee2e2', '#dc2626')}">${u.callsBusy}</span></td>
    </tr>`;
    }

    html += `</table></div>`;

    // Messages breakdown
    html += `
<div style="${s.card}">
  <div style="background:linear-gradient(135deg,#7c3aed,#a855f7);padding:20px 24px;">
    <h2 style="${s.cardHeaderText}">💬 Mesajlaşma Detayı</h2>
  </div>
  <table width="100%" cellpadding="0" cellspacing="0">
    <tr style="background:#f8fafc;">
      <th style="${s.th}">Personel</th>
      <th style="${s.th}">WhatsApp</th>
      <th style="${s.th}">Instagram</th>
      <th style="${s.th}">Messenger</th>
      <th style="${s.th}">Toplam</th>
    </tr>`;

    for (const u of data.userStats) {
      if (u.messagesTotal === 0 && data.type === "daily") continue;
      html += `
    <tr>
      <td style="${s.tdBold}">${u.userName}</td>
      <td style="${s.td}">${u.messagesWhatsapp}</td>
      <td style="${s.td}">${u.messagesInstagram}</td>
      <td style="${s.td}">${u.messagesMessenger}</td>
      <td style="${s.tdBold}">${u.messagesTotal}</td>
    </tr>`;
    }

    html += `</table></div>`;

    // Task/Note breakdown
    html += `
<div style="${s.card}">
  <div style="background:linear-gradient(135deg,#ca8a04,#eab308);padding:20px 24px;">
    <h2 style="${s.cardHeaderText}">✅ Görev & Not Detayı</h2>
  </div>
  <table width="100%" cellpadding="0" cellspacing="0">
    <tr style="background:#f8fafc;">
      <th style="${s.th}">Personel</th>
      <th style="${s.th}">Tamamlanan</th>
      <th style="${s.th}">Yeni Atanan</th>
      <th style="${s.th}">📝 Not</th>
      <th style="${s.th}">⏰ Gecikmiş</th>
    </tr>`;

    for (const u of data.userStats) {
      html += `
    <tr>
      <td style="${s.tdBold}">${u.userName}</td>
      <td style="${s.td}">${u.tasksCompleted}</td>
      <td style="${s.td}">${u.tasksCreated}</td>
      <td style="${s.td}">${u.notesAdded}</td>
      <td style="${s.td}">${u.overdueTaskCount > 0 ? `<span style="${s.badge('#fee2e2', '#dc2626')}">${u.overdueTaskCount} 🔴</span>` : '<span style="color:#22c55e;">0 ✓</span>'}</td>
    </tr>`;
    }

    html += `</table></div>`;

    // ═══ BÖLÜM 3: PERSONEL SKOR KARTI ═══
    html += `
<div style="${s.card}">
  <div style="background:linear-gradient(135deg,#0f172a,#334155);padding:20px 24px;">
    <h2 style="${s.cardHeaderText}">🏆 Personel Skor Kartı</h2>
  </div>
  <table width="100%" cellpadding="0" cellspacing="0">
    <tr style="background:#f8fafc;">
      <th style="${s.th}">#</th>
      <th style="${s.th}">Personel</th>
      <th style="${s.th}">📧</th>
      <th style="${s.th}">📞</th>
      <th style="${s.th}">💬</th>
      <th style="${s.th}">✅</th>
      <th style="${s.th}">Puan</th>
    </tr>`;

    data.userStats.forEach((u, i) => {
      const rowBg = i === 0 ? 'background:#fefce8;' : '';
      html += `
    <tr style="${rowBg}">
      <td style="${s.td};font-size:16px;">${medal(i)}</td>
      <td style="${s.tdBold}">${u.userName}</td>
      <td style="${s.td}">${u.mailsSent}</td>
      <td style="${s.td}">${u.callsTotal}</td>
      <td style="${s.td}">${u.messagesTotal}</td>
      <td style="${s.td}">${u.tasksCompleted}</td>
      <td style="${s.td}"><span style="${s.badge('#0f172a', '#ffffff')};font-size:14px;">${u.score}</span></td>
    </tr>`;
    });

    html += `</table></div>`;

    // ═══ BÖLÜM 4: SICAK FIRSATLAR & UYARILAR ═══
    if (data.hotLeads.length > 0) {
      html += `
<div style="${s.card}">
  <div style="background:linear-gradient(135deg,#dc2626,#ef4444);padding:20px 24px;">
    <h2 style="${s.cardHeaderText}">🔥 Sıcak Fırsatlar — Takip Edilmeli!</h2>
  </div>
  <div style="padding:16px;">
    <p style="font-size:12px;color:#64748b;margin:0 0 12px;">Bu acenteler mailinize tıkladı ama henüz yeterli takip yapılmadı.</p>
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr style="background:#f8fafc;">
        <th style="${s.th}">Acente</th>
        <th style="${s.th}">Tıklama</th>
        <th style="${s.th}">Son Arama</th>
        <th style="${s.th}">Durum</th>
      </tr>`;

      for (const hl of data.hotLeads) {
        const clickDate = hl.clickedAt.toLocaleDateString("tr-TR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
        const callDate = hl.lastCallDate
          ? hl.lastCallDate.toLocaleDateString("tr-TR", { day: "numeric", month: "short" })
          : "Hiç aranmadı";
        const status = !hl.lastCallDate
          ? `<span style="${s.badge('#fee2e2', '#dc2626')}">🔴 ACİL TAKİP</span>`
          : `<span style="${s.badge('#fef9c3', '#ca8a04')}">🟡 Yeniden Aranmalı</span>`;

        html += `
      <tr>
        <td style="${s.tdBold}">${hl.agencyName}</td>
        <td style="${s.td}">${clickDate}</td>
        <td style="${s.td}">${callDate}</td>
        <td style="${s.td}">${status}</td>
      </tr>`;
      }

      html += `</table></div></div>`;
    }

    // Overdue tasks
    if (data.overdueTasks.length > 0) {
      html += `
<div style="${s.card}">
  <div style="background:linear-gradient(135deg,#ea580c,#f97316);padding:20px 24px;">
    <h2 style="${s.cardHeaderText}">⏰ Gecikmiş Görevler</h2>
  </div>
  <table width="100%" cellpadding="0" cellspacing="0">
    <tr style="background:#f8fafc;">
      <th style="${s.th}">Görev</th>
      <th style="${s.th}">Atanan</th>
      <th style="${s.th}">Son Tarih</th>
      <th style="${s.th}">Gecikme</th>
    </tr>`;

      for (const t of data.overdueTasks) {
        html += `
    <tr>
      <td style="${s.tdBold}">${t.content}</td>
      <td style="${s.td}">${t.assigneeName}</td>
      <td style="${s.td}">${t.dueDate.toLocaleDateString("tr-TR", { day: "numeric", month: "short" })}</td>
      <td style="${s.td}"><span style="${s.badge('#fee2e2', '#dc2626')}">${t.daysOverdue} gün 🔴</span></td>
    </tr>`;
      }

      html += `</table></div>`;
    }

    // Unanswered messages
    if (data.unansweredMessages.length > 0) {
      html += `
<div style="${s.card}">
  <div style="background:linear-gradient(135deg,#0284c7,#38bdf8);padding:20px 24px;">
    <h2 style="${s.cardHeaderText}">💬 Yanıtsız Mesajlar (24+ saat)</h2>
  </div>
  <table width="100%" cellpadding="0" cellspacing="0">
    <tr style="background:#f8fafc;">
      <th style="${s.th}">Acente</th>
      <th style="${s.th}">Kanal</th>
      <th style="${s.th}">Son Mesaj</th>
      <th style="${s.th}">Bekleme</th>
    </tr>`;

      const chLabel: Record<string, string> = { WHATSAPP: "WhatsApp", INSTAGRAM: "Instagram", MESSENGER: "Messenger" };
      for (const m of data.unansweredMessages) {
        html += `
    <tr>
      <td style="${s.tdBold}">${m.agencyName}</td>
      <td style="${s.td}">${chLabel[m.channel] || m.channel}</td>
      <td style="${s.td};max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">"${m.lastMessage}"</td>
      <td style="${s.td}"><span style="${s.badge('#fee2e2', '#dc2626')}">${m.waitingHours} saat 🔴</span></td>
    </tr>`;
      }

      html += `</table></div>`;
    }

    // ═══ BÖLÜM 5: DÖNEM KARŞILAŞTIRMASI ═══
    if (data.prevPeriod) {
      const prev = data.prevPeriod;
      const label = data.type === "weekly" ? "Geçen Hafta" : "Geçen Ay";

      html += `
<div style="${s.card}">
  <div style="background:linear-gradient(135deg,#6366f1,#818cf8);padding:20px 24px;">
    <h2 style="${s.cardHeaderText}">📈 Dönem Karşılaştırması (vs ${label})</h2>
  </div>
  <table width="100%" cellpadding="0" cellspacing="0">
    <tr style="background:#f8fafc;">
      <th style="${s.th}">Metrik</th>
      <th style="${s.th}">Bu Dönem</th>
      <th style="${s.th}">${label}</th>
      <th style="${s.th}">Değişim</th>
    </tr>
    <tr>
      <td style="${s.tdBold}">📧 Mail Gönderim</td>
      <td style="${s.td}">${data.totalMailsSent}</td>
      <td style="${s.td}">${prev.mailsSent}</td>
      <td style="${s.td}">${trend(data.totalMailsSent, prev.mailsSent)}</td>
    </tr>
    <tr>
      <td style="${s.tdBold}">👁 Mail Açılma</td>
      <td style="${s.td}">${data.totalMailsOpened}</td>
      <td style="${s.td}">${prev.mailsOpened}</td>
      <td style="${s.td}">${trend(data.totalMailsOpened, prev.mailsOpened)}</td>
    </tr>
    <tr>
      <td style="${s.tdBold}">📞 Arama</td>
      <td style="${s.td}">${data.totalCalls}</td>
      <td style="${s.td}">${prev.calls}</td>
      <td style="${s.td}">${trend(data.totalCalls, prev.calls)}</td>
    </tr>
    <tr>
      <td style="${s.tdBold}">✅ Tamamlanan Görev</td>
      <td style="${s.td}">${data.totalTasksCompleted}</td>
      <td style="${s.td}">${prev.tasksCompleted}</td>
      <td style="${s.td}">${trend(data.totalTasksCompleted, prev.tasksCompleted)}</td>
    </tr>
    <tr>
      <td style="${s.tdBold}">🆕 Yeni Acente</td>
      <td style="${s.td}">${data.newAgencies}</td>
      <td style="${s.td}">${prev.newAgencies}</td>
      <td style="${s.td}">${trend(data.newAgencies, prev.newAgencies)}</td>
    </tr>
  </table>
</div>`;
    }

    // FOOTER
    html += `
<div style="text-align:center;padding:24px 0;border-top:1px solid #e2e8f0;margin-top:24px;">
  <p style="font-size:12px;color:#94a3b8;margin:0;">Bu rapor KobiKolay CRM tarafından otomatik oluşturulmuştur.</p>
  <p style="font-size:11px;color:#cbd5e1;margin:4px 0 0;">${new Date().toLocaleDateString("tr-TR", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" })}</p>
</div>

</div></body></html>`;

    return html;
  }
}
