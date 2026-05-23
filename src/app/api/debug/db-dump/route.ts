import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const convs = await prisma.conversation.findMany({
      where: { channelType: "INSTAGRAM" },
      orderBy: { updatedAt: "desc" },
      take: 10,
    });

    const settings = await prisma.systemSetting.findMany({
      where: { category: "meta" }
    });

    const maskedSettings = settings.map(s => ({
      key: s.key,
      value: s.value ? s.value.substring(0, 5) + "..." + s.value.substring(s.value.length - 5) : ""
    }));

    return NextResponse.json({
      success: true,
      conversations: convs,
      settings: maskedSettings
    });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message
    });
  }
}
