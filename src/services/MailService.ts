import nodemailer from "nodemailer";
import { SystemSettingService } from "./SystemSettingService";

export interface MailAttachment {
  filename: string;
  content?: any;
  contentType?: string;
  path?: string;    // local file path
  href?: string;    // remote URL (e.g. Vercel Blob)
}

export interface SendEmailArgs {
  to: string;
  subject: string;
  html?: string;
  text?: string;
  attachments?: MailAttachment[];
}

/**
 * The Communication Brain: Mail Service
 * Sends real B2B emails using SMTP settings configured dynamically in the UI.
 */
export class MailService {
  /**
   * Core method to send an email using saved SMTP settings.
   * If SMTP settings are missing or incomplete, it falls back to console logging (simulation).
   */
  static async sendEmail({ to, subject, html, text, attachments }: SendEmailArgs): Promise<boolean> {
    console.log(`[MailService] Fetching SMTP settings from database to send to: ${to}`);

    // 1. Fetch SMTP settings from DB
    const smtp = await SystemSettingService.getByCategory("smtp");

    const cleanHost = String(smtp.host || "").trim();
    const cleanPort = String(smtp.port || "").trim();
    const cleanUser = String(smtp.user || "").trim();
    let cleanPass = String(smtp.pass || "").trim();
    const cleanFrom = String(smtp.from || "").trim();
    const cleanFromName = String(smtp.fromName || "").trim();

    // 2. Validate SMTP credentials
    if (!cleanHost || !cleanUser || !cleanPass) {
      console.warn(
        `[MailService] SMTP settings (host, user, or pass) are not configured. ` +
        `Cannot send email to: ${to}, Subject="${subject}"`
      );
      throw new Error("SMTP ayarları yapılandırılmamış. Lütfen Ayarlar > Entegrasyonlar sayfasından SMTP bilgilerini girin.");
    }

    // Gmail için 16 haneli Uygulama Şifresi girildiyse tüm boşlukları temizle
    if (cleanHost.includes("gmail") || cleanUser.includes("gmail")) {
      const strippedPass = cleanPass.replace(/\s+/g, "");
      if (strippedPass.length === 16) {
        cleanPass = strippedPass;
      }
    }

    const port = parseInt(cleanPort || "587");
    const isSecure = port === 465; // SSL is secure by default on 465, TLS/STARTTLS uses false for port 587/25

    console.log(`[MailService] Creating SMTP transporter for ${cleanUser}@${cleanHost}:${port}...`);

    // 3. Create Transporter
    const transporter = nodemailer.createTransport({
      host: cleanHost,
      port: port,
      secure: isSecure,
      auth: {
        user: cleanUser,
        pass: cleanPass,
      },
      tls: {
        // Do not fail on invalid certs (common with local/private SMTP relays)
        rejectUnauthorized: false,
      },
    });

    const fromName = cleanFromName || "KobiKolay CRM";
    const fromEmail = cleanFrom || cleanUser;

    // 4. Send the Mail
    await transporter.sendMail({
      from: `"${fromName}" <${fromEmail}>`,
      to,
      subject,
      text,
      html,
      attachments,
    });

    console.log(`[MailService] Email successfully sent to: ${to} (Subject: "${subject}")`);
    return true;
  }

  /**
   * Backward-compatible method to send an offer email.
   * Leverages the new real SMTP transport under the hood.
   */
  static async sendOfferMail(companyName: string, to: string, offerId: string): Promise<boolean> {
    console.log(`[MailService] Preparing to send offer ${offerId} to ${companyName} (${to})`);
    
    const subject = `KobiKolay CRM: Sektörel Çözüm Önerimiz (Teklif ID: ${offerId})`;
    const html = `
      <div style="font-family: sans-serif; padding: 20px; color: #333;">
        <h2>Sayın ${companyName} Yetkilisi,</h2>
        <p>Acenteniz için hazırladığımız özel B2B sektörel çözüm önerimiz ve yazılım teklifimiz ektedir.</p>
        <p>Teklif detaylarınızı incelemek için sisteme giriş yapabilirsiniz.</p>
        <br>
        <p>Saygılarımızla,<br><strong>KobiKolay Ekibi</strong></p>
      </div>
    `;

    return this.sendEmail({ to, subject, html });
  }
}
