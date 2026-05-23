import { PrismaClient } from "@prisma/client";
import nodemailer from "nodemailer";
import { SystemSettingService } from "./src/services/SystemSettingService";

const prisma = new PrismaClient();

async function main() {
  console.log("🔍 Veritabanındaki SMTP ayarları yükleniyor...");

  try {
    const smtp = await SystemSettingService.getByCategory("smtp");

    if (!smtp.host || !smtp.user || !smtp.pass) {
      console.log("\n⚠️  SMTP Ayarları henüz doldurulmamış!");
      console.log("Lütfen tarayıcınızda http://localhost:3000/settings/integrations sayfasına gidip SMTP ayarlarını doldurup kaydedin.");
      return;
    }

    console.log("\n📬 Bulunan SMTP Ayarları:");
    console.log(`- Host: ${smtp.host}`);
    console.log(`- Port: ${smtp.port}`);
    console.log(`- Kullanıcı: ${smtp.user}`);
    console.log(`- Şifre: ${"*".repeat(smtp.pass.length)} (Gizlenmiştir)`);
    console.log(`- Gönderen E-posta: ${smtp.from || smtp.user}`);
    console.log(`- Gönderen Adı: ${smtp.fromName || "KobiKolay CRM"}`);

    const port = parseInt(smtp.port || "587");
    const isSecure = port === 465;

    console.log("\n⚡ SMTP Sunucusuna bağlantı testi başlatılıyor...");
    
    const transporter = nodemailer.createTransport({
      host: smtp.host,
      port: port,
      secure: isSecure,
      auth: {
        user: smtp.user,
        pass: smtp.pass,
      },
      tls: {
        rejectUnauthorized: false
      }
    });

    // Verify SMTP connection
    await transporter.verify();
    console.log("🎉 Başarılı! SMTP Sunucusu ile bağlantı kuruldu. Ayarlarınız DOĞRU. ✅");

  } catch (error: any) {
    console.error("\n❌ HATA: SMTP sunucusuna bağlanılamadı!");
    console.error(`Detay: ${error.message}`);
  } finally {
    await prisma.$disconnect();
  }
}

main();
