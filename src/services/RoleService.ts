import prisma from "@/lib/prisma";

export const PERMISSIONS_LIST = [
  { key: "agents:view", label: "Acenteleri Görüntüleyebilir", group: "Acente", description: "Acente listesini ve detaylarını görüntüleme yetkisi" },
  { key: "agents:edit", label: "Acenteleri Düzenleyebilir", group: "Acente", description: "Acente bilgilerini ekleme, düzenleme ve silme yetkisi" },
  { key: "agents:export", label: "Acenteleri Excel'e Aktarabilir", group: "Acente", description: "Acente verilerini Excel dosyasına dışa aktarma yetkisi" },
  { key: "offers:create", label: "Teklif Oluşturabilir", group: "Teklif", description: "Yeni teklif oluşturma yetkisi" },
  { key: "offers:manage", label: "Tüm Teklifleri Yönetebilir", group: "Teklif", description: "Tüm teklifleri görüntüleme, düzenleme ve silme yetkisi" },
  { key: "campaigns:manage", label: "Kampanyaları Yönetebilir", group: "Pazarlama", description: "Kampanya oluşturma, düzenleme ve gönderme yetkisi" },
  { key: "users:manage", label: "Personel ve Rol Yönetimi", group: "Sistem", description: "Kullanıcı hesaplarını ve rolleri yönetme yetkisi" },
  { key: "*", label: "Tam Yetki (Super Admin)", group: "Sistem", description: "Sistemdeki tüm modül ve işlemlere tam erişim" },
];

export class RoleService {
  static async getAllRoles() {
    try {
      return await prisma.role.findMany({
        include: {
          _count: {
            select: { users: true }
          }
        },
        orderBy: { name: "asc" }
      });
    } catch (error) {
      console.warn("Database connection failed in getAllRoles, returning empty list.");
      return [];
    }
  }

  static async getRoleById(id: string) {
    return prisma.role.findUnique({
      where: { id }
    });
  }

  static async createRole(data: { name: string; description?: string; permissions: string[] }) {
    return prisma.role.create({
      data
    });
  }

  static async updateRole(id: string, data: { name?: string; description?: string; permissions?: string[] }) {
    return prisma.role.update({
      where: { id },
      data
    });
  }

  static async deleteRole(id: string) {
    // Atanmış kullanıcıları kontrol et
    const usersWithRole = await prisma.user.count({ where: { roleId: id } });
    if (usersWithRole > 0) {
      throw new Error(`Bu role ${usersWithRole} kullanıcı atanmış durumda. Silmeden önce kullanıcıların rolünü değiştirin.`);
    }
    return prisma.role.delete({
      where: { id }
    });
  }
}
