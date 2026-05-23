import prisma from "@/lib/prisma";
import { CampaignStatus, MailStatus, Agency } from "@prisma/client";
import { MailService } from "./MailService";

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
    parsed = parsed.replace(/{{companyName}}/g, agency.companyName || "");
    parsed = parsed.replace(/{{documentNo}}/g, agency.documentNo || "");
    parsed = parsed.replace(/{{unsubscribeToken}}/g, agency.unsubscribeToken || "");
    parsed = parsed.replace(/{{unsubscribeUrl}}/g, `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/unsubscribe?token=${agency.unsubscribeToken}`);
    return parsed;
  }

  /**
   * Helper to build email html (Mock format)
   */
  static buildCampaignEmail(content: string, agency: any): string {
    const parsedContent = this.templateParser(content, agency);
    return `
      <div style="font-family: sans-serif; padding: 20px; color: #333;">
        <h2>Sayın ${agency.companyName} Yetkilisi,</h2>
        <div style="line-height: 1.6; font-size: 14px;">
          ${parsedContent.replace(/\n/g, '<br>')}
        </div>
        <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
        <p style="font-size: 11px; color: #999;">
          Bu e-posta KobiKolay CRM üzerinden gönderilmiştir.
          E-posta listesinden çıkmak için <a href="${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/unsubscribe?token=${agency.unsubscribeToken}">buraya tıklayabilirsiniz</a>.
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
    
    // Send emails sequentially or in parallel chunks
    for (const agency of targets) {
      const email = agency.contacts[0]?.email;
      if (!email) continue;

      try {
        // Send actual email via SMTP
        const html = this.buildCampaignEmail(campaign.content, agency);
        await MailService.sendEmail({
          to: email,
          subject: campaign.subject ?? "KobiKolay Tanıtım",
          html,
        });

        await prisma.campaignLog.create({
          data: {
            campaignId: campaignId,
            agencyId: agency.id,
            status: MailStatus.SENT,
            sentAt: new Date()
          }
        });
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

    await prisma.campaign.update({
      where: { id: campaignId },
      data: { 
        status: CampaignStatus.COMPLETED,
        targetCount: targets.length
      }
    });

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
    const toEmail = contact?.email || agency.contacts[0]?.email || "";

    if (!toEmail) {
      throw new Error("Acenteye ait e-posta adresi bulunamadı.");
    }

    const _emailHtml = this.buildCampaignEmail(plainTextContent, agency);
    
    // Send real email via SMTP
    await MailService.sendEmail({
      to: toEmail,
      subject: subject,
      html: _emailHtml,
    });

    // Log to MailLog (Röntgen)
    await prisma.mailLog.create({
      data: {
        agencyId: agency.id,
        subject: subject,
        content: `Birebir E-Posta (Inbox Hızlı Teklif).\n${attachedSectors.length > 0 ? `Odak Sektör(ler): ${sectorNames}\nEkli Dosya: ${hasPdfs ? 'Var' : 'Yok'}\n` : ''}Ön Yazı:\n${this.templateParser(plainTextContent, agency)}`,
        status: MailStatus.SENT,
        sentAt: new Date(),
      }
    });

    if (agency.status === 'PASSIVE') {
      await prisma.agency.update({
        where: { id: agency.id },
        data: { status: 'LEAD' }
      });
    }

    return { success: true };
  }

  /**
   * Tanıtım istatistikleri
   */
  static async getCampaignStats() {
    const now = new Date();

    // Zaman aralıkları
    const todayStart = new Date(now); todayStart.setHours(0,0,0,0);
    const yesterdayStart = new Date(todayStart); yesterdayStart.setDate(yesterdayStart.getDate() - 1);

    const weekStart = new Date(todayStart);
    weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1); // Pazartesi
    const lastWeekStart = new Date(weekStart); lastWeekStart.setDate(lastWeekStart.getDate() - 7);

    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);

    // Count helper
    const countInRange = async (from: Date, to: Date) => {
      return prisma.campaignLog.count({
        where: { sentAt: { gte: from, lte: to }, status: "SENT" },
      });
    };

    const [
      todayCount, yesterdayCount,
      thisWeekCount, lastWeekCount,
      thisMonthCount, lastMonthCount,
      totalCount, totalCampaigns,
    ] = await Promise.all([
      countInRange(todayStart, now),
      countInRange(yesterdayStart, todayStart),
      countInRange(weekStart, now),
      countInRange(lastWeekStart, weekStart),
      countInRange(monthStart, now),
      countInRange(lastMonthStart, lastMonthEnd),
      prisma.campaignLog.count({ where: { status: "SENT" } }),
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

    // Sektör bazlı gönderim (CampaignLog -> Agency -> Sectors)
    const sectorStats = await prisma.$queryRaw<{ name: string; count: bigint }[]>`
      SELECT s.name, COUNT(cl.id)::bigint as count
      FROM campaign_logs cl
      JOIN agencies a ON a.id = cl.agency_id
      JOIN "_AgencySectors" as2 ON as2."A" = a.id
      JOIN sectors s ON s.id = as2."B"
      WHERE cl.status = 'SENT'
      GROUP BY s.name
      ORDER BY count DESC
      LIMIT 10
    `;

    return {
      today: todayCount,
      yesterday: yesterdayCount,
      thisWeek: thisWeekCount,
      lastWeek: lastWeekCount,
      thisMonth: thisMonthCount,
      lastMonth: lastMonthCount,
      total: totalCount,
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
      sectorStats: sectorStats.map(s => ({
        name: s.name,
        count: Number(s.count),
      })),
    };
  }
}
