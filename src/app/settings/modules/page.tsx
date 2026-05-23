import { SystemModuleService } from "@/services/SystemModuleService";
import { PageHeader } from "@/components/layout/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Package, CheckCircle2, XCircle } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function ModulesPage() {
  const modules = await SystemModuleService.list(false);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Sistem Modülleri"
        description="CRM'de sunulan modüller ve fiyatlandırma."
      />

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {modules.length === 0 ? (
          <div className="col-span-full text-center py-20 bg-white rounded-2xl border">
            <Package size={40} className="mx-auto text-muted-foreground/30 mb-3" />
            <p className="text-muted-foreground">Modül bulunamadı</p>
          </div>
        ) : (
          modules.map((mod: any) => (
            <div key={mod.id} className="bg-white rounded-2xl border shadow-sm p-6 space-y-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                    <Package size={20} />
                  </div>
                  <h3 className="font-semibold text-slate-900">{mod.name}</h3>
                </div>
                {mod.isActive ? (
                  <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 text-[10px] gap-1">
                    <CheckCircle2 size={10} /> Aktif
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-[10px] gap-1 text-red-600">
                    <XCircle size={10} /> Pasif
                  </Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground line-clamp-3">{mod.description}</p>
              <div className="pt-2 border-t">
                <span className="text-lg font-bold text-primary">₺{mod.price?.toLocaleString("tr-TR")}</span>
                <span className="text-xs text-muted-foreground ml-1">/ modül</span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
