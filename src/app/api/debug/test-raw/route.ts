import { NextRequest, NextResponse } from "next/server";
import { InstagramService } from "@/services/InstagramService";

export async function GET(req: NextRequest) {
  const customerId = '2359516167869451';
  try {
    const creds = await InstagramService.getCredentials();
    const url = `https://graph.instagram.com/v21.0/${customerId}?fields=name,username&access_token=${creds.pageToken}`;
    
    const response = await fetch(url);
    const data = await response.json();

    return NextResponse.json({
      success: true,
      url: url.substring(0, 80) + "...",
      status: response.status,
      ok: response.ok,
      data: data
    });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message,
      stack: error.stack
    });
  }
}
