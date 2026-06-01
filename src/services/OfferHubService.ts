import prisma from "@/lib/prisma";
import { CommunicationType, OfferStatus } from "@prisma/client";

export interface HubFilter {
  isMassOperation?: boolean;
  type?: CommunicationType;
  sectorId?: string;
  search?: string;
}

export class OfferHubService {
  /**
   * Fetches communications for the hub with high performance.
   */
  static async getHubEntries(filter: HubFilter) {
    try {
      const where: any = {};
      
      if (filter.isMassOperation !== undefined) {
        where.isMassOperation = filter.isMassOperation;
      }
      
      if (filter.type) {
        where.type = filter.type;
      }

      if (filter.search) {
        where.OR = [
          { subject: { contains: filter.search, mode: 'insensitive' } },
          { agency: { companyName: { contains: filter.search, mode: 'insensitive' } } }
        ];
      }

      return await prisma.offer.findMany({
        where,
        include: {
          agency: {
            select: {
              id: true,
              companyName: true,
            }
          }
        },
        orderBy: { createdAt: "desc" },
        take: 100, // Safety limit
      });
    } catch (error) {
      console.warn("Database connection failed in OfferHubService.getHubEntries");
      return [];
    }
  }

  /**
   * Hybrid Query: Fetches all communications relevant to a specific agency.
   * Includes both VIP offers and Mass operations where the agency was a target.
   */
  static async getAgencyCommunications(agencyId: string) {
    try {
      return await prisma.offer.findMany({
        where: {
          OR: [
            { agencyId: agencyId }, // VIP Offer
            { agencyIds: { has: agencyId } } // Mass Operation
          ]
        },
        orderBy: { createdAt: "desc" }
      });
    } catch (error) {
      console.warn("Database connection failed in OfferHubService.getAgencyCommunications");
      return [];
    }
  }

  /**
   * Records a mass operation as a single "Smart Pointer" entry.
   */
  static async logMassOperation(data: {
    subject: string;
    content: string;
    agencyIds: string[];
    type: CommunicationType;
    metadata?: any;
  }) {
    return prisma.offer.create({
      data: {
        isMassOperation: true,
        agencyIds: data.agencyIds,
        type: data.type,
        subject: data.subject,
        content: data.content,
        metadata: data.metadata || {},
        status: OfferStatus.SENT,
      }
    });
  }
}
