import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

/**
 * Geçici debug endpoint'i — Conversation ve mesajları kontrol eder.
 * CANLI'DA KALICI OLMAMALI — test sonrası silinecek.
 */
export async function GET() {
  try {
    const conversations = await prisma.conversation.findMany({
      where: { channelType: "INSTAGRAM" },
      include: {
        messages: {
          orderBy: { createdAt: "desc" },
          take: 3,
        },
      },
      orderBy: { updatedAt: "desc" },
      take: 10,
    });

    return NextResponse.json({
      count: conversations.length,
      conversations: conversations.map((c) => ({
        id: c.id,
        contactName: c.contactName,
        contactPhone: c.contactPhone,
        status: c.status,
        createdAt: c.createdAt,
        messageCount: c.messages.length,
        lastMessages: c.messages.map((m) => ({
          content: m.content,
          senderType: m.senderType,
          createdAt: m.createdAt,
        })),
      })),
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
