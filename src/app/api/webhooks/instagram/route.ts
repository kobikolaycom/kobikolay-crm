import { NextRequest, NextResponse } from "next/server";

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
    // 1. Önce environment variable'dan kontrol et (en güvenilir)
    const envToken = process.env.META_WEBHOOK_VERIFY_TOKEN;
    if (envToken && token === envToken) {
      console.log("[Instagram Webhook] Verification successful via ENV");
      return new NextResponse(challenge, { 
        status: 200,
        headers: { "Content-Type": "text/plain" },
      });
    }

    // 2. DB'den kontrol et (fallback)
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
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    console.log("[Instagram Webhook] Incoming event:", JSON.stringify(body).substring(0, 500));

    // Meta webhook format:
    // { object: "instagram", entry: [{ id, time, messaging: [{ sender, recipient, timestamp, message }] }] }
    if (body.object === "instagram" || body.object === "page") {
      const { InstagramService } = await import("@/services/InstagramService");
      const entries = body.entry || [];

      for (const entry of entries) {
        const messagingEvents = entry.messaging || [];

        for (const event of messagingEvents) {
          // Mesaj geldi mi?
          if (event.message && event.message.text) {
            const senderId = event.sender?.id;
            const messageText = event.message.text;
            const timestamp = event.timestamp || Date.now();

            if (!senderId) continue;

            // Kullanıcı profili çek (isim)
            let senderName: string | null = null;
            try {
              const profile = await InstagramService.getUserProfile(senderId);
              senderName = profile.name || null;
            } catch (e) {
              console.error("[Instagram Webhook] Profile fetch failed:", e);
            }

            // Mesajı kaydet
            await InstagramService.handleIncomingMessage(
              senderId,
              senderName,
              messageText,
              timestamp
            );

            console.log(`[Instagram Webhook] Message saved from ${senderName || senderId}: ${messageText}`);
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
