import { OfferHubService } from "@/services/OfferHubService";
import { PageHeader } from "@/components/layout/PageHeader";
import CommunicationHub from "./CommunicationHub";

export const dynamic = "force-dynamic";

export default async function OffersPage() {
  const entries = await OfferHubService.getHubEntries({});

  return (
    <div className="space-y-6 p-6 lg:p-8">
      <PageHeader
        title="Teklif & Tanıtım Merkezi"
        description="Tüm gönderilmiş teklifleri ve tanıtım e-postalarını tek panelden izleyin."
      />
      <CommunicationHub initialEntries={JSON.parse(JSON.stringify(entries))} />
    </div>
  );
}
