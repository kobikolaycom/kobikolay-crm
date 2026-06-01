import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get("token");

    if (!token) {
      return NextResponse.json({ error: "Geçersiz token" }, { status: 400 });
    }

    const agency = await prisma.agency.findUnique({
      where: { unsubscribeToken: token },
      select: { id: true, companyName: true, isUnsubscribed: true },
    });

    if (!agency) {
      return NextResponse.json({ error: "Acente bulunamadı" }, { status: 404 });
    }

    return NextResponse.json({
      companyName: agency.companyName,
      isUnsubscribed: agency.isUnsubscribed,
    });
  } catch (error: any) {
    console.error("[Unsubscribe GET Error]:", error);
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { token, confirm } = body;

    if (!token) {
      return NextResponse.json({ error: "Geçersiz token" }, { status: 400 });
    }

    if (!confirm) {
      return NextResponse.json({ error: "Lütfen abonelikten çıkmak istediğinizi onaylayın" }, { status: 400 });
    }

    const agency = await prisma.agency.findUnique({
      where: { unsubscribeToken: token },
    });

    if (!agency) {
      return NextResponse.json({ error: "Acente bulunamadı" }, { status: 404 });
    }

    // Acenteyi güncelle
    await prisma.agency.update({
      where: { id: agency.id },
      data: { isUnsubscribed: true },
    });

    // Omnichannel sohbete sistem mesajı ekleyelim (Röntgen / Takip için)
    let conversation = await prisma.conversation.findFirst({
      where: { agencyId: agency.id },
    });

    if (!conversation) {
      conversation = await prisma.conversation.create({
        data: {
          agencyId: agency.id,
          channelType: "MANUAL_NOTE",
          status: "OPEN",
          contactName: agency.authorizedPerson || "Yetkili",
        },
      });
    }

    await prisma.conversationMessage.create({
      data: {
        conversationId: conversation.id,
        content: `🚨 **Abonelikten Ayrıldı:** Alıcı e-posta listemizden ayrılmayı tercih etti. Artık bu acenteye otomatik veya birebir tanıtım e-postaları gönderilemeyecektir.`,
        isInternalNote: true,
        senderType: "system",
        senderName: "Sistem",
      },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("[Unsubscribe POST Error]:", error);
    return NextResponse.json({ error: "Sunucu hatası" }, { status: 500 });
  }
}
