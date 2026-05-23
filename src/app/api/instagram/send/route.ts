import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { InstagramService } from "@/services/InstagramService";

/**
 * POST: Instagram DM mesajı gönderir.
 * Inbox'tan agent bir Instagram konuşmasına yanıt yazdığında çağrılır.
 */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { recipientId, message } = await req.json();

    if (!recipientId || !message) {
      return NextResponse.json(
        { error: "recipientId ve message alanları zorunludur" },
        { status: 400 }
      );
    }

    const result = await InstagramService.sendMessage(recipientId, message);

    return NextResponse.json({ success: true, data: result });
  } catch (error: any) {
    console.error("[Instagram Send] Error:", error);
    return NextResponse.json(
      { error: error.message || "Mesaj gönderilemedi" },
      { status: 500 }
    );
  }
}
