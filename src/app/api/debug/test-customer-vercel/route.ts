import { NextRequest, NextResponse } from "next/server";
import { InstagramService } from "@/services/InstagramService";

export async function GET(req: NextRequest) {
  const customerId = '2359516167869451';
  try {
    const profile = await InstagramService.getUserProfile(customerId);
    const displayName = InstagramService.formatDisplayName(profile);
    const creds = await InstagramService.getCredentials();

    return NextResponse.json({
      success: true,
      customerId,
      profile,
      displayName,
      tokenStartsWith: creds.pageToken ? creds.pageToken.substring(0, 10) : "empty"
    });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message,
      stack: error.stack
    });
  }
}
