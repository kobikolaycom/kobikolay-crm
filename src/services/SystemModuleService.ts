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
    return prisma.systemModule.findMany({
      where: onlyActive ? { isActive: true } : {},
      orderBy: { name: "asc" }
    });
  }

  /**
   * Create a new system module.
   */
  static async create(data: CreateModuleInput) {
    return prisma.systemModule.create({
      data: {
        name: data.name,
        description: data.description,
        price: data.price,
        isActive: data.isActive ?? true
      }
    });
  }

  /**
   * Update an existing system module.
   */
  static async update(id: string, data: Partial<CreateModuleInput>) {
    return prisma.systemModule.update({
      where: { id },
      data
    });
  }

  /**
   * Delete a system module.
   */
  static async delete(id: string) {
    return prisma.systemModule.delete({
      where: { id }
    });
  }

  /**
   * Get a system module by ID.
   */
  static async getById(id: string) {
    return prisma.systemModule.findUnique({
      where: { id }
    });
  }
}
