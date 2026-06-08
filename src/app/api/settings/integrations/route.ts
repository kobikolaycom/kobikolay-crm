import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { SystemSettingService } from "@/services/SystemSettingService";

// Helper: Check if user has admin privileges
function isAdmin(session: any): boolean {
  const role = session?.user?.role;
  const permissions = session?.user?.permissions;
  return role === "Super Admin" || (Array.isArray(permissions) && permissions.includes("*"));
}

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Only admins can view integration settings (contains sensitive credentials)
  if (!isAdmin(session)) {
    return NextResponse.json({ error: "Yetkisiz: Bu sayfaya erişim yetkiniz yok" }, { status: 403 });
  }

  try {
    const [smtp, whatsapp, meta, meta_capi, system] = await Promise.all([
      SystemSettingService.getByCategory("smtp"),
      SystemSettingService.getByCategory("whatsapp"),
      SystemSettingService.getByCategory("meta"),
      SystemSettingService.getByCategory("meta_capi"),
      SystemSettingService.getByCategory("system"),
    ]);

    return NextResponse.json({ smtp, whatsapp, meta, meta_capi, system, userRole: session.user.role });
  } catch {
    return NextResponse.json({ smtp: {}, whatsapp: {}, meta: {}, meta_capi: {}, system: {}, userRole: null });
  }
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Only admins can modify integration settings
  if (!isAdmin(session)) {
    return NextResponse.json({ error: "Yetkisiz: Ayarları değiştirme yetkiniz yok" }, { status: 403 });
  }

  try {
    const { category, entries } = await req.json();

    // Validate category
    const allowedCategories = ["smtp", "whatsapp", "meta", "meta_capi", "system"];
    if (!category || !allowedCategories.includes(category)) {
      return NextResponse.json({ error: "Geçersiz kategori" }, { status: 400 });
    }

    await SystemSettingService.saveCategory(category, entries);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Settings save error:", error);
    return NextResponse.json({ error: "Ayarlar kaydedilemedi" }, { status: 500 });
  }
}
