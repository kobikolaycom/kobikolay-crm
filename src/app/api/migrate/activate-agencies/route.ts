import { NextRequest } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";

/**
 * Tek seferlik migration: Etkileşimi olan (çağrı, mail, not, görev) tüm PASSIVE acenteleri AKTİF yapar.
 * POST /api/migrate/activate-agencies (Super Admin only)
 */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return Response.json({ error: "Yetkisiz" }, { status: 401 });
  }

  // Only Super Admin can run migrations
  const role = session.user.role;
  const permissions = (session.user as any).permissions;
  if (role !== "Super Admin" && !(Array.isArray(permissions) && permissions.includes("*"))) {
    return Response.json({ error: "Bu işlem için Super Admin yetkisi gereklidir" }, { status: 403 });
  }

  try {
    // 1. Aktivitesi olan acenteler (çağrı notu, görev, hatırlatıcı, not)
    const withActivities = await prisma.activity.findMany({
      select: { agencyId: true },
      distinct: ["agencyId"],
    });

    // 2. Mail gönderilen acenteler (bireysel mail)
    const withMailLogs = await prisma.mailLog.findMany({
      where: { status: "SENT" },
      select: { agencyId: true },
      distinct: ["agencyId"],
    });

    // 3. Kampanya gönderilen acenteler
    const withCampaignLogs = await prisma.campaignLog.findMany({
      where: { status: "SENT" },
      select: { agencyId: true },
      distinct: ["agencyId"],
    });

    // 4. Mesajlaşması olan acenteler (conversation with messages, not MANUAL_NOTE)
    const withConversations = await prisma.conversation.findMany({
      where: {
        agencyId: { not: null },
        messages: { some: {} },
      },
      select: { agencyId: true },
      distinct: ["agencyId"],
    });

    // Benzersiz acente ID'lerini topla
    const activeAgencyIds = new Set<string>();
    
    withActivities.forEach(a => { if (a.agencyId) activeAgencyIds.add(a.agencyId); });
    withMailLogs.forEach(m => { if (m.agencyId) activeAgencyIds.add(m.agencyId); });
    withCampaignLogs.forEach(c => { if (c.agencyId) activeAgencyIds.add(c.agencyId); });
    withConversations.forEach(c => { if (c.agencyId) activeAgencyIds.add(c.agencyId); });

    const ids = Array.from(activeAgencyIds);

    // Sadece PASSIVE olanları güncelle (zaten ACTIVE olanları dokunma)
    const result = await prisma.agency.updateMany({
      where: {
        id: { in: ids },
        status: "PASSIVE",
      },
      data: {
        status: "ACTIVE",
      },
    });

    return Response.json({
      success: true,
      message: `${result.count} pasif acente AKTİF yapıldı.`,
      details: {
        totalInteractedAgencies: ids.length,
        activatedCount: result.count,
        breakdown: {
          withActivities: withActivities.length,
          withMailLogs: withMailLogs.length,
          withCampaignLogs: withCampaignLogs.length,
          withConversations: withConversations.length,
        },
      },
    });
  } catch (error: any) {
    console.error("[Migration] Activate agencies error:", error);
    return Response.json({ error: "Migration işlemi başarısız oldu" }, { status: 500 });
  }
}
