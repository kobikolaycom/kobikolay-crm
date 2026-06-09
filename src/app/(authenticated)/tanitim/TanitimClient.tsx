"use client";

import { useRouter } from "next/navigation";

import { useState, useEffect, useTransition, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
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
  Eye, ChevronRight, Search, MapPin, Filter, X, TestTube2,
  Megaphone, Building2, MessageSquare, MailCheck, MailX,
} from "lucide-react";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import {
  getSectorsAction,
  getTargetCountAction,
  getTargetAgenciesPreviewAction,
  createAndDispatchCampaignAction,
  deleteCampaignAction,
  getFilteredAgenciesAction,
  getDistrictsAction,
  sendBulkPromotionAction,
  sendTestEmailAction,
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

interface EmailTemplate {
  id: string;
  name: string;
  category: string;
  subject: string | null;
  content: string;
  isDefault: boolean;
}

interface AgencyRow {
  id: string;
  companyName: string;
  authorizedPerson: string | null;
  status: string;
  contacts: { email: string | null; province: string | null; district: string | null }[];
  sectors: { id: string; name: string }[];
  mailLogs: { sentAt: string | null; status: string }[];
  _count: { mailLogs: number; campaignLogs: number; conversations: number };
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

function agencyStatusBadge(status: string) {
  const map: Record<string, { label: string; cls: string }> = {
    ACTIVE: { label: "Aktif", cls: "bg-emerald-100 text-emerald-700" },
    PASSIVE: { label: "Pasif", cls: "bg-slate-100 text-slate-600" },
    LEAD: { label: "Lead", cls: "bg-blue-100 text-blue-700" },
  };
  const v = map[status] || { label: status, cls: "bg-muted text-muted-foreground" };
  return <Badge variant="outline" className={`text-[9px] ${v.cls}`}>{v.label}</Badge>;
}

function mailStatusIcon(count: { mailLogs: number; campaignLogs: number }) {
  const total = count.mailLogs + count.campaignLogs;
  if (total > 0) {
    return <Badge variant="outline" className="text-[9px] bg-violet-50 text-violet-600 border-violet-200 gap-0.5"><MailCheck size={9} /> Gönderildi</Badge>;
  }
  return <Badge variant="outline" className="text-[9px] bg-slate-50 text-slate-500 gap-0.5"><MailX size={9} /> Yeni</Badge>;
}

export function TanitimClient({
  campaigns: initialCampaigns,
  templates: initialTemplates,
  provinces: initialProvinces,
  sectors: initialSectors,
}: {
  campaigns: Campaign[];
  templates: EmailTemplate[];
  provinces: string[];
  sectors: Sector[];
}) {
  const router = useRouter();
  const [campaigns] = useState(initialCampaigns);
  const [isPending, startTransition] = useTransition();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deletingCampaign, setDeletingCampaign] = useState<Campaign | null>(null);

  // Wizard state
  const [step, setStep] = useState(1); // 1: İçerik, 2: Hedef Kitle, 3: Önizleme & Gönder

  // Step 1: İçerik
  const [campaignName, setCampaignName] = useState("");
  const [subject, setSubject] = useState("");
  const [content, setContent] = useState("");
  const [selectedTemplateId, setSelectedTemplateId] = useState("custom");

  const [activeField, setActiveField] = useState<"subject" | "content">("content");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const insertPlaceholder = (placeholder: string) => {
    if (activeField === "subject") {
      const input = document.getElementById("campaign-subject") as HTMLInputElement;
      if (!input) {
        setSubject((prev) => prev + placeholder);
        return;
      }

      const start = input.selectionStart ?? 0;
      const end = input.selectionEnd ?? 0;
      const text = input.value;
      const before = text.substring(0, start);
      const after = text.substring(end, text.length);

      const newSubject = before + placeholder + after;
      setSubject(newSubject);

      setTimeout(() => {
        input.focus();
        input.setSelectionRange(start + placeholder.length, start + placeholder.length);
      }, 0);
    } else {
      const textarea = textareaRef.current;
      if (!textarea) {
        setContent((prev) => prev + placeholder);
        return;
      }

      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const text = textarea.value;
      const before = text.substring(0, start);
      const after = text.substring(end, text.length);

      const newContent = before + placeholder + after;
      setContent(newContent);

      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(start + placeholder.length, start + placeholder.length);
      }, 0);
    }
  };

  // Step 2: Filtreler + Acente Seçimi
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedProvince, setSelectedProvince] = useState("all");
  const [selectedDistrict, setSelectedDistrict] = useState("all");
  const [districts, setDistricts] = useState<string[]>([]);
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [selectedSector, setSelectedSector] = useState("all");
  const [mailHistory, setMailHistory] = useState("all");
  const [contactHistory, setContactHistory] = useState("all");
  const [agencies, setAgencies] = useState<AgencyRow[]>([]);
  const [totalAgencies, setTotalAgencies] = useState(0);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [loadingAgencies, setLoadingAgencies] = useState(false);

  // Şablon seçilince içeriği doldur
  const handleTemplateSelect = (templateId: string) => {
    setSelectedTemplateId(templateId);
    if (templateId === "custom") return;
    const tpl = initialTemplates.find(t => t.id === templateId);
    if (tpl) {
      setContent(tpl.content);
      if (tpl.subject) setSubject(tpl.subject);
    }
  };

  // İl değişince ilçeleri yükle
  useEffect(() => {
    setSelectedDistrict("all");
    if (selectedProvince && selectedProvince !== "all") {
      getDistrictsAction(selectedProvince).then(setDistricts).catch(() => setDistricts([]));
    } else {
      setDistricts([]);
    }
  }, [selectedProvince]);

  // Acente listesini filtrele
  const loadAgencies = useCallback(() => {
    setLoadingAgencies(true);
    getFilteredAgenciesAction({
      search: searchQuery || undefined,
      province: selectedProvince !== "all" ? selectedProvince : undefined,
      district: selectedDistrict !== "all" ? selectedDistrict : undefined,
      status: selectedStatus !== "all" ? selectedStatus : undefined,
      sectorId: selectedSector !== "all" ? selectedSector : undefined,
      mailHistory: mailHistory !== "all" ? mailHistory : undefined,
      contactHistory: contactHistory !== "all" ? contactHistory : undefined,
    }).then(({ data, total }) => {
      setAgencies(data);
      setTotalAgencies(total);
      setLoadingAgencies(false);
    }).catch(() => {
      setLoadingAgencies(false);
    });
  }, [searchQuery, selectedProvince, selectedDistrict, selectedStatus, selectedSector, mailHistory, contactHistory]);

  // Step 2'ye geçince acente listesini yükle
  useEffect(() => {
    if (step === 2) {
      loadAgencies();
    }
  }, [step, loadAgencies]);

  // Select all toggle
  const toggleSelectAll = () => {
    if (selectedIds.length === agencies.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(agencies.map(a => a.id));
    }
  };

  // Single toggle
  const toggleSelect = (id: string) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  // Reset
  const resetForm = () => {
    setStep(1);
    setCampaignName("");
    setSubject("");
    setContent("");
    setSelectedTemplateId("custom");
    setSearchQuery("");
    setSelectedProvince("all");
    setSelectedDistrict("all");
    setSelectedStatus("all");
    setSelectedSector("all");
    setMailHistory("all");
    setContactHistory("all");
    setAgencies([]);
    setSelectedIds([]);
  };

  const openCreate = () => {
    resetForm();
    setShowCreateDialog(true);
  };

  // Test mail gönder
  const handleTestEmail = () => {
    if (!subject.trim() || !content.trim()) {
      toast.error("Konu ve içerik alanlarını doldurun");
      return;
    }
    startTransition(async () => {
      try {
        const result = await sendTestEmailAction({
          subject: subject.trim(),
          content: content.trim(),
        });
        toast.success(`Test maili ${result.sentTo} adresine gönderildi!`);
      } catch (err: any) {
        toast.error(err.message || "Test gönderimi başarısız");
      }
    });
  };

  // Toplu gönder
  const handleDispatch = () => {
    if (!campaignName.trim() || !subject.trim() || !content.trim()) {
      toast.error("Tüm alanları doldurun");
      return;
    }
    if (selectedIds.length === 0) {
      toast.error("En az bir acente seçin");
      return;
    }

    startTransition(async () => {
      try {
        const result = await sendBulkPromotionAction({
          agencyIds: selectedIds,
          subject: subject.trim(),
          content: content.trim(),
          campaignName: campaignName.trim(),
        });
        toast.success(`${result.sent} acenteye mail gönderildi!${result.failed > 0 ? ` (${result.failed} başarısız)` : ""}`);
        setShowCreateDialog(false);
        router.refresh();
      } catch (err: any) {
        toast.error(err.message || "Gönderim başarısız");
      }
    });
  };

  // Delete
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
        router.refresh();
      } catch (err: any) {
        toast.error(err.message || "Silme başarısız");
      }
    });
  };

  // Tüm kullanılabilir şablonlar (Teklif ve Özel Gün Şablonları)
  const promotionTemplates = initialTemplates.filter(t => t.category === "offer_intro" || t.category === "special");

  const canProceedStep1 = campaignName.trim() && subject.trim() && content.trim();
  const canProceedStep2 = selectedIds.length > 0;

  // Canlı önizleme (örnek veriyle)
  const previewContent = content
    .replace(/{{companyName}}/g, "ABC Turizm Ltd.")
    .replace(/{{authorizedPerson}}/g, "Ahmet Bey")
    .replace(/{{documentNo}}/g, "12345")
    .replace(/{{sectorNames}}/g, "Yazılım, Turizm")
    .replace(/{{currentDate}}/g, new Date().toLocaleDateString("tr-TR"))
    .replace(/{{unsubscribeUrl}}/g, "#");

  return (
    <>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="space-y-1">
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <Megaphone size={24} className="text-primary" /> Tanıtım Kampanyaları
          </h2>
          <p className="text-xs sm:text-sm text-slate-500">
            Toplu tanıtım ve özel gün e-postalarınızı gelişmiş filtrelerle gönderin.
          </p>
        </div>
        <Button onClick={openCreate} className="gap-2 rounded-xl shadow-lg shadow-primary/20 w-full sm:w-auto">
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
                    className="h-8 w-8 rounded-lg text-muted-foreground hover:text-red-600 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity"
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
        <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-hidden flex flex-col rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Rocket size={20} className="text-primary" />
              Yeni Kampanya Oluştur
            </DialogTitle>
            <DialogDescription>
              3 adımda kampanyanızı hazırlayın, filtreleyin ve gönderin.
            </DialogDescription>
          </DialogHeader>

          {/* Step Indicator */}
          <div className="flex items-center gap-2 py-3 border-b">
            {[
              { num: 1, label: "İçerik & Şablon" },
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
            {/* ─── ADIM 1: İÇERİK & ŞABLON ─── */}
            {step === 1 && (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                    <Label>Şablon Seç</Label>
                    <Select value={selectedTemplateId} onValueChange={handleTemplateSelect}>
                      <SelectTrigger className="rounded-xl">
                        <SelectValue placeholder="Şablon seçin..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="custom">✏️ Serbest Yaz</SelectItem>
                        {promotionTemplates.map((t) => (
                          <SelectItem key={t.id} value={t.id}>
                            {t.category === "special" ? "🎉" : t.category === "offer_intro" ? "📢" : "🎁"} {t.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>E-posta Konu Satırı *</Label>
                  <Input
                    id="campaign-subject"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    onFocus={() => setActiveField("subject")}
                    onClick={() => setActiveField("subject")}
                    placeholder="Örn: KobiKolay CRM - Sektörünüze Özel Çözüm"
                    className="rounded-xl"
                  />
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>E-posta İçeriği *</Label>
                    <Textarea
                      ref={textareaRef}
                      value={content}
                      onChange={(e) => setContent(e.target.value)}
                      onFocus={() => setActiveField("content")}
                      onClick={() => setActiveField("content")}
                      className="rounded-xl min-h-[220px] font-mono text-sm"
                      placeholder="Sayın {{authorizedPerson}},&#10;&#10;{{companyName}} olarak sizlere..."
                    />
                    <div className="flex flex-wrap gap-1.5 mt-1">
                      {["{{companyName}}", "{{authorizedPerson}}", "{{sectorNames}}", "{{currentDate}}", "{{unsubscribeUrl}}"].map(v => (
                        <button
                          key={v}
                          type="button"
                          onMouseDown={(e) => { e.preventDefault(); insertPlaceholder(v); }}
                          className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 hover:bg-primary/10 hover:text-primary transition-colors font-mono cursor-pointer"
                        >
                          {v}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="flex items-center gap-1.5"><Eye size={14} /> Canlı Önizleme</Label>
                    {(() => {
                      const hasHtml = /<[a-z/][\s\S]*>/i.test(previewContent);
                      const formatted = hasHtml ? previewContent : previewContent.replace(/\n/g, "<br>");
                      return (
                        <div 
                          className="bg-slate-50 border rounded-xl p-4 text-sm leading-relaxed min-h-[220px] max-h-[280px] overflow-y-auto"
                          dangerouslySetInnerHTML={{ 
                            __html: formatted || '<span class="text-muted-foreground italic">İçerik yazın, önizleme burada görünecek...</span>' 
                          }}
                        />
                      );
                    })()}
                  </div>
                </div>
              </>
            )}

            {/* ─── ADIM 2: HEDEF KİTLE ─── */}
            {step === 2 && (
              <>
                {/* Filtreler */}
                <div className="bg-slate-50 rounded-2xl border p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-semibold text-slate-700 flex items-center gap-1.5">
                      <Filter size={14} /> Filtreler
                    </h4>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-xs h-7 rounded-lg"
                      onClick={() => {
                        setSearchQuery("");
                        setSelectedProvince("all");
                        setSelectedDistrict("all");
                        setSelectedStatus("all");
                        setSelectedSector("all");
                        setMailHistory("all");
                        setContactHistory("all");
                      }}
                    >
                      <X size={12} className="mr-1" /> Temizle
                    </Button>
                  </div>

                  {/* Arama */}
                  <div className="relative">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Acente ara..."
                      className="pl-9 rounded-xl h-9 text-sm"
                    />
                  </div>

                  {/* Filtre row 1: İl, İlçe, Durum, Sektör */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs flex items-center gap-1"><MapPin size={10} /> İl</Label>
                      <Select value={selectedProvince} onValueChange={setSelectedProvince}>
                        <SelectTrigger className="rounded-xl h-9 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Tümü</SelectItem>
                          {initialProvinces.map((p) => (
                            <SelectItem key={p} value={p}>{p}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs flex items-center gap-1"><MapPin size={10} /> İlçe</Label>
                      <Select value={selectedDistrict} onValueChange={setSelectedDistrict} disabled={selectedProvince === "all"}>
                        <SelectTrigger className="rounded-xl h-9 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Tümü</SelectItem>
                          {districts.map((d) => (
                            <SelectItem key={d} value={d}>{d}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs flex items-center gap-1"><Building2 size={10} /> Durum</Label>
                      <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                        <SelectTrigger className="rounded-xl h-9 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Tümü</SelectItem>
                          <SelectItem value="ACTIVE">Aktif</SelectItem>
                          <SelectItem value="PASSIVE">Pasif</SelectItem>
                          <SelectItem value="LEAD">Lead</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs flex items-center gap-1"><FileText size={10} /> Sektör</Label>
                      <Select value={selectedSector} onValueChange={setSelectedSector}>
                        <SelectTrigger className="rounded-xl h-9 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Tümü</SelectItem>
                          {initialSectors.map((s) => (
                            <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Filtre row 2: Mail geçmişi, İletişim */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs flex items-center gap-1"><Mail size={10} /> Mail Geçmişi</Label>
                      <Select value={mailHistory} onValueChange={setMailHistory}>
                        <SelectTrigger className="rounded-xl h-9 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Tümü</SelectItem>
                          <SelectItem value="sent">✉️ Daha Önce Gönderildi</SelectItem>
                          <SelectItem value="not_sent">🆕 Hiç Gönderilmedi</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs flex items-center gap-1"><MessageSquare size={10} /> İletişim</Label>
                      <Select value={contactHistory} onValueChange={setContactHistory}>
                        <SelectTrigger className="rounded-xl h-9 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Tümü</SelectItem>
                          <SelectItem value="contacted">💬 İletişim Kuruldu</SelectItem>
                          <SelectItem value="not_contacted">⚪ İletişim Kurulmadı</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Filtre butonu + sayaç */}
                  <div className="flex items-center justify-between pt-1">
                    <Button variant="outline" size="sm" className="rounded-xl h-8 text-xs gap-1" onClick={loadAgencies} disabled={loadingAgencies}>
                      {loadingAgencies ? <RefreshCw size={12} className="animate-spin" /> : <Search size={12} />}
                      Filtrele
                    </Button>
                    <div className="flex items-center gap-1.5 text-sm">
                      <Target size={14} className="text-primary" />
                      <span className="font-bold text-primary">{totalAgencies}</span>
                      <span className="text-muted-foreground text-xs">acente bulundu</span>
                    </div>
                  </div>
                </div>

                {/* Acente Listesi */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <button
                      type="button"
                      onClick={toggleSelectAll}
                      className="flex items-center gap-2 text-sm font-medium text-slate-700 hover:text-primary transition-colors cursor-pointer"
                    >
                      <Checkbox
                        checked={agencies.length > 0 && selectedIds.length === agencies.length}
                        onCheckedChange={toggleSelectAll}
                      />
                      Tümünü Seç ({agencies.length})
                    </button>
                    {selectedIds.length > 0 && (
                      <Badge className="bg-primary/10 text-primary border-primary/20 text-xs">
                        {selectedIds.length} acente seçildi
                      </Badge>
                    )}
                  </div>

                  <div className="bg-white border rounded-xl divide-y max-h-[300px] overflow-y-auto">
                    {loadingAgencies ? (
                      <div className="flex items-center justify-center py-10">
                        <RefreshCw size={20} className="animate-spin text-primary" />
                      </div>
                    ) : agencies.length === 0 ? (
                      <div className="text-center py-10 text-sm text-muted-foreground">
                        Filtrelere uygun acente bulunamadı.
                      </div>
                    ) : (
                      agencies.map((agency) => (
                        <div
                          key={agency.id}
                          className={`px-4 py-2.5 flex items-center gap-3 hover:bg-slate-50 transition-colors cursor-pointer ${
                            selectedIds.includes(agency.id) ? "bg-primary/5" : ""
                          }`}
                          onClick={() => toggleSelect(agency.id)}
                        >
                          <Checkbox
                            checked={selectedIds.includes(agency.id)}
                            onCheckedChange={() => toggleSelect(agency.id)}
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium text-slate-900 truncate">{agency.companyName}</span>
                              {agencyStatusBadge(agency.status)}
                              {mailStatusIcon(agency._count)}
                            </div>
                            <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                              {agency.contacts[0]?.province && (
                                <span className="flex items-center gap-0.5">
                                  <MapPin size={9} /> {agency.contacts[0].province}
                                  {agency.contacts[0]?.district && ` / ${agency.contacts[0].district}`}
                                </span>
                              )}
                              {agency.contacts[0]?.email && (
                                <span className="truncate">{agency.contacts[0].email}</span>
                              )}
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
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
                    <span className="text-sm font-bold text-primary">{selectedIds.length} acente</span>
                  </div>
                  <div className="px-5 py-3 flex items-center justify-between">
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Şablon</span>
                    <span className="text-sm">
                      {selectedTemplateId === "custom"
                        ? "Serbest Yazı"
                        : initialTemplates.find(t => t.id === selectedTemplateId)?.name || "—"}
                    </span>
                  </div>
                </div>

                <div className="space-y-2">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">E-posta Önizleme (Örnek Veriyle)</p>
                  <div className="bg-slate-50 border rounded-2xl p-5">
                    <p className="text-xs text-muted-foreground mb-2">Konu: <strong>{subject}</strong></p>
                    {(() => {
                      const hasHtml = /<[a-z/][\s\S]*>/i.test(previewContent);
                      const formatted = hasHtml ? previewContent : previewContent.replace(/\n/g, "<br>");
                      return (
                        <div 
                          className="bg-white border rounded-xl p-4 text-sm leading-relaxed max-h-[200px] overflow-y-auto"
                          dangerouslySetInnerHTML={{ 
                            __html: formatted || '<span class="text-muted-foreground italic">İçerik yazın, önizleme burada görünecek...</span>' 
                          }}
                        />
                      );
                    })()}
                  </div>
                </div>

                <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-700 flex items-start gap-2">
                  <AlertTriangle size={16} className="mt-0.5 shrink-0" />
                  <span>
                    <strong>{selectedIds.length} acenteye</strong> e-posta gönderilecek.
                    Her 10 mailden sonra gönderim hızı yavaşlatılır (SMTP güvenliği).
                    Abonelikten çıkan acenteler otomatik hariç tutulur. Bu işlem geri alınamaz.
                  </span>
                </div>
              </>
            )}
          </div>

          {/* Footer Navigation */}
          <DialogFooter className="border-t pt-4">
            <div className="flex w-full justify-between">
              <div className="flex gap-2">
                {step > 1 && (
                  <Button variant="outline" onClick={() => setStep(step - 1)} disabled={isPending} className="rounded-xl">
                    Geri
                  </Button>
                )}
                {step === 1 && (
                  <Button
                    variant="outline"
                    onClick={handleTestEmail}
                    disabled={isPending || !subject.trim() || !content.trim()}
                    className="gap-1.5 rounded-xl text-xs"
                  >
                    <TestTube2 size={14} /> Kendime Test Gönder
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
                    disabled={isPending || selectedIds.length === 0}
                    className="gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700"
                  >
                    {isPending ? (
                      <RefreshCw className="animate-spin" size={16} />
                    ) : (
                      <Rocket size={16} />
                    )}
                    {isPending ? "Gönderiliyor..." : `${selectedIds.length} Acenteye Gönder`}
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
