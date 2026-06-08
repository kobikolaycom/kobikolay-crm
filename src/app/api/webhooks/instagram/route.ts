import { NextRequest, NextResponse } from "next/server";
import { verifyWebhookSignature } from "@/lib/webhook-verify";

/**
 * GET: Meta Webhook Doğrulama (Verification Challenge)
 * Meta Developer panelinden webhook URL'i eklerken bu endpoint çağrılır.
 * 
 * Önce ENV'den, sonra DB'den verify token kontrol eder.
 */
export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  console.log("[Instagram Webhook] Verify request:", { mode, token, challenge: challenge?.substring(0, 20) });

  if (mode === "subscribe" && token && challenge) {
    // Environment variable'dan kontrol et
    const envToken = process.env.META_WEBHOOK_VERIFY_TOKEN;
    
    if (envToken && token === envToken) {
      console.log("[Instagram Webhook] Verification successful");
      return new NextResponse(challenge, { 
        status: 200,
        headers: { "Content-Type": "text/plain" },
      });
    }

    // 3. DB'den kontrol et (fallback)
    try {
      const { InstagramService } = await import("@/services/InstagramService");
      const isValid = await InstagramService.verifyWebhook(token);
      if (isValid) {
        console.log("[Instagram Webhook] Verification successful via DB");
        return new NextResponse(challenge, { 
          status: 200,
          headers: { "Content-Type": "text/plain" },
        });
      }
    } catch (e) {
      console.error("[Instagram Webhook] DB verify failed:", e);
    }

    console.warn("[Instagram Webhook] Verification failed - token mismatch. Received:", token);
    return new NextResponse("Forbidden", { status: 403 });
  }

  return new NextResponse("Bad Request", { status: 400 });
}

/**
 * POST: Instagram Webhook Event'lerini alır ve işler.
 * Gelen DM mesajlarını ConversationMessage olarak kaydeder.
 * Profil bilgilerini (isim, kullanıcı adı, profil fotoğrafı vb.) çeker.
 */
export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get("x-hub-signature-256");

    if (!verifyWebhookSignature(rawBody, signature)) {
      console.warn("[Instagram Webhook] Invalid signature - rejecting request");
      return NextResponse.json({ error: "Invalid signature" }, { status: 403 });
    }

    const body = JSON.parse(rawBody);
    console.log("[Instagram Webhook] Incoming event:", body.object, "entries:", body.entry?.length || 0);

    // Meta webhook format:
    // { object: "instagram", entry: [{ id, time, messaging: [{ sender, recipient, timestamp, message }] }] }
    if (body.object === "instagram" || body.object === "page") {
      const { InstagramService } = await import("@/services/InstagramService");
      const entries = body.entry || [];

      for (const entry of entries) {
        const messagingEvents = entry.messaging || [];

        for (const event of messagingEvents) {
          // Echo mesajlarını (kendi gönderdiğimiz mesajları) atla
          if (event.message && event.message.is_echo) {
            console.log("[Instagram Webhook] Echo mesajı algılandı, atlanıyor");
            continue;
          }

          // Mesaj geldi mi?
          if (event.message && event.message.text) {
            const senderId = event.sender?.id;
            const messageText = event.message.text;
            const timestamp = event.timestamp || Date.now();

            if (!senderId) continue;

            // Kullanıcı profili çek (isim, kullanıcı adı, profil fotoğrafı vb.)
            let profile: Awaited<ReturnType<typeof InstagramService.getUserProfile>> = {};
            try {
              profile = await InstagramService.getUserProfile(senderId);
              console.log(`[Instagram Webhook] Profil alındı:`, JSON.stringify(profile));
            } catch (e) {
              console.error("[Instagram Webhook] Profile fetch failed:", e);
            }

            // Mesajı kaydet (profil bilgileri ile birlikte)
            await InstagramService.handleIncomingMessage(
              senderId,
              profile,
              messageText,
              timestamp
            );

            const displayName = InstagramService.formatDisplayName(profile);
            console.log(`[Instagram Webhook] Mesaj kaydedildi: ${displayName || senderId}`);
          }

          // Resim / medya mesajları
          if (event.message && event.message.attachments) {
            const senderId = event.sender?.id;
            const timestamp = event.timestamp || Date.now();

            if (!senderId) continue;

            let profile: Awaited<ReturnType<typeof InstagramService.getUserProfile>> = {};
            try {
              profile = await InstagramService.getUserProfile(senderId);
            } catch (e) {
              console.error("[Instagram Webhook] Profile fetch failed for attachment:", e);
            }

            for (const attachment of event.message.attachments) {
              const type = attachment.type || "unknown";
              const url = attachment.payload?.url || "";
              const content = `[${type.toUpperCase()}] ${url}`;

              await InstagramService.handleIncomingMessage(
                senderId,
                profile,
                content,
                timestamp
              );

              console.log(`[Instagram Webhook] Medya kaydedildi: ${type} from ${senderId}`);
            }
          }

          // Echo/delivery/read receipt'leri şimdilik atla
          if (event.delivery || event.read) {
            continue;
          }
        }
      }
    }

    // Meta her zaman 200 bekler
    return NextResponse.json({ status: "ok" }, { status: 200 });
  } catch (error) {
    console.error("[Instagram Webhook] Error:", error);
    // Meta yine de 200 bekler, yoksa retry yapar
    return NextResponse.json({ status: "ok" }, { status: 200 });
  }
}
