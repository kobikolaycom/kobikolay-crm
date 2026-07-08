import prisma from "@/lib/prisma";
import { MailStatus } from "@prisma/client";
import { MailService } from "./MailService";
import type { MailAttachment } from "./MailService";
import { EmailTemplateService } from "./EmailTemplateService";
import { AgencyService } from "@/services/AgencyService";
import { getBaseUrl } from "@/lib/utils";

const FALLBACK_INTRO = (agencyName: string) =>
  `<strong>${agencyName}</strong> için hazırladığımız dijital çözüm önerilerimizi aşağıda inceleyebilirsiniz:`;

export class PitchService {
  static async sendPitch(
    agencyId: string,
    customIntro?: string,
    sentById?: string
  ) {
    let mailLog: any = null;
    try {
      const agency = await prisma.agency.findUnique({
        where: { id: agencyId },
        include: { contacts: true, category: true },
      });

      if (!agency) {
        return { success: false, error: "İşletme bulunamadı" };
      }

      const toEmail = agency.contacts?.[0]?.email;
      if (!toEmail) {
        return { success: false, error: `${agency.companyName}: E-posta adresi tanımlı değil` };
      }

      const agencyName = agency.companyName;
      const authorizedPerson = agency.authorizedPerson;

      // Fetch default offer template for this category (or generic if none)
      const offerTemplate = await EmailTemplateService.getDefault("offer_intro", agency.categoryId || undefined);

      const greeting = authorizedPerson
        ? `Sayın ${authorizedPerson},`
        : "Sayın Yetkili,";

      let introHtml: string;
      if (customIntro) {
        const hasHtml = /<[a-z/][\s\S]*>/i.test(customIntro);
        introHtml = hasHtml ? customIntro : customIntro.replace(/\n/g, "<br>");
      } else {
        if (offerTemplate) {
          const parsedIntro = EmailTemplateService.parseTemplate(offerTemplate.content, {
            companyName: agencyName,
            authorizedPerson,
          });
          introHtml = parsedIntro.replace(/\n/g, "<br>");
        } else {
          introHtml = FALLBACK_INTRO(agencyName);
        }
      }

      const baseUrl = getBaseUrl();
      const unsubscribeUrl = `${baseUrl}/unsubscribe?token=${agency.unsubscribeToken}`;

      const fullHtml = `
        <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 640px; margin: 0 auto; background: #ffffff; border: 1px solid #e8ecf1; border-radius: 16px; overflow: hidden;">
          
          <!-- Header -->
          <div style="background: linear-gradient(135deg, #4f46e5, #7c3aed); padding: 28px 32px; text-align: center;">
            <h1 style="margin: 0; font-size: 22px; font-weight: 800; letter-spacing: -0.5px;">
              <a href="https://acenteyazilim.com" style="color: #ffffff; text-decoration: none;">KobiKolay B2B</a>
            </h1>
            <p style="margin: 6px 0 0 0; color: rgba(255,255,255,0.8); font-size: 13px;">
              Dijital Altyapı Çözümleri
            </p>
          </div>

          <!-- Body -->
          <div style="padding: 32px;">
            <p style="font-size: 16px; font-weight: 600; color: #1e293b; margin: 0 0 20px 0;">
              ${greeting}
            </p>
            <div style="font-size: 14px; color: #475569; line-height: 1.8; margin-bottom: 28px;">
              ${introHtml}
            </div>
          </div>

          <!-- Footer -->
          <div style="background: #f8fafc; border-top: 1px solid #e8ecf1; padding: 20px 32px; text-align: center;">
            <p style="margin: 0 0 4px 0; font-size: 13px; color: #64748b;">Saygılarımızla,</p>
            <p style="margin: 0; font-size: 14px; font-weight: 700; color: #1e293b;">KobiKolay Ekibi</p>
            <p style="margin: 8px 0 0 0; font-size: 11px; color: #94a3b8; line-height: 1.5;">
              Barbaros Mah. Şebboy Sokak No:4/1 İç Kapı No:1 Ataşehir/İstanbul (Dijitalpark Teknokent)
            </p>
            <hr style="border: none; border-top: 1px solid #e8ecf1; margin: 16px 0;">
            <p style="margin: 0; font-size: 11px; color: #94a3b8; line-height: 1.5;">
              Bu e-posta KobiKolay B2B CRM sistemi üzerinden gönderilmiştir.<br>
              E-posta listesinden çıkmak için <a href="${unsubscribeUrl}" style="color: #4f46e5; text-decoration: underline;">buraya tıklayabilirsiniz</a>.
            </p>
          </div>
        </div>
      `;

      let emailSubject = `${agencyName} — Dijital Çözüm Önerimiz`;
      if (offerTemplate && offerTemplate.subject) {
        emailSubject = EmailTemplateService.parseTemplate(offerTemplate.subject, {
          companyName: agencyName,
          authorizedPerson,
        });
      }

      mailLog = await prisma.mailLog.create({
        data: {
          agencyId,
          subject: emailSubject,
          content: `Tanıtım Gönderildi.\nKategori: ${agency.category?.name || "Belirtilmedi"}\nAlıcı: ${toEmail}`,
          status: MailStatus.PENDING,
          ...(sentById ? { sentById } : {}),
        },
      });

      const tid = mailLog.trackingId;
      const trackingPixel = `<img src="${baseUrl}/api/track?tid=${tid}&type=open" width="1" height="1" style="display:none;border:0;" alt="" />`;

      let trackedHtml = fullHtml.replace(
        /href="(https?:\/\/[^"]+)"/g,
        (match: string, url: string) => {
          if (url.includes("/api/track") || url.includes("acenteyazilim.com") || url.includes("whatsapp.com") || url.includes("wa.me")) return match;
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

      await MailService.sendEmail({
        to: toEmail,
        subject: emailSubject,
        html: trackedHtml,
      });

      await prisma.mailLog.update({
        where: { id: mailLog.id },
        data: {
          status: MailStatus.SENT,
          sentAt: new Date(),
        },
      });

      if (sentById) {
        await AgencyService.assignRepresentativeIfEmpty(agencyId, sentById);
      }

      await AgencyService.updateLastInteraction(agencyId);

      return { success: true };
    } catch (error: any) {
      console.error(`[PitchService] sendPitch failed for agency ${agencyId}:`, error);
      try {
        if (mailLog) {
          await prisma.mailLog.update({
            where: { id: mailLog.id },
            data: {
              status: MailStatus.FAILED,
              content: `Sistem Hatası: ${error.message}`,
            },
          });
        } else {
          await prisma.mailLog.create({
            data: {
              agencyId,
              subject: "Tanıtım Gönderim Hatası",
              content: `Sistem Hatası: ${error.message}`,
              status: MailStatus.FAILED,
            },
          });
        }
      } catch (logError) {
        console.error("[PitchService] Failed to log error to DB:", logError);
      }
      return { success: false, error: error.message || "Gönderim başarısız" };
    }
  }
}
