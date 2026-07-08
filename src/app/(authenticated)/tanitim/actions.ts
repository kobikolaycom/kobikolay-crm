"use server";

import { auth } from "@/auth";
import { CampaignService } from "@/services/CampaignService";
import { BusinessCategoryService } from "@/services/BusinessCategoryService";
import { AgencyService } from "@/services/AgencyService";
import { EmailTemplateService } from "@/services/EmailTemplateService";
import { MailService } from "@/services/MailService";
import prisma from "@/lib/prisma";
import { CampaignStatus, MailStatus } from "@prisma/client";
import { revalidatePath } from "next/cache";

export async function getSectorsAction() {
  const session = await auth();
  if (!session?.user) throw new Error("Yetkisiz");
  return BusinessCategoryService.list();
}

export async function getProvincesAction() {
  const session = await auth();
  if (!session?.user) throw new Error("Yetkisiz");
  return AgencyService.getDistinctProvinces();
}

export async function getDistrictsAction(province: string) {
  const session = await auth();
  if (!session?.user) throw new Error("Yetkisiz");
  return AgencyService.getDistrictsByProvince(province);
}

export async function getTemplatesAction() {
  const session = await auth();
  if (!session?.user) throw new Error("Yetkisiz");
  return EmailTemplateService.list();
}

export async function getFilteredAgenciesAction(filters: {
  search?: string;
  province?: string;
  district?: string;
  status?: string;
  categoryId?: string;
  mailHistory?: string;
  contactHistory?: string;
  page?: number;
  pageSize?: number;
}) {
  const session = await auth();
  if (!session?.user) throw new Error("Yetkisiz");
  return AgencyService.getFilteredForPromotion(filters);
}

export async function getTargetCountAction(filter: {
  categoryId?: string;
  status?: string;
}) {
  const session = await auth();
  if (!session?.user) throw new Error("Yetkisiz");
  const targets = await CampaignService.getTargetAgencies(filter as any);
  return targets.length;
}

export async function getTargetAgenciesPreviewAction(filter: {
  categoryId?: string;
  status?: string;
}) {
  const session = await auth();
  if (!session?.user) throw new Error("Yetkisiz");
  const targets = await CampaignService.getTargetAgencies(filter as any);
  return targets.slice(0, 20).map(t => ({
    id: t.id,
    companyName: t.companyName,
    email: t.contacts[0]?.email || "—",
  }));
}

export async function createAndDispatchCampaignAction(data: {
  name: string;
  subject: string;
  content: string;
  categoryId?: string;
  agencyStatus?: string;
}) {
  const session = await auth();
  if (!session?.user) throw new Error("Yetkisiz");

  if (!data.name || !data.subject || !data.content) {
    throw new Error("Kampanya adı, konu ve içerik zorunludur");
  }

  // 1. Create campaign record
  const campaign = await prisma.campaign.create({
    data: {
      name: data.name,
      subject: data.subject,
      content: data.content,
      status: CampaignStatus.DRAFT,
    },
  });

  // 2. Build filter
  const filter: any = {};
  if (data.categoryId && data.categoryId !== "all") filter.categoryId = data.categoryId;
  if (data.agencyStatus && data.agencyStatus !== "all") filter.status = data.agencyStatus;

  // 3. Dispatch
  try {
    const result = await CampaignService.dispatchCampaign(campaign.id, filter);
    revalidatePath("/tanitim");
    return { success: true, campaignId: campaign.id, count: result.count };
  } catch (error: any) {
    // Mark as failed
    await prisma.campaign.update({
      where: { id: campaign.id },
      data: { status: CampaignStatus.CANCELLED },
    });
    throw new Error(`Gönderim hatası: ${error.message}`);
  }
}

/**
 * Tanıtım sayfasından gelişmiş filtrelerle toplu mail gönderimi.
 */
export async function sendBulkPromotionAction(data: {
  agencyIds: string[];
  subject: string;
  content: string;
  campaignName: string;
}) {
  const session = await auth();
  if (!session?.user) throw new Error("Yetkisiz");

  if (!data.agencyIds.length || !data.subject || !data.content) {
    throw new Error("Acente seçimi, konu ve içerik zorunludur");
  }

  // 1. Create campaign record
  const campaign = await prisma.campaign.create({
    data: {
      name: data.campaignName || `Tanıtım - ${new Date().toLocaleDateString("tr-TR")}`,
      subject: data.subject,
      content: data.content,
      status: CampaignStatus.SENDING,
      targetCount: data.agencyIds.length,
    },
  });

  // 2. Fetch selected agencies with contacts and sectors
  const agencies = await prisma.agency.findMany({
    where: { 
      id: { in: data.agencyIds },
      isUnsubscribed: false,
    },
    include: {
      contacts: { select: { email: true } },
      category: { select: { name: true } },
    },
  });

  // 3. Send emails with progressive rate limiting
  const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
  let sentCount = 0;
  let failCount = 0;

  for (let i = 0; i < agencies.length; i++) {
    const agency = agencies[i];
    const email = agency.contacts[0]?.email;
    if (!email) continue;

    // Progressive bekleme: 500ms base + her 10 mailde +2 saniye
    const baseDelay = 500;
    const extraDelay = Math.floor(i / 10) * 2000;
    if (i > 0) await delay(baseDelay + extraDelay);

    try {
      // Parse template and build email HTML
      const emailSubject = CampaignService.templateParser(data.subject, agency);
      const rawHtml = CampaignService.buildCampaignEmail(data.content, agency);

      // Create MailLog record for tracking (pixel + link)
      const mailLog = await prisma.mailLog.create({
        data: {
          agencyId: agency.id,
          subject: emailSubject,
          content: `Kampanya E-postası: ${data.campaignName}`,
          status: MailStatus.PENDING,
        },
      });

      // Inject tracking pixel and wrap links
      const tid = mailLog.trackingId;
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://kobikolay-crm.vercel.app";
      const trackingPixel = `<img src="${baseUrl}/api/track?tid=${tid}&type=open" width="1" height="1" style="display:none;border:0;" alt="" />`;

      let trackedHtml = rawHtml;

        const lastDivIndex = trackedHtml.lastIndexOf('</div>');
      if (lastDivIndex !== -1) {
        trackedHtml = trackedHtml.slice(0, lastDivIndex) + trackingPixel + trackedHtml.slice(lastDivIndex);
      } else {
        trackedHtml += trackingPixel;
      }

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
        },
      });

      await prisma.campaignLog.create({
        data: {
          campaignId: campaign.id,
          agencyId: agency.id,
          status: MailStatus.SENT,
          sentAt: new Date(),
        },
      });

      await AgencyService.updateLastInteraction(agency.id);
      sentCount++;
    } catch (error: any) {
      await prisma.campaignLog.create({
        data: {
          campaignId: campaign.id,
          agencyId: agency.id,
          status: MailStatus.FAILED,
          errorMessage: error.message || "Bilinmeyen hata",
        },
      });
      failCount++;
    }
  }

  // 4. Update campaign status
  await prisma.campaign.update({
    where: { id: campaign.id },
    data: {
      status: CampaignStatus.COMPLETED,
      targetCount: sentCount,
    },
  });

  revalidatePath("/tanitim");
  return { success: true, sent: sentCount, failed: failCount };
}

/**
 * Kendine test mail gönder.
 */
export async function sendTestEmailAction(data: {
  subject: string;
  content: string;
}) {
  const session = await auth();
  if (!session?.user) throw new Error("Yetkisiz");

  // SMTP ayarlarından "from" adresini al
  const settings = await prisma.systemSetting.findMany({ where: { category: "smtp" } });
  const fromEmail = settings.find(s => s.key === "user")?.value || settings.find(s => s.key === "from")?.value;

  if (!fromEmail) {
    throw new Error("SMTP ayarlarında gönderici adresi bulunamadı. Lütfen Ayarlar > Entegrasyonlar'dan SMTP yapılandırmasını kontrol edin.");
  }

  // Örnek verilerle parse et
  const sampleAgency = {
    companyName: "Örnek Turizm Ltd.",
    authorizedPerson: "Ahmet Bey",
    documentNo: "12345",
    sectors: [{ name: "Yazılım" }, { name: "Turizm" }],
    unsubscribeToken: "test-token",
  };

  const parsedContent = CampaignService.templateParser(data.content, sampleAgency);
  const html = CampaignService.buildCampaignEmail(parsedContent, sampleAgency);

  await MailService.sendEmail({
    to: fromEmail,
    subject: `[TEST] ${CampaignService.templateParser(data.subject, sampleAgency)}`,
    html,
  });

  return { success: true, sentTo: fromEmail };
}

export async function deleteCampaignAction(id: string) {
  const session = await auth();
  if (!session?.user) throw new Error("Yetkisiz");

  await prisma.campaignLog.deleteMany({ where: { campaignId: id } });
  await prisma.campaign.delete({ where: { id } });
  revalidatePath("/tanitim");
  return { success: true };
}
