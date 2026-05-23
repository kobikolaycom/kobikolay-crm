import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const entries = [
      { key: "appId", value: "1714904416349761" },
      { key: "appSecret", value: "24e6c99c75fb74b9777f9c2d76fcd27d" },
      { key: "pageToken", value: "IGAAYXskyPbkFBZA3lZAHM4ZA0FmNnExZA2pCUXZA1ZAERzaHRnckE4ZAkJ3QU1aQWpGdlpNV3VCS0lscV83ZAURiYWN1cDB5NlQyZAG9nUW9zOTFfLUdOQUxfS285dmhXQjF0ZA3pyWGJ1Ylhic1ptc0FkUk8ySm0wa2gzdHhOOFV6ZA0tY3VDZA2VDb3FDQk9iSHZDWTN2M3g1dkdnd3JZAG1qRElBZAwZDZD" },
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
      message: "Meta credentials successfully synchronized to Vercel production database!"
    });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message
    });
  }
}
