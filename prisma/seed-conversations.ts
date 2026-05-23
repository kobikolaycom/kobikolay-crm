import { PrismaClient, ChannelType, ConversationStatus } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🚀 Sohbete dayalı seed verisi hazırlanıyor...");

  // Eski verileri temizle
  await prisma.conversationMessage.deleteMany();
  await prisma.conversation.deleteMany();
  console.log("🗑️  Eski sohbet verileri temizlendi.");

  // İlk kullanıcıyı bulalım (personel notu veya yanıt atan kişi için)
  const user = await prisma.user.findFirst();
  if (!user) {
    console.error("❌ Veritabanında kullanıcı bulunamadı! Lütfen önce ana seed'i çalıştırın.");
    process.exit(1);
  }

  // İlk iki acenteyi çekelim
  const agencies = await prisma.agency.findMany({ take: 2 });
  if (agencies.length === 0) {
    console.log("ℹ️  Herhangi bir acente bulunamadı. Lütfen test acenteleri oluşturulması için seed verilerini kontrol edin veya acente ekleyin.");
  }

  // 1. WhatsApp - Aktif Müşteri Sorusu (Orphan Lead - Acenteye henüz atanmamış)
  const wp1 = await prisma.conversation.create({
    data: {
      channelType: "WHATSAPP",
      status: "OPEN",
      contactName: "Ahmet Yılmaz",
      contactPhone: "+90 532 100 20 30",
      isAdDriven: true,
      adCampaignName: "KobiKolay CRM B2B Launch",
      assignedUserId: user.id,
      messages: {
        create: [
          {
            content: "Merhaba, turizm acentesi yönetim yazılımınız için bilgi alabilir miyim?",
            senderType: "customer",
            senderName: "Ahmet Yılmaz",
            createdAt: new Date(Date.now() - 3600000 * 2) // 2 saat önce
          },
          {
            content: "Tabii ki Ahmet Bey, B2B acente platformumuz üzerinden teklif gönderme, XML uçak bileti entegrasyonu ve omnichannel müşteri takip sistemlerini yönetebilirsiniz. Hangi modüllerle ilgileniyorsunuz?",
            senderType: "agent",
            senderName: user.name || "Müşteri Temsilcisi",
            createdAt: new Date(Date.now() - 3600000 * 1.8)
          },
          {
            content: "Özellikle otel rezervasyonu ve uçak bileti entegrasyonlarıyla ilgileniyoruz. Fiyat listenizi ve tanıtım dosyasını gönderebilir misiniz?",
            senderType: "customer",
            senderName: "Ahmet Yılmaz",
            createdAt: new Date(Date.now() - 3600000 * 1.5)
          }
        ]
      }
    }
  });
  console.log(`✅ WhatsApp Aktif Sohbet oluşturuldu: ${wp1.contactName}`);

  // 2. Instagram - Çözümlenmiş Sohbet (Orphan Lead)
  const ig1 = await prisma.conversation.create({
    data: {
      channelType: "INSTAGRAM",
      status: "RESOLVED",
      contactName: "zeynep_geziyor",
      isAdDriven: false,
      assignedUserId: user.id,
      messages: {
        create: [
          {
            content: "Selam! Profilinizdeki CRM yazılımının demo sürümüne nasıl ulaşabilirim?",
            senderType: "customer",
            senderName: "zeynep_geziyor",
            createdAt: new Date(Date.now() - 86400000 * 3) // 3 gün önce
          },
          {
            content: "Merhaba Zeynep Hanım! DM üzerinden veya web sitemizden formu doldurarak hemen demo hesabı oluşturabilirsiniz. Detayları e-posta adresinize de iletebiliriz.",
            senderType: "agent",
            senderName: user.name || "Müşteri Temsilcisi",
            createdAt: new Date(Date.now() - 86400000 * 2.9)
          },
          {
            content: "Çok iyi olur, zeynep@gezginacente.com adresine mail atar mısınız? Teşekkürler!",
            senderType: "customer",
            senderName: "zeynep_geziyor",
            createdAt: new Date(Date.now() - 86400000 * 2.8)
          },
          {
            content: "Zeynep Hanım, e-posta adresinize demo erişim bilgileri ve sektörel çözüm broşürümüz gönderilmiştir. Kontrol etmenizi rica ederiz.",
            senderType: "agent",
            senderName: user.name || "Müşteri Temsilcisi",
            createdAt: new Date(Date.now() - 86400000 * 2.7)
          },
          {
            content: "Aldım, harika görünüyor! İnceleyip döneceğim.",
            senderType: "customer",
            senderName: "zeynep_geziyor",
            createdAt: new Date(Date.now() - 86400000 * 2.5)
          }
        ]
      }
    }
  });
  console.log(`✅ Instagram Çözülmüş Sohbet oluşturuldu: ${ig1.contactName}`);

  // 3. Messenger - Aktif Reklam Kampanyası
  const fb1 = await prisma.conversation.create({
    data: {
      channelType: "MESSENGER",
      status: "OPEN",
      contactName: "Mustafa Kaplan",
      isAdDriven: true,
      adCampaignName: "Turizm Acentesi Teklif Kampanyası",
      assignedUserId: user.id,
      messages: {
        create: [
          {
            content: "Merhaba, teklif hazırlama modülünüzün toplu e-posta gönderimi desteği var mı?",
            senderType: "customer",
            senderName: "Mustafa Kaplan",
            createdAt: new Date(Date.now() - 3600000 * 5)
          },
          {
            content: "Evet Mustafa Bey, sistemimiz üzerinden dilediğiniz acente grubuna tek tıkla özelleştirilmiş şablonlar ile toplu kampanya e-postaları veya sektörel teklifler gönderebilir, raporları takip edebilirsiniz.",
            senderType: "agent",
            senderName: user.name || "Müşteri Temsilcisi",
            createdAt: new Date(Date.now() - 3600000 * 4.8)
          }
        ]
      }
    }
  });
  console.log(`✅ Messenger Reklam Kaynaklı Sohbet oluşturuldu: ${fb1.contactName}`);

  // 4. Manuel Not Akışı (Acenteye Bağlı)
  if (agencies[0]) {
    const note1 = await prisma.conversation.create({
      data: {
        channelType: "MANUAL_NOTE",
        status: "OPEN",
        agencyId: agencies[0].id,
        createdByUserId: user.id,
        assignedUserId: user.id,
        messages: {
          create: [
            {
              content: `Sistem Tarafından Başlatıldı: ${user.name || "Yönetici"} bu acente için manuel görüşme notları akışı oluşturdu.`,
              senderType: "system",
              senderName: "Sistem",
              isInternalNote: true,
              createdAt: new Date(Date.now() - 3600000 * 24)
            },
            {
              content: `${agencies[0].companyName} acentesi arandı. Fiyat teklifi bekliyorlar. Uçak bileti ve cruise modüllerini istiyorlar.`,
              senderType: "agent",
              senderName: user.name || "Yönetici",
              isInternalNote: true,
              createdAt: new Date(Date.now() - 3600000 * 23.5)
            },
            {
              content: "Teklif gönderildi, 25.000 TL soft fiyat üzerinden değerlendiriyorlar. Cuma günü takip araması yapılacak.",
              senderType: "agent",
              senderName: user.name || "Yönetici",
              isInternalNote: true,
              createdAt: new Date(Date.now() - 3600000 * 18)
            }
          ]
        }
      }
    });
    console.log(`✅ Manuel Görüşme Notu oluşturuldu: ${agencies[0].companyName}`);
  }

  // 5. İkinci Acente İçin Manuel Görüşme Notu
  if (agencies[1]) {
    const note2 = await prisma.conversation.create({
      data: {
        channelType: "MANUAL_NOTE",
        status: "OPEN",
        agencyId: agencies[1].id,
        createdByUserId: user.id,
        assignedUserId: user.id,
        messages: {
          create: [
            {
              content: `Sistem Tarafından Başlatıldı: ${user.name || "Yönetici"} bu acente için manuel görüşme notları akışı oluşturdu.`,
              senderType: "system",
              senderName: "Sistem",
              isInternalNote: true,
              createdAt: new Date(Date.now() - 3600000 * 48)
            },
            {
              content: "BTK zone yetkisi ve belge no kontrol edildi. Acente aktif durumda. Vize hizmetleri ve otel rezervasyon teklifi sunuldu.",
              senderType: "agent",
              senderName: user.name || "Yönetici",
              isInternalNote: true,
              createdAt: new Date(Date.now() - 3600000 * 47)
            }
          ]
        }
      }
    });
    console.log(`✅ Manuel Görüşme Notu oluşturuldu: ${agencies[1].companyName}`);
  }

  console.log("\n🎉 Tüm sohbet seed verileri başarıyla oluşturuldu!");
}

main()
  .catch((e) => {
    console.error("Seed hatası:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
