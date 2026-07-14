"use server";

import { PitchService } from "@/services/PitchService";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function dispatchBulkPitchChunkAction(
  agencyIds: string[],
  coverLetter: string,
  chunkIndex: number,
  chunkSize: number,
  templateId?: string
) {
  const session = await auth();
  if (!session?.user) throw new Error("Yetkisiz erişim");
  const userId = session.user.id;

  const start = chunkIndex * chunkSize;
  const chunk = agencyIds.slice(start, start + chunkSize);

  if (chunk.length === 0) return { done: true, sent: 0 };

  // ── Daily Send Limit Check ──
  const DAILY_LIMIT = 800;
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todaySentCount = await prisma.mailLog.count({
    where: {
      sentAt: { gte: todayStart },
      status: "SENT",
    },
  });
  if (todaySentCount >= DAILY_LIMIT) {
    throw new Error(
      `Günlük mail gönderim limitine (${DAILY_LIMIT}) ulaşıldı. Spam riski nedeniyle daha fazla mail gönderilemez. Yarın tekrar deneyebilirsiniz.`
    );
  }

  const results = [];
  for (const agencyId of chunk) {
    // ── Deduplication: Skip if a mail was sent to this agency in the last 1 hour ──
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const recentMail = await prisma.mailLog.findFirst({
      where: {
        agencyId,
        sentAt: { gte: oneHourAgo },
        status: "SENT",
      },
    });
    if (recentMail) {
      console.warn(`[BulkSend] Skipping agency ${agencyId} — mail already sent within 1 hour`);
      results.push({ success: false, error: "Duplicate skipped (1-hour cooldown)" });
      continue;
    }

    // PitchService handles everything: greeting, intro, sector blocks, PDFs, sending
    const result = await PitchService.sendPitch(agencyId, coverLetter, userId, templateId);
    results.push(result);
    // Wait 1 second to reduce spam risk
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  revalidatePath("/agents");

  return { done: start + chunkSize >= agencyIds.length, sent: chunk.length, results };
}

export async function deleteAgencyAction(id: string) {
  const session = await auth();
  if (!session?.user) throw new Error("Yetkisiz erişim");

  // Only Super Admin is authorized to delete agencies
  if (session.user.role !== "Super Admin") {
    throw new Error("Acenteleri silme yetkiniz bulunmamaktadır. Sadece Yöneticiler acente silebilir.");
  }

  // Fetch test mode setting from system settings
  const testModeSetting = await prisma.systemSetting.findUnique({
    where: { category_key: { category: "system", key: "testMode" } },
  });
  const isTestMode = testModeSetting?.value === "true";

  if (!isTestMode) {
    // In live mode (testMode is false), prevent deletion if the agency has related records
    const agencyWithCounts = await prisma.agency.findUnique({
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

    if (!agencyWithCounts) throw new Error("Acente bulunamadı");

    const blocks: string[] = [];
    if (agencyWithCounts._count.conversations > 0) blocks.push(`${agencyWithCounts._count.conversations} yazışma`);
    if (agencyWithCounts._count.activities > 0) blocks.push(`${agencyWithCounts._count.activities} aktivite`);
    if (agencyWithCounts._count.mailLogs > 0) blocks.push(`${agencyWithCounts._count.mailLogs} mail kaydı`);
    if (agencyWithCounts._count.campaignLogs > 0) blocks.push(`${agencyWithCounts._count.campaignLogs} kampanya kaydı`);
    if (agencyWithCounts._count.offers > 0) blocks.push(`${agencyWithCounts._count.offers} teklif`);

    if (blocks.length > 0) {
      throw new Error(
        `Bu acente canlı modda silinemez. Bağlı geçmiş kayıtlar var: ${blocks.join(", ")}. Sistem Ayarları > API & Entegrasyonlar sayfasından Test Modunu açarak silebilirsiniz.`
      );
    }
  }

  // Safe to delete or in Test Mode (Cascade Delete)
  // 1. Delete conversation messages first (associated with the agency's conversations)
  await prisma.conversationMessage.deleteMany({
    where: {
      conversation: {
        agencyId: id,
      },
    },
  });

  // 2. Delete conversations
  await prisma.conversation.deleteMany({
    where: { agencyId: id },
  });

  // 3. Delete activities
  await prisma.activity.deleteMany({
    where: { agencyId: id },
  });

  // 4. Delete mail logs
  await prisma.mailLog.deleteMany({
    where: { agencyId: id },
  });

  // 5. Delete campaign logs
  await prisma.campaignLog.deleteMany({
    where: { agencyId: id },
  });

  // 6. Delete offers
  await prisma.offer.deleteMany({
    where: { agencyId: id },
  });

  // 7. Delete contacts
  await prisma.contact.deleteMany({ where: { agencyId: id } });

  // 8. Delete tax info
  await prisma.taxInfo.deleteMany({ where: { agencyId: id } });

  // 9. Finally delete the agency itself
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
  btkZone?: string;
  categoryId?: string;
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
      btkZone: data.btkZone || null,
      status: "ACTIVE",
      categoryId: data.categoryId || null,
    },
  });

  // Create contact if any contact info provided
  if (data.phone || data.email || data.address || data.province || data.district) {
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

export async function updateAgencyAction(
  id: string,
  data: {
    companyName: string;
    documentNo: string;
    phone?: string;
    email?: string;
    address?: string;
    province?: string;
    district?: string;
    authorizedPerson?: string;
    website?: string;
    btkZone?: string;
    categoryId?: string;
  }
) {
  const session = await auth();
  if (!session?.user) throw new Error("Yetkisiz erişim");

  // Duplicate TURSAB number check (excluding the current agency)
  if (data.documentNo) {
    const existing = await prisma.agency.findFirst({
      where: { 
        documentNo: data.documentNo,
        id: { not: id }
      },
      select: { id: true, companyName: true },
    });
    if (existing) {
      throw new Error(
        `Bu TÜRSAB numarası zaten kayıtlı: "${existing.companyName}" (${data.documentNo})`
      );
    }
  }

  // Update agency
  await prisma.agency.update({
    where: { id },
    data: {
      companyName: data.companyName,
      documentNo: data.documentNo,
      authorizedPerson: data.authorizedPerson || null,
      website: data.website || null,
      btkZone: data.btkZone || null,
      categoryId: data.categoryId || null,
    },
  });

  // Update or create contact details
  const existingContact = await prisma.contact.findFirst({
    where: { agencyId: id },
  });

  if (existingContact) {
    await prisma.contact.update({
      where: { id: existingContact.id },
      data: {
        phone: data.phone || null,
        email: data.email || null,
        address: data.address || null,
        province: data.province || null,
        district: data.district || null,
      },
    });
  } else if (data.phone || data.email || data.address || data.province || data.district) {
    await prisma.contact.create({
      data: {
        agencyId: id,
        phone: data.phone || null,
        email: data.email || null,
        address: data.address || null,
        province: data.province || null,
        district: data.district || null,
      },
    });
  }

  revalidatePath("/agents");
  return { success: true };
}



export async function bulkDeleteAgenciesAction(ids: string[]) {
  if (!ids || ids.length === 0) return;

  let successCount = 0;
  let lastError = null;

  for (const id of ids) {
    try {
      await deleteAgencyAction(id);
      successCount++;
    } catch (err: any) {
      lastError = err.message;
    }
  }

  revalidatePath("/agents");

  if (lastError && successCount === 0) {
    throw new Error(lastError);
  } else if (lastError && successCount > 0) {
    throw new Error(`${successCount} işletme silindi ancak diğerleri silinemedi: ${lastError}`);
  }
}
