import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft, Send, TrendingUp, TrendingDown, Minus,
  Calendar, CalendarDays, CalendarRange,
  BarChart3, Users, Mail, Megaphone
} from "lucide-react";
import { CampaignService } from "@/services/CampaignService";

export const dynamic = "force-dynamic";

function PerformanceBadge({ current, previous, label }: { current: number; previous: number; label: string }) {
  if (previous === 0 && current === 0) {
    return <span className="text-[10px] text-muted-foreground flex items-center gap-0.5"><Minus size={10} /> {label}: Veri yok</span>;
  }
  if (previous === 0) {
    return <span className="text-[10px] text-emerald-600 flex items-center gap-0.5"><TrendingUp size={10} /> {label}: +{current} yeni</span>;
  }
  const diff = current - previous;
  const pct = Math.round((diff / previous) * 100);
  if (diff > 0) {
    return <span className="text-[10px] text-emerald-600 flex items-center gap-0.5"><TrendingUp size={10} /> {label}: +{pct}% ↑</span>;
  }
  if (diff < 0) {
    return <span className="text-[10px] text-red-500 flex items-center gap-0.5"><TrendingDown size={10} /> {label}: {pct}% ↓</span>;
  }
  return <span className="text-[10px] text-muted-foreground flex items-center gap-0.5"><Minus size={10} /> {label}: Aynı</span>;
}

function statusLabel(status: string) {
  switch (status) {
    case "DRAFT": return <Badge variant="outline" className="text-[10px]">Taslak</Badge>;
    case "SENDING": return <Badge className="text-[10px] bg-blue-500">Gönderiliyor</Badge>;
    case "COMPLETED": return <Badge className="text-[10px] bg-emerald-600">Tamamlandı</Badge>;
    case "FAILED": return <Badge variant="destructive" className="text-[10px]">Hata</Badge>;
    default: return <Badge variant="outline" className="text-[10px]">{status}</Badge>;
  }
}

export default async function TanitimStatsPage() {
  let stats;
  try {
    stats = await CampaignService.getCampaignStats();
  } catch (e) {
    // Raw query might fail if tables don't have data / join table name differs
    stats = {
      today: 0, yesterday: 0,
      thisWeek: 0, lastWeek: 0,
      thisMonth: 0, lastMonth: 0,
      total: 0, totalCampaigns: 0,
      recentCampaigns: [],
      sectorStats: [],
    };
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild className="rounded-xl">
          <Link href="/dashboard"><ArrowLeft size={16} /> Geri</Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <Megaphone size={24} className="text-purple-600" /> Tanıtım İstatistikleri
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">Gönderilen kampanya performans özeti</p>
        </div>
      </div>

      {/* Period Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Bugün */}
        <Link href="/agents?campaignFilter=today" className="glass-card rounded-2xl p-5 border shadow-sm space-y-2 hover:border-purple-300 hover:shadow-md transition-all cursor-pointer group">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground font-semibold uppercase tracking-wider flex items-center gap-1.5">
              <Calendar size={12} /> Bugün
            </span>
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-600">
              <Send size={18} />
            </div>
          </div>
          <h3 className="text-3xl font-extrabold text-slate-900 group-hover:text-purple-600 transition-colors">{stats.today}</h3>
          <PerformanceBadge current={stats.today} previous={stats.yesterday} label="Düne göre" />
        </Link>

        {/* Bu Hafta */}
        <Link href="/agents?campaignFilter=week" className="glass-card rounded-2xl p-5 border shadow-sm space-y-2 hover:border-blue-300 hover:shadow-md transition-all cursor-pointer group">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground font-semibold uppercase tracking-wider flex items-center gap-1.5">
              <CalendarDays size={12} /> Bu Hafta
            </span>
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-600">
              <Send size={18} />
            </div>
          </div>
          <h3 className="text-3xl font-extrabold text-slate-900 group-hover:text-blue-600 transition-colors">{stats.thisWeek}</h3>
          <PerformanceBadge current={stats.thisWeek} previous={stats.lastWeek} label="Geçen haftaya göre" />
        </Link>

        {/* Bu Ay */}
        <Link href="/agents?campaignFilter=month" className="glass-card rounded-2xl p-5 border shadow-sm space-y-2 hover:border-green-300 hover:shadow-md transition-all cursor-pointer group">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground font-semibold uppercase tracking-wider flex items-center gap-1.5">
              <CalendarRange size={12} /> Bu Ay
            </span>
            <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center text-green-600">
              <Send size={18} />
            </div>
          </div>
          <h3 className="text-3xl font-extrabold text-slate-900 group-hover:text-green-600 transition-colors">{stats.thisMonth}</h3>
          <PerformanceBadge current={stats.thisMonth} previous={stats.lastMonth} label="Geçen aya göre" />
        </Link>

        {/* Toplam */}
        <div className="glass-card rounded-2xl p-5 border shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground font-semibold uppercase tracking-wider flex items-center gap-1.5">
              <BarChart3 size={12} /> Toplam
            </span>
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-600">
              <Mail size={18} />
            </div>
          </div>
          <h3 className="text-3xl font-extrabold text-slate-900">{stats.total.toLocaleString()}</h3>
          <span className="text-[10px] text-muted-foreground">{stats.totalCampaigns} kampanya</span>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Son Kampanyalar */}
        <div className="lg:col-span-2 glass-card rounded-3xl border shadow-sm overflow-hidden">
          <div className="px-6 py-5 border-b flex items-center justify-between">
            <h3 className="font-bold text-slate-900 flex items-center gap-2">
              <Megaphone size={18} className="text-purple-600" /> Son Kampanyalar
            </h3>
            <Button variant="ghost" size="sm" asChild className="text-xs gap-1">
              <Link href="/tanitim">Tümünü Gör →</Link>
            </Button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-slate-50/50">
                  <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase">Kampanya</th>
                  <th className="text-center px-3 py-3 text-xs font-semibold text-muted-foreground uppercase">Durum</th>
                  <th className="text-center px-3 py-3 text-xs font-semibold text-muted-foreground uppercase">Hedef</th>
                  <th className="text-center px-3 py-3 text-xs font-semibold text-muted-foreground uppercase">Gönderilen</th>
                  <th className="text-right px-5 py-3 text-xs font-semibold text-muted-foreground uppercase">Tarih</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {stats.recentCampaigns.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center py-10 text-muted-foreground text-sm">
                      Henüz kampanya oluşturulmamış
                    </td>
                  </tr>
                ) : (
                  stats.recentCampaigns.map((c: any) => (
                    <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-5 py-3">
                        <p className="font-medium text-slate-900">{c.name}</p>
                        <p className="text-xs text-muted-foreground truncate max-w-[250px]">{c.subject}</p>
                      </td>
                      <td className="text-center px-3 py-3">{statusLabel(c.status)}</td>
                      <td className="text-center px-3 py-3 font-semibold">{c.targetCount}</td>
                      <td className="text-center px-3 py-3 font-semibold text-purple-600">{c.logCount}</td>
                      <td className="text-right px-5 py-3 text-xs text-muted-foreground">
                        {new Date(c.createdAt).toLocaleDateString("tr-TR")}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Sektör Dağılımı */}
        <div className="glass-card rounded-3xl border shadow-sm overflow-hidden">
          <div className="px-6 py-5 border-b">
            <h3 className="font-bold text-slate-900 flex items-center gap-2">
              <Users size={18} className="text-purple-600" /> Sektör Dağılımı
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">Hangi sektöre kaç mail gönderildi</p>
          </div>
          <div className="p-5 space-y-3">
            {stats.sectorStats.length === 0 ? (
              <div className="text-center py-10">
                <BarChart3 size={32} className="mx-auto text-muted-foreground/30 mb-2" />
                <p className="text-sm text-muted-foreground">Sektör verisi yok</p>
              </div>
            ) : (
              stats.sectorStats.map((s: any, i: number) => {
                const maxCount = stats.sectorStats[0]?.count || 1;
                const widthPct = Math.max(8, (s.count / maxCount) * 100);
                const colors = [
                  "bg-purple-500", "bg-blue-500", "bg-green-500", "bg-amber-500",
                  "bg-pink-500", "bg-cyan-500", "bg-indigo-500", "bg-rose-500",
                  "bg-teal-500", "bg-orange-500"
                ];
                return (
                  <div key={s.name} className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-slate-700">{s.name}</span>
                      <span className="text-xs font-bold text-slate-900">{s.count.toLocaleString()}</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2.5">
                      <div
                        className={`h-2.5 rounded-full ${colors[i % colors.length]} transition-all`}
                        style={{ width: `${widthPct}%` }}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
