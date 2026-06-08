import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import nodemailer from "nodemailer";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Only admins can test SMTP settings
  const role = session.user.role;
  const permissions = (session.user as any).permissions;
  if (role !== "Super Admin" && !(Array.isArray(permissions) && permissions.includes("*"))) {
    return NextResponse.json({ error: "Yetkisiz" }, { status: 403 });
  }

  let body: any = {};
  try {
    body = await req.json();
    const { host, port, user, pass, from, fromName, encryption, testEmail, action } = body;

    const cleanHost = String(host || "").trim();
    const cleanPort = String(port || "").trim();
    const cleanUser = String(user || "").trim();
    let cleanPass = String(pass || "").trim();
    const cleanFrom = String(from || "").trim();
    const cleanTestEmail = String(testEmail || "").trim();

    if (!cleanHost || !cleanPort || !cleanUser || !cleanPass) {
      return NextResponse.json({ error: "Eksik SMTP bilgileri (Host, Port, Kullanıcı Adı, Şifre gerekli)" }, { status: 400 });
    }

    // Gmail için 16 haneli Uygulama Şifresi girildiyse tüm boşlukları temizle
    if (cleanHost.includes("gmail") || cleanUser.includes("gmail")) {
      const strippedPass = cleanPass.replace(/\s+/g, "");
      if (strippedPass.length === 16) {
        cleanPass = strippedPass;
      }
    }

    const secure = encryption === "SSL"; 
    
    // Always permit rejectUnauthorized false for robust certificate handshakes
    const tlsConfig = { rejectUnauthorized: false };

    const transporter = nodemailer.createTransport({
      host: cleanHost,
      port: Number(cleanPort),
      secure: secure,
      auth: {
        user: cleanUser,
        pass: cleanPass,
      },
      tls: tlsConfig,
    });

    if (action === "connect") {
      await transporter.verify();
      return NextResponse.json({ success: true, message: "Bağlantı başarılı!" });
    } else if (action === "send") {
      if (!cleanTestEmail) {
        return NextResponse.json({ error: "Test e-posta adresi gerekli" }, { status: 400 });
      }

      await transporter.sendMail({
        from: fromName ? `"${fromName}" <${cleanFrom || cleanUser}>` : (cleanFrom || cleanUser),
        to: cleanTestEmail,
        subject: "KobiKolay CRM - Test E-Postası",
        text: "Bu bir KobiKolay CRM test e-postasıdır. SMTP ayarlarınız başarılı bir şekilde yapılandırılmıştır.",
        html: "<p>Bu bir <strong>KobiKolay CRM</strong> test e-postasıdır. SMTP ayarlarınız başarılı bir şekilde yapılandırılmıştır.</p>",
      });

      return NextResponse.json({ success: true, message: "Test e-postası başarıyla gönderildi!" });
    }

    return NextResponse.json({ error: "Geçersiz işlem" }, { status: 400 });
  } catch (error: any) {
    console.error("SMTP Test Error:", error);
    
    let userFriendlyError = error.message || "E-posta gönderilirken bilinmeyen bir hata oluştu.";
    const errStr = String(error.message || "").toLowerCase();
    const errCode = String(error.code || "").toUpperCase();
    const hostStr = String(body?.host || "").toLowerCase();
    const userStr = String(body?.user || "").toLowerCase();

    if (errStr.includes("535") || errStr.includes("username and password not accepted") || errCode === "EAUTH") {
      if (hostStr.includes("gmail") || userStr.includes("gmail")) {
        userFriendlyError = "Gmail Kimlik Doğrulama Hatası (535): Girdiğiniz şifre Google tarafından reddedildi. Güvenlik kuralları gereği Gmail hesabınızın normal hesap şifresini SMTP için kullanamazsınız. Lütfen Google hesabınızda 'İki Adımlı Doğrulama'yı açtıktan sonra bir 'Uygulama Şifresi' (App Password) oluşturun ve o 16 haneli şifreyi boşluksuz şekilde yazılımdaki şifre alanına girin.";
      } else {
        userFriendlyError = "SMTP Kimlik Doğrulama Hatası (535): Kullanıcı adı veya şifre yanlış. Lütfen e-posta adresinizi ve şifrenizi kontrol edin. (Not: Kurumsal veya Gmail hesaplarında özel SMTP şifresi oluşturmanız gerekebilir).";
      }
    } else if (errCode === "ENOTFOUND" || errStr.includes("enotfound")) {
      userFriendlyError = `Sunucu Adresi Bulunamadı (ENOTFOUND): Girdiğiniz Host adresi '${body?.host || ""}' bulunamadı. Lütfen Host adresini kontrol edin. Gmail için: smtp.gmail.com olmalıdır.`;
    } else if (errCode === "ETIMEDOUT" || errStr.includes("timedout")) {
      userFriendlyError = "Bağlantı Zaman Aşımı (ETIMEDOUT): SMTP sunucusuna bağlanılamadı. Port numarasını, şifreleme türünü kontrol edin veya sunucu güvenlik duvarının bu porta izin verdiğinden emin olun. (Örn: Port 587 ve TLS/NONE veya Port 465 ve SSL).";
    } else if (errCode === "ECONNREFUSED" || errStr.includes("connrefused")) {
      userFriendlyError = `Bağlantı Reddedildi (ECONNREFUSED): ${body?.host || ""}:${body?.port || ""} bağlantısı reddedildi. Port numarasını ve şifreleme seçeneğini doğru eşleştirdiğinizden emin olun. (SSL için Port: 465, TLS/STARTTLS için Port: 587).`;
    } else if (errStr.includes("unexpected socket close")) {
      userFriendlyError = "Soket Beklenmedik Şekilde Kapandı (Protocol Mismatch): Port 465 kullanıyorsanız 'Bağlantı' türünü kesinlikle 'SSL' seçmelisiniz. Eğer 'TLS' seçtiyseniz Port'u 587 yapmalısınız. Lütfen Port ve Bağlantı türünün eşleştiğinden emin olun.";
    }

    return NextResponse.json({ error: userFriendlyError }, { status: 500 });
  }
}
