import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import nodemailer from "nodemailer";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const { host, port, user, pass, from, fromName, encryption, testEmail, action } = body;

    if (!host || !port || !user || !pass) {
      return NextResponse.json({ error: "Eksik SMTP bilgileri (Host, Port, Kullanıcı Adı, Şifre gerekli)" }, { status: 400 });
    }

    const secure = encryption === "SSL"; 
    
    // Some mail servers require specific TLS configurations
    const tlsConfig = encryption === "TLS" ? { rejectUnauthorized: false } : undefined;

    const transporter = nodemailer.createTransport({
      host,
      port: Number(port),
      secure: secure,
      auth: {
        user,
        pass,
      },
      tls: tlsConfig,
    });

    if (action === "connect") {
      await transporter.verify();
      return NextResponse.json({ success: true, message: "Bağlantı başarılı!" });
    } else if (action === "send") {
      if (!testEmail) {
        return NextResponse.json({ error: "Test e-posta adresi gerekli" }, { status: 400 });
      }

      await transporter.sendMail({
        from: fromName ? `"${fromName}" <${from || user}>` : (from || user),
        to: testEmail,
        subject: "KobiKolay CRM - Test E-Postası",
        text: "Bu bir KobiKolay CRM test e-postasıdır. SMTP ayarlarınız başarılı bir şekilde yapılandırılmıştır.",
        html: "<p>Bu bir <strong>KobiKolay CRM</strong> test e-postasıdır. SMTP ayarlarınız başarılı bir şekilde yapılandırılmıştır.</p>",
      });

      return NextResponse.json({ success: true, message: "Test e-postası başarıyla gönderildi!" });
    }

    return NextResponse.json({ error: "Geçersiz işlem" }, { status: 400 });
  } catch (error: any) {
    console.error("SMTP Test Error:", error);
    return NextResponse.json({ error: error.message || "Bağlantı hatası" }, { status: 500 });
  }
}
