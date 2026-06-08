import { NextRequest, NextResponse } from "next/server";
import { verifyWebhookSignature } from "@/lib/webhook-verify";
import prisma from "@/lib/prisma";
import { ConversationService } from "@/services/ConversationService";

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  console.log("[Messenger Webhook] Verify request:", { mode, token, challenge: challenge?.substring(0, 20) });

  if (mode === "subscribe" && token && challenge) {
    const envToken = process.env.META_WEBHOOK_VERIFY_TOKEN;
    
    if (envToken && token === envToken) {
      return new NextResponse(challenge, { status: 200, headers: { "Content-Type": "text/plain" } });
    }
    
    // Check DB as fallback
    try {
      const dbToken = await prisma.systemSetting.findUnique({
        where: { category_key: { category: "meta", key: "webhookVerifyToken" } }
      });
      if (dbToken?.value === token) {
        return new NextResponse(challenge, { status: 200, headers: { "Content-Type": "text/plain" } });
      }
    } catch (e) {}

    return new NextResponse("Forbidden", { status: 403 });
  }

  return new NextResponse("Bad Request", { status: 400 });
}

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get("x-hub-signature-256");

    if (!verifyWebhookSignature(rawBody, signature)) {
      console.warn("[Messenger Webhook] Invalid signature - rejecting request");
      return NextResponse.json({ error: "Invalid signature" }, { status: 403 });
    }

    const body = JSON.parse(rawBody);
    console.log("[Messenger Webhook] Incoming event:", body.object, "entries:", body.entry?.length || 0);

    if (body.object === "page") {
      const entries = body.entry || [];

      for (const entry of entries) {
        const messagingEvents = entry.messaging || [];

        for (const event of messagingEvents) {
          // Echo mesajlarını atla
          if (event.message && event.message.is_echo) {
            console.log("[Messenger Webhook] Echo mesajı algılandı, atlanıyor.");
            continue;
          }

          if (event.message && event.message.text) {
            const senderId = event.sender?.id;
            const messageText = event.message.text;
            
            if (!senderId) continue;

            // Fetch basic profile info from Messenger API if possible
            // We use a simplified version, falling back to "Messenger Kullanıcı"
            let contactName = "Messenger Kullanıcı";
            try {
              const { InstagramService } = await import("@/services/InstagramService");
              const creds = await InstagramService.getCredentials();
              if (creds.pageToken) {
                const fbUrl = `https://graph.facebook.com/v21.0/${senderId}?fields=name`;
                const res = await fetch(fbUrl, { headers: { Authorization: `Bearer ${creds.pageToken}` } });
                const data = await res.json();
                if (res.ok && data.name) {
                  contactName = data.name;
                }
              }
            } catch (e) {
              console.error("[Messenger Webhook] Profil çekilemedi:", e);
            }

            // Find or create conversation
            let conversation = await prisma.conversation.findFirst({
              where: {
                channelType: "MESSENGER",
                contactPhone: senderId,
                status: "OPEN",
              },
            });

            if (!conversation) {
              conversation = await prisma.conversation.create({
                data: {
                  channelType: "MESSENGER",
                  contactName,
                  contactPhone: senderId,
                  status: "OPEN",
                },
              });
            } else if (contactName !== "Messenger Kullanıcı" && conversation.contactName === "Messenger Kullanıcı") {
              await prisma.conversation.update({
                where: { id: conversation.id },
                data: { contactName },
              });
            }

            // Save message
            await ConversationService.createMessage(conversation.id, {
              content: messageText,
              senderType: "customer",
              senderName: contactName,
              isInternalNote: false,
            });

            console.log(`[Messenger Webhook] Mesaj kaydedildi: ${contactName} (${senderId})`);
          }
          
          // Medya vs. desteklenebilir
          if (event.message && event.message.attachments) {
             const senderId = event.sender?.id;
             if (!senderId) continue;
             for (const attachment of event.message.attachments) {
               const type = attachment.type || "unknown";
               const url = attachment.payload?.url || "";
               
               let conversation = await prisma.conversation.findFirst({
                 where: { channelType: "MESSENGER", contactPhone: senderId, status: "OPEN" },
               });

               if (!conversation) {
                 conversation = await prisma.conversation.create({
                   data: { channelType: "MESSENGER", contactName: "Messenger Kullanıcı", contactPhone: senderId, status: "OPEN" },
                 });
               }

               await ConversationService.createMessage(conversation.id, {
                 content: `[${type.toUpperCase()}] ${url}`,
                 senderType: "customer",
                 senderName: conversation.contactName || "Messenger Kullanıcı",
                 isInternalNote: false,
               });
             }
          }
        }
      }
    }

    return NextResponse.json({ status: "ok" }, { status: 200 });
  } catch (error) {
    console.error("[Messenger Webhook] Error:", error);
    return NextResponse.json({ status: "ok" }, { status: 200 });
  }
}
