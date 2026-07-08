import { AgencyService } from "@/services/AgencyService";
import { BusinessCategoryService } from "@/services/BusinessCategoryService";
import { UserService } from "@/services/UserService";
import { PageHeader } from "@/components/layout/PageHeader";
import { AgentsTableClient } from "./AgentsTableClient";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function AgentsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const getParam = (p: string | string[] | undefined) => Array.isArray(p) ? p[0] : p;
  const page = Number(getParam(params.page)) || 1;
  const pageSize = 50;
  const search = getParam(params.search) || "";
  const categoryId = getParam(params.categoryId) || "all";
  const pitchStatus = getParam(params.pitchStatus) || "all";
  const campaignFilter = getParam(params.campaignFilter) || "all";
  const dateFrom = getParam(params.dateFrom) || "";
  const dateTo = getParam(params.dateTo) || "";
  const mailInteraction = getParam(params.mailInteraction) || "all";
  const representativeId = getParam(params.representativeId) || "";
  const callStatusFilter = getParam(params.callStatusFilter) || "all";
  const btkZone = getParam(params.btkZone) || "all";
  const province = getParam(params.province) || "all";
  const district = getParam(params.district) || "all";
  const sortBy = getParam(params.sortBy) || "";
  const sortOrder = getParam(params.sortOrder) || "";

  const { data: agencies, total } = await AgencyService.list({
    skip: (page - 1) * pageSize,
    take: pageSize,
    search,
    categoryId,
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

  const [categories, users, btkZones, provinces, templates] = await Promise.all([
    BusinessCategoryService.list(),
    UserService.getActiveUsers(),
    AgencyService.getDistinctBtkZones(),
    AgencyService.getDistinctProvinces(),
    import("@/services/EmailTemplateService").then(m => m.EmailTemplateService.list())
  ]);

  return (
    <div className="space-y-6 p-6 lg:p-8">
      <PageHeader
        title="Acenteler"
        description="Tüm acente kayıtlarını görüntüleyin ve yönetin."
      />
      <AgentsTableClient
        agencies={JSON.parse(JSON.stringify(agencies))}
        categories={JSON.parse(JSON.stringify(categories))}
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
        initialCategoryId={categoryId}
        templates={JSON.parse(JSON.stringify(templates))}
      />
    </div>
  );
}
