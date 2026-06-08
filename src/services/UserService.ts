import prisma from "@/lib/prisma";

export class UserService {
  /**
   * Get all active users in the system.
   */
  static async getActiveUsers() {
    try {
      return await prisma.user.findMany({
        where: {
          isActive: true,
        },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          isActive: true,
        },
        orderBy: {
          name: "asc",
        },
      });
    } catch (error) {
      console.warn("Database connection failed in getActiveUsers, returning empty list.");
      return [];
    }
  }

  /**
   * Get all users (including inactive ones) for administrative management.
   */
  static async getAllUsers() {
    try {
      return await prisma.user.findMany({
        select: {
          id: true,
          name: true,
          email: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
          roleId: true,
          role: true,
        },
        orderBy: {
          createdAt: "desc",
        },
      });
    } catch (error) {
      console.warn("Database connection failed in getAllUsers, returning empty list.");
      return [];
    }
  }

  /**
   * Get all active managers.
   * Dynamic check: Any user with '*' or 'offers:manage' or similar manager permissions.
   * For simplicity, we can fetch all and filter or just fetch those with manager roles.
   */
  static async getActiveManagers() {
    try {
      return await prisma.user.findMany({
        where: {
          isActive: true,
          role: {
            permissions: {
              hasSome: ["*", "offers:manage", "campaigns:manage"],
            }
          }
        },
        select: {
          id: true,
          name: true,
          email: true,
          isActive: true,
          roleId: true,
          role: true,
        },
      });
    } catch (error) {
      // Fallback to all active users if permissions filter isn't supported or fails
      return prisma.user.findMany({
        where: { isActive: true },
      });
    }
  }

  /**
   * Create a new personnel user.
   */
  static async createPersonnel(data: {
    name: string;
    email: string;
    passwordHash: string;
    roleId: string;
  }) {
    return prisma.user.create({
      data: {
        name: data.name,
        email: data.email,
        password: data.passwordHash,
        roleId: data.roleId,
        isActive: true,
      },
    });
  }

  /**
   * Update user role.
   */
  static async updateRole(userId: string, roleId: string) {
    return prisma.user.update({
      where: { id: userId },
      data: { roleId },
    });
  }

  /**
   * Delete a user permanently. Prevents deletion if the user has related records.
   */
  static async deleteUser(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        _count: {
          select: {
            assignedActivities: true,
            createdActivities: true,
            assignedConversations: true,
            createdConversations: true,
            sentMailLogs: true,
          }
        }
      }
    });

    if (!user) throw new Error("Kullanıcı bulunamadı.");

    const hasRelations = 
      user._count.assignedActivities > 0 ||
      user._count.createdActivities > 0 ||
      user._count.assignedConversations > 0 ||
      user._count.createdConversations > 0 ||
      user._count.sentMailLogs > 0;

    if (hasRelations) {
      throw new Error("Bu kullanıcının sistemde işlem geçmişi (aktivite, not, sohbet vb.) bulunduğu için silinemez. Lütfen silmek yerine pasife çekmeyi tercih edin.");
    }

    return prisma.user.delete({
      where: { id: userId },
    });
  }
}
