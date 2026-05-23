import prisma from "@/lib/prisma";
import { SectorCreateSchema } from "@/lib/validations";
import { Sector } from "@prisma/client";

/**
 * The Bridge: Sector Service
 * Centralizes all Sector-related database operations.
 */
export class SectorService {
  
  /**
   * Fetches all sectors with template and agency counts.
   */
  static async list() {
    try {
      return await prisma.sector.findMany({
        orderBy: { name: "asc" },
        include: {
          templates: true,
          _count: {
            select: { agencies: true },
          },
        },
      });
    } catch (error) {
      console.warn("Database connection failed in SectorService.list, returning empty array.");
      return [];
    }
  }

  /**
   * Get a single sector by ID.
   */
  static async getById(id: string) {
    return prisma.sector.findUnique({
      where: { id },
      include: {
        templates: true,
        _count: { select: { agencies: true } },
      },
    });
  }

  /**
   * Creates a new sector.
   */
  static async create(data: { name: string; description?: string; pdfUrl?: string }): Promise<Sector> {
    return await prisma.sector.create({
      data: {
        name: data.name,
        description: data.description,
        pdfUrl: data.pdfUrl,
      },
    });
  }

  /**
   * Updates a sector.
   */
  static async update(id: string, data: { name?: string; description?: string; pdfUrl?: string }): Promise<Sector> {
    return await prisma.sector.update({
      where: { id },
      data,
    });
  }

  /**
   * Deletes a sector. Will fail if agencies are still linked.
   */
  static async delete(id: string): Promise<void> {
    // Check if any agencies are linked
    const sector = await prisma.sector.findUnique({
      where: { id },
      include: { _count: { select: { agencies: true } } },
    });

    if (sector && sector._count.agencies > 0) {
      throw new Error(`Bu sektöre bağlı ${sector._count.agencies} acente var. Önce acentelerin sektör bağlantısını kaldırın.`);
    }

    // Delete linked templates first
    await prisma.pitchTemplate.deleteMany({ where: { sectorId: id } });
    await prisma.sector.delete({ where: { id } });
  }

  /**
   * Links an agency to a sector (Many-to-Many).
   */
  static async linkAgency(agencyId: string, sectorId: string): Promise<void> {
    await prisma.agency.update({
      where: { id: agencyId },
      data: {
        sectors: {
          connect: { id: sectorId },
        },
      },
    });
  }

  /**
   * Unlinks an agency from a sector.
   */
  static async unlinkAgency(agencyId: string, sectorId: string): Promise<void> {
    await prisma.agency.update({
      where: { id: agencyId },
      data: {
        sectors: {
          disconnect: { id: sectorId },
        },
      },
    });
  }
}
