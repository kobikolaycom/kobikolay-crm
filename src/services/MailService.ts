import nodemailer from "nodemailer";
import { SystemSettingService } from "./SystemSettingService";

export interface MailAttachment {
  filename: string;
  content: any;
  contentType?: string;
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

    // 2. Validate SMTP credentials
    if (!smtp.host || !smtp.user || !smtp.pass) {
      console.warn(
        `[MailService] Warning: SMTP settings (host, user, or pass) are not yet configured in settings. ` +
        `Simulating mail dispatch for: To=${to}, Subject="${subject}"`
      );
      // Wait for a simulated network delay
      await new Promise(resolve => setTimeout(resolve, 300));
      return true; // Graceful simulation fallback
    }

    const port = parseInt(smtp.port || "587");
    const isSecure = port === 465; // SSL is secure by default on 465, TLS/STARTTLS uses false for port 587/25

    console.log(`[MailService] Creating SMTP transporter for ${smtp.user}@${smtp.host}:${port}...`);

    // 3. Create Transporter
    const transporter = nodemailer.createTransport({
      host: smtp.host,
      port: port,
      secure: isSecure,
      auth: {
        user: smtp.user,
        pass: smtp.pass,
      },
      tls: {
        // Do not fail on invalid certs (common with local/private SMTP relays)
        rejectUnauthorized: false,
      },
    });

    const fromName = smtp.fromName || "KobiKolay CRM";
    const fromEmail = smtp.from || smtp.user;

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
