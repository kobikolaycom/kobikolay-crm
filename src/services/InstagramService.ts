import { SystemSettingService } from "./SystemSettingService";
import { ConversationService } from "./ConversationService";
import prisma from "@/lib/prisma";

export class InstagramService {
  /**
   * Meta ayarlarını veritabanından çeker.
   */
  static async getCredentials() {
    const settings = await SystemSettingService.getByCategory("meta");
    return {
      appId: settings.appId || "",
      appSecret: settings.appSecret || "",
      pageToken: settings.pageToken || "",
      igAccountId: settings.igAccountId || "",
    };
  }

  /**
   * Instagram Graph API üzerinden mesaj gönderir.
   * Kullanıcıya DM yanıtı gönderir.
   */
  static async sendMessage(recipientId: string, messageText: string) {
    const creds = await this.getCredentials();
    if (!creds.pageToken) {
      throw new Error("Instagram Page Access Token yapılandırılmamış. Ayarlar > Entegrasyonlar bölümünden yapılandırın.");
    }

    // Instagram Messaging API (Graph API v21.0)
    const url = `https://graph.facebook.com/v21.0/me/messages`;

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${creds.pageToken}`,
      },
      body: JSON.stringify({
        recipient: { id: recipientId },
        message: { text: messageText },
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("Instagram API Error:", data);
      throw new Error(data.error?.message || "Instagram mesaj gönderilemedi");
    }

    return data;
  }

  /**
   * Gelen webhook mesajını işler ve Conversation/Message oluşturur.
   */
  static async handleIncomingMessage(senderId: string, senderName: string | null, messageText: string, timestamp: number) {
    // Mevcut açık konuşma var mı?
    let conversation = await prisma.conversation.findFirst({
      where: {
        channelType: "INSTAGRAM",
        contactPhone: senderId, // Instagram sender ID'yi contactPhone'da saklıyoruz
        status: "OPEN",
      },
      include: { messages: true },
    });

    // Yoksa yeni konuşma aç
    if (!conversation) {
      conversation = await prisma.conversation.create({
        data: {
          channelType: "INSTAGRAM",
          contactName: senderName || `Instagram Kullanıcı`,
          contactPhone: senderId,
          status: "OPEN",
        },
        include: { messages: true },
      });
    } else if (senderName && !conversation.contactName) {
      // İsim güncelle
      await prisma.conversation.update({
        where: { id: conversation.id },
        data: { contactName: senderName },
      });
    }

    // Mesajı kaydet
    await ConversationService.createMessage(conversation.id, {
      content: messageText,
      senderType: "customer",
      senderName: senderName || "Instagram Kullanıcı",
      isInternalNote: false,
    });

    return conversation;
  }

  /**
   * Webhook verify token doğrulaması.
   */
  static async verifyWebhook(verifyToken: string): Promise<boolean> {
    const creds = await this.getCredentials();
    // Webhook verify token'ı whatsapp ayarlarından veya meta ayarlarından kontrol et
    // Basit bir sabit kontrol: appSecret'ı verify token olarak kullan
    // Ya da SystemSetting'den özel bir webhook_verify_token çek
    const savedToken = await SystemSettingService.get("meta", "webhookVerifyToken");
    if (savedToken) {
      return verifyToken === savedToken;
    }
    // Fallback: appSecret ile karşılaştır
    return verifyToken === creds.appSecret;
  }

  /**
   * Instagram kullanıcı profilini çeker.
   */
  static async getUserProfile(userId: string): Promise<{ name?: string; profile_pic?: string }> {
    const creds = await this.getCredentials();
    if (!creds.pageToken) return {};

    try {
      const url = `https://graph.facebook.com/v21.0/${userId}?fields=name,profile_pic&access_token=${creds.pageToken}`;
      const response = await fetch(url);
      if (response.ok) {
        return await response.json();
      }
    } catch (e) {
      console.error("Failed to get Instagram user profile:", e);
    }
    return {};
  }
}
