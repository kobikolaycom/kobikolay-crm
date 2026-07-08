import prisma from "@/lib/prisma";

export class BusinessCategoryService {
  static async list() {
    try {
      const categories = await prisma.businessCategory.findMany({
        orderBy: { sortOrder: "asc" },
        include: {
          _count: {
            select: { agencies: true, emailTemplates: true },
          },
        },
      });
      return categories;
    } catch (error) {
      console.error("Kategoriler listelenirken hata oluştu:", error);
      throw error;
    }
  }

  static async getById(id: string) {
    try {
      return await prisma.businessCategory.findUnique({
        where: { id },
      });
    } catch (error) {
      console.error("Kategori getirilirken hata oluştu:", error);
      throw error;
    }
  }

  static async getBySlug(slug: string) {
    try {
      return await prisma.businessCategory.findUnique({
        where: { slug },
      });
    } catch (error) {
      console.error("Kategori getirilirken hata oluştu:", error);
      throw error;
    }
  }

  static async create(data: {
    name: string;
    slug: string;
    description?: string;
    icon?: string;
    color?: string;
    sortOrder?: number;
  }) {
    try {
      return await prisma.businessCategory.create({
        data,
      });
    } catch (error) {
      console.error("Kategori oluşturulurken hata oluştu:", error);
      throw error;
    }
  }

  static async update(id: string, data: any) {
    try {
      return await prisma.businessCategory.update({
        where: { id },
        data,
      });
    } catch (error) {
      console.error("Kategori güncellenirken hata oluştu:", error);
      throw error;
    }
  }

  static async delete(id: string) {
    try {
      const category = await prisma.businessCategory.findUnique({
        where: { id },
        include: { _count: { select: { agencies: true } } },
      });

      if (!category) {
        throw new Error("Kategori bulunamadı");
      }

      if (category._count.agencies > 0) {
        throw new Error("Bu kategoriye ait işletmeler var, silinemez. Önce işletmeleri başka bir kategoriye taşıyın.");
      }

      return await prisma.businessCategory.delete({
        where: { id },
      });
    } catch (error) {
      console.error("Kategori silinirken hata oluştu:", error);
      throw error;
    }
  }
}
