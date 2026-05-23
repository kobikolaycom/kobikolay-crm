import { PageHeader } from "@/components/layout/PageHeader";
import { CampaignService } from "@/services/CampaignService";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Send, Mail, Users, Clock, CheckCircle2, AlertCircle, Plus } from "lucide-react";
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
  });
<truncated 2164 bytes>

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
