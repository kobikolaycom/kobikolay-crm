import { SectorService } from "@/services/SectorService";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Briefcase, FileText, Globe } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function SectorsPage() {
  const sectors = await SectorService.list();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Sektör Yönetimi"
        description="Tanıtım sektörlerini ve PDF şablonlarını yönetin."
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {sectors.length === 0 ? (
          <div className="col-span-full text-center py-20">
            <Briefcase size={40} className="mx-auto text-muted-foreground/30 mb-3" />
            <p className="text-muted-foreground">Henüz sektör eklenmemiş.</p>
          </div>
        ) : (
          sectors.map((sector: any) => (
            <div
              key={sector.id}
              className="bg-white rounded-2xl border shadow-sm p-6 space-y-4 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                    <Briefcase size={20} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900">{sector.name}</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {sector.templates?.length || 0} şablon
                    </p>
                  </div>
                </div>
              </div>

              {sector.description && (
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {sector.description}
                </p>
              )}

              <div className="flex items-center gap-2 pt-2">
                {sector.pdfUrl && (
                  <Badge variant="outline" className="gap-1 text-xs">
                    <FileText size={12} /> PDF Mevcut
                  </Badge>
                )}
                <Badge variant="secondary" className="text-xs">
                  <Globe size={12} className="mr-1" />
                  {sector._count?.agencies || 0} acente
                </Badge>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
