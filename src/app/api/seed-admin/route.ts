import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";

/**
 * Personel Sıfırlama API
 * 
 * GET /api/seed-admin?secret=kobikolay2026
 * 
 * Bu endpoint:
 * 1. Tüm mevcut kullanıcıları siler
 * 2. SuperAdmin ve Personel rollerini oluşturur
 * 3. Onurhan Şeker superadmin hesabını oluşturur
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const secret = searchParams.get("secret");

  // Basit güvenlik kontrolü
  if (secret !== "kobikolay2026") {
    return NextResponse.json({ error: "Yetkisiz erişim" }, { status: 403 });
  }

  try {
    // 1. Mevcut kullanıcıları temizle (sentMailLogs ilişkisini temizle)
    await prisma.mailLog.updateMany({
      where: { sentById: { not: null } },
      data: { sentById: null },
    });

    // Activity ilişkilerini temizle
    await prisma.activity.updateMany({
      where: { creatorId: { not: null } },
      data: { creatorId: null as any },
    });
    await prisma.activity.updateMany({
      where: { assignedToId: { not: null } },
      data: { assignedToId: null },
    });

    // Conversation ilişkilerini temizle
    await prisma.conversation.updateMany({
      where: { assignedToId: { not: null } },
      data: { assignedToId: null },
    });
    await prisma.conversation.updateMany({
      where: { createdById: { not: null } },
      data: { createdById: null as any },
    });

    // Kullanıcıları sil
    await prisma.user.deleteMany({});

    // 2. Rolleri oluştur
    const superAdminRole = await prisma.role.upsert({
      where: { name: "SuperAdmin" },
      update: { permissions: ["*"], description: "Tam yetkili sistem yöneticisi" },
      create: {
        name: "SuperAdmin",
        description: "Tam yetkili sistem yöneticisi",
        permissions: ["*"],
      },
    });

    await prisma.role.upsert({
      where: { name: "Personel" },
      update: {},
      create: {
        name: "Personel",
        description: "Standart personel",
        permissions: ["agents:read", "agents:write", "inbox:read", "inbox:write"],
      },
    });

    // 3. SuperAdmin kullanıcısı oluştur
    const hashedPassword = await bcrypt.hash("Amazon.90", 12);
    const user = await prisma.user.create({
      data: {
        name: "Onurhan Şeker",
        email: "onurhan@kobikolay.com",
        password: hashedPassword,
        roleId: superAdminRole.id,
        isActive: true,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Personel sıfırlandı ve SuperAdmin oluşturuldu",
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: "SuperAdmin",
      },
    });
  } catch (error: any) {
    console.error("[Seed Admin] Error:", error);
    return NextResponse.json(
      { error: error.message || "Bir hata oluştu" },
      { status: 500 }
    );
  }
}
