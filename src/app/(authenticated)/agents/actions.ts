"use server";

import { PitchService } from "@/services/PitchService";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function dispatchBulkPitchChunkAction(
  agencyIds: string[],
  sectorId: string,
  coverLetter: string,
  chunkIndex: number,
  chunkSize: number
) {
  const start = chunkIndex * chunkSize;
  const chunk = agencyIds.slice(start, start + chunkSize);

  if (chunk.length === 0) return { done: true, sent: 0 };

  const results = [];
  for (const agencyId of chunk) {
    const result = await PitchService.sendPitch(agencyId, coverLetter, []);
    results.push(result);
  }

  revalidatePath("/agents");

  return { done: start + chunkSize >= agencyIds.length, sent: chunk.length, results };
}

export async function deleteAgencyAction(id: string) {
  const session = await auth();
  if (!session?.user) throw new Error("Yetkisiz erişim");

  // Safety checks - prevent deletion if agency has related data
  const agency = await prisma.agency.findUnique({
    where: { id },
    include: {
      _count: {
        select: {
          conversations: true,
          activities: true,
          mailLogs: true,
          campaignLogs: true,
          offers: true,
        },
      },
    },
  });

  if (!agency) throw new Error("Acente bulunamadı");

  const blocks: string[] = [];
  if (agency._count.conversations > 0) blocks.push(`${agency._count.conversations} yazışma`);
  if (agency._count.activities > 0) blocks.push(`${agency._count.activities} aktivite`);
  if (agency._count.mailLogs > 0) blocks.push(`${agency._count.mailLogs} mail kaydı`);
  if (agency._count.campaignLogs > 0) blocks.push(`${agency._count.campaignLogs} kampanya kaydı`);
  if (agency._count.offers > 0) blocks.push(`${agency._count.offers} teklif`);

  if (blocks.length > 0) {
    throw new Error(
      `Bu acente silinemez. Bağlı kayıtlar: ${blocks.join(", ")}. Önce bu kayıtları kaldırın.`
    );
  }

  // Safe to delete - remove contacts and tax info first
  await prisma.contact.deleteMany({ where: { agencyId: id } });
  await prisma.taxInfo.deleteMany({ where: { agencyId: id } });
  await prisma.agency.delete({ where: { id } });

  revalidatePath("/agents");
  return { success: true };
}

export async function createAgencyAction(data: {
  companyName: string;
  documentNo: string;
  phone?: string;
  email?: string;
  address?: string;
  province?: string;
  district?: string;
  authorizedPerson?: string;
  website?: string;
  sectorId?: string;
}) {
  const session = await auth();
  if (!session?.user) throw new Error("Yetkisiz erişim");

  // Duplicate TURSAB number check
  if (data.documentNo) {
    const existing = await prisma.agency.findFirst({
      where: { documentNo: data.documentNo },
      select: { id: true, companyName: true },
    });
    if (existing) {
      throw new Error(
        `Bu TÜRSAB numarası zaten kayıtlı: "${existing.companyName}" (${data.documentNo})`
      );
    }
  }

  const agency = await prisma.agency.create({
    data: {
      companyName: data.companyName,
      documentNo: data.documentNo || `MANUAL-${Date.now()}`,
      authorizedPerson: data.authorizedPerson || null,
      website: data.website || null,
      status: "ACTIVE",
      ...(data.sectorId ? { sectors: { connect: { id: data.sectorId } } } : {}),
    },
  });

  // Create contact if any contact info provided
  if (data.phone || data.email || data.address) {
    await prisma.contact.create({
      data: {
        agencyId: agency.id,
        phone: data.phone || null,
        email: data.email || null,
        address: data.address || null,
        province: data.province || null,
        district: data.district || null,
      },
    });
  }

  revalidatePath("/agents");
  return { success: true, id: agency.id };
}

export async function resetBatchImportedAgenciesAction() {
  const session = await auth();
  if (!session?.user) throw new Error("Yetkisiz erişim");

  // Fetch all passive agencies with their relation counts
  const passiveAgencies = await prisma.agency.findMany({
    where: { status: "PASSIVE" },
    include: {
      _count: {
        select: {
          conversations: true,
          activities: true,
          mailLogs: true,
          campaignLogs: true,
          offers: true,
        },
      },
    },
  });

  // Filter out those with zero relation counts (so they are fresh/untouched)
  const targets = passiveAgencies.filter(
    (a) =>
      a._count.conversations === 0 &&
      a._count.activities === 0 &&
      a._count.mailLogs === 0 &&
      a._count.campaignLogs === 0 &&
      a._count.offers === 0
  );

  const targetIds = targets.map((t) => t.id);

  if (targetIds.length > 0) {
    // Delete contacts first
    await prisma.contact.deleteMany({
      where: { agencyId: { in: targetIds } },
    });
    // Delete taxInfo
    await prisma.taxInfo.deleteMany({
      where: { agencyId: { in: targetIds } },
    });
    // Delete agencies
    const deleteResult = await prisma.agency.deleteMany({
      where: { id: { in: targetIds } },
    });

    revalidatePath("/agents");
    return { success: true, count: deleteResult.count };
  }

  return { success: true, count: 0 };
}
