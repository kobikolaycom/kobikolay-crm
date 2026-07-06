import { AgencyService } from "@/services/AgencyService";
import { SectorService } from "@/services/SectorService";
import { UserService } from "@/services/UserService";
import { PageHeader } from "@/components/layout/PageHeader";
import { AgentsTableClient } from "./AgentsTableClient";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function AgentsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const page = Number(params.page) || 1;
  const pageSize = 50;
  const search = (params.search as string) || "";
  const sector = (params.sector as string) || "all";
  const pitchStatus = (params.pitchStatus as string) || "all";
  const campaignFilter = (params.campaignFilter as string) || "all";
  const dateFrom = (params.dateFrom as string) || "";
  const dateTo = (params.dateTo as string) || "";
  const mailInteraction = (params.mailInteraction as string) || "all";
  const representativeId = (params.representativeId as string) || "";
  const callStatusFilter = (params.callStatusFilter as string) || "all";
  const btkZone = (params.btkZone as string) || "all";
  const province = (params.province as string) || "all";
  const district = (params.district as string) || "all";
  const sortBy = (params.sortBy as string) || "";
  const sortOrder = (params.sortOrder as string) || "";

  const { data: agencies, total } = await AgencyService.list({
    skip: (page - 1) * pageSize,
    take: pageSize,
    search,
    sector,
    pitchStatus,
    campaignFilter,
    dateFrom: dateFrom || undefined,
    dateTo: dateTo || undefined,
    mailInteraction: mailInteraction !== "all" ? mailInteraction : undefined,
    representativeId: representativeId || undefined,
    callStatusFilter: callStatusFilter !== "all" ? callStatusFilter : undefined,
    btkZone: btkZone !== "all" ? btkZone : undefined,
    province: province !== "all" ? province : undefined,
    district: district !== "all" ? district : undefined,
    sortBy: sortBy || undefined,
    sortOrder: (sortOrder as "asc" | "desc") || undefined,
  });

  const [sectors, users, btkZones, provinces] = await Promise.all([
    SectorService.list(),
    UserService.getActiveUsers(),
    AgencyService.getDistinctBtkZones(),
    AgencyService.getDistinctProvinces(),
  ]);

  return (
    <div className="space-y-6 p-6 lg:p-8">
      <PageHeader
        title="Acenteler"
        description="Tüm acente kayıtlarını görüntüleyin ve yönetin."
      />
      <AgentsTableClient
        agencies={JSON.parse(JSON.stringify(agencies))}
        sectors={JSON.parse(JSON.stringify(sectors))}
        users={JSON.parse(JSON.stringify(users))}
        btkZones={btkZones}
        provinces={provinces}
        total={total}
        currentPage={page}
        pageSize={pageSize}
        initialCampaignFilter={campaignFilter}
        initialDateFrom={dateFrom}
        initialDateTo={dateTo}
        initialMailInteraction={mailInteraction}
        initialRepresentativeId={representativeId}
        initialCallStatusFilter={callStatusFilter}
        initialBtkZone={btkZone}
        initialProvince={province}
        initialDistrict={district}
        initialSortBy={sortBy}
        initialSortOrder={sortOrder}
        initialSector={sector}
      />
    </div>
  );
}
