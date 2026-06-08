import React from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/layout/PageHeader";
import {
  FileText, Phone, ClipboardList, Bell, Clock,
  Building2, MapPin, UserCircle
} from "lucide-react";
import { DashboardService } from "@/services/DashboardService";

export const dynamic = "force-dynamic";

function formatTimeAgo(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - new Date(date).getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);
  if (diffMin < 1) return "Az önce";
  if (diffMin < 60) return `${diffMin}dk önce`;
  if (diffHour < 24) return `${diffHour}sa önce`;
  if (diffDay < 7) return `${diffDay}g önce`;
  return new Date(date).toLocaleDateString("tr-TR");
}

const typeConfig: Record<string, { label: string; icon: React.ReactNode; cls: string }> = {
  CALL_LOG: { label: "Çağrı", icon: <Phone size={14} />, cls: "bg-blue-50 text-blue-700 border-blue-200" },
  TASK_ASSIGNMENT: { label: "Görev", icon: <ClipboardList size={14} />, cls: "bg-purple-50 text-purple-700 border-purple-200" },
  SELF_REMINDER: { label: "Hatırlatıcı", icon: <Bell size={14} />, cls: "bg-amber-50 text-amber-700 border-amber-200" },
  MANUAL_NOTE: { label: "Not", icon: <FileText size={14} />, cls: "bg-teal-50 text-teal-700 border-teal-200" },
};

const statusConfig: Record<string, { label: string; cls: string }> = {
  PENDING: { label: "Bekliyor", cls: "bg-yellow-50 text-yellow-700 border-yellow-200" },
  COMPLETED: { label: "Tamamlandı", cls: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  CANCELLED: { label: "İptal", cls: "bg-red-50 text-red-700 border-red-200" },
};

const callStatusLabels: Record<string, string> = {
  REACHED: "Ulaşıldı",
  NO_ANSWER: "Cevap Yok",
  BUSY: "Meşgul",
  WRONG_NUMBER: "Yanlış No",
  GOOD: "İyi",
  NORMAL: "Normal",
  BAD: "Kötü",
};

const filterTabs = [
  { key: "all", label: "Tümü" },
  { key: "today", label: "Bugün" },
  { key: "week", label: "Bu Hafta" },
  { key: "month", label: "Bu Ay" },
];

export default async function ActivitiesPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>;
}) {
  const params = await searchParams;
  const currentFilter = params.filter || "all";
  const activities = await DashboardService.getRecentActivities(
    200,
    currentFilter === "all" ? undefined : currentFilter
  );

  return (
    <div className="space-y-6 p-6 lg:p-8">
      <PageHeader
        title="Faaliyet Geçmişi"
        description="Tüm acente aktiviteleri: notlar, çağrılar, görevler ve hatırlatıcılar."
      />

      {/* Date Filter Tabs */}
      <div className="flex items-center gap-2">
        {filterTabs.map(tab => (
          <Link key={tab.key} href={`/activities${tab.key === "all" ? "" : `?filter=${tab.key}`}`}>
            <Button
              variant={currentFilter === tab.key ? "default" : "outline"}
              size="sm"
              className="text-xs"
            >
              {tab.label}
            </Button>
          </Link>
        ))}
        <span className="text-xs text-muted-foreground ml-2">
          {activities.length} aktivite
        </span>
      </div>

      <div className="glass-card rounded-2xl border shadow-sm overflow-hidden">
        {activities.length === 0 ? (
          <div className="text-center py-20">
            <ClipboardList size={40} className="mx-auto text-muted-foreground/30 mb-3" />
            <p className="text-muted-foreground">Bu dönemde aktivite bulunmuyor.</p>
          </div>
        ) : (
          <>
          {/* Mobile/Tablet card view */}
          <div className="lg:hidden divide-y">
            {activities.map((act: any) => {
              const tc = typeConfig[act.type] || { label: act.type, icon: <FileText size={14} />, cls: "bg-slate-50 text-slate-600 border-slate-200" };
              const sc = statusConfig[act.status] || { label: act.status, cls: "bg-slate-50 text-slate-600 border-slate-200" };
              return (
                <Link key={act.id} href={`/agents/${act.agency?.id}`} className="block px-5 py-4 hover:bg-slate-50 transition-colors">
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className={`text-[10px] font-semibold gap-1 ${tc.cls}`}>
                        {tc.icon} {tc.label}
                      </Badge>
                      <Badge variant="outline" className={`text-[10px] font-semibold ${sc.cls}`}>
                        {sc.label}
                      </Badge>
                    </div>
                    <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                      <Clock size={10} /> {formatTimeAgo(act.createdAt)}
                    </span>
                  </div>
                  <p className="text-sm font-medium text-slate-800 truncate">{act.agency?.companyName || "—"}</p>
                  <p className="text-xs text-muted-foreground truncate mt-0.5">{act.content}</p>
                  {act.completionNote && (
                    <p className="text-[10px] text-emerald-600 truncate mt-0.5">✓ {act.completionNote}</p>
                  )}
                  <div className="flex flex-wrap items-center gap-3 mt-2">
                    {act.agency?.contacts?.[0]?.province && (
                      <span className="text-[10px] text-muted-foreground flex items-center gap-0.5"><MapPin size={10} /> {act.agency.contacts[0].province}</span>
                    )}
                    {act.agency?.sectors?.[0]?.name && (
                      <span className="text-[10px] text-muted-foreground flex items-center gap-0.5"><Building2 size={10} /> {act.agency.sectors[0].name}</span>
                    )}
                    {act.creator?.name && (
                      <span className="text-[10px] text-amber-600 font-semibold flex items-center gap-0.5"><UserCircle size={10} /> {act.creator.name}</span>
                    )}
                    {act.agency?.representative?.name && (
                      <span className="text-[10px] text-indigo-600 font-semibold">👤 {act.agency.representative.name}</span>
                    )}
                    {act.callStatus && (
                      <span className="text-[10px] text-muted-foreground">{callStatusLabels[act.callStatus] || act.callStatus}</span>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
          {/* Desktop table */}
          <div className="hidden lg:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50/80 border-b text-xs text-muted-foreground">
                  <th className="text-left px-5 py-3.5 font-medium">Tür</th>
                  <th className="text-left px-4 py-3.5 font-medium">Acente</th>
                  <th className="text-left px-4 py-3.5 font-medium">İçerik</th>
                  <th className="text-left px-4 py-3.5 font-medium">Şehir</th>
                  <th className="text-left px-4 py-3.5 font-medium">Sektör</th>
                  <th className="text-left px-4 py-3.5 font-medium">Durum</th>
                  <th className="text-left px-4 py-3.5 font-medium">İşlem Yapan</th>
                  <th className="text-left px-4 py-3.5 font-medium">Temsilci</th>
                  <th className="text-right px-5 py-3.5 font-medium">Tarih</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {activities.map((act: any) => {
                  const tc = typeConfig[act.type] || { label: act.type, icon: <FileText size={14} />, cls: "bg-slate-50 text-slate-600 border-slate-200" };
                  const sc = statusConfig[act.status] || { label: act.status, cls: "bg-slate-50 text-slate-600 border-slate-200" };
                  return (
                    <tr key={act.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="px-5 py-3">
                        <Badge variant="outline" className={`text-[10px] font-semibold gap-1 ${tc.cls}`}>
                          {tc.icon} {tc.label}
                        </Badge>
                        {act.callStatus && (
                          <span className="text-[9px] text-muted-foreground block mt-0.5">
                            {callStatusLabels[act.callStatus] || act.callStatus}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <Link href={`/agents/${act.agency?.id}`} className="hover:text-primary transition-colors">
                          <p className="font-medium text-slate-800 truncate max-w-[180px]">{act.agency?.companyName || "—"}</p>
                        </Link>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-xs text-muted-foreground truncate max-w-[250px]">{act.content}</p>
                        {act.completionNote && (
                          <p className="text-[10px] text-emerald-600 truncate max-w-[250px] mt-0.5">✓ {act.completionNote}</p>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          {act.agency?.contacts?.[0]?.province ? (<><MapPin size={11} /> {act.agency.contacts[0].province}</>) : "—"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          {act.agency?.sectors?.[0]?.name ? (<><Building2 size={11} /> {act.agency.sectors[0].name}</>) : "—"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="outline" className={`text-[10px] font-semibold ${sc.cls}`}>
                          {sc.label}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        {act.creator?.name ? (
                          <span className="text-[10px] text-amber-600 font-semibold flex items-center gap-1">
                            <UserCircle size={12} /> {act.creator.name}
                          </span>
                        ) : <span className="text-[10px] text-slate-300">—</span>}
                      </td>
                      <td className="px-4 py-3">
                        {act.agency?.representative?.name ? (
                          <span className="text-[10px] text-indigo-600 font-semibold">👤 {act.agency.representative.name}</span>
                        ) : <span className="text-[10px] text-slate-300">—</span>}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="text-xs text-muted-foreground flex items-center justify-end gap-1">
                          <Clock size={11} /> {formatTimeAgo(act.createdAt)}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          </>
        )}
      </div>
    </div>
  );
}
