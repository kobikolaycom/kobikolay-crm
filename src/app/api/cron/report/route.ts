import { NextRequest, NextResponse } from "next/server";
import { ReportService } from "@/services/ReportService";

// Vercel Cron Job security
const CRON_SECRET = process.env.CRON_SECRET;

export async function GET(request: NextRequest) {
  // Security: Verify cron caller
  // 1. If CRON_SECRET is configured, require Bearer token match
  // 2. Otherwise, accept Vercel's built-in cron invocation header
  const authHeader = request.headers.get("authorization");
  const isVercelCron = request.headers.get("x-vercel-cron") === "1" 
    || request.headers.get("user-agent")?.includes("vercel-cron");

  if (CRON_SECRET) {
    // CRON_SECRET tanımlı — Bearer token zorunlu
    if (authHeader !== `Bearer ${CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  } else {
    // CRON_SECRET tanımlı değil — sadece Vercel cron çağrılarına izin ver
    if (!isVercelCron) {
      console.warn("[Cron] CRON_SECRET not set and request is not from Vercel cron");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
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
