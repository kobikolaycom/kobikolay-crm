import { PageHeader } from "@/components/layout/PageHeader";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Send, Mail, Users, Clock, Plus } from "lucide-react";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Tanıtım Mailleri | KobiKolay CRM",
  description: "Toplu tanıtım campaigns ve mail gönderim geçmişi.",
};

function statusBadge(status: string) {
  const map: Record<string, { label: string; cls: string }> = {
    COMPLETED: { label: "Tamamlandı", cls: "bg-emerald-100 text-emerald-700 border-emerald-200" },
    SENDING:   { label: "Gönderiliyor", cls: "bg-blue-100 text-blue-700 border-blue-200" },
    DRAFT:     { label: "Taslak", cls: "bg-amber-100 text-amber-700 border-amber-200" },
    CANCELLED: { label: "İptal", cls: "bg-red-100 text-red-700 border-red-200" },
  };
  const v = map[status] || { label: status, cls: "bg-muted text-muted-foreground" };
  return <Badge variant="outline" className={`text-[10px] font-semibold ${v.cls}`}>{v.label}</Badge>;
}

export default async function TanitimPage() {
  const campaigns = await prisma.campaign.findMany({
    orderBy: { createdAt: "desc" },
    take: 50,
    include: {
      _count: { select: { logs: true } },
      logs: {
        where: { status: "SENT" },
        select: { id: true },
      },
    },
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-500 p-6 lg:p-8">
      <PageHeader
        title="Tanıtım Mailleri"
        description="Toplu tanıtım kampanyaları oluşturun ve gönderim geçmişini takip edin."
      />

      <div className="flex justify-end">
        <Link href="/tanitim/stats">
          <Button variant="outline" className="gap-2 rounded-xl mr-2">
            <Mail size={16} /> İstatistikler
          </Button>
        </Link>
      </div>

      <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
        <div className="px-6 py-5 border-b flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-600">
            <Send size={20} />
          </div>
          <div>
            <h3 className="font-semibold text-slate-900">Kampanya Geçmişi</h3>
            <p className="text-xs text-muted-foreground">Tüm tanıtım kampanyalarınız</p>
          </div>
        </div>

        {campaigns.length === 0 ? (
          <div className="text-center py-20">
            <Mail size={32} className="mx-auto text-muted-foreground/30 mb-3" />
            <p className="text-sm text-muted-foreground">Henüz kampanya oluşturulmamış</p>
          </div>
        ) : (
          <div className="divide-y">
            {campaigns.map((campaign) => {
              const totalLogs = campaign._count.logs;
              const sentCount = campaign.logs.length;
              const successRate = totalLogs > 0 ? Math.round((sentCount / totalLogs) * 100) : 0;

              return (
                <div key={campaign.id} className="px-6 py-4 hover:bg-slate-50/50 transition-colors flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-semibold text-slate-900">{campaign.name}</h4>
                      {statusBadge(campaign.status)}
                    </div>
                    <p className="text-sm text-slate-500 line-clamp-1">{campaign.subject}</p>
                    
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-muted-foreground mt-3">
                      <span className="flex items-center gap-1">
                        <Users size={12} />
                        <span className="font-semibold">{campaign.targetCount}</span> hedef kitle
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock size={12} />
                        {format(new Date(campaign.createdAt), "dd MMM yyyy, HH:mm", { locale: tr })}
                      </span>
                    </div>
                  </div>

                  {campaign.status === "COMPLETED" && (
                    <div className="flex flex-col items-end gap-1.5 min-w-[120px]">
                      <div className="text-xs text-muted-foreground">Gönderim oranı</div>
                      <div className="text-lg font-bold text-emerald-600">{successRate}%</div>
                      <div className="h-1.5 w-24 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-emerald-500 rounded-full"
                          style={{ width: `${successRate}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
