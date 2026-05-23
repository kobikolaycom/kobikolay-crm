"use server";

import { auth } from "@/auth";
import { CampaignService } from "@/services/CampaignService";
import { SectorService } from "@/services/SectorService";
import prisma from "@/lib/prisma";
import { CampaignStatus } from "@prisma/client";
import { revalidatePath } from "next/cache";

export async function getSectorsAction() {
  const session = await auth();
  if (!session?.user) throw new Error("Yetkisiz");
  return SectorService.list();
}

export async function getTargetCountAction(filter: {
  sectorId?: string;
  status?: string;
}) {
  const session = await auth();
  if (!session?.user) throw new Error("Yetkisiz");
  const targets = await CampaignService.getTargetAgencies(filter as any);
  return targets.length;
}

export async function getTargetAgenciesPreviewAction(filter: {
  sectorId?: string;
  status?: string;
}) {
  const session = await auth();
  if (!session?.user) throw new Error("Yetkisiz");
  const targets = await CampaignService.getTargetAgencies(filter as any);
  return targets.slice(0, 20).map(t => ({
    id: t.id,
    companyName: t.companyName,
    email: t.contacts[0]?.email || "—",
  }));
}

export async function createAndDispatchCampaignAction(data: {
  name: string;
  subject: string;
  content: string;
  sectorId?: string;
  agencyStatus?: string;
}) {
  const session = await auth();
  if (!session?.user) throw new Error("Yetkisiz");

  if (!data.name || !data.subject || !data.content) {
    throw new Error("Kampanya adı, konu ve içerik zorunludur");
  }

  // 1. Create campaign record
  const campaign = await prisma.campaign.create({
    data: {
      name: data.name,
      subject: data.subject,
      content: data.content,
      status: CampaignStatus.DRAFT,
    },
  });

  // 2. Build filter
  const filter: any = {};
  if (data.sectorId && data.sectorId !== "all") filter.sectorId = data.sectorId;
  if (data.agencyStatus && data.agencyStatus !== "all") filter.status = data.agencyStatus;

  // 3. Dispatch
  try {
    const result = await CampaignService.dispatchCampaign(campaign.id, filter);
    revalidatePath("/tanitim");
    return { success: true, campaignId: campaign.id, count: result.count };
  } catch (error: any) {
    // Mark as failed
    await prisma.campaign.update({
      where: { id: campaign.id },
      data: { status: CampaignStatus.CANCELLED },
    });
    throw new Error(`Gönderim hatası: ${error.message}`);
  }
}

export async function deleteCampaignAction(id: string) {
  const session = await auth();
  if (!session?.user) throw new Error("Yetkisiz");

  await prisma.campaignLog.deleteMany({ where: { campaignId: id } });
  await prisma.campaign.delete({ where: { id } });
  revalidatePath("/tanitim");
  return { success: true };
}
