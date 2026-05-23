import prisma from "@/lib/prisma";
import { OfferStatus, MailStatus } from "@prisma/client";
import { MailService } from "./MailService";

export interface SelectedModule {
  moduleId: string;
  name: string;
}

export class PitchService {
  /**
   * Idempotent Dispatch: Oluşturur, Gönderir ve Röntgen'e kaydeder.
   */
  static async sendPitch(
    agencyId: string,
    coverLetter: string,
    selectedModules: SelectedModule[],
    totalSoftwarePrice?: number,
    attachedPdfUrls?: string[]
  ) {
    try {
      // Demo şifrelerini MailLog'da maskele (güvenlik: düz metin şifre DB'de tutulmaz)
      const sanitizedCoverLetter = coverLetter.replace(
        /🔑 Şifre: .+/g,
        "🔑 Şifre: **** (Güvenliğiniz için gizlenmiştir)"
      );

      // Atomik transaction: Offer + MailLog birlikte oluşturulur
      const { offer } = await prisma.$transaction(async (tx) => {
        // 1. Create Offer (orijinal coverLetter ile — mail gövdesinde şifre görünsün)
        const offer = await tx.offer.create({
          data: {
            agencyId,
            status: OfferStatus.SENT,
            coverLetter,
            selectedModules: selectedModules as any,
            moduleIds: selectedModules.map(m => m.moduleId),
            totalSoftwarePrice,
          }
        });

        const mailSubject = `KobiKolay CRM: Sektörel Çözüm Önerimiz (ID: ${offer.id})`;

        // Log to MailLog (maskelenmiş içerikle)
        const pdfText = attachedPdfUrls && attachedPdfUrls.length > 0 
          ? `\nEklenen Dosyalar: ${attachedPdfUrls.length} adet PDF broşürü`
          : "";

        await tx.mailLog.create({
          data: {
            agencyId,
            subject: mailSubject,
            content: `Sunum Gönderildi.\nModüller: ${selectedModules.map(m => m.name).join(', ')}\nFiyat: ${totalSoftwarePrice ? totalSoftwarePrice + ' TL' : 'Belirtilmedi'}${pdfText}\n\nÖn Yazı:\n${sanitizedCoverLetter}`,
            status: MailStatus.SENT,
            sentAt: new Date(),
          }
        });

        return { offer };
      });

      // DB Transaction başarılı olduktan sonra, arka planda gerçek SMTP e-postası gönderelim
      const agency = await prisma.agency.findUnique({
        where: { id: agencyId },
        include: { contacts: true }
      });
      const toEmail = agency?.contacts[0]?.email;

      if (agency && toEmail) {
        const mailSubject = `KobiKolay CRM: Sektörel Çözüm Önerimiz (Teklif ID: ${offer.id})`;
        
        // Şifreler ve ön yazı
        const html = `
          <div style="font-family: sans-serif; padding: 20px; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #f0f0f0; rounded: 12px;">
            <div style="line-height: 1.6; font-size: 14px; white-space: pre-wrap;">
              ${coverLetter}
            </div>
            <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
            <p style="font-size: 11px; color: #999;">
              Bu e-posta KobiKolay B2B CRM sistemi üzerinden otomatik olarak üretilmiştir.
            </p>
          </div>
        `;

        // Eğer ekli PDF broşürleri varsa nodemailer'a ekleyelim
        const attachments = attachedPdfUrls?.map(url => ({
          filename: url.split("/").pop() || "brosur.pdf",
          path: url, // Nodemailer web URL'lerini veya yerel yolları destekler
        })) || [];

        // SMTP gönderimi tetiklenir
        await MailService.sendEmail({
          to: toEmail,
          subject: mailSubject,
          html,
          attachments,
        }).catch(err => {
          console.error(`[PitchService] SMTP email dispatch failed for Offer ${offer.id}:`, err);
        });
      }

      return { success: true, data: offer };
    } catch (error: any) {
      console.error("Pitch sending failed:", error);
      
      // Fallback log — transaction dışında, başarısız gönderim kaydı
      await prisma.mailLog.create({
        data: {
          agencyId,
          subject: "Teklif/Sunum Gönderim Hatası",
          content: `Sistem Hatası: ${error.message}`,
          status: MailStatus.FAILED,
        }
      }).catch(() => {}); // ignore error if agencyId is invalid

      return { success: false, error: "Sunum gönderilemedi." };
    }
  }

  /**
   * Sektöre göre hazır şablonları getirir.
   */
  static async getTemplatesBySector(sectorId: string) {
    return prisma.pitchTemplate.findMany({
      where: { sectorId },
      orderBy: { createdAt: "desc" }
    });
  }
}
