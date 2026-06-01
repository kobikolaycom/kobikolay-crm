import prisma from "@/lib/prisma";
import { PageHeader } from "@/components/layout/PageHeader";
import { TanitimClient } from "./TanitimClient";
import { EmailTemplateService } from "@/services/EmailTemplateService";
import { AgencyService } from "@/services/AgencyService";
import { SectorService } from "@/services/SectorService";

export const dynamic = "force-dynamic";

export default async function TanitimPage() {
  let campaigns: any[] = [];
  let templates: any[] = [];
  let provinces: string[] = [];
  let sectors: any[] = [];

  try {
    campaigns = await prisma.campaign.findMany({
      orderBy: { createdAt: "desc" },
      take: 50,
      include: {
        _count: { select: { logs: true } },
        logs: {
          where: { status: "SENT" },
          select: { id: true },
        },
      },
    });
  } catch (error) {
    console.error("Database connection failed in TanitimPage (campaigns):", error);
  }

  try {
    templates = await EmailTemplateService.list();
    if (templates.length === 0) {
      await EmailTemplateService.seedDefaults();
      templates = await EmailTemplateService.list();
    }
  } catch (error) {
    console.error("Failed to load templates:", error);
  }

  try {
    provinces = await AgencyService.getDistinctProvinces();
  } catch (error) {
    console.error("Failed to load provinces:", error);
  }

  try {
    sectors = await SectorService.list();
  } catch (error) {
    console.error("Failed to load sectors:", error);
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500 p-6 lg:p-8">
      <TanitimClient
        campaigns={JSON.parse(JSON.stringify(campaigns))}
        templates={JSON.parse(JSON.stringify(templates))}
        provinces={provinces}
        sectors={JSON.parse(JSON.stringify(sectors.map((s: any) => ({ id: s.id, name: s.name }))))}
      />
    </div>
  );
}
