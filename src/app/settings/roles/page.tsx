import { RoleService, PERMISSIONS_LIST } from "@/services/RoleService";
import { PageHeader } from "@/components/layout/PageHeader";
import { Badge } from "@/components/ui/badge";
import { ShieldCheck, Users } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function RolesPage() {
  const roles = await RoleService.getAllRoles();

  const grouped = PERMISSIONS_LIST.reduce((acc, p) => {
    if (!acc[p.group]) acc[p.group] = [];
    acc[p.group].push(p);
    return acc;
  }, {} as Record<string, typeof PERMISSIONS_LIST>);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Yetki Paketleri (Roller)"
        description="Sistemdeki rolleri ve yetki seviyelerini görüntüleyin."
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {roles.map((role: any) => (
          <div key={role.id} className="bg-white rounded-2xl border shadow-sm overflow-hidden">
            <div className="px-6 py-5 border-b flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center text-green-600">
                  <ShieldCheck size={20} />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900">{role.name}</h3>
                  {role.description && (
                    <p className="text-xs text-muted-foreground">{role.description}</p>
                  )}
                </div>
              </div>
              <Badge variant="secondary" className="gap-1 text-xs">
                <Users size={12} /> {role._count?.users || 0} personel
              </Badge>
            </div>
            <div className="p-6">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-3">Yetkiler</p>
              <div className="flex flex-wrap gap-1.5">
                {role.permissions.includes("*") ? (
                  <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 text-[10px]">
                    ⭐ Tam Yetki (Super Admin)
                  </Badge>
                ) : (
                  role.permissions.map((perm: string) => {
                    const match = PERMISSIONS_LIST.find((p) => p.key === perm);
                    return (
                      <Badge key={perm} variant="outline" className="text-[10px]">
                        {match?.label || perm}
                      </Badge>
                    );
                  })
                )}
                {role.permissions.length === 0 && (
                  <span className="text-xs text-muted-foreground">Yetki tanımlanmamış</span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
