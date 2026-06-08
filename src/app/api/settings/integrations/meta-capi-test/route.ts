import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import crypto from "crypto";

/**
 * Meta Conversions API test endpoint
 * POST /api/settings/integrations/meta-capi-test
 */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
  }

  try {
    const { accessToken, datasetId, testEventCode } = await req.json();

    if (!accessToken || !datasetId) {
      return NextResponse.json({ error: "Access Token ve Dataset ID gereklidir" }, { status: 400 });
    }

    // Test payload — SHA256 hash'lenmiş örnek veriler
    const testEmail = crypto.createHash("sha256").update("test@kobikolay.com").digest("hex");
    const testPhone = crypto.createHash("sha256").update("905001234567").digest("hex");

    const payload: any = {
      data: [
        {
          event_name: "Lead",
          event_time: Math.floor(Date.now() / 1000),
          action_source: "system_generated",
          user_data: {
            em: [testEmail],
            ph: [testPhone],
          },
          custom_data: {
            event_source: "crm",
            lead_event_source: "KobiKolay CRM",
            lead_status: "Test Event",
          },
        },
      ],
    };

    // Test event code varsa ekle
    if (testEventCode) {
      payload.test_event_code = testEventCode;
    }

    const url = `https://graph.facebook.com/v25.0/${datasetId}/events?access_token=${accessToken}`;

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const result = await response.json();

    if (!response.ok) {
      const errorMsg = result?.error?.message || JSON.stringify(result);
      return NextResponse.json(
        { error: `Meta API Hatası: ${errorMsg}` },
        { status: response.status }
      );
    }

    return NextResponse.json({
      success: true,
      message: `✅ Test olayı başarıyla gönderildi! Events received: ${result.events_received || 0}${testEventCode ? " (Test modunda — Meta Olay Yöneticisi > Test Olayları sekmesinden kontrol edin)" : ""}`,
      result,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "API bağlantı hatası" },
      { status: 500 }
    );
  }
}
