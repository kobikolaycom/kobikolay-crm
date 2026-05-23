import { UserService } from "@/services/UserService";
import { PageHeader } from "@/components/layout/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Users, Mail, ShieldCheck, CheckCircle2, XCircle } from "lucide-react";
import { format } from "date-fns";
import { tr } from "date-fns/locale";

export const dynamic = "force-dynamic";

export default async function UsersPage() {
  const users = await UserService.getAllUsers();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Personel Yönetimi"
        description="Sistem kullanıcılarını görüntüleyin ve yönetin."
      />

      <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-slate-50/50">
                <th className="text-left px-6 py-3 font-semibold text-slate-600">Ad Soyad</th>
                <th className="text-left px-6 py-3 font-semibold text-slate-600">E-posta</th>
                <th className="text-left px-6 py-3 font-semibold text-slate-600">Rol</th>
                <th className="text-left px-6 py-3 font-semibold text-slate-600">Durum</th>
                <th className="text-left px-6 py-3 font-semibold text-slate-600">Kayıt Tarihi</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {users.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-20">
                    <Users size={32} className="mx-auto text-muted-foreground/30 mb-3" />
                    <p className="text-muted-foreground">Personel bulunamadı</p>
                  </td>
                </tr>
              ) : (
                users.map((user: any) => (
                  <tr key={user.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-sm">
                          {user.name?.[0]?.toUpperCase() || "?"}
                        </div>
                        <span className="font-medium text-slate-900">{user.name || "—"}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-muted-foreground">
                      <div className="flex items-center gap-1.5">
                        <Mail size={14} />
                        {user.email}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <Badge variant="outline" className="gap-1 text-[10px]">
                        <ShieldCheck size={10} /> {user.role?.name || "—"}
                      </Badge>
                    </td>
                    <td className="px-6 py-4">
                      {user.isActive ? (
                        <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 text-[10px] gap-1">
                          <CheckCircle2 size={10} /> Aktif
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-[10px] gap-1 text-red-600">
                          <XCircle size={10} /> Pasif
                        </Badge>
                      )}
                    </td>
                    <td className="px-6 py-4 text-muted-foreground text-xs">
                      {format(new Date(user.createdAt), "d MMM yyyy", { locale: tr })}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
