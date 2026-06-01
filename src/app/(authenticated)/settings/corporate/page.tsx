import { PageHeader } from "@/components/layout/PageHeader";
import { CorporateClient } from "./CorporateClient";
import { getLogoAction } from "./actions";

export const dynamic = "force-dynamic";

export default async function CorporatePage() {
  const logoUrl = await getLogoAction();

  return (
    <div className="space-y-6 animate-in fade-in duration-500 p-6 lg:p-8">
      <PageHeader
        title="Kurumsal Kimlik"
        description="Şirket logonuzu yükleyin. Logo, dashboard ve e-posta gösterimlerinde kullanılacaktır."
      />
      <CorporateClient logoUrl={logoUrl} />
    </div>
  );
}
