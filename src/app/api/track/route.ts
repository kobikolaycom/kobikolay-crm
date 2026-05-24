import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

/**
 * ═══════════════════════════════════════════════════════════════
 *  E-posta Tracking API
 * ═══════════════════════════════════════════════════════════════
 *
 *  Bu endpoint iki tür izleme sağlar:
 *
 *  1. OPEN (Pixel Tracking):
 *     GET /api/track?tid=xxx&type=open
 *     E-postanın içine gömülü 1x1 şeffaf piksel. Alıcı e-postayı
 *     açtığında tarayıcısı bu URL'yi çağırır → openedAt güncellenir.
 *
 *  2. CLICK (Link Redirect):
 *     GET /api/track?tid=xxx&type=click&url=https://...
 *     E-postadaki linkler bu URL üzerinden sarmalanır. Tıklandığında
 *     clickedAt güncellenir → kullanıcı orijinal URL'ye yönlendirilir.
 *
 * ═══════════════════════════════════════════════════════════════
 */

// 1x1 transparent GIF pixel
const TRACKING_PIXEL = Buffer.from(
  "R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7",
  "base64"
);

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const trackingId = searchParams.get("tid");
  const type = searchParams.get("type") || "open";
  const redirectUrl = searchParams.get("url");

  if (!trackingId) {
    return new NextResponse("Missing tracking ID", { status: 400 });
  }

  try {
    if (type === "open") {
      // Record email open
      await prisma.mailLog.updateMany({
        where: {
          trackingId,
          openedAt: null, // Only record first open
        },
        data: {
          openedAt: new Date(),
        },
      });

      // Return 1x1 transparent pixel
      return new NextResponse(TRACKING_PIXEL, {
        status: 200,
        headers: {
          "Content-Type": "image/gif",
          "Cache-Control": "no-cache, no-store, must-revalidate, private",
          "Pragma": "no-cache",
          "Expires": "0",
        },
      });
    }

    if (type === "click") {
      // Record link click
      await prisma.mailLog.updateMany({
        where: {
          trackingId,
          clickedAt: null, // Only record first click
        },
        data: {
          clickedAt: new Date(),
          // Also mark as opened if not already
          openedAt: new Date(),
        },
      });

      // Redirect to original URL
      if (redirectUrl) {
        return NextResponse.redirect(redirectUrl, 302);
      }

      return new NextResponse("Link tracked", { status: 200 });
    }

    return new NextResponse("Invalid type", { status: 400 });
  } catch (error) {
    console.error("[Track API] Error:", error);
    // Always return a valid response even on error
    if (type === "open") {
      return new NextResponse(TRACKING_PIXEL, {
        status: 200,
        headers: { "Content-Type": "image/gif" },
      });
    }
    if (redirectUrl) {
      return NextResponse.redirect(redirectUrl, 302);
    }
    return new NextResponse("Error", { status: 500 });
  }
}
