import prisma from "@/lib/prisma";
import { MailStatus } from "@prisma/client";
import { MailService } from "./MailService";
import type { MailAttachment } from "./MailService";
import { EmailTemplateService } from "./EmailTemplateService";
import { AgencyService } from "@/services/AgencyService";

/**
 * ═══════════════════════════════════════════════════════════════════
 *  PitchService — Sistemin Beyni
 * ═══════════════════════════════════════════════════════════════════
 *
 *  Bu servis, acentelere gönderilecek tanıtım e-postalarının tüm
 *  yaşam döngüsünü yönetir:
 *
 *  1. Acente bilgilerini çözer (isim, yetkili, e-posta)
 *  2. Seçilen faaliyet alanlarının içeriklerini ve PDF broşürlerini toplar
 *  3. Profesyonel HTML e-postayı dinamik olarak inşa eder
 *  4. PDF'leri ek olarak ekler (Vercel Blob URL'leri desteklenir)
 *  5. SMTP üzerinden gönderir ve MailLog'a kaydeder
 *
 * ═══════════════════════════════════════════════════════════════════
 */

// ─── Varsayılan Giriş Metni (EmailTemplate bulunamazsa fallback) ───
const FALLBACK_INTRO = (agencyName: string) =>
  `<strong>${agencyName}</strong> için hazırladığımız dijital çözüm önerilerimizi aşağıda inceleyebilirsiniz:`;

export class PitchService {
  /**
   * Ana gönderim metodu.
   * Her acente için kişiselleştirilmiş, sektör içerikli profesyonel e-posta oluşturur ve gönderir.
   */
  static async sendPitch(
    agencyId: string,
    sectorIds: string[],
    customIntro?: string,
    sentById?: string
  ) {
    let mailLog: any = null;
    try {
      // ─── 1. Acente Bilgilerini Al ───
      const agency = await prisma.agency.findUnique({
        where: { id: agencyId },
        include: { contacts: true },
      });

      if (!agency) {
        return { success: false, error: "Acente bulunamadı" };
      }

      const toEmail = agency.contacts?.[0]?.email;
      if (!toEmail) {
        return { success: false, error: `${agency.companyName}: E-posta adresi tanımlı değil` };
      }

      const agencyName = agency.companyName;
      const authorizedPerson = agency.authorizedPerson;

      // ─── 2. Seçilen Faaliyet Alanlarını Al ───
      const sectors = await prisma.sector.findMany({
        where: { id: { in: sectorIds } },
        include: { references: true },
        orderBy: { name: "asc" },
      });

      // Fetch default offer template to check for custom subject / content
      const offerTemplate = await EmailTemplateService.getDefault("offer_intro");

      // ─── 3. Kişisel Selamlama ───
      const greeting = authorizedPerson
        ? `Sayın ${authorizedPerson},`
        : "Sayın Yetkili,";

      // ─── 4. Giriş Metni (Mail Şablonlarından çek, yoksa fallback) ───
      let introHtml: string;
      if (customIntro) {
        introHtml = customIntro.replace(/\n/g, "<br>");
      } else {
        if (offerTemplate) {
          const parsedIntro = EmailTemplateService.parseTemplate(offerTemplate.content, {
            companyName: agencyName,
            authorizedPerson,
            sectors: sectors.map(s => ({ name: s.name })),
          });
          introHtml = parsedIntro.replace(/\n/g, "<br>");
        } else {
          introHtml = FALLBACK_INTRO(agencyName);
        }
      }

      // ─── 5. Faaliyet Alanı Blokları ───
      const sectorBlocksHtml = sectors
        .map((sector) => {
          const content = sector.coverLetter
            ? sector.coverLetter.replace(/\n/g, "<br>")
            : "";

          const refHtml =
            sector.references.length > 0
              ? `<div style="margin-top: 12px; padding-top: 10px; border-top: 1px dashed #e0e0e0;">
                  <span style="font-size: 11px; color: #888; text-transform: uppercase; letter-spacing: 1px;">Referanslar:</span>
                  <div style="margin-top: 6px;">
                    ${sector.references
                      .map(
                        (r) =>
                          `<span style="display: inline-block; background: #f0f4ff; color: #4f46e5; font-size: 12px; font-weight: 600; padding: 3px 10px; border-radius: 6px; margin: 2px 4px 2px 0;">${r.name}</span>`
                      )
                      .join("")}
                  </div>
                </div>`
              : "";

          const pdfBadge = sector.pdfUrl
            ? `<div style="margin-top: 10px;"><span style="display: inline-block; background: #ecfdf5; color: #059669; font-size: 11px; font-weight: 600; padding: 3px 10px; border-radius: 6px;">📎 PDF Broşür Ekte</span></div>`
            : "";

          return `
            <div style="background: #fafbfc; border: 1px solid #e8ecf1; border-radius: 12px; padding: 20px; margin-bottom: 16px;">
              <h3 style="margin: 0 0 12px 0; color: #1e293b; font-size: 16px; font-weight: 700; border-left: 4px solid #4f46e5; padding-left: 12px;">
                ${sector.name}
              </h3>
              <div style="color: #475569; font-size: 14px; line-height: 1.7;">
                ${content}
              </div>
              ${refHtml}
              ${pdfBadge}
            </div>
          `;
        })
        .join("");

      // ─── 5.5. Base URL and Unsubscribe URL ───
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL
        || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null)
        || "https://kobikolay-crm.vercel.app";

      const unsubscribeUrl = `${baseUrl}/unsubscribe?token=${agency.unsubscribeToken}`;

      // ─── 6. Tam HTML E-posta Gövdesi ───
      const fullHtml = `
        <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 640px; margin: 0 auto; background: #ffffff; border: 1px solid #e8ecf1; border-radius: 16px; overflow: hidden;">
          
          <!-- Header -->
          <div style="background: linear-gradient(135deg, #4f46e5, #7c3aed); padding: 28px 32px; text-align: center;">
            <h1 style="margin: 0; font-size: 22px; font-weight: 800; letter-spacing: -0.5px;">
              <a href="https://acenteyazilim.com" style="color: #ffffff; text-decoration: none;">acenteyazılım.com</a>
            </h1>
            <p style="margin: 6px 0 0 0; color: rgba(255,255,255,0.8); font-size: 13px;">
              Dijital Seyahat Altyapı Çözümleri
            </p>
          </div>

          <!-- Body -->
          <div style="padding: 32px;">
            
            <!-- Greeting -->
            <p style="font-size: 16px; font-weight: 600; color: #1e293b; margin: 0 0 20px 0;">
              ${greeting}
            </p>

            <!-- Intro -->
            <div style="font-size: 14px; color: #475569; line-height: 1.8; margin-bottom: 28px;">
              ${introHtml}
            </div>

            <!-- Sector Content Blocks -->
            ${sectorBlocksHtml}

          </div>

          <!-- Footer -->
          <div style="background: #f8fafc; border-top: 1px solid #e8ecf1; padding: 20px 32px; text-align: center;">
            <p style="margin: 0 0 4px 0; font-size: 13px; color: #64748b;">
              Saygılarımızla,
            </p>
            <p style="margin: 0; font-size: 14px; font-weight: 700; color: #1e293b;">
              KobiKolay Ekibi
            </p>
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

      // ─── 7. PDF Ekleri ───
      const attachments: MailAttachment[] = [];
      for (const sector of sectors) {
        if (sector.pdfUrl) {
          const safeName = sector.name
            .replace(/[^a-zA-Z0-9ÇçĞğıİÖöŞşÜü\s]/g, "")
            .trim()
            .replace(/\s+/g, "_");
          attachments.push({
            filename: `${safeName}_brosur.pdf`,
            path: sector.pdfUrl, // nodemailer supports both local paths and URLs
          });
        }
      }

      // ─── 8. MailLog Kaydını ÖNCE Oluştur (trackingId almak için) ───
      let emailSubject = `${agencyName} — Dijital Çözüm Önerimiz`;
      if (offerTemplate && offerTemplate.subject) {
        emailSubject = EmailTemplateService.parseTemplate(offerTemplate.subject, {
          companyName: agencyName,
          authorizedPerson,
          sectors: sectors.map((s) => ({ name: s.name })),
        });
      }
      const sectorNames = sectors.map((s) => s.name).join(", ") || "Belirtilmedi";

      mailLog = await prisma.mailLog.create({
        data: {
          agencyId,
          subject: emailSubject,
          content: `Tanıtım Gönderildi.\nFaaliyet Alanları: ${sectorNames}\nEk PDF: ${attachments.length} adet\nAlıcı: ${toEmail}`,
          status: MailStatus.PENDING,
          ...(sentById ? { sentById } : {}),
        },
      });

      // ─── 9. Tracking Pixel + Link Wrapping ───
      const tid = mailLog.trackingId;

      // Tracking pixel — e-posta açıldığında tetiklenir
      const trackingPixel = `<img src="${baseUrl}/api/track?tid=${tid}&type=open" width="1" height="1" style="display:none;border:0;" alt="" />`;

      // Link wrapping — tüm href linklerini tıklama takibi için sarmala
      let trackedHtml = fullHtml.replace(
        /href="(https?:\/\/[^"]+)"/g,
        (match: string, url: string) => {
          // Kendi tracking URL'lerimizi tekrar sarmalama
          if (url.includes("/api/track")) return match;
          const trackUrl = `${baseUrl}/api/track?tid=${tid}&type=click&url=${encodeURIComponent(url)}`;
          return `href="${trackUrl}"`;
        }
      );

      // Tracking pixel'i HTML'in sonuna (son </div> kapanışından önce) ekle
      const lastDivIndex = trackedHtml.lastIndexOf('</div>');
      if (lastDivIndex !== -1) {
        trackedHtml = trackedHtml.slice(0, lastDivIndex) + trackingPixel + trackedHtml.slice(lastDivIndex);
      } else {
        // Fallback: en sona ekle
        trackedHtml += trackingPixel;
      }

      // ─── 10. E-posta Gönder ───
      await MailService.sendEmail({
        to: toEmail,
        subject: emailSubject,
        html: trackedHtml,
        attachments,
      });

      // ─── 11. MailLog'u SENT Olarak Güncelle ───
      await prisma.mailLog.update({
        where: { id: mailLog.id },
        data: {
          status: MailStatus.SENT,
          sentAt: new Date(),
        },
      });

      // Auto-assign representative if first interaction
      if (sentById) {
        await AgencyService.assignRepresentativeIfEmpty(agencyId, sentById);
      }

      // Update last interaction timestamp
      await AgencyService.updateLastInteraction(agencyId);

      return { success: true };
    } catch (error: any) {
      console.error(`[PitchService] sendPitch failed for agency ${agencyId}:`, error);

      // Hata kaydı — mevcut PENDING log varsa güncelle, yoksa yeni oluştur
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

  /**
   * Sektöre göre hazır şablonları getirir.
   */
  static async getTemplatesBySector(sectorId: string) {
    return prisma.pitchTemplate.findMany({
      where: { sectorId },
      orderBy: { createdAt: "desc" },
    });
  }
}

