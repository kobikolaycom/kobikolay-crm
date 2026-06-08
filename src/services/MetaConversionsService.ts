import { SystemSettingService } from "./SystemSettingService";
import crypto from "crypto";

/**
 * Meta Conversions API (CAPI) Entegrasyonu
 * Instagram/Facebook reklam dönüşümlerini Meta'ya geri bildirir.
 * 
 * Dokümantasyon: https://developers.facebook.com/docs/marketing-api/conversions-api
 */
export class MetaConversionsService {
  private static API_VERSION = "v25.0";

  /**
   * SHA256 ile hash'le (Meta gerekliliği)
   */
  private static sha256(value: string): string {
    return crypto.createHash("sha256").update(value.trim().toLowerCase()).digest("hex");
  }

  /**
   * Telefon numarasını normalize et ve hash'le
   * Meta formatı: +90 olmadan, sadece rakamlar, sonra SHA256
   */
  private static hashPhone(phone: string): string {
    // Boşluk, tire, parantez temizle
    let cleaned = phone.replace(/[\s\-\(\)\.]/g, "");
    // Başında 0 varsa kaldır ve +90 ekle
    if (cleaned.startsWith("0")) {
      cleaned = "90" + cleaned.slice(1);
    } else if (!cleaned.startsWith("90") && !cleaned.startsWith("+90")) {
      cleaned = "90" + cleaned;
    }
    cleaned = cleaned.replace("+", "");
    return this.sha256(cleaned);
  }

  /**
   * Meta Conversions API'ye olay gönder
   */
  static async sendEvent(params: {
    eventName: string;
    email?: string | null;
    phone?: string | null;
    leadId?: string | null;
    customData?: Record<string, any>;
  }): Promise<{ success: boolean; message: string }> {
    // Meta CAPI ayarlarını DB'den al
    const metaCapi = await SystemSettingService.getByCategory("meta_capi");
    const accessToken = metaCapi.accessToken?.trim();
    const datasetId = metaCapi.datasetId?.trim();

    if (!accessToken || !datasetId) {
      console.warn("[MetaCAPI] Access Token veya Dataset ID ayarlanmamış. Olay gönderilemedi.");
      return { success: false, message: "Meta CAPI ayarları yapılandırılmamış" };
    }

    // User data oluştur (hash'lenmiş)
    const userData: Record<string, any> = {};
    if (params.email) {
      userData.em = [this.sha256(params.email)];
    }
    if (params.phone) {
      userData.ph = [this.hashPhone(params.phone)];
    }
    if (params.leadId) {
      userData.lead_id = params.leadId;
    }

    // Event payload
    const eventPayload = {
      data: [
        {
          event_name: params.eventName,
          event_time: Math.floor(Date.now() / 1000),
          action_source: "system_generated",
          user_data: userData,
          custom_data: {
            event_source: "crm",
            lead_event_source: "KobiKolay CRM",
            ...params.customData,
          },
        },
      ],
    };

    // Test event code varsa ekle
    const testEventCode = metaCapi.testEventCode?.trim();
    if (testEventCode) {
      (eventPayload as any).test_event_code = testEventCode;
    }

    const url = `https://graph.facebook.com/${this.API_VERSION}/${datasetId}/events?access_token=${accessToken}`;

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(eventPayload),
      });

      const result = await response.json();

      if (!response.ok) {
        const errorMsg = result?.error?.message || JSON.stringify(result);
        console.error(`[MetaCAPI] Olay gönderilemedi: ${errorMsg}`);
        return { success: false, message: errorMsg };
      }

      console.log(`[MetaCAPI] Olay gönderildi: ${params.eventName}`, result);
      return {
        success: true,
        message: `Olay başarıyla gönderildi. Events received: ${result.events_received || 0}`,
      };
    } catch (error: any) {
      console.error("[MetaCAPI] API hatası:", error?.message || error);
      return { success: false, message: error?.message || "API bağlantı hatası" };
    }
  }

  /**
   * Acenteye ulaşıldığında Meta'ya bildir
   */
  static async sendContactedEvent(agencyName: string, email?: string | null, phone?: string | null) {
    return this.sendEvent({
      eventName: "Lead",
      email,
      phone,
      customData: {
        lead_status: "Contacted",
        agency_name: agencyName,
      },
    });
  }

  /**
   * Görev atandığında Meta'ya bildir
   */
  static async sendQualifiedEvent(agencyName: string, email?: string | null, phone?: string | null) {
    return this.sendEvent({
      eventName: "Lead",
      email,
      phone,
      customData: {
        lead_status: "Qualified",
        agency_name: agencyName,
      },
    });
  }

  /**
   * Mail gönderildiğinde Meta'ya bildir
   */
  static async sendEmailSentEvent(agencyName: string, email?: string | null) {
    return this.sendEvent({
      eventName: "Lead",
      email,
      customData: {
        lead_status: "Email Sent",
        agency_name: agencyName,
      },
    });
  }
}
