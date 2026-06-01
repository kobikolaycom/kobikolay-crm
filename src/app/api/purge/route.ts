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

  try {
    const body = await req.json();
    const { target } = body;

    const results: string[] = [];

    if (target === "conversations" || target === "all") {
      // Delete all messages first, then conversations
      const msgCount = await prisma.message.deleteMany({});
      const convoCount = await prisma.conversation.deleteMany({});
      results.push(`${convoCount.count} konuşma ve ${msgCount.count} mesaj silindi`);
    }

    if (target === "sectors" || target === "all") {
      // Disconnect agency-sector relations
      await prisma.$executeRawUnsafe(`DELETE FROM "_AgencySectors"`);
      
      // Delete sector references
      try { await prisma.sectorReference.deleteMany({}); } catch {}
      
      // Delete email templates
      try { await prisma.emailTemplate.deleteMany({}); } catch {}

      const sectorCount = await prisma.sector.deleteMany({});
      results.push(`${sectorCount.count} faaliyet alanı silindi`);
    }

    return new Response(
      JSON.stringify({ success: true, results }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Purge error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Silme işlemi başarısız" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
