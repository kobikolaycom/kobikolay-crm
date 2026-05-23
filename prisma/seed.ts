import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  // 1. Create Super Admin Role
  const superAdminRole = await prisma.role.upsert({
    where: { name: "Super Admin" },
    update: {
      permissions: ["*"], // Grant all permissions
    },
    create: {
      name: "Super Admin",
      description: "Tüm yetkilere sahip kurucu rolü.",
      permissions: ["*"],
    },
  });

  console.log("✅ Super Admin role created/verified.");

  // 2. Create Initial Admin User
  const hashedPassword = await bcrypt.hash("Amazon.90", 10);
  
  const adminUser = await prisma.user.upsert({
    where: { email: "admin@kobikolay.com" },
    update: {
      roleId: superAdminRole.id,
      isActive: true,
    },
    create: {
      email: "admin@kobikolay.com",
      name: "Özdemir Bey",
      password: hashedPassword,
      roleId: superAdminRole.id,
      isActive: true,
    },
  });

  console.log(`✅ Admin user seeded: ${adminUser.email}`);
  
  // 3. Create basic roles for demonstration
  const salesManagerRole = await prisma.role.upsert({
    where: { name: "Satış Şefi" },
    update: {},
    create: {
      name: "Satış Şefi",
      description: "Ekip yönetimi ve teklif yetkisi.",
      permissions: ["agents:view", "agents:edit", "offers:manage", "campaigns:manage"],
    },
  });

  const salesRepRole = await prisma.role.upsert({
    where: { name: "Satış Temsilcisi" },
    update: {},
    create: {
      name: "Satış Temsilcisi",
      description: "Sadece acente görme ve teklif hazırlama yetkisi.",
      permissions: ["agents:view", "offers:create"],
    },
  });

  console.log(`✅ Basic roles seeded: ${salesManagerRole.name}, ${salesRepRole.name}`);

  // 4. Seed Default Sectors
  const defaultSectors = [
    { name: "Uçak Bileti", description: "Yurtiçi ve yurtdışı uçak bileti rezervasyonları." },
    { name: "Otel Rezervasyonu", description: "B2B ve B2C konaklama rezervasyon hizmetleri." },
    { name: "Cruise", description: "Uluslararası gemi turları ve kabin kiralama." },
    { name: "Vize Hizmetleri", description: "Schengen ve dünya geneli vize danışmanlığı." }
  ];

  for (const s of defaultSectors) {
    await prisma.sector.upsert({
      where: { name: s.name },
      update: {},
      create: {
        name: s.name,
        description: s.description,
      }
    });
  }

  console.log("✅ Default sectors seeded.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
