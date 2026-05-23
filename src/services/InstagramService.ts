import { SystemSettingService } from "./SystemSettingService";
import { ConversationService } from "./ConversationService";
import prisma from "@/lib/prisma";

export interface InstagramProfile {
  name?: string;
  username?: string;
  profile_pic?: string;
  follower_count?: number;
  is_verified_user?: boolean;
  is_user_follow_business?: boolean;
  is_business_follow_user?: boolean;
}

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
   * Önce Instagram Graph API, sonra Facebook Graph API dener.
   */
  static async sendMessage(recipientId: string, messageText: string) {
    const creds = await this.getCredentials();
    if (!creds.pageToken) {
      throw new Error("Instagram Page Access Token yapılandırılmamış. Ayarlar > Entegrasyonlar bölümünden yapılandırın.");
    }

    const payload = JSON.stringify({
      recipient: { id: recipientId },
      message: { text: messageText },
    });

    const headers = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${creds.pageToken}`,
    };

    const isInstagramToken = creds.pageToken.startsWith("IG");

    console.log(`[InstagramService] Mesaj gönderiliyor (isInstagramToken=${isInstagramToken}): recipientId=${recipientId}, text="${messageText.substring(0, 50)}..."`);

    // 1. Instagram Graph API (Instagram DM'ler için doğru endpoint)
    try {
      const igUrl = `https://graph.instagram.com/v21.0/me/messages`;
      console.log(`[InstagramService] Deneniyor: ${igUrl}`);
      const igResponse = await fetch(igUrl, { method: "POST", headers, body: payload });
      const igData = await igResponse.json();

      if (igResponse.ok) {
        console.log(`[InstagramService] Instagram API ile mesaj gönderildi:`, JSON.stringify(igData));
        return igData;
      }

      console.error(`[InstagramService] Instagram API Hata (${igResponse.status}):`, JSON.stringify(igData?.error || igData));
      
      if (isInstagramToken) {
        throw new Error(igData.error?.message || `Instagram API Hata (${igResponse.status})`);
      }
    } catch (e: any) {
      console.error("[InstagramService] Instagram API gönderim hatası:", e);
      if (isInstagramToken) {
        throw new Error(e.message || "Instagram mesaj gönderilemedi");
      }
    }

    // 2. Facebook Graph API (fallback — Page token ile bazı durumlarda çalışır)
    try {
      const fbUrl = `https://graph.facebook.com/v21.0/me/messages`;
      console.log(`[InstagramService] Fallback deneniyor: ${fbUrl}`);
      const fbResponse = await fetch(fbUrl, { method: "POST", headers, body: payload });
      const fbData = await fbResponse.json();

      if (fbResponse.ok) {
        console.log(`[InstagramService] Facebook API ile mesaj gönderildi:`, JSON.stringify(fbData));
        return fbData;
      }

      console.error(`[InstagramService] Facebook API hata (${fbResponse.status}):`, JSON.stringify(fbData?.error || fbData));
      throw new Error(fbData.error?.message || "Instagram mesaj gönderilemedi");
    } catch (e: any) {
      console.error("[InstagramService] Tüm endpointler başarısız:", e);
      throw new Error(e.message || "Instagram mesaj gönderilemedi — API bağlantısı kurulamadı.");
    }
  }

  /**
   * Instagram kullanıcı profilini çeker.
   * Birden fazla API endpoint'i ve geniş field seti ile dener.
   */
  static async getUserProfile(userId: string): Promise<InstagramProfile> {
    const creds = await this.getCredentials();
    if (!creds.pageToken) {
      console.warn("[InstagramService] getUserProfile: pageToken boş, profil çekilemiyor.");
      return {};
    }

    const isInstagramToken = creds.pageToken.startsWith("IG");

    // Instagram token ise direkt graph.instagram.com'a özel sorgula (invalid field'lar olmadan)
    if (isInstagramToken) {
      try {
        const igUrl = `https://graph.instagram.com/v21.0/${userId}?fields=name,username&access_token=${creds.pageToken}`;
        console.log(`[InstagramService] Profil çekiliyor (IG Graph - Instagram Token): userId=${userId}`);
        const igResponse = await fetch(igUrl);
        const igData = await igResponse.json();

        if (igResponse.ok && (igData.name || igData.username)) {
          console.log(`[InstagramService] Profil bulundu (IG Graph):`, JSON.stringify(igData));
          return {
            name: igData.name,
            username: igData.username,
            profile_pic: undefined,
          };
        } else {
          console.warn(`[InstagramService] IG Graph API hata:`, JSON.stringify(igData?.error || igData));
        }
      } catch (e) {
        console.error("[InstagramService] IG Graph API profil hatası:", e);
      }
    }

    // Çekilecek alanlar
    const fields = "name,username,profile_pic,follower_count,is_verified_user,is_user_follow_business,is_business_follow_user";

    // 1. Önce Facebook Graph API ile dene (Instagram IGSID için standart endpoint)
    try {
      const fbUrl = `https://graph.facebook.com/v21.0/${userId}?fields=${fields}&access_token=${creds.pageToken}`;
      console.log(`[InstagramService] Profil çekiliyor (FB Graph): userId=${userId}`);
      const fbResponse = await fetch(fbUrl);
      const fbData = await fbResponse.json();

      if (fbResponse.ok && (fbData.name || fbData.username)) {
        console.log(`[InstagramService] Profil bulundu (FB Graph):`, JSON.stringify(fbData));
        return fbData;
      }

      if (!fbResponse.ok) {
        console.warn(`[InstagramService] FB Graph API hata:`, JSON.stringify(fbData?.error || fbData));
      }
    } catch (e) {
      console.error("[InstagramService] FB Graph API profil hatası:", e);
    }

    // 2. Instagram Graph API ile dene (alternatif endpoint)
    try {
      const igUrl = `https://graph.instagram.com/v21.0/${userId}?fields=${fields}&access_token=${creds.pageToken}`;
      console.log(`[InstagramService] Profil çekiliyor (IG Graph): userId=${userId}`);
      const igResponse = await fetch(igUrl);
      const igData = await igResponse.json();

      if (igResponse.ok && (igData.name || igData.username)) {
        console.log(`[InstagramService] Profil bulundu (IG Graph):`, JSON.stringify(igData));
        return igData;
      }

      if (!igResponse.ok) {
        console.warn(`[InstagramService] IG Graph API hata:`, JSON.stringify(igData?.error || igData));
      }
    } catch (e) {
      console.error("[InstagramService] IG Graph API profil hatası:", e);
    }

    // 3. Sadece temel alanlarla tekrar dene (bazı alanlar izin gerektirebilir)
    try {
      const basicUrl = `https://graph.facebook.com/v21.0/${userId}?fields=name,profile_pic&access_token=${creds.pageToken}`;
      console.log(`[InstagramService] Profil çekiliyor (sadece temel alanlar): userId=${userId}`);
      const basicResponse = await fetch(basicUrl);
      const basicData = await basicResponse.json();

      if (basicResponse.ok && basicData.name) {
        console.log(`[InstagramService] Temel profil bulundu:`, JSON.stringify(basicData));
        return basicData;
      }

      if (!basicResponse.ok) {
        console.warn(`[InstagramService] Temel profil API hata:`, JSON.stringify(basicData?.error || basicData));
      }
    } catch (e) {
      console.error("[InstagramService] Temel profil hatası:", e);
    }

    console.warn(`[InstagramService] userId=${userId} için hiçbir profil verisi alınamadı.`);
    return {};
  }

  /**
   * Profil verisinden görüntüleme ismi oluşturur.
   * Örn: "Ahmet Yılmaz (@ahmetyilmaz)" veya "Ahmet Yılmaz" veya "@ahmetyilmaz"
   */
  static formatDisplayName(profile: InstagramProfile): string | null {
    const { name, username } = profile;

    if (name && username) {
      return `${name} (@${username})`;
    }
    if (name) {
      return name;
    }
    if (username) {
      return `@${username}`;
    }
    return null;
  }

  /**
   * Gelen webhook mesajını işler ve Conversation/Message oluşturur.
   */
  static async handleIncomingMessage(
    senderId: string,
    profile: InstagramProfile,
    messageText: string,
    timestamp: number
  ) {
    const displayName = this.formatDisplayName(profile);

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
          contactName: displayName || `Instagram Kullanıcı`,
          contactPhone: senderId,
          status: "OPEN",
        },
        include: { messages: true },
      });
    } else if (displayName && conversation.contactName === "Instagram Kullanıcı") {
      // Daha önce isim alınamamıştı, şimdi güncelle
      await prisma.conversation.update({
        where: { id: conversation.id },
        data: { contactName: displayName },
      });
    } else if (displayName && !conversation.contactName) {
      // İsim boşsa güncelle
      await prisma.conversation.update({
        where: { id: conversation.id },
        data: { contactName: displayName },
      });
    }

    // Mesajı kaydet
    await ConversationService.createMessage(conversation.id, {
      content: messageText,
      senderType: "customer",
      senderName: displayName || "Instagram Kullanıcı",
      isInternalNote: false,
    });

    return conversation;
  }

  /**
   * Webhook verify token doğrulaması.
   */
  static async verifyWebhook(verifyToken: string): Promise<boolean> {
    const creds = await this.getCredentials();
    // Webhook verify token'ı meta ayarlarından kontrol et
    const savedToken = await SystemSettingService.get("meta", "webhookVerifyToken");
    if (savedToken) {
      return verifyToken === savedToken;
    }
    // Fallback: appSecret ile karşılaştır
    return verifyToken === creds.appSecret;
  }
}
