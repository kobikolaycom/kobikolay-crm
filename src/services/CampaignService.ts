import prisma from "@/lib/prisma";
import { CampaignStatus, MailStatus, Agency } from "@prisma/client";
import { MailService } from "./MailService";
import { AgencyService } from "@/services/AgencyService";
import { escapeHtml, getBaseUrl } from "@/lib/utils";

export interface CampaignFilter {
  sectorId?: string;
  province?: string;
  btkZone?: string;
  status?: "ACTIVE" | "PASSIVE" | "LEAD";
}

export class CampaignService {
  /**
   * Targets agencies based on filters.
   * Returns agencies that match AND are NOT unsubscribed.
   */
  static async getTargetAgencies(filter: CampaignFilter) {
    const whereClause: any = {
      isUnsubscribed: false, // Yasal Filtre: Abonelikten çıkanları KESİNLİKLE dahil etme
    };

    if (filter.status) {
      whereClause.status = filter.status;
    }

    if (filter.province) {
      whereClause.contacts = {
        some: { province: filter.province },
      };
    }

    if (filter.sectorId) {
      whereClause.sectors = {
        some: { id: filter.sectorId },
      };
    }

    if (filter.btkZone) {
      whereClause.btkZone = filter.btkZone;
    }

    const targets = await prisma.agency.findMany({
      where: whereClause,
      select: {
        id: true,
        companyName: true,
        unsubscribeToken: true,
        status: true,
        contacts: {
          select: { email: true }
        }
      }
    });

    // Sadece emaili olanları filtrele
    return targets.filter(t => t.contacts.some(c => c.email));
  }

  /**
   * Replaces placeholders in templates with actual agency data.
   */
  static templateParser(template: string, agency: any): string {
    if (!template) return "";
    let parsed = template;
    parsed = parsed.replace(/{{companyName}}/g, escapeHtml(agency.companyName || ""));
    parsed = parsed.replace(/{{authorizedPerson}}/g, escapeHtml(agency.authorizedPerson || "Yetkili"));
    parsed = parsed.replace(/{{documentNo}}/g, escapeHtml(agency.documentNo || ""));
    parsed = parsed.replace(/{{sectorNames}}/g, escapeHtml(agency.sectors?.map((s: any) => s.name).join(", ") || ""));
    parsed = parsed.replace(/{{currentDate}}/g, new Date().toLocaleDateString("tr-TR"));
    parsed = parsed.replace(/{{unsubscribeToken}}/g, agency.unsubscribeToken || "");
    parsed = parsed.replace(/{{unsubscribeUrl}}/g, `${getBaseUrl()}/unsubscribe?token=${agency.unsubscribeToken}`);
    parsed = parsed.replace(/{{baseUrl}}/g, getBaseUrl());
    return parsed;
  }

  /**
   * Helper to build email html (Mock format)
   */
  static buildCampaignEmail(content: string, agency: any): string {
    const parsedContent = this.templateParser(content, agency);
    const hasHtml = /<[a-z/][\s\S]*>/i.test(parsedContent);
    const bodyContent = hasHtml ? parsedContent : parsedContent.replace(/\n/g, '<br>');
    return `
      <div style="font-family: sans-serif; padding: 20px; color: #333;">
        <h2>Sayın ${agency.companyName} Yetkilisi,</h2>
        <div style="line-height: 1.6; font-size: 14px;">
          ${bodyContent}
        </div>
        <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
        <p style="font-size: 11px; color: #999; line-height: 1.5; margin: 0 0 8px 0;">
          <strong>Adres:</strong> Barbaros Mah. Şebboy Sokak No:4/1 İç Kapı No:1 Ataşehir/İstanbul (Dijitalpark Teknokent)
        </p>
        <p style="font-size: 11px; color: #999; margin: 0;">
          Bu e-posta KobiKolay CRM üzerinden gönderilmiştir.<br>
          E-posta listesinden çıkmak için <a href="${getBaseUrl()}/unsubscribe?token=${agency.unsubscribeToken}">buraya tıklayabilirsiniz</a>.
        </p>
      </div>
    `;
  }

  /**
   * Dispatches a mass campaign to multiple agencies.
   */
  static async dispatchCampaign(campaignId: string, filter: CampaignFilter) {
    const campaign = await prisma.campaign.findUnique({
      where: { id: campaignId }
    });

    if (!campaign) throw new Error("Kampanya bulunamadı");

    await prisma.campaign.update({
      where: { id: campaignId },
      data: { status: CampaignStatus.SENDING }
    });

    const targets = await this.getTargetAgencies(filter);
    
    // Progressive rate limiting: 500ms base + 2s extra every 10 emails
    const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
    
    for (let i = 0; i < targets.length; i++) {
      const agency = targets[i];
      const email = agency.contacts[0]?.email;
      if (!email) continue;

      // Progressive bekleme: her 10 mailde +2 saniye ekle
      const baseDelay = 500; // 500ms temel bekleme
      const extraDelay = Math.floor(i / 10) * 2000; // Her 10 mailde +2sn
      if (i > 0) await delay(baseDelay + extraDelay);

      try {
        const emailSubject = campaign.subject ? this.templateParser(campaign.subject, agency) : "KobiKolay Tanıtım";
        const rawHtml = this.buildCampaignEmail(campaign.content, agency);

        // Create MailLog record first to get trackingId
        const mailLog = await prisma.mailLog.create({
          data: {
            agencyId: agency.id,
            subject: emailSubject,
            content: `Kampanya E-postası: ${campaign.name}`,
            status: MailStatus.PENDING,
          }
        });

        const tid = mailLog.trackingId;
        const baseUrl = getBaseUrl();
        const trackingPixel = `<img src="${baseUrl}/api/track?tid=${tid}&type=open" width="1" height="1" style="display:none;border:0;" alt="" />`;

        // Wrap links for tracking
        let trackedHtml = rawHtml.replace(
          /href="(https?:\/\/[^"]+)"/g,
          (match: string, url: string) => {
            if (url.includes("/api/track")) return match;
            const trackUrl = `${baseUrl}/api/track?tid=${tid}&type=click&url=${encodeURIComponent(url)}`;
            return `href="${trackUrl}"`;
          }
        );

        const lastDivIndex = trackedHtml.lastIndexOf('</div>');
        if (lastDivIndex !== -1) {
          trackedHtml = trackedHtml.slice(0, lastDivIndex) + trackingPixel + trackedHtml.slice(lastDivIndex);
        } else {
          trackedHtml += trackingPixel;
        }

        // Send actual email via SMTP
        await MailService.sendEmail({
          to: email,
          subject: emailSubject,
          html: trackedHtml,
        });

        // Update MailLog status to SENT
        await prisma.mailLog.update({
          where: { id: mailLog.id },
          data: {
            status: MailStatus.SENT,
            sentAt: new Date(),
          }
        });

        await prisma.campaignLog.create({
          data: {
            campaignId: campaignId,
            agencyId: agency.id,
            status: MailStatus.SENT,
            sentAt: new Date()
          }
        });

        await AgencyService.updateLastInteraction(agency.id);
      } catch (error: any) {
        await prisma.campaignLog.create({
          data: {
            campaignId: campaignId,
            agencyId: agency.id,
            status: MailStatus.FAILED,
            errorMessage: error.message || "Bilinmeyen hata"
          }
        });
      }
    }

    try {
      await prisma.campaign.update({
        where: { id: campaignId },
        data: { 
          status: CampaignStatus.COMPLETED,
          targetCount: targets.length
        }
      });
    } catch (statusError) {
      console.error(`[CampaignService] Failed to update campaign ${campaignId} status to COMPLETED:`, statusError);
    }

    return { success: true, count: targets.length };
  }

  /**
   * Sends an individual email directly to one agency from Inbox / Offer Hub
   */
  static async sendIndividualEmail(agencyId: string, subject: string, plainTextContent: string, newSectorId?: string) {
    const agency = await prisma.agency.findUnique({
      where: { id: agencyId },
      include: { sectors: true }
    });

    if (!agency) throw new Error("Acente bulunamadı");
    if (agency.isUnsubscribed) throw new Error("Acente e-posta almak istemiyor (Abonelikten çıkmış)");
    
    let attachedSectors = agency.sectors;

    if (newSectorId && newSectorId !== "none") {
      const isAlreadyAssigned = agency.sectors.some(s => s.id === newSectorId);
      if (!isAlreadyAssigned) {
        await prisma.agency.update({
          where: { id: agency.id },
          data: {
            sectors: {
              connect: { id: newSectorId }
            }
          }
        });
        const newlyAdded = await prisma.sector.findUnique({ where: { id: newSectorId } });
        if (newlyAdded) {
          attachedSectors.push(newlyAdded);
        }
      }
    }

    const sectorNames = attachedSectors.map(s => s.name).join(", ");
    const hasPdfs = attachedSectors.some(s => s.pdfUrl);

    // Fetch the target email address for individual message
    const contact = await prisma.contact.findFirst({
      where: { agencyId: agency.id, email: { not: null } }
    });
    const toEmail = contact?.email || "";

    if (!toEmail) {
      throw new Error("Acenteye ait e-posta adresi bulunamadı.");
    }

    const _emailHtml = this.buildCampaignEmail(plainTextContent, agency);
    const parsedSubject = this.templateParser(subject, agency);

    // Create MailLog record first to get trackingId
    const mailLog = await prisma.mailLog.create({
      data: {
        agencyId: agency.id,
        subject: parsedSubject,
        content: `Birebir E-Posta (Inbox Hızlı Teklif).\n${attachedSectors.length > 0 ? `Odak Sektör(ler): ${sectorNames}\nEkli Dosya: ${hasPdfs ? 'Var' : 'Yok'}\n` : ''}Ön Yazı:\n${this.templateParser(plainTextContent, agency)}`,
        status: MailStatus.PENDING,
      }
    });

    const tid = mailLog.trackingId;
    const baseUrl = getBaseUrl();
    const trackingPixel = `<img src="${baseUrl}/api/track?tid=${tid}&type=open" width="1" height="1" style="display:none;border:0;" alt="" />`;

    // Wrap links for tracking
    let trackedHtml = _emailHtml.replace(
      /href="(https?:\/\/[^"]+)"/g,
      (match: string, url: string) => {
        if (url.includes("/api/track")) return match;
        const trackUrl = `${baseUrl}/api/track?tid=${tid}&type=click&url=${encodeURIComponent(url)}`;
        return `href="${trackUrl}"`;
      }
    );

    const lastDivIndex = trackedHtml.lastIndexOf('</div>');
    if (lastDivIndex !== -1) {
      trackedHtml = trackedHtml.slice(0, lastDivIndex) + trackingPixel + trackedHtml.slice(lastDivIndex);
    } else {
      trackedHtml += trackingPixel;
    }

    // Send real email via SMTP
    await MailService.sendEmail({
      to: toEmail,
      subject: parsedSubject,
      html: trackedHtml,
    });

    // Update status to SENT
    await prisma.mailLog.update({
      where: { id: mailLog.id },
      data: {
        status: MailStatus.SENT,
        sentAt: new Date(),
      }
    });

    await AgencyService.updateLastInteraction(agencyId);

    if (agency.status === 'PASSIVE') {
      await prisma.agency.update({
        where: { id: agency.id },
        data: { status: 'LEAD' }
      });
    }

    return { success: true };
  }

  /**
   * Tanıtım istatistikleri — CampaignLog + MailLog birleşik
   */
  static async getCampaignStats() {
    const now = new Date();

    // ─── Türkiye Saati (UTC+3) ───
    // Vercel UTC'de çalışır. TR gece yarısı = UTC 21:00 (önceki gün)
    const TR_OFFSET = 3 * 60 * 60 * 1000; // 3 saat ms
    const nowTR = new Date(now.getTime() + TR_OFFSET);

    // Bugün başlangıcı (TR)
    const todayStart = new Date(Date.UTC(nowTR.getUTCFullYear(), nowTR.getUTCMonth(), nowTR.getUTCDate()));
    todayStart.setTime(todayStart.getTime() - TR_OFFSET);

    // Dün başlangıcı
    const yesterdayStart = new Date(todayStart.getTime() - 24 * 60 * 60 * 1000);

    // Hafta başlangıcı (Pazartesi 00:00 TR)
    const dayOfWeek = nowTR.getUTCDay(); // 0=Pazar, 1=Pazartesi, ...
    const daysToMonday = (dayOfWeek + 6) % 7; // Pazar=6, Pazartesi=0, Salı=1, ...
    const weekStart = new Date(todayStart.getTime() - daysToMonday * 24 * 60 * 60 * 1000);
    const lastWeekStart = new Date(weekStart.getTime() - 7 * 24 * 60 * 60 * 1000);

    // Ay başlangıcı (TR)
    const monthStart = new Date(Date.UTC(nowTR.getUTCFullYear(), nowTR.getUTCMonth(), 1));
    monthStart.setTime(monthStart.getTime() - TR_OFFSET);
    const lastMonthStart = new Date(Date.UTC(nowTR.getUTCFullYear(), nowTR.getUTCMonth() - 1, 1));
    lastMonthStart.setTime(lastMonthStart.getTime() - TR_OFFSET);
    const lastMonthEnd = new Date(monthStart.getTime() - 1); // Geçen ayın son anı

    // Count helpers — both tables
    const countCampaignInRange = (from: Date, to: Date) =>
      prisma.campaignLog.count({
        where: { sentAt: { gte: from, lte: to }, status: "SENT" },
      });
    const countMailInRange = (from: Date, to: Date) =>
      prisma.mailLog.count({
        where: { sentAt: { gte: from, lte: to }, status: "SENT" },
      });

    const [
      clToday, mlToday,
      clYesterday, mlYesterday,
      clWeek, mlWeek,
      clLastWeek, mlLastWeek,
      clMonth, mlMonth,
      clLastMonth, mlLastMonth,
      clTotal, mlTotal,
      totalCampaigns,
    ] = await Promise.all([
      countCampaignInRange(todayStart, now), countMailInRange(todayStart, now),
      countCampaignInRange(yesterdayStart, todayStart), countMailInRange(yesterdayStart, todayStart),
      countCampaignInRange(weekStart, now), countMailInRange(weekStart, now),
      countCampaignInRange(lastWeekStart, weekStart), countMailInRange(lastWeekStart, weekStart),
      countCampaignInRange(monthStart, now), countMailInRange(monthStart, now),
      countCampaignInRange(lastMonthStart, lastMonthEnd), countMailInRange(lastMonthStart, lastMonthEnd),
      prisma.campaignLog.count({ where: { status: "SENT" } }),
      prisma.mailLog.count({ where: { status: "SENT" } }),
      prisma.campaign.count(),
    ]);

    // Son kampanyalar
    const recentCampaigns = await prisma.campaign.findMany({
      orderBy: { createdAt: "desc" },
      take: 10,
      include: {
        _count: { select: { logs: true } },
      },
    });

    // Son tanıtım mailleri (PitchService üzerinden gönderilenler)
    const recentMailLogs = await prisma.mailLog.findMany({
      where: { status: "SENT" },
      orderBy: { sentAt: "desc" },
      take: 10,
      include: {
        agency: { select: { companyName: true } },
      },
    });

    // Sektör bazlı gönderim — CampaignLog + MailLog birleşik
    let sectorStats: { name: string; count: number }[] = [];
    try {
      const rawStats = await prisma.$queryRaw<{ name: string; count: bigint }[]>`
        SELECT s.name, COUNT(*)::bigint as count FROM (
          SELECT cl.agency_id FROM campaign_logs cl WHERE cl.status = 'SENT'
          UNION ALL
          SELECT ml.agency_id FROM mail_logs ml WHERE ml.status = 'SENT'
        ) combined
        JOIN agencies a ON a.id = combined.agency_id
        JOIN "_AgencySectors" as2 ON as2."A" = a.id
        JOIN sectors s ON s.id = as2."B"
        GROUP BY s.name
        ORDER BY count DESC
        LIMIT 10
      `;
      sectorStats = rawStats.map(s => ({ name: s.name, count: Number(s.count) }));
    } catch (statsError) {
      console.error("[CampaignService] Failed to fetch sector stats:", statsError);
      sectorStats = [];
    }

    return {
      today: clToday + mlToday,
      yesterday: clYesterday + mlYesterday,
      thisWeek: clWeek + mlWeek,
      lastWeek: clLastWeek + mlLastWeek,
      thisMonth: clMonth + mlMonth,
      lastMonth: clLastMonth + mlLastMonth,
      total: clTotal + mlTotal,
      totalCampaigns,
      recentCampaigns: recentCampaigns.map(c => ({
        id: c.id,
        name: c.name,
        subject: c.subject,
        status: c.status,
        targetCount: c.targetCount,
        logCount: c._count.logs,
        createdAt: c.createdAt,
      })),
      recentMailLogs: recentMailLogs.map(m => ({
        id: m.id,
        subject: m.subject,
        agencyName: m.agency?.companyName || "—",
        sentAt: m.sentAt,
        openedAt: m.openedAt,
        clickedAt: m.clickedAt,
      })),
      sectorStats,
    };
  }
}
