import { NextRequest, NextResponse } from "next/server";
import { InstagramService } from "@/services/InstagramService";

export async function GET(req: NextRequest) {
  const customerId = '2359516167869451'; // Real customer ID
  const messageText = 'Merhaba, bu Vercel üzerinden gönderilen bir test yanıtıdır.';

  try {
    const result = await InstagramService.sendMessage(customerId, messageText);
    return NextResponse.json({
      success: true,
      result
    });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message,
      stack: error.stack
    });
  }
}
