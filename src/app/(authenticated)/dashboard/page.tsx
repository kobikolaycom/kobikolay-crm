import React from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Users, 
  MessageSquare,
  Send,
  ArrowUpRight,
  Clock,
  CheckCircle2,
  Mail,
  MessageCircle,
  Calendar,
  FileText,
  MapPin,
  Building2,
  UserCircle
} from "lucide-react";
import { DashboardService } from "@/services/DashboardService";
import { DashboardTasksClient } from "./DashboardTasksClient";
import { auth } from "@/auth";


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

function channelIcon(channelType: string) {
  const map: Record<string, React.ReactNode> = {
    WHATSAPP: <MessageCircle className="text-emerald-500 w-4 h-4" />,
    INSTAGRAM: <Send className="text-pink-500 w-4 h-4" />,
    MESSENGER: <MessageSquare className="text-blue-500 w-4 h-4" />,
    MANUAL_NOTE: <Mail className="text-amber-500 w-4 h-4" />,
  };
  return map[channelType] || <MessageSquare className="w-4 h-4" />;
}

export default async function DashboardPage() {
  const session = await auth();
  
  const userId = session?.user?.id;

  const [stats, recentConversations, recentNotes, overdueTasks, todayTasks, upcomingTasks] = await Promise.all([
    DashboardService.getStats(),
    DashboardService.getRecentConversations(),
    DashboardService.getRecentNotes(),
    DashboardService.getOverdueTasks(userId),
    DashboardService.getTodayTasks(userId),
    DashboardService.getUpcomingTasks(userId),
  ]);

  // Serialize dates for client
  const serializeTasks = (tasks: any[]) => tasks.map(t => ({
    ...t,
    dueDate: t.dueDate ? t.dueDate.toISOString() : null,
    createdAt: undefined,
    updatedAt: undefined,
  }));

  return (
    <div className="space-y-8 animate-in fade-in duration-500 p-6 lg:p-8">
      {/* Welcome banner */}
      {(() => {
        const quotes = [
          "İnsanlar ne yaptığınızı satın almazlar, neden yaptığınızı satın alırlar.",
          "Müşterilerinize satış yapmayı bırakın; onlara yardımcı olmayı seçin.",
          "Başarı, her gün tekrarlanan küçük çabaların toplamıdır.",
          "Tüketiciyle bağ kurmayan her pazarlama fikri ölü doğar.",
        ];
        const randomQuote = quotes[Math.floor(Math.random() * quotes.length)];
        const fullName = session?.user?.name || "Kullanıcı";
        const firstName = fullName.split(" ")[0];
        return (
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">Hoşgeldin, {firstName}!</h1>
            <p className="text-muted-foreground mt-1 italic">&ldquo;{randomQuote}&rdquo;</p>
          </div>
        );
      })()}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <Link href="/agents" className="glass-card rounded-2xl p-6 border shadow-sm flex items-center justify-between hover:border-primary/30 hover:shadow-md transition-all cursor-pointer group">
          <div>
            <span className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Toplam Acente</span>
            <h3 className="text-3xl font-extrabold text-slate-900 mt-2 group-hover:text-primary transition-colors">{stats.totalAgencies.toLocaleString()}</h3>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
            <Users size={22} />
          </div>
        </Link>

        <Link href="/inbox" className="glass-card rounded-2xl p-6 border shadow-sm flex items-center justify-between hover:border-green-300 hover:shadow-md transition-all cursor-pointer group">
          <div>
            <span className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Aktif Sohbetler</span>
            <h3 className="text-3xl font-extrabold text-slate-900 mt-2 group-hover:text-green-600 transition-colors">{stats.activeConversations}</h3>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-green-500/10 flex items-center justify-center text-green-600">
            <MessageSquare size={22} />
          </div>
        </Link>

        <div className="glass-card rounded-2xl p-6 border shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Bekleyen Görev</span>
            <h3 className="text-3xl font-extrabold text-slate-900 mt-2">{overdueTasks.length + todayTasks.length + upcomingTasks.length}</h3>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-600">
            <Calendar size={22} />
          </div>
        </div>

        <Link href="/tanitim/stats" className="glass-card rounded-2xl p-6 border shadow-sm flex items-center justify-between hover:border-purple-300 hover:shadow-md transition-all cursor-pointer group">
          <div>
            <span className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Gönderilen Tanıtım</span>
            <h3 className="text-3xl font-extrabold text-slate-900 mt-2 group-hover:text-purple-600 transition-colors">{stats.sentCampaigns}</h3>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-purple-500/10 flex items-center justify-center text-purple-600">
            <Send size={22} />
          </div>
        </Link>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Recent Conversations */}
        <div className="lg:col-span-2 glass-card rounded-3xl border shadow-sm overflow-hidden flex flex-col h-[400px]">
          <div className="px-6 py-5 border-b flex items-center justify-between">
            <h3 className="font-bold text-slate-900 flex items-center gap-2">
              <MessageSquare size={18} className="text-primary" /> Son Sohbetler
            </h3>
            <Button variant="ghost" size="sm" asChild className="gap-1 text-xs">
              <Link href="/inbox">Tümünü Gör <ArrowUpRight size={14} /></Link>
            </Button>
          </div>
          <div className="flex-1 overflow-y-auto divide-y">
            {recentConversations.length === 0 ? (
              <div className="text-center py-20">
                <MessageSquare size={32} className="mx-auto text-muted-foreground/30 mb-3" />
                <p className="text-sm text-muted-foreground">Henüz sohbet bulunmuyor.</p>
              </div>
            ) : (
              recentConversations.map(convo => (
                <Link 
                  key={convo.id}
                  href={`/inbox?conversationId=${convo.id}`}
                  className="flex items-center justify-between px-6 py-3.5 hover:bg-slate-50 transition-colors cursor-pointer group"
                >
                  <div className="flex-1 min-w-0 flex items-start gap-3">
                    <div className="mt-0.5 shrink-0">{channelIcon(convo.channelType)}</div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate group-hover:text-primary transition-colors">
                        {convo.contactName || convo.agencyName || "Bilinmeyen"}
                      </p>
                      <p className="text-xs text-muted-foreground truncate mt-0.5">
                        {convo.lastMessage || "Mesaj yok"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0 ml-4">
                    {convo.status === "OPEN" ? (
                      <Badge variant="outline" className="text-[9px] font-bold bg-green-50 text-green-700 border-green-200 px-1.5 py-0">Aktif</Badge>
                    ) : (
                      <Badge variant="outline" className="text-[9px] font-bold bg-slate-50 text-slate-500 border-slate-200 px-1.5 py-0">Kapandı</Badge>
                    )}
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock size={12} />
                      {formatTimeAgo(convo.updatedAt)}
                    </span>
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>

        {/* Tasks Panel - Client Component */}
        <DashboardTasksClient
          overdueTasks={serializeTasks(overdueTasks)}
          todayTasks={serializeTasks(todayTasks)}
          upcomingTasks={serializeTasks(upcomingTasks)}
        />

        {/* Recent Notes — Rich Table */}
        <div className="lg:col-span-3 glass-card rounded-3xl border shadow-sm overflow-hidden flex flex-col">
          <div className="px-6 py-5 border-b flex items-center justify-between">
            <h3 className="font-bold text-slate-900 flex items-center gap-2">
              <FileText size={18} className="text-amber-500" /> Son Acente Notları
            </h3>
            <Button variant="ghost" size="sm" asChild className="gap-1 text-xs">
              <Link href="/activities">Tümünü Gör <ArrowUpRight size={14} /></Link>
            </Button>
          </div>
          {recentNotes.length === 0 ? (
            <div className="text-center py-16">
              <FileText size={32} className="mx-auto text-muted-foreground/30 mb-3" />
              <p className="text-sm text-muted-foreground">Henüz acente notu bulunmuyor.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50/80 border-b text-xs text-muted-foreground">
                    <th className="text-left px-5 py-3 font-medium">Acente</th>
                    <th className="text-left px-4 py-3 font-medium">Not İçeriği</th>
                    <th className="text-left px-4 py-3 font-medium">Şehir</th>
                    <th className="text-left px-4 py-3 font-medium">Sektör</th>
                    <th className="text-left px-4 py-3 font-medium">Temsilci</th>
                    <th className="text-left px-4 py-3 font-medium">Yazan</th>
                    <th className="text-right px-5 py-3 font-medium">Tarih</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {recentNotes.map((note: any) => (
                    <tr key={note.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="px-5 py-3">
                        <Link href={`/agents/${note.agencyId}`} className="hover:text-primary transition-colors">
                          <p className="font-medium text-slate-800 truncate max-w-[180px]">{note.agencyName || "—"}</p>
                          {note.agencyStatus && (
                            <Badge variant="outline" className={`text-[9px] mt-0.5 ${
                              note.agencyStatus === "ACTIVE" ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
                              note.agencyStatus === "LEAD" ? "bg-blue-50 text-blue-700 border-blue-200" :
                              "bg-slate-50 text-slate-500 border-slate-200"
                            }`}>
                              {note.agencyStatus === "ACTIVE" ? "Aktif" : note.agencyStatus === "LEAD" ? "Lead" : note.agencyStatus === "PASSIVE" ? "Pasif" : note.agencyStatus}
                            </Badge>
                          )}
                        </Link>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-xs text-muted-foreground truncate max-w-[220px]">{note.lastMessage || "—"}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          {note.agencyProvince ? (<><MapPin size={11} /> {note.agencyProvince}</>) : "—"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          {note.agencySector ? (<><Building2 size={11} /> {note.agencySector}</>) : "—"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {note.representativeName ? (
                          <span className="text-[10px] text-indigo-600 font-semibold flex items-center gap-1">
                            👤 {note.representativeName}
                          </span>
                        ) : (
                          <span className="text-[10px] text-slate-300">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {note.createdByName ? (
                          <span className="text-[10px] text-amber-600 font-semibold flex items-center gap-1">
                            <UserCircle size={12} /> {note.createdByName}
                          </span>
                        ) : (
                          <span className="text-[10px] text-slate-300">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="text-xs text-muted-foreground flex items-center justify-end gap-1">
                          <Clock size={11} /> {formatTimeAgo(note.updatedAt)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
