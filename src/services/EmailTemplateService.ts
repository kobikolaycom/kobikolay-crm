import prisma from "@/lib/prisma";
import { escapeHtml, getBaseUrl } from "@/lib/utils";

// E-posta şablonları servisi
// NOT: emailTemplate modeli migration uygulanmadan önce undefined olabilir.
// Bu yüzden tüm erişimleri güvenli bir şekilde yapıyoruz.
function getModel() {
  const model = (prisma as any).emailTemplate;
  if (!model) {
    console.warn("[EmailTemplateService] emailTemplate modeli henüz mevcut değil. Migration uygulanmamış olabilir.");
    return null;
  }
  return model;
}

export class EmailTemplateService {
  /**
   * Tüm şablonları listele, opsiyonel olarak kategoriye göre filtrele
   */
  static async list(category?: string) {
    try {
      const model = getModel();
      if (!model) return [];

      const where = category ? { category } : {};

      const templates = await model.findMany({
        where,
        orderBy: { createdAt: "desc" },
      });

      return templates;
    } catch (error) {
      console.error("E-posta şablonları listelenirken hata oluştu:", error);
      return [];
    }
  }

  /**
   * ID'ye göre tek bir şablon getir
   */
  static async getById(id: string) {
    try {
      const model = getModel();
      if (!model) return null;

      const template = await model.findUnique({
        where: { id },
      });

      return template;
    } catch (error) {
      console.error("E-posta şablonu getirilirken hata oluştu:", error);
      return null;
    }
  }

  /**
   * Belirli bir kategori için varsayılan şablonu getir
   */
  static async getDefault(category: string) {
    try {
      const model = getModel();
      if (!model) return null;

      const template = await model.findFirst({
        where: {
          category,
          isDefault: true,
        },
      });

      return template;
    } catch (error) {
      console.error("Varsayılan şablon getirilirken hata oluştu:", error);
      return null;
    }
  }

  /**
   * Yeni bir e-posta şablonu oluştur
   * Eğer isDefault true ise, aynı kategorideki diğer şablonların isDefault değerini false yap
   */
  static async create(data: {
    name: string;
    category: string;
    subject?: string;
    content: string;
    isDefault?: boolean;
  }) {
    try {
      const model = getModel();
      if (!model) throw new Error("EmailTemplate modeli henüz mevcut değil. Veritabanı migration'ını çalıştırın.");

      // Use transaction to prevent race condition with default flag
      const template = await prisma.$transaction(async (tx: any) => {
        const txModel = tx.emailTemplate;
        if (!txModel) throw new Error("EmailTemplate modeli henüz mevcut değil.");

        // Varsayılan olarak işaretleniyorsa, aynı kategorideki diğerlerini güncelle
        if (data.isDefault) {
          await txModel.updateMany({
            where: { category: data.category, isDefault: true },
            data: { isDefault: false },
          });
        }

        return txModel.create({
          data: {
            name: data.name,
            category: data.category,
            subject: data.subject,
            content: data.content,
            isDefault: data.isDefault ?? false,
          },
        });
      });

      return template;
    } catch (error) {
      console.error("E-posta şablonu oluşturulurken hata oluştu:", error);
      throw error;
    }
  }

  /**
   * Mevcut bir e-posta şablonunu güncelle
   * Eğer isDefault true ise, aynı kategorideki diğer şablonların isDefault değerini false yap
   */
  static async update(
    id: string,
    data: {
      name?: string;
      category?: string;
      subject?: string;
      content?: string;
      isDefault?: boolean;
    }
  ) {
    try {
      const model = getModel();
      if (!model) throw new Error("EmailTemplate modeli henüz mevcut değil.");

      // Varsayılan olarak işaretleniyorsa, aynı kategorideki diğerlerini güncelle
      if (data.isDefault) {
        // Güncellenecek şablonun kategorisini belirle
        const category =
          data.category ??
          (await model.findUnique({ where: { id } }))?.category;

        if (category) {
          await model.updateMany({
            where: {
              category,
              isDefault: true,
              id: { not: id },
            },
            data: { isDefault: false },
          });
        }
      }

      const template = await model.update({
        where: { id },
        data,
      });

      return template;
    } catch (error) {
      console.error("E-posta şablonu güncellenirken hata oluştu:", error);
      throw error;
    }
  }

  /**
   * Bir e-posta şablonunu sil
   */
  static async delete(id: string) {
    try {
      const model = getModel();
      if (!model) throw new Error("EmailTemplate modeli henüz mevcut değil.");

      // Aktif şablon silinemez
      const template = await model.findUnique({ where: { id } });
      if (template?.isDefault) {
        throw new Error("Aktif şablon silinemez. Önce başka bir şablonu aktif yapın.");
      }

      const deleted = await model.delete({
        where: { id },
      });

      return deleted;
    } catch (error) {
      console.error("E-posta şablonu silinirken hata oluştu:", error);
      throw error;
    }
  }

  /**
   * Belirli bir şablonu varsayılan (aktif) yap.
   * Aynı kategorideki diğer şablonların isDefault değerini false yapar.
   */
  static async setDefault(id: string) {
    try {
      const model = getModel();
      if (!model) throw new Error("EmailTemplate modeli henüz mevcut değil.");

      const template = await model.findUnique({ where: { id } });
      if (!template) throw new Error("Şablon bulunamadı.");

      // Transaction ile atomik güncelleme
      await prisma.$transaction(async (tx: any) => {
        const txModel = tx.emailTemplate;

        // Aynı kategorideki tüm şablonları pasif yap
        await txModel.updateMany({
          where: { category: template.category, isDefault: true },
          data: { isDefault: false },
        });

        // Seçilen şablonu aktif yap
        await txModel.update({
          where: { id },
          data: { isDefault: true },
        });
      });

      return await model.findUnique({ where: { id } });
    } catch (error) {
      console.error("Şablon aktif yapılırken hata oluştu:", error);
      throw error;
    }
  }

  /**
   * Bir şablonu kopyalayarak yeni şablon oluştur
   */
  static async duplicate(id: string) {
    try {
      const model = getModel();
      if (!model) throw new Error("EmailTemplate modeli henüz mevcut değil.");

      const original = await model.findUnique({ where: { id } });
      if (!original) throw new Error("Kopyalanacak şablon bulunamadı.");

      const copy = await model.create({
        data: {
          name: `${original.name} (Kopya)`,
          category: original.category,
          subject: original.subject,
          content: original.content,
          isDefault: false, // Kopya asla varsayılan olmaz
        },
      });

      return copy;
    } catch (error) {
      console.error("Şablon kopyalanırken hata oluştu:", error);
      throw error;
    }
  }

  /**
   * Şablon içeriğindeki yer tutucuları (placeholder) gerçek değerlerle değiştir
   */
  static parseTemplate(
    content: string,
    agency: {
      companyName: string;
      authorizedPerson?: string | null;
      documentNo?: string;
      sectors?: { name: string }[];
      unsubscribeToken?: string | null;
    }
  ): string {
    const baseUrl = getBaseUrl();

    const unsubscribeUrl = agency.unsubscribeToken
      ? `${baseUrl}/unsubscribe?token=${agency.unsubscribeToken}`
      : "";

    const sectorNames =
      agency.sectors?.map((s) => s.name).join(", ") || "";

    const currentDate = new Date().toLocaleDateString("tr-TR");

    let parsed = content;

    parsed = parsed.replace(/\{\{companyName\}\}/g, escapeHtml(agency.companyName));
    parsed = parsed.replace(
      /\{\{authorizedPerson\}\}/g,
      escapeHtml(agency.authorizedPerson || "Yetkili")
    );
    parsed = parsed.replace(
      /\{\{documentNo\}\}/g,
      escapeHtml(agency.documentNo || "")
    );
    parsed = parsed.replace(/\{\{sectorNames\}\}/g, escapeHtml(sectorNames));
    parsed = parsed.replace(/\{\{currentDate\}\}/g, currentDate);
    parsed = parsed.replace(/\{\{unsubscribeUrl\}\}/g, unsubscribeUrl);
    parsed = parsed.replace(/\{\{baseUrl\}\}/g, baseUrl);

    return parsed;
  }

  /**
   * Varsayılan şablonları oluştur (eğer yoklarsa)
   */
  static async seedDefaults() {
    try {
      const model = getModel();
      if (!model) {
        console.warn("[EmailTemplateService] seedDefaults atlanıyor — model henüz mevcut değil.");
        return;
      }

      // Eski seeded promotion_intro kayıtlarını temizle (sadece sistem tarafından oluşturulanları)
      await model.deleteMany({
        where: { 
          category: "promotion_intro",
          name: { in: ["Tanıtım Giriş Metni", "Promotion Intro"] } // Sadece bilinen seed isimleri
        }
      });

      // Ayrıca eski seeded offer_intro ismini güncelle (Migration)
      await model.updateMany({
        where: { category: "offer_intro", name: "Teklif Ön Yazısı" },
        data: { name: "Tanıtım Maili Ön Yazısı" }
      });

      const defaults = [
        {
          name: "Tanıtım Maili Ön Yazısı",
          category: "offer_intro",
          content:
            "Sayın {{authorizedPerson}},\n\n{{companyName}} olarak sizlere sunduğumuz hizmetleri tanıtmak istiyoruz.",
          isDefault: true,
        },
      ];

      for (const template of defaults) {
        // Bu kategoride varsayılan şablon var mı kontrol et
        const existing = await model.findFirst({
          where: {
            category: template.category,
            isDefault: true,
          },
        });

        // Yoksa oluştur
        if (!existing) {
          await model.create({
            data: template,
          });
          console.log(
            `Varsayılan şablon oluşturuldu: ${template.name}`
          );
        }
      }
    } catch (error) {
      console.error(
        "Varsayılan şablonlar oluşturulurken hata oluştu:",
        error
      );
      // seedDefaults hata verse de sayfa çökmemeli
    }
  }
}
