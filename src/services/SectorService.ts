import prisma from "@/lib/prisma";
import { Sector } from "@prisma/client";

/**
 * The Bridge: Sector Service (Faaliyet Alanı Servisi)
 * Centralizes all Sector-related database operations.
 */
export class SectorService {
  
  /**
   * Fetches all sectors with template, reference and agency counts.
   */
  static async list() {
    try {
      return await prisma.sector.findMany({
        orderBy: { name: "asc" },
        include: {
          templates: true,
          references: {
            orderBy: { createdAt: "asc" },
          },
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
   * Get a single sector by ID with full relations.
   */
  static async getById(id: string) {
    return prisma.sector.findUnique({
      where: { id },
      include: {
        templates: true,
        references: {
          orderBy: { createdAt: "asc" },
        },
        _count: { select: { agencies: true } },
      },
    });
  }

  /**
   * Creates a new sector (faaliyet alanı).
   */
  static async create(data: {
    name: string;
    description?: string;
    pdfUrl?: string;
    coverLetter?: string;
  }): Promise<Sector> {
    return await prisma.sector.create({
      data: {
        name: data.name,
        description: data.description,
        pdfUrl: data.pdfUrl,
        coverLetter: data.coverLetter,
      },
    });
  }

  /**
   * Updates a sector.
   */
  static async update(
    id: string,
    data: { name?: string; description?: string; pdfUrl?: string | null; coverLetter?: string | null }
  ): Promise<Sector> {
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
      throw new Error(`Bu faaliyet alanına bağlı ${sector._count.agencies} acente var. Önce acentelerin bağlantısını kaldırın.`);
    }

    // Delete linked templates, references, and sector atomically
    await prisma.$transaction([
      prisma.pitchTemplate.deleteMany({ where: { sectorId: id } }),
      prisma.sectorReference.deleteMany({ where: { sectorId: id } }),
      prisma.sector.delete({ where: { id } }),
    ]);
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

  // ─── Reference CRUD ───

  /**
   * Adds a reference to a sector.
   */
  static async addReference(sectorId: string, data: { name: string; domain: string; logoUrl?: string }) {
    return prisma.sectorReference.create({
      data: {
        sectorId,
        name: data.name,
        domain: data.domain,
        logoUrl: data.logoUrl,
      },
    });
  }

  /**
   * Updates a reference.
   */
  static async updateReference(id: string, data: { name?: string; domain?: string; logoUrl?: string | null }) {
    return prisma.sectorReference.update({
      where: { id },
      data,
    });
  }

  /**
   * Deletes a reference.
   */
  static async deleteReference(id: string) {
    return prisma.sectorReference.delete({
      where: { id },
    });
  }

  /**
   * Gets all references for a sector.
   */
  static async getReferences(sectorId: string) {
    return prisma.sectorReference.findMany({
      where: { sectorId },
      orderBy: { createdAt: "asc" },
    });
  }
}
