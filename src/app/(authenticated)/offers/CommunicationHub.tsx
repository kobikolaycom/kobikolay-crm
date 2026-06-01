"use client";

import { useState, useTransition } from "react";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger
} from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription
} from "@/components/ui/dialog";
import {
  FileText,
  Target,
  Search,
  Users,
  Eye,
  ExternalLink,
  Info,
  Calendar,
  CheckCircle2,
  XCircle
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { tr } from "date-fns/locale";

interface HubEntry {
  id: string;
  isMassOperation: boolean;
  type: string;
  subject: string | null;
  content: string | null;
  agency?: { companyName: string } | null;
  agencyIds: string[];
  createdAt: Date | string;
  status: string;
  totalSoftwarePrice?: number | null;
  coverLetter?: string | null;
  metadata?: any;
}

function statusBadge(status: string) {
  const map: Record<string, { label: string; cls: string }> = {
    SENT: { label: "Gönderildi", cls: "bg-emerald-100 text-emerald-700 border-emerald-200" },
    PENDING: { label: "Beklemede", cls: "bg-amber-100 text-amber-700 border-amber-200" },
    APPROVED: { label: "Onaylandı", cls: "bg-blue-100 text-blue-700 border-blue-200" },
    REJECTED: { label: "Reddedildi", cls: "bg-red-100 text-red-700 border-red-200" },
  };
  const v = map[status] || { label: status, cls: "bg-muted text-muted-foreground" };
  return <Badge variant="outline" className={`text-[10px] font-semibold ${v.cls}`}>{v.label}</Badge>;
}

function typeBadge(type: string, isMass: boolean) {
  if (isMass) {
    return (
      <Badge variant="outline" className="text-[9px] bg-purple-50 text-purple-700 border-purple-200 gap-1">
        <Target size={10} /> Toplu Tanıtım
      </Badge>
    );
  }
  if (type === "OFFER") {
    return (
      <Badge variant="outline" className="text-[9px] bg-blue-50 text-blue-700 border-blue-200 gap-1">
        <FileText size={10} /> Teklif
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="text-[9px] bg-amber-50 text-amber-700 border-amber-200 gap-1">
      <FileText size={10} /> Tanıtım
    </Badge>
  );
}

export default function CommunicationHub({ initialEntries }: { initialEntries: HubEntry[] }) {
  const [entries] = useState(initialEntries);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedEntry, setSelectedEntry] = useState<HubEntry | null>(null);
  const [activeTab, setActiveTab] = useState("all");

  const filtered = entries.filter((e) => {
    if (activeTab === "mass" && !e.isMassOperation) return false;
    if (activeTab === "vip" && e.isMassOperation) return false;
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      const matchSubject = e.subject?.toLowerCase().includes(term);
      const matchAgency = e.agency?.companyName?.toLowerCase().includes(term);
      if (!matchSubject && !matchAgency) return false;
    }
    return true;
  });

  return (
    <div className="space-y-4">
      {/* Tabs + Search */}
      <div className="flex items-center justify-between gap-4">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1">
          <TabsList>
            <TabsTrigger value="all">Tümü ({entries.length})</TabsTrigger>
            <TabsTrigger value="mass">
              Toplu ({entries.filter((e) => e.isMassOperation).length})
            </TabsTrigger>
            <TabsTrigger value="vip">
              VIP ({entries.filter((e) => !e.isMassOperation).length})
            </TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="relative w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
          <Input
            placeholder="Ara..."
            className="pl-9 rounded-xl"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Entries Grid */}
      {filtered.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-2xl border">
          <FileText size={40} className="mx-auto text-muted-foreground/30 mb-3" />
          <p className="text-muted-foreground">Kayıt bulunamadı</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((entry) => (
            <div
              key={entry.id}
              className="bg-white rounded-2xl border shadow-sm p-5 space-y-3 hover:shadow-md transition-shadow cursor-pointer group"
              onClick={() => setSelectedEntry(entry)}
            >
              <div className="flex items-start justify-between">
                <div className="space-y-1.5 flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-900 truncate group-hover:text-primary transition-colors">
                    {entry.subject || "Başlıksız"}
                  </p>
                  <div className="flex items-center gap-2 flex-wrap">
                    {typeBadge(entry.type, entry.isMassOperation)}
                    {statusBadge(entry.status)}
                  </div>
                </div>
                <Button variant="ghost" size="icon" className="shrink-0 h-8 w-8 rounded-lg opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                  <Eye size={14} />
                </Button>
              </div>

              <div className="text-xs text-muted-foreground space-y-1">
                {entry.isMassOperation ? (
                  <div className="flex items-center gap-1.5">
                    <Users size={12} />
                    <span>{entry.agencyIds?.length || 0} acente hedeflendi</span>
                  </div>
                ) : entry.agency ? (
                  <div className="flex items-center gap-1.5">
                    <FileText size={12} />
                    <span className="truncate">{entry.agency.companyName}</span>
                  </div>
                ) : null}
                <div className="flex items-center gap-1.5">
                  <Calendar size={12} />
                  <span>
                    {format(new Date(entry.createdAt), "d MMMM yyyy, HH:mm", { locale: tr })}
                  </span>
                </div>
                {entry.totalSoftwarePrice && (
                  <div className="flex items-center gap-1.5 text-primary font-semibold">
                    <span>₺{entry.totalSoftwarePrice.toLocaleString("tr-TR")}</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Detail Dialog */}
      <Dialog open={!!selectedEntry} onOpenChange={() => setSelectedEntry(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col rounded-2xl">
          {selectedEntry && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  {selectedEntry.subject || "Detay"}
                </DialogTitle>
                <DialogDescription>
                  {format(new Date(selectedEntry.createdAt), "d MMMM yyyy, HH:mm", { locale: tr })}
                </DialogDescription>
              </DialogHeader>

              <div className="flex-1 overflow-y-auto space-y-4 py-4">
                <div className="flex items-center gap-2 flex-wrap">
                  {typeBadge(selectedEntry.type, selectedEntry.isMassOperation)}
                  {statusBadge(selectedEntry.status)}
                </div>

                <div>
                  <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-2">Hedef</h4>
                  {selectedEntry.isMassOperation ? (
                    <div className="flex items-center gap-2 text-sm">
                      <Users size={16} className="text-purple-600" />
                      <span className="font-medium">{selectedEntry.agencyIds?.length || 0} acente</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-purple-700 font-bold">
                      <FileText size={16} />
                      {selectedEntry.agency?.companyName || "Bilinmeyen Acente"}
                    </div>
                  )}
                </div>

                <div>
                  <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-2">İçerik / Ön Yazı</h4>
                  <div className="bg-background border rounded-2xl p-4 text-sm leading-relaxed whitespace-pre-wrap max-h-60 overflow-y-auto">
                    {selectedEntry.content || selectedEntry.coverLetter || "İçerik bulunamadı."}
                  </div>
                </div>

                {selectedEntry.metadata && (
                  <div>
                    <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-2">Meta Veriler & Sistem İzleri</h4>
                    <pre className="text-[10px] bg-slate-950 text-slate-300 p-3 rounded-xl overflow-x-auto">
                      {JSON.stringify(selectedEntry.metadata, null, 2)}
                    </pre>
                  </div>
                )}
              </div>

              <div className="p-4 border-t bg-muted/30 flex justify-between items-center">
                <div className="text-xs text-muted-foreground">
                  ID: <code className="bg-muted px-1 rounded">{selectedEntry.id}</code>
                </div>
                <Button onClick={() => setSelectedEntry(null)} className="rounded-full px-6">
                  Kapat
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
