import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Users, 
  MessageSquare,
  Megaphone,
  Send,
  ArrowUpRight,
  Clock,
  CheckCircle2,
  Mail,
  MessageCircle,
  Phone,
  Calendar
} from "lucide-react";
import { DashboardService } from "@/services/DashboardService";
import { DashboardTasksClient } from "./DashboardTasksClient";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";

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
  const map: Record<string, JSX.Element> = {
    WHATSAPP: <MessageCircle className="text-emerald-500 w-4 h-4" />,
    INSTAGRAM: <Send className="text-pink-500 w-4 h-4" />,
    MESSENGER: <MessageSquare className="text-blue-500 w-4 h-4" />,
    MANUAL_NOTE: <Mail className="text-amber-500 w-4 h-4" />,
  };
  return map[channelType] || <MessageSquare className="w-4 h-4" />;
}

export default async function DashboardPage() {
  const session = await auth();
  
  let logoUrl: string | null = null;
  try {
    const logoSetting = await prisma.systemSetting.findFirst({ where: { category: "corporate", key: "logo_url" } });
    logoUrl = logoSetting?.value || null;
  } catch {}

  const userId = session?.user?.id;

  const [stats, recentConversations, overdueTasks, todayTasks, upcomingTasks] = await Promise.all([
    DashboardService.getStats(),
    DashboardService.getRecentConversations(),
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
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-slate-900">Hoşgeldin, {firstName}!</h1>
              <p className="text-muted-foreground mt-1 italic">&ldquo;{randomQuote}&rdquo;</p>
            </div>
            {logoUrl && (
              <div className="shrink-0">
                <img src={logoUrl} alt="Şirket Logosu" className="h-12 max-w-[200px] object-contain" />
              </div>
            )}
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
      </div>
    </div>
  );
}
