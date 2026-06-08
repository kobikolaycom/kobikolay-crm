import prisma from "@/lib/prisma";

export const PERMISSIONS_LIST = [
  { key: "agents:view", label: "Acenteleri Görüntüleyebilir", group: "Acente" },
  { key: "agents:edit", label: "Acenteleri Düzenleyebilir", group: "Acente" },
  { key: "agents:export", label: "Acenteleri Excel'e Aktarabilir", group: "Acente" },
  { key: "offers:create", label: "Teklif Oluşturabilir", group: "Teklif" },
  { key: "offers:manage", label: "Tüm Teklifleri Yönetebilir", group: "Teklif" },
  { key: "campaigns:manage", label: "Kampanyaları Yönetebilir", group: "Pazarlama" },
  { key: "users:manage", label: "Personel ve Rol Yönetimi", group: "Sistem" },
  { key: "*", label: "Tam Yetki (Super Admin)", group: "Sistem" },
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
