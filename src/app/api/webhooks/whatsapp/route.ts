import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { ConversationService } from "@/services/ConversationService";

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  console.log("[WhatsApp Webhook] Verify request:", { mode, token, challenge: challenge?.substring(0, 20) });

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
    const body = await req.json();
    console.log("[WhatsApp Webhook] Incoming event:", JSON.stringify(body).substring(0, 1000));

    if (body.object === "whatsapp_business_account") {
      const entries = body.entry || [];
      for (const entry of entries) {
        const changes = entry.changes || [];
        for (const change of changes) {
          const value = change.value;
          if (!value || !value.messages) continue;

          const contacts = value.contacts || [];
          const messages = value.messages || [];

          for (const message of messages) {
            const senderPhone = message.from;
            const messageText = message.text?.body || (message.type ? `[${message.type.toUpperCase()}] Medya/Diğer` : "Mesaj");
            const contactName = contacts.find((c: any) => c.wa_id === senderPhone)?.profile?.name || "WhatsApp Kullanıcı";

            if (!senderPhone) continue;

            // Find or create conversation
            let conversation = await prisma.conversation.findFirst({
              where: {
                channelType: "WHATSAPP",
                contactPhone: senderPhone,
                status: "OPEN",
              },
            });

            if (!conversation) {
              conversation = await prisma.conversation.create({
                data: {
                  channelType: "WHATSAPP",
                  contactName,
                  contactPhone: senderPhone,
                  status: "OPEN",
                },
              });
            } else if (contactName !== "WhatsApp Kullanıcı" && conversation.contactName === "WhatsApp Kullanıcı") {
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

            console.log(`[WhatsApp Webhook] Mesaj kaydedildi: ${contactName} (${senderPhone}): "${messageText}"`);
          }
        }
      }
    }

    return NextResponse.json({ status: "ok" }, { status: 200 });
  } catch (error) {
    console.error("[WhatsApp Webhook] Error:", error);
    return NextResponse.json({ status: "ok" }, { status: 200 });
  }
}
