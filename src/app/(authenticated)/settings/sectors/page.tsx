import { SectorService } from "@/services/SectorService";
import { SectorsClient } from "./SectorsClient";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Faaliyet Alanları | KobiKolay CRM",
  description: "Faaliyet alanlarını, PDF broşürlerini ve referansları yönetin.",
};

export default async function SectorsPage() {
  const sectors = await SectorService.list();

  return (
    <div className="space-y-6 p-6 lg:p-8">
      <SectorsClient sectors={JSON.parse(JSON.stringify(sectors))} />
    </div>
  );
}
