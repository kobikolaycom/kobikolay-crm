import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const entries = [
      { key: "appId", value: "1714904416349761" },
      { key: "appSecret", value: "24e6a594522bec16dd513c7d0f91d27d" },
      { key: "pageToken", value: "IGAAYXskyPbkFBZAGJtQWFub1dENWpWaEhrMnExSGcwYS1sOXNqNmotRGhaZATM0X01xYkl0T2tkMnlibW5EVFFoVXlIazBaU2FwNmdWWDFrTEUtWkJlbVprWWswdzVRWUtfa2V6RC10V0pLY2pkODNZAeU1CTEEzQWgyR1RydUFTTQZDZD" },
      { key: "igAccountId", value: "1784147676338287" },
      { key: "webhookVerifyToken", value: "acenteyazilim_crm_2026" }
    ];

    const operations = entries.map(entry =>
      prisma.systemSetting.upsert({
        where: { category_key: { category: "meta", key: entry.key } },
        update: { value: entry.value },
        create: { category: "meta", key: entry.key, value: entry.value },
      })
    );

    await prisma.$transaction(operations);

    return NextResponse.json({
      success: true,
      message: "Meta credentials successfully synchronized with correct values!"
    });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message
    });
  }
}
