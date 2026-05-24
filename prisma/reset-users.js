const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

async function main() {
  console.log("🔄 Personel sıfırlama başlıyor...");

  // 1. Mevcut kullanıcıları sil (cascade olmayan ilişkileri temizle)
  await prisma.user.deleteMany({});
  console.log("✅ Tüm kullanıcılar silindi");

  // 2. SuperAdmin rolü oluştur/güncelle
  const superAdminRole = await prisma.role.upsert({
    where: { name: "SuperAdmin" },
    update: { permissions: ["*"], description: "Tam yetkili sistem yöneticisi" },
    create: {
      name: "SuperAdmin",
      description: "Tam yetkili sistem yöneticisi",
      permissions: ["*"],
    },
  });
  console.log("✅ SuperAdmin rolü:", superAdminRole.id);

  // 3. Personel rolü oluştur
  await prisma.role.upsert({
    where: { name: "Personel" },
    update: {},
    create: {
      name: "Personel",
      description: "Standart personel",
      permissions: ["agents:read", "agents:write", "inbox:read", "inbox:write"],
    },
  });
  console.log("✅ Personel rolü oluşturuldu");

  // 4. SuperAdmin kullanıcısı oluştur
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
  console.log("✅ SuperAdmin kullanıcısı oluşturuldu:", user.id);
  console.log("   📧 Email: onurhan@kobikolay.com");
  console.log("   🔑 Şifre: Amazon.90");

  console.log("\n🎉 Tamamlandı!");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
