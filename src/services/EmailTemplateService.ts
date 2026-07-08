import prisma from "@/lib/prisma";
import { escapeHtml, getBaseUrl } from "@/lib/utils";

// E-posta şablonları servisi
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
   * Tüm şablonları listele, opsiyonel olarak kategoriye (offer_intro vb.) ve businessCategoryId'ye göre filtrele
   */
  static async list(category?: string, categoryId?: string) {
    try {
      const model = getModel();
      if (!model) return [];

      const where: any = {};
      if (category) where.category = category;
      if (categoryId) where.categoryId = categoryId;
      else if (categoryId === null) where.categoryId = null;

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
   * Belirli bir kategori ve businessCategory için varsayılan şablonu getir
   */
  static async getDefault(category: string, categoryId?: string) {
    try {
      const model = getModel();
      if (!model) return null;

      const template = await model.findFirst({
        where: {
          category,
          categoryId: categoryId || null,
          isDefault: true,
        },
      });

      // Eğer businessCategory'e özel şablon yoksa, genel (categoryId null) varsayılanı getir
      if (!template && categoryId) {
        return await model.findFirst({
          where: {
            category,
            categoryId: null,
            isDefault: true,
          }
        });
      }

      return template;
    } catch (error) {
      console.error("Varsayılan şablon getirilirken hata oluştu:", error);
      return null;
    }
  }

  /**
   * Yeni bir e-posta şablonu oluştur
   */
  static async create(data: {
    name: string;
    category: string;
    categoryId?: string;
    subject?: string;
    content: string;
    isDefault?: boolean;
  }) {
    try {
      const model = getModel();
      if (!model) throw new Error("EmailTemplate modeli henüz mevcut değil.");

      const template = await prisma.$transaction(async (tx: any) => {
        const txModel = tx.emailTemplate;
        if (!txModel) throw new Error("EmailTemplate modeli henüz mevcut değil.");

        // Varsayılan olarak işaretleniyorsa, aynı kategorideki diğerlerini güncelle
        if (data.isDefault) {
          await txModel.updateMany({
            where: { 
              category: data.category, 
              categoryId: data.categoryId || null,
              isDefault: true 
            },
            data: { isDefault: false },
          });
        }

        return txModel.create({
          data: {
            name: data.name,
            category: data.category,
            categoryId: data.categoryId || null,
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
   */
  static async update(
    id: string,
    data: {
      name?: string;
      category?: string;
      categoryId?: string;
      subject?: string;
      content?: string;
      isDefault?: boolean;
    }
  ) {
    try {
      const model = getModel();
      if (!model) throw new Error("EmailTemplate modeli henüz mevcut değil.");

      if (data.isDefault) {
        const existing = await model.findUnique({ where: { id } });
        const category = data.category ?? existing?.category;
        const categoryId = data.categoryId !== undefined ? data.categoryId : existing?.categoryId;

        if (category) {
          await model.updateMany({
            where: {
              category,
              categoryId: categoryId || null,
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

      const template = await model.findUnique({ where: { id } });
      if (!template) throw new Error("Şablon bulunamadı.");

      if (template.isDefault) {
        const nextDefault = await model.findFirst({
          where: {
            category: template.category,
            categoryId: template.categoryId,
            id: { not: id },
          },
          orderBy: { createdAt: "desc" },
        });

        if (nextDefault) {
          await model.update({
            where: { id: nextDefault.id },
            data: { isDefault: true },
          });
        }
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
   */
  static async setDefault(id: string) {
    try {
      const model = getModel();
      if (!model) throw new Error("EmailTemplate modeli henüz mevcut değil.");

      const template = await model.findUnique({ where: { id } });
      if (!template) throw new Error("Şablon bulunamadı.");

      await prisma.$transaction(async (tx: any) => {
        const txModel = tx.emailTemplate;

        await txModel.updateMany({
          where: { 
            category: template.category, 
            categoryId: template.categoryId,
            isDefault: true 
          },
          data: { isDefault: false },
        });

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
          categoryId: original.categoryId,
          subject: original.subject,
          content: original.content,
          isDefault: false,
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
      unsubscribeToken?: string | null;
    }
  ): string {
    const baseUrl = getBaseUrl();

    const unsubscribeUrl = agency.unsubscribeToken
      ? `${baseUrl}/unsubscribe?token=${agency.unsubscribeToken}`
      : "";

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
    parsed = parsed.replace(/\{\{currentDate\}\}/g, currentDate);
    parsed = parsed.replace(/\{\{unsubscribeUrl\}\}/g, unsubscribeUrl);
    parsed = parsed.replace(/\{\{baseUrl\}\}/g, baseUrl);

    return parsed;
  }

  /**
   * Varsayılan şablonları oluştur (eğer yoklarsa)
   */
  static async seedDefaults() { return; }
}
