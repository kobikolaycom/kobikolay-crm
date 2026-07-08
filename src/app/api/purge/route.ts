import { NextRequest } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return new Response(JSON.stringify({ error: "Yetkisiz erişim" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Security: Only Super Admin is authorized to purge data
  if (session.user.role !== "Super Admin") {
    return new Response(JSON.stringify({ error: "Yetersiz yetki. Sadece yöneticiler verileri temizleyebilir." }), {
      status: 403,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const body = await req.json();
    const { target } = body;

    const results: string[] = [];

    if (target === "conversations" || target === "all") {
      // Delete all conversation messages first (correct Prisma model)
      const msgCount = await prisma.conversationMessage.deleteMany({});
      const convoCount = await prisma.conversation.deleteMany({});
      results.push(`${convoCount.count} konuşma ve ${msgCount.count} mesaj silindi`);
    }

    if (target === "categories" || target === "all") {
      // Disconnect agency-category relations
      await prisma.agency.updateMany({ data: { categoryId: null } });
      
      // Delete email templates
      try { await prisma.emailTemplate.deleteMany({}); } catch {}

      const categoryCount = await prisma.businessCategory.deleteMany({});
      results.push(`${categoryCount.count} kategori silindi`);
    }

    return new Response(
      JSON.stringify({ success: true, results }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Purge error:", error);
    return new Response(
      JSON.stringify({ error: "Silme işlemi başarısız" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
