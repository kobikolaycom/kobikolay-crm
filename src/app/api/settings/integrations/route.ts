import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { SystemSettingService } from "@/services/SystemSettingService";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const [smtp, whatsapp, meta, system] = await Promise.all([
      SystemSettingService.getByCategory("smtp"),
      SystemSettingService.getByCategory("whatsapp"),
      SystemSettingService.getByCategory("meta"),
      SystemSettingService.getByCategory("system"),
    ]);

    return NextResponse.json({ smtp, whatsapp, meta, system, userRole: session.user.role });
  } catch {
    return NextResponse.json({ smtp: {}, whatsapp: {}, meta: {}, system: {}, userRole: null });
  }
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { category, entries } = await req.json();
    await SystemSettingService.saveCategory(category, entries);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
