import { NextRequest, NextResponse } from "next/server";
import { ReportService } from "@/services/ReportService";

// Vercel Cron Job security header
const CRON_SECRET = process.env.CRON_SECRET;

export async function GET(request: NextRequest) {
  // Security: Verify cron secret or allow test mode
  const authHeader = request.headers.get("authorization");
  const isTest = request.nextUrl.searchParams.get("test") === "true";
  const testEmail = request.nextUrl.searchParams.get("email");

  if (!isTest && CRON_SECRET && authHeader !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const type = request.nextUrl.searchParams.get("type") as "daily" | "weekly" | "monthly";

  if (!type || !["daily", "weekly", "monthly"].includes(type)) {
    return NextResponse.json({ error: "Invalid type. Use: daily, weekly, monthly" }, { status: 400 });
  }

  try {
    let result;

    if (isTest && testEmail) {
      // Demo mode: send test report with fake data
      result = await ReportService.sendDemoReport(type, testEmail);
    } else if (type === "monthly") {
      // Monthly: check if today is the last day of the month
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
      return NextResponse.json({ success: false, error: result.error }, { status: 500 });
    }
  } catch (error: any) {
    console.error("Report cron error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
