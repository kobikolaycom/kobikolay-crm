"use client";

import { useState, useEffect, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  Send, Mail, Users, Clock, CheckCircle2, Plus, Trash2,
  AlertTriangle, RefreshCw, Target, FileText, ArrowRight, Rocket,
  Eye, ChevronRight,
} from "lucide-react";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import {
  getSectorsAction,
  getTargetCountAction,
  getTargetAgenciesPreviewAction,
  createAndDispatchCampaignAction,
  deleteCampaignAction,
} from "./actions";

interface Campaign {
  id: string;
  name: string;
  subject: string;
  content: string;
  targetCount: number;
  status: string;
  createdAt: string;
}

interface Sector {
  id: string;
  name: string;
}

function statusBadge(status: string) {
  const map: Record<string, { label: string; cls: string }> = {
    COMPLETED: { label: "Tamamlandı", cls: "bg-emerald-100 text-emerald-700 border-emerald-200" },
    SENDING: { label: "Gönderiliyor", cls: "bg-blue-100 text-blue-700 border-blue-200" },
    DRAFT: { label: "Taslak", cls: "bg-amber-100 text-amber-700 border-amber-200" },
    CANCELLED: { label: "İptal", cls: "bg-red-100 text-red-700 border-red-200" },
  };
  const v = map[status] || { label: status, cls: "bg-muted text-muted-foreground" };
  return <Badge variant="outline" className={`text-[10px] font-semibold ${v.cls}`}>{v.label}</Badge>;
}

export function TanitimClient({ campaigns: initialCampaigns }: { campaigns: Campaign[] }) {
  const [campaigns] = useState(initialCampaigns);
  const [isPending, startTransition] = useTransition();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deletingCampaign, setDeletingCampaign] = useState<Campaign | null>(null);

  // Wizard state
  const [step, setStep] = useState(1); // 1: İçerik, 2: Hedef Kitle, 3: Önizleme & Gönder
  const [sectors, setSectors] = useState<Sector[]>([]);

  // Form
  const [campaignName, setCampaignName] = useState("");
  const [subject, setSubject] = useState("");
  const [content, setContent] = useState(
    "Sayın Yetkili,\n\nSizlere özel hazırladığımız sektörel CRM çözümümüzü tanıtmak isteriz.\n\nKobiKolay CRM ile:\n• Müşteri yönetimini kolaylaştırın\n• Satış süreçlerinizi otomatikleştirin\n• Raporlama ve analiz yapın\n\nDetaylı bilgi ve demo talepleriniz için bizimle iletişime geçebilirsiniz.\n\nSaygılarımızla,\nKobiKolay Ekibi"
  );
  const [selectedSector, setSelectedSector] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [targetCount, setTargetCount] = useState(0);
  const [targetPreview, setTargetPreview] = useState<{ id: string; companyName: string; email: string }[]>([]);
  const [loadingTargets, setLoadingTargets] = useState(false);

  // Load sectors
  useEffect(() => {
    getSectorsAction().then(setSectors).catch(() => {});
  }, []);

  // Recalculate targets when filters change (step 2)
  useEffect(() => {
    if (step === 2) {
      setLoadingTargets(true);
      const filter: any = {};
      if (selectedSector !== "all") filter.sectorId = selectedSector;
      if (selectedStatus !== "all") filter.status = selectedStatus;

      Promise.all([
        getTargetCountAction(filter),
        getTargetAgenciesPreviewAction(filter),
      ]).then(([count, preview]) => {
        setTargetCount(count);
        setTargetPreview(preview);
        setLoadingTargets(false);
      }).catch(() => setLoadingTargets(false));
    }
  }, [step, selectedSector, selectedStatus]);

  const resetForm = () => {
    setStep(1);
    setCampaignName("");
    setSubject("");
    setContent("Sayın Yetkili,\n\nSizlere özel hazırladığımız sektörel CRM çözümümüzü tanıtmak isteriz.\n\nKobiKolay CRM ile:\n• Müşteri yönetimini kolaylaştırın\n• Satış süreçlerinizi otomatikleştirin\n• Raporlama ve analiz yapın\n\nDetaylı bilgi ve demo talepleriniz için bizimle iletişime geçebilirsiniz.\n\nSaygılarımızla,\nKobiKolay Ekibi");
    setSelectedSector("all");
    setSelectedStatus("all");
    setTargetCount(0);
    setTargetPreview([]);
  };

  const openCreate = () => {
    resetForm();
    setShowCreateDialog(true);
  };

  const handleDispatch = () => {
    if (!campaignName.trim() || !subject.trim() || !content.trim()) {
      toast.error("Tüm alanları doldurun");
      return;
    }
    if (targetCount === 0) {
      toast.error("Hedef kitle boş, filtre ayarlarını kontrol edin");
      return;
    }

    startTransition(async () => {
      try {
        const result = await createAndDispatchCampaignAction({
          name: campaignName.trim(),
          subject: subject.trim(),
          content: content.trim(),
          sectorId: selectedSector !== "all" ? selectedSector : undefined,
          agencyStatus: selectedStatus !== "all" ? selectedStatus : undefined,
        });
        toast.success(`Kampanya ${result.count} acenteye gönderildi!`);
        setShowCreateDialog(false);
        window.location.reload();
      } catch (err: any) {
        toast.error(err.message || "Gönderim başarısız");
      }
    });
  };

  const handleDelete = (campaign: Campaign) => {
    setDeletingCampaign(campaign);
    setShowDeleteDialog(true);
  };

  const confirmDelete = () => {
    if (!deletingCampaign) return;
    startTransition(async () => {
      try {
        await deleteCampaignAction(deletingCampaign.id);
        toast.success("Kampanya silindi");
        setShowDeleteDialog(false);
        window.location.reload();
      } catch (err: any) {
        toast.error(err.message || "Silme başarısız");
      }
    });
  };

  const canProceedStep1 = campaignName.trim() && subject.trim() && content.trim();
  const canProceedStep2 = targetCount > 0;

  return (
    <>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">Tanıtım Kampanyaları</h2>
          <p className="text-sm text-slate-500">
            Acentelerinize toplu e-posta gönderin ve performanslarını takip edin.
          </p>
        </div>
        <Button onClick={openCreate} className="gap-2 rounded-xl shadow-lg shadow-primary/20">
          <Plus size={16} /> Yeni Kampanya Oluştur
        </Button>
      </div>

      {/* Campaign List */}
      <div className="space-y-4">
        {campaigns.length === 0 ? (
          <div className="text-center py-20 bg-slate-50 border-2 border-dashed rounded-2xl">
            <Mail size={48} className="mx-auto text-muted-foreground/30 mb-4" />
            <h3 className="font-semibold text-lg">Henüz Kampanya Yok</h3>
            <p className="text-sm text-muted-foreground mt-1 max-w-sm mx-auto">
              Acentelerinize toplu duyuru veya tanıtım göndermek için ilk kampanyayı oluşturun.
            </p>
            <Button onClick={openCreate} className="mt-4 gap-2 rounded-xl" variant="outline">
              <Plus size={16} /> Kampanya Oluştur
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {campaigns.map((campaign) => (
              <div
                key={campaign.id}
                className="bg-white rounded-2xl p-6 border shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 group hover:shadow-md transition-shadow"
              >
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
                    <Send size={20} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1.5">
                      <h4 className="font-semibold text-slate-900">{campaign.name}</h4>
                      {statusBadge(campaign.status)}
                    </div>
                    <p className="text-sm text-slate-500 line-clamp-1">{campaign.subject}</p>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-muted-foreground mt-3">
                      <span className="flex items-center gap-1">
                        <Users size={12} />
                        <span className="font-semibold">{campaign.targetCount}</span> hedef acente
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock size={12} />
                        {format(new Date(campaign.createdAt), "dd MMM yyyy, HH:mm", { locale: tr })}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {campaign.status === "COMPLETED" && (
                    <div className="flex flex-col items-end gap-1.5 min-w-[100px] mr-4">
                      <div className="text-xs text-muted-foreground">Gönderim</div>
                      <div className="flex items-center gap-1.5 text-emerald-600">
                        <CheckCircle2 size={14} />
                        <span className="text-sm font-bold">{campaign.targetCount} gönderildi</span>
                      </div>
                    </div>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 rounded-lg text-muted-foreground hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => handleDelete(campaign)}
                  >
                    <Trash2 size={14} />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ─── KAMPANYA OLUŞTUR WIZARD ─── */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-hidden flex flex-col rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Rocket size={20} className="text-primary" />
              Yeni Kampanya Oluştur
            </DialogTitle>
            <DialogDescription>
              3 adımda kampanyanızı hazırlayın ve gönderin.
            </DialogDescription>
          </DialogHeader>

          {/* Step Indicator */}
          <div className="flex items-center gap-2 py-3 border-b">
            {[
              { num: 1, label: "İçerik" },
              { num: 2, label: "Hedef Kitle" },
              { num: 3, label: "Önizleme & Gönder" },
            ].map((s, i) => (
              <div key={s.num} className="flex items-center gap-2">
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                    step >= s.num
                      ? "bg-primary text-white"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {step > s.num ? <CheckCircle2 size={14} /> : s.num}
                </div>
                <span className={`text-sm font-medium ${step >= s.num ? "text-slate-900" : "text-muted-foreground"}`}>
                  {s.label}
                </span>
                {i < 2 && <ChevronRight size={14} className="text-muted-foreground mx-1" />}
              </div>
            ))}
          </div>

          {/* Step Content */}
          <div className="flex-1 overflow-y-auto py-4 space-y-4">
            {/* ─── ADIM 1: İÇERİK ─── */}
            {step === 1 && (
              <>
                <div className="space-y-2">
                  <Label>Kampanya Adı *</Label>
                  <Input
                    value={campaignName}
                    onChange={(e) => setCampaignName(e.target.value)}
                    placeholder="Örn: Mayıs 2026 Otel CRM Tanıtımı"
                    className="rounded-xl"
                  />
                </div>
                <div className="space-y-2">
                  <Label>E-posta Konu Satırı *</Label>
                  <Input
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="Örn: KobiKolay CRM - Sektörünüze Özel Çözüm"
                    className="rounded-xl"
                  />
                </div>
                <div className="space-y-2">
                  <Label>E-posta İçeriği *</Label>
                  <Textarea
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    className="rounded-xl min-h-[200px] font-mono text-sm"
                  />
                  <p className="text-xs text-muted-foreground">
                    Kullanılabilir değişkenler: {"{{companyName}}, {{documentNo}}, {{unsubscribeUrl}}"}
                  </p>
                </div>
              </>
            )}

            {/* ─── ADIM 2: HEDEF KİTLE ─── */}
            {step === 2 && (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Sektör Filtresi</Label>
                    <Select value={selectedSector} onValueChange={setSelectedSector}>
                      <SelectTrigger className="rounded-xl">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Tüm Sektörler</SelectItem>
                        {sectors.map((s) => (
                          <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Durum Filtresi</Label>
                    <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                      <SelectTrigger className="rounded-xl">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Tüm Durumlar</SelectItem>
                        <SelectItem value="ACTIVE">Aktif</SelectItem>
                        <SelectItem value="PASSIVE">Pasif</SelectItem>
                        <SelectItem value="LEAD">Lead</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Target Count */}
                <div className="bg-primary/5 border border-primary/20 rounded-2xl p-5 text-center">
                  {loadingTargets ? (
                    <RefreshCw className="animate-spin mx-auto text-primary" size={24} />
                  ) : (
                    <>
                      <div className="flex items-center justify-center gap-2 mb-1">
                        <Target size={20} className="text-primary" />
                        <span className="text-3xl font-bold text-primary">{targetCount}</span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        acente bu filtrelere uyuyor ve e-posta alabilir
                      </p>
                    </>
                  )}
                </div>

                {/* Preview List */}
                {targetPreview.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">
                      Hedef Kitle Önizleme (ilk 20)
                    </p>
                    <div className="bg-white border rounded-xl divide-y max-h-[200px] overflow-y-auto">
                      {targetPreview.map((t) => (
                        <div key={t.id} className="px-4 py-2.5 flex items-center justify-between text-sm">
                          <span className="font-medium text-slate-900">{t.companyName}</span>
                          <span className="text-xs text-muted-foreground">{t.email}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}

            {/* ─── ADIM 3: ÖNİZLEME & GÖNDER ─── */}
            {step === 3 && (
              <>
                <div className="bg-white border rounded-2xl divide-y">
                  <div className="px-5 py-3 flex items-center justify-between">
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Kampanya Adı</span>
                    <span className="text-sm font-medium">{campaignName}</span>
                  </div>
                  <div className="px-5 py-3 flex items-center justify-between">
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Konu</span>
                    <span className="text-sm font-medium">{subject}</span>
                  </div>
                  <div className="px-5 py-3 flex items-center justify-between">
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Hedef Kitle</span>
                    <span className="text-sm font-bold text-primary">{targetCount} acente</span>
                  </div>
                  <div className="px-5 py-3 flex items-center justify-between">
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Sektör</span>
                    <span className="text-sm">
                      {selectedSector === "all"
                        ? "Tümü"
                        : sectors.find((s) => s.id === selectedSector)?.name || "—"}
                    </span>
                  </div>
                </div>

                <div className="space-y-2">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">E-posta Önizleme</p>
                  <div className="bg-slate-50 border rounded-2xl p-5">
                    <p className="text-xs text-muted-foreground mb-2">Konu: <strong>{subject}</strong></p>
                    <div className="bg-white border rounded-xl p-4 text-sm leading-relaxed whitespace-pre-wrap max-h-[200px] overflow-y-auto">
                      {content}
                    </div>
                  </div>
                </div>

                <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-700 flex items-start gap-2">
                  <AlertTriangle size={16} className="mt-0.5 shrink-0" />
                  <span>
                    <strong>{targetCount} acenteye</strong> e-posta gönderilecek. Abonelikten çıkan acenteler otomatik olarak hariç tutulur. Bu işlem geri alınamaz.
                  </span>
                </div>
              </>
            )}
          </div>

          {/* Footer Navigation */}
          <DialogFooter className="border-t pt-4">
            <div className="flex w-full justify-between">
              <div>
                {step > 1 && (
                  <Button variant="outline" onClick={() => setStep(step - 1)} disabled={isPending} className="rounded-xl">
                    Geri
                  </Button>
                )}
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setShowCreateDialog(false)} disabled={isPending} className="rounded-xl">
                  İptal
                </Button>
                {step < 3 ? (
                  <Button
                    onClick={() => setStep(step + 1)}
                    disabled={step === 1 ? !canProceedStep1 : !canProceedStep2}
                    className="gap-2 rounded-xl"
                  >
                    İleri <ArrowRight size={16} />
                  </Button>
                ) : (
                  <Button
                    onClick={handleDispatch}
                    disabled={isPending || targetCount === 0}
                    className="gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700"
                  >
                    {isPending ? (
                      <RefreshCw className="animate-spin" size={16} />
                    ) : (
                      <Rocket size={16} />
                    )}
                    {isPending ? "Gönderiliyor..." : `${targetCount} Acenteye Gönder`}
                  </Button>
                )}
              </div>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── SİL DİALOG ─── */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle size={20} /> Kampanyayı Sil
            </DialogTitle>
            <DialogDescription>
              &quot;{deletingCampaign?.name}&quot; kampanyasını ve tüm gönderim loglarını silmek istediğinize emin misiniz?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)} disabled={isPending} className="rounded-xl">
              Vazgeç
            </Button>
            <Button variant="destructive" onClick={confirmDelete} disabled={isPending} className="gap-2 rounded-xl">
              {isPending ? <RefreshCw className="animate-spin" size={16} /> : <Trash2 size={16} />}
              Evet, Sil
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
