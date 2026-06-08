import prisma from "@/lib/prisma";

export interface CreateModuleInput {
  name: string;
  description: string;
  price: number;
  isActive?: boolean;
}

export class SystemModuleService {
  /**
   * List all system modules.
   */
  static async list(onlyActive: boolean = true) {
    try {
      return await prisma.systemModule.findMany({
        where: onlyActive ? { isActive: true } : {},
        orderBy: { name: "asc" }
      });
    } catch (error) {
      console.warn("Database connection failed in SystemModuleService.list");
      return [];
    }
  }

  /**
   * Create a new system module.
   */
  static async create(data: CreateModuleInput) {
    try {
      return await prisma.systemModule.create({
        data: {
          name: data.name,
          description: data.description,
          price: data.price,
          isActive: data.isActive ?? true
        }
      });
    } catch (error) {
      console.error("SystemModuleService.create failed:", error);
      throw error;
    }
  }

  /**
   * Update an existing system module.
   */
  static async update(id: string, data: Partial<CreateModuleInput>) {
    try {
      return await prisma.systemModule.update({
        where: { id },
        data
      });
    } catch (error) {
      console.error("SystemModuleService.update failed:", error);
      throw error;
    }
  }

  /**
   * Delete a system module.
   */
  static async delete(id: string) {
    try {
      return await prisma.systemModule.delete({
        where: { id }
      });
    } catch (error) {
      console.error("SystemModuleService.delete failed:", error);
      throw error;
    }
  }

  /**
   * Get a system module by ID.
   */
  static async getById(id: string) {
    try {
      return await prisma.systemModule.findUnique({
        where: { id }
      });
    } catch (error) {
      console.warn("Database connection failed in SystemModuleService.getById");
      return null;
    }
  }
}
