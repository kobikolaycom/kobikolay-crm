import { NextRequest, NextResponse } from "next/server";
import { ReportService } from "@/services/ReportService";

// Vercel Cron Job security header
const CRON_SECRET = process.env.CRON_SECRET;

export async function GET(request: NextRequest) {
  // Security: Verify cron secret (fail-closed: deny if secret not configured)
  const authHeader = request.headers.get("authorization");

  if (!CRON_SECRET || authHeader !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const isTest = request.nextUrl.searchParams.get("test") === "true";
  const testEmail = request.nextUrl.searchParams.get("email");
  const type = request.nextUrl.searchParams.get("type") as "daily" | "weekly" | "monthly";

  if (!type || !["daily", "weekly", "monthly"].includes(type)) {
    return NextResponse.json({ error: "Invalid type. Use: daily, weekly, monthly" }, { status: 400 });
  }

  // Validate test email format if provided
  if (isTest && testEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(testEmail)) {
    return NextResponse.json({ error: "Invalid email format" }, { status: 400 });
  }

  try {
    let result;

    if (isTest && testEmail) {
      result = await ReportService.sendDemoReport(type, testEmail);
    } else if (type === "monthly") {
      const now = new Date();
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      if (tomorrow.getDate() !== 1 && !isTest) {
        return NextResponse.json({ message: "Not the last day of month, skipping." });
      }
      result = await ReportService.sendMonthlyReport();
    } else if (type === "weekly") {
      result = await ReportService.sendWeeklyReport();
    } else {
      result = await ReportService.sendDailyReport();
    }

    if (result.success) {
      return NextResponse.json({ success: true, message: `${type} report sent successfully` });
    } else {
      return NextResponse.json({ success: false, error: "Report sending failed" }, { status: 500 });
    }
  } catch (error: any) {
    console.error("Report cron error:", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
