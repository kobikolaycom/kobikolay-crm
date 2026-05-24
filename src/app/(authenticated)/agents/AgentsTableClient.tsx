"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  MoreHorizontal, Send, X, RefreshCw, AlertCircle,
  Search, ChevronLeft, ChevronRight, Users, Mail,
  Upload, FileSpreadsheet, CheckCircle2, FileText,
  ExternalLink, Trash2, AlertTriangle, Plus, Building2, Phone
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { dispatchBulkPitchChunkAction, deleteAgencyAction, createAgencyAction, resetBatchImportedAgenciesAction } from "./actions";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useDebounce } from "use-debounce";

interface AgentsTableClientProps {
  agencies: any[];
  sectors: any[];
  total: number;
  currentPage: number;
  pageSize: number;
  initialCampaignFilter?: string;
  initialDateFrom?: string;
  initialDateTo?: string;
}

function statusBadge(status: string) {
  const map: Record<string, { label: string; cls: string }> = {
    ACTIVE:   { label: "Aktif", cls: "bg-emerald-100 text-emerald-700 border-emerald-200" },
    PASSIVE:  { label: "Pasif", cls: "bg-slate-100 text-slate-600 border-slate-200" },
    LEAD:     { label: "Lead", cls: "bg-blue-100 text-blue-700 border-blue-200" },
    BLOCKED:  { label: "Engelli", cls: "bg-red-100 text-red-700 border-red-200" },
    REJECTED: { label: "Reddedildi", cls: "bg-orange-100 text-orange-700 border-orange-200" },
  };
  const v = map[status] || { label: status, cls: "bg-muted text-muted-foreground" };
  return <Badge variant="outline" className={`text-[10px] font-semibold ${v.cls}`}>{v.label}</Badge>;
}

export function AgentsTableClient({ agencies, sectors, total, currentPage, pageSize, initialCampaignFilter = "all", initialDateFrom = "", initialDateTo = "" }: AgentsTableClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState(searchParams.get("search") || "");
  const [debouncedSearch] = useDebounce(searchTerm, 400);
  const [dateFrom, setDateFrom] = useState(initialDateFrom);
  const [dateTo, setDateTo] = useState(initialDateTo);

  // Excel Import State
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importSectorId, setImportSectorId] = useState("none");
  const [importing, setImporting] = useState(false);
  const [importPercent, setImportPercent] = useState(0);
  const [importProcessed, setImportProcessed] = useState(0);
  const [importTotal, setImportTotal] = useState(0);
  const [importCreatedLive, setImportCreatedLive] = useState(0);
  const [importSkippedLive, setImportSkippedLive] = useState(0);
  const [importResult, setImportResult] = useState<{ created: number; skipped: number; total: number; errors: string[] } | null>(null);

  // Reset Batch Upload State
  const [showResetConfirmDialog, setShowResetConfirmDialog] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  // Delete Agency State
  const [showDeleteAgencyDialog, setShowDeleteAgencyDialog] = useState(false);
  const [deletingAgency, setDeletingAgency] = useState<any>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Create Agency State
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [newCompanyName, setNewCompanyName] = useState("");
  const [newDocumentNo, setNewDocumentNo] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newAddress, setNewAddress] = useState("");
  const [newProvince, setNewProvince] = useState("");
  const [newDistrict, setNewDistrict] = useState("");
  const [newAuthorized, setNewAuthorized] = useState("");
  const [newWebsite, setNewWebsite] = useState("");
  const [newSectorId, setNewSectorId] = useState("none");

  // Modal State
  const [selectedSectorId, setSelectedSectorId] = useState("");
  const [coverLetter, setCoverLetter] = useState(
    "Sayın {{authorizedPerson}},\n\nDeğerli iş ortağımız {{agencyName}} için hazırladığımız faaliyet alanı çözümlerimizi incelemenizi rica ederiz.\n\nSaygılarımızla,\nKobiKolay Ekibi"
  );
  const [isSending, setIsSending] = useState(false);
  const [progress, setProgress] = useState(0);

  // URL based search
  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString());
    if (debouncedSearch) {
      params.set("search", debouncedSearch);
    } else {
      params.delete("search");
    }
    params.delete("page");
    router.replace(`${pathname}?${params.toString()}`);
  }, [debouncedSearch, pathname, router, searchParams]);

  // Toggle selection
  const toggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const toggleAll = () => {
    if (selectedIds.length === agencies.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(agencies.map((a) => a.id));
    }
  };

  // Pagination
  const totalPages = Math.ceil(total / pageSize);
  const goToPage = (page: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", String(page));
    router.push(`${pathname}?${params.toString()}`);
  };

  // Bulk Send
  const handleBulkSend = async () => {
    if (!selectedSectorId || selectedIds.length === 0) return;
    setIsSending(true);
    setProgress(0);

    const chunkSize = 5;
    const totalChunks = Math.ceil(selectedIds.length / chunkSize);

    try {
      for (let i = 0; i < totalChunks; i++) {
        await dispatchBulkPitchChunkAction(
          selectedIds,
          selectedSectorId,
          coverLetter,
          i,
          chunkSize
        );
        setProgress(Math.round(((i + 1) / totalChunks) * 100));
      }
      toast.success(`${selectedIds.length} acenteye tanıtım gönderildi`);
      setIsModalOpen(false);
      setSelectedIds([]);
      setProgress(0);
    } catch (error) {
      toast.error("Gönderim sırasında hata oluştu");
    } finally {
      setIsSending(false);
    }
  };

  // Excel Import
  const handleImportFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const validTypes = ["application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "application/vnd.ms-excel"];
      if (!validTypes.includes(file.type) && !file.name.endsWith(".xlsx") && !file.name.endsWith(".xls")) {
        toast.error("Sadece Excel dosyası (.xlsx, .xls) yüklenebilir");
        return;
      }
      setImportFile(file);
      setImportResult(null);
      setImportPercent(0);
    }
  };

  const handleImport = async () => {
    if (!importFile) return;
    setImporting(true);
    setImportResult(null);
    setImportPercent(0);
    setImportProcessed(0);
    setImportTotal(0);
    setImportCreatedLive(0);
    setImportSkippedLive(0);

    try {
      const fd = new FormData();
      fd.append("file", importFile);
      if (importSectorId !== "none") fd.append("sectorId", importSectorId);

      const res = await fetch("/api/agencies/import", { method: "POST", body: fd });

      if (!res.ok) {
        const errData = await res.json();
        toast.error(errData.error || "Import hatası");
        setImporting(false);
        return;
      }

      // Read streaming response
      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            if (!line.trim()) continue;
            try {
              const msg = JSON.parse(line);
              if (msg.type === "start") {
                setImportTotal(msg.total);
              } else if (msg.type === "progress") {
                setImportPercent(msg.percent);
                setImportProcessed(msg.processed);
                setImportCreatedLive(msg.created);
                setImportSkippedLive(msg.skipped);
              } else if (msg.type === "done") {
                setImportResult(msg);
                toast.success(`${msg.created} acente başarıyla eklendi`);
              }
            } catch {
              // Skip malformed JSON lines
            }
          }
        }
      }
    } catch (err) {
      toast.error("İçe aktarma sırasında hata oluştu");
    } finally {
      setImporting(false);
    }
  };

  const resetImport = () => {
    setImportFile(null);
    setImportResult(null);
    setImportSectorId("none");
    setImportPercent(0);
    setImportProcessed(0);
    setImportTotal(0);
    setImportCreatedLive(0);
    setImportSkippedLive(0);
  };

  // Reset Batch Imported Agencies
  const handleResetBatchImport = async () => {
    setIsResetting(true);
    try {
      const res = await resetBatchImportedAgenciesAction();
      toast.success(`${res.count} adet işlem görmemiş pasif acente sıfırlandı.`);
      setShowResetConfirmDialog(false);
      window.location.reload();
    } catch (err: any) {
      toast.error(err.message || "Sıfırlama başarısız");
    } finally {
      setIsResetting(false);
    }
  };

  // Delete Agency
  const handleDeleteAgency = async () => {
    if (!deletingAgency) return;
    setIsDeleting(true);
    try {
      await deleteAgencyAction(deletingAgency.id);
      toast.success(`"${deletingAgency.companyName}" silindi`);
      setShowDeleteAgencyDialog(false);
      setDeletingAgency(null);
      window.location.reload();
    } catch (err: any) {
      toast.error(err.message || "Silme başarısız");
    } finally {
      setIsDeleting(false);
    }
  };

  // Create Agency
  const handleCreateAgency = async () => {
    if (!newCompanyName.trim() || !newDocumentNo.trim() || !newPhone.trim() || !newEmail.trim()) {
      toast.error("Firma adı, TÜRSAB numarası, telefon ve e-posta zorunludur");
      return;
    }
    setIsCreating(true);
    try {
      await createAgencyAction({
        companyName: newCompanyName.trim(),
        documentNo: newDocumentNo.trim(),
        phone: newPhone.trim() || undefined,
        email: newEmail.trim() || undefined,
        address: newAddress.trim() || undefined,
        province: newProvince.trim() || undefined,
        district: newDistrict.trim() || undefined,
        authorizedPerson: newAuthorized.trim() || undefined,
        website: newWebsite.trim() || undefined,
        sectorId: newSectorId !== "none" ? newSectorId : undefined,
      });
      toast.success(`"${newCompanyName.trim()}" başarıyla eklendi`);
      setShowCreateDialog(false);
      resetCreateForm();
      window.location.reload();
    } catch (err: any) {
      toast.error(err.message || "Acente eklenemedi");
    } finally {
      setIsCreating(false);
    }
  };

  const resetCreateForm = () => {
    setNewCompanyName(""); setNewDocumentNo(""); setNewPhone(""); setNewEmail("");
    setNewAddress(""); setNewProvince(""); setNewDistrict("");
    setNewAuthorized(""); setNewWebsite(""); setNewSectorId("none");
  };

  return (
    <>
      {/* Search Bar & Actions */}
      <div className="flex items-center justify-between gap-4 mb-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
          <Input
            placeholder="Acente ara (isim, belge no)..."
            className="pl-9 rounded-xl"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => { resetCreateForm(); setShowCreateDialog(true); }}
            className="gap-2 rounded-xl"
          >
            <Plus size={16} /> Yeni Acente
          </Button>
          <Button
            variant="outline"
            onClick={() => { resetImport(); setShowImportDialog(true); }}
            className="gap-2 rounded-xl"
          >
            <FileSpreadsheet size={16} /> Excel ile Aktar
          </Button>
          <Button
            variant="outline"
            onClick={() => setShowResetConfirmDialog(true)}
            className="gap-2 rounded-xl text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700 font-bold"
          >
            <RefreshCw size={16} /> Test Verisini Sıfırla
          </Button>
          {selectedIds.length > 0 && (
            <Button
              onClick={() => setIsModalOpen(true)}
              className="gap-2 rounded-xl"
            >
              <Send size={16} />
              {selectedIds.length} Acenteye Tanıtım Gönder
            </Button>
          )}
        </div>
      </div>

      {/* Campaign Filter Tabs */}
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <span className="text-xs text-muted-foreground font-semibold mr-1">Filtre:</span>
        {[
          { key: "all", label: "Tümü" },
          { key: "today", label: "Bugün Gönderilenler" },
          { key: "week", label: "Bu Hafta" },
          { key: "month", label: "Bu Ay" },
          { key: "never", label: "Hiç İşlem Yapılmamış" },
        ].map((f) => {
          const isActive = initialCampaignFilter === f.key && !initialDateFrom && !initialDateTo;
          return (
            <Button
              key={f.key}
              size="sm"
              variant={isActive ? "default" : "outline"}
              className={`rounded-lg text-xs h-7 px-3 ${
                f.key === "never" && isActive ? "bg-red-600 hover:bg-red-700" : ""
              }`}
              onClick={() => {
                const params = new URLSearchParams(searchParams.toString());
                if (f.key === "all") {
                  params.delete("campaignFilter");
                } else {
                  params.set("campaignFilter", f.key);
                }
                params.delete("page");
                params.delete("dateFrom");
                params.delete("dateTo");
                setDateFrom("");
                setDateTo("");
                router.push(`${pathname}?${params.toString()}`);
              }}
            >
              {f.label}
            </Button>
          );
        })}

        {/* Date Range */}
        <div className="ml-auto flex items-center gap-2">
          <Input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="rounded-lg h-7 text-xs w-[140px]"
            placeholder="Başlangıç"
          />
          <span className="text-xs text-muted-foreground">—</span>
          <Input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="rounded-lg h-7 text-xs w-[140px]"
          />
          <Button
            size="sm"
            variant={(initialDateFrom || initialDateTo) ? "default" : "outline"}
            className="rounded-lg text-xs h-7 px-3"
            disabled={!dateFrom && !dateTo}
            onClick={() => {
              const params = new URLSearchParams(searchParams.toString());
              params.delete("campaignFilter");
              params.delete("page");
              if (dateFrom) params.set("dateFrom", dateFrom); else params.delete("dateFrom");
              if (dateTo) params.set("dateTo", dateTo); else params.delete("dateTo");
              router.push(`${pathname}?${params.toString()}`);
            }}
          >
            Filtrele
          </Button>
          {(initialDateFrom || initialDateTo) && (
            <Button
              size="sm"
              variant="ghost"
              className="rounded-lg text-xs h-7 px-2 text-red-500 hover:text-red-700"
              onClick={() => {
                const params = new URLSearchParams(searchParams.toString());
                params.delete("dateFrom");
                params.delete("dateTo");
                params.delete("page");
                setDateFrom("");
                setDateTo("");
                router.push(`${pathname}?${params.toString()}`);
              }}
            >
              <X size={14} /> Temizle
            </Button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-slate-50/50">
                <th className="text-left px-4 py-3 w-10">
                  <Checkbox
                    checked={selectedIds.length === agencies.length && agencies.length > 0}
                    onCheckedChange={toggleAll}
                  />
                </th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600">Şirket Adı</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600">Belge No</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600">Yetkili</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600">Faaliyet Alanları</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600">Durum</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600">İletişim</th>
                <th className="text-right px-4 py-3 w-10"></th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {agencies.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-20">
                    <Users size={32} className="mx-auto text-muted-foreground/30 mb-3" />
                    <p className="text-muted-foreground">Acente bulunamadı</p>
                  </td>
                </tr>
              ) : (
                agencies.map((agency) => (
                  <tr key={agency.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-4 py-3">
                      <Checkbox
                        checked={selectedIds.includes(agency.id)}
                        onCheckedChange={() => toggleSelect(agency.id)}
                      />
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/agents/${agency.id}`}
                        className="font-medium text-slate-900 hover:text-primary transition-colors"
                      >
                        {agency.companyName}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground font-mono text-xs">
                      {agency.documentNo}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {agency.authorizedPerson || "—"}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1 flex-wrap">
                        {agency.sectors?.map((s: any) => (
                          <Badge key={s.id} variant="secondary" className="text-[9px]">
                            {s.name}
                          </Badge>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3">{statusBadge(agency.status)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        {agency.contacts?.[0]?.email && (
                          <span className="flex items-center gap-1">
                            <Mail size={12} />
                            {agency.contacts[0].email}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg">
                            <MoreHorizontal size={16} />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48 rounded-xl">
                          <DropdownMenuItem asChild className="gap-2 cursor-pointer">
                            <Link href={`/agents/${agency.id}`}>
                              <ExternalLink size={14} /> Detayına Git
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="gap-2 cursor-pointer text-red-600 focus:text-red-600 focus:bg-red-50"
                            onClick={() => { setDeletingAgency(agency); setShowDeleteAgencyDialog(true); }}
                          >
                            <Trash2 size={14} /> Acenteyi Sil
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (() => {
          const pages: (number | "...")[] = [];
          const showAround = 2;
          for (let i = 1; i <= totalPages; i++) {
            if (
              i <= 3 ||
              i > totalPages - 3 ||
              (i >= currentPage - showAround && i <= currentPage + showAround)
            ) {
              pages.push(i);
            } else if (pages[pages.length - 1] !== "...") {
              pages.push("...");
            }
          }

          const buildPageUrl = (page: number) => {
            const params = new URLSearchParams(searchParams.toString());
            params.set("page", String(page));
            return `${pathname}?${params.toString()}`;
          };

          return (
            <div className="border-t px-4 py-3 flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                Toplam <strong>{total.toLocaleString()}</strong> acente, sayfa {currentPage}/{totalPages}
              </span>
              <div className="flex items-center gap-1">
                <Link
                  href={currentPage > 1 ? buildPageUrl(currentPage - 1) : "#"}
                  className={`inline-flex items-center justify-center rounded-lg h-8 w-8 border text-sm transition-colors ${
                    currentPage <= 1
                      ? "pointer-events-none opacity-40 border-slate-200"
                      : "hover:bg-primary hover:text-white hover:border-primary border-slate-200 cursor-pointer active:scale-95"
                  }`}
                >
                  <ChevronLeft size={16} />
                </Link>

                {pages.map((p, i) =>
                  p === "..." ? (
                    <span key={`dots-${i}`} className="px-1 text-muted-foreground select-none">…</span>
                  ) : (
                    <Link
                      key={p}
                      href={buildPageUrl(p)}
                      className={`inline-flex items-center justify-center rounded-lg h-8 min-w-[32px] px-2 text-xs font-medium border transition-all active:scale-95 ${
                        p === currentPage
                          ? "bg-primary text-white border-primary pointer-events-none shadow-sm"
                          : "border-slate-200 text-slate-700 hover:bg-primary hover:text-white hover:border-primary cursor-pointer"
                      }`}
                    >
                      {p}
                    </Link>
                  )
                )}

                <Link
                  href={currentPage < totalPages ? buildPageUrl(currentPage + 1) : "#"}
                  className={`inline-flex items-center justify-center rounded-lg h-8 w-8 border text-sm transition-colors ${
                    currentPage >= totalPages
                      ? "pointer-events-none opacity-40 border-slate-200"
                      : "hover:bg-primary hover:text-white hover:border-primary border-slate-200 cursor-pointer active:scale-95"
                  }`}
                >
                  <ChevronRight size={16} />
                </Link>
              </div>
            </div>
          );
        })()}
      </div>

      {/* Bulk Send Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
            <div className="p-6 border-b flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Toplu Tanıtım Gönderimi</h3>
                <p className="text-sm text-muted-foreground mt-0.5">
                  {selectedIds.length} acente seçildi
                </p>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setIsModalOpen(false)} className="rounded-full">
                <X size={18} />
              </Button>
            </div>

            <div className="p-6 space-y-5 max-h-[60vh] overflow-y-auto">
              <div className="space-y-2">
                <Label>Hedef Faaliyet Alanı</Label>
                <Select value={selectedSectorId} onValueChange={setSelectedSectorId}>
                  <SelectTrigger className="rounded-xl">
                    <SelectValue placeholder="Faaliyet alanı seçin..." />
                  </SelectTrigger>
                  <SelectContent>
                    {sectors.map((s: any) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-3">
                <Label>Ön Yazı (Template Engine)</Label>
                <Textarea
                  className="min-h-[150px] font-mono text-sm rounded-xl"
                  value={coverLetter}
                  onChange={(e) => setCoverLetter(e.target.value)}
                  disabled={isSending}
                />
                <p className="text-xs text-muted-foreground">
                  Kullanılabilir değişkenler: {"{{agencyName}}, {{authorizedPerson}}, {{unsubscribeLink}}"}
                </p>
              </div>

              {isSending && (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Gönderiliyor...</span>
                    <span>{progress}%</span>
                  </div>
                  <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary transition-all duration-500"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="p-6 border-t bg-muted/30 flex justify-end gap-3">
              <Button variant="outline" onClick={() => setIsModalOpen(false)} disabled={isSending} className="rounded-xl">
                İptal
              </Button>
              <Button onClick={handleBulkSend} disabled={isSending || !selectedSectorId} className="rounded-xl">
                {isSending ? <RefreshCw className="animate-spin mr-2" size={16} /> : null}
                {isSending ? "İşleniyor..." : "Gönderimi Başlat"}
              </Button>
            </div>
          </div>
        </div>
      )}
      {/* ─── EXCEL IMPORT DIALOG ─── */}
      <Dialog open={showImportDialog} onOpenChange={setShowImportDialog}>
        <DialogContent className="sm:max-w-lg rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileSpreadsheet size={20} className="text-emerald-600" />
              Excel ile Acente Aktar
            </DialogTitle>
            <DialogDescription>
              Excel dosyanızı yükleyin, acenteler otomatik olarak sisteme aktarılır.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* File Upload */}
            <div className="space-y-2">
              <Label>Excel Dosyası (.xlsx, .xls)</Label>
              <div className="border-2 border-dashed rounded-xl p-5 text-center hover:border-primary/50 transition-colors">
                {importFile ? (
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 text-sm">
                      <FileText size={16} className="text-emerald-600" />
                      <span className="font-medium truncate">{importFile.name}</span>
                      <span className="text-muted-foreground text-xs">
                        ({(importFile.size / 1024).toFixed(0)} KB)
                      </span>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 rounded-lg"
                      onClick={() => setImportFile(null)}
                    >
                      <X size={14} />
                    </Button>
                  </div>
                ) : (
                  <label className="cursor-pointer block">
                    <Upload size={28} className="mx-auto text-muted-foreground/50 mb-2" />
                    <p className="text-sm text-muted-foreground">
                      Excel dosyasını seçin veya sürükleyin
                    </p>
                    <p className="text-xs text-muted-foreground/70 mt-1">
                      Sütunlar: firma/şirket adı, belge no, telefon, e-posta, adres, il, ilçe, yetkili
                    </p>
                    <input
                      type="file"
                      accept=".xlsx,.xls"
                      className="hidden"
                      onChange={handleImportFileChange}
                    />
                  </label>
                )}
              </div>
            </div>

            {/* Sector Assignment */}
            <div className="space-y-2">
              <Label>Faaliyet Alanı Ataması (isteğe bağlı)</Label>
              <Select value={importSectorId} onValueChange={setImportSectorId} disabled={importing}>
                <SelectTrigger className="rounded-xl">
                  <SelectValue placeholder="Faaliyet alanı seçin..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Faaliyet alanı atama</SelectItem>
                  {sectors.map((s: any) => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Loading Animation with Progress */}
            {importing && (
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-5 space-y-4">
                {/* Progress Header */}
                <div className="flex items-center justify-between">
                  <p className="font-semibold text-blue-800 flex items-center gap-2">
                    <FileSpreadsheet size={18} className="text-blue-600" />
                    Excel İçe Aktarılıyor...
                  </p>
                  <span className="text-2xl font-bold text-blue-700">{importPercent}%</span>
                </div>

                {/* Progress Bar */}
                <div className="h-3 w-full bg-blue-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-blue-500 to-blue-600 rounded-full transition-all duration-300 ease-out"
                    style={{ width: `${importPercent}%` }}
                  />
                </div>

                {/* Stats Row */}
                <div className="grid grid-cols-4 gap-2 text-center">
                  <div className="bg-white rounded-lg p-2">
                    <div className="text-lg font-bold text-slate-700">{importProcessed.toLocaleString()}</div>
                    <div className="text-[10px] text-muted-foreground">İşlenen</div>
                  </div>
                  <div className="bg-white rounded-lg p-2">
                    <div className="text-lg font-bold text-slate-500">{importTotal.toLocaleString()}</div>
                    <div className="text-[10px] text-muted-foreground">Toplam</div>
                  </div>
                  <div className="bg-white rounded-lg p-2">
                    <div className="text-lg font-bold text-emerald-600">{importCreatedLive.toLocaleString()}</div>
                    <div className="text-[10px] text-muted-foreground">Eklenen</div>
                  </div>
                  <div className="bg-white rounded-lg p-2">
                    <div className="text-lg font-bold text-amber-600">{importSkippedLive.toLocaleString()}</div>
                    <div className="text-[10px] text-muted-foreground">Atlanan</div>
                  </div>
                </div>

                <p className="text-xs text-blue-500 text-center animate-pulse">
                  &quot;{importFile?.name}&quot; — Lütfen bu pencereyi kapatmayın.
                </p>
              </div>
            )}

            {/* Import Result */}
            {importResult && (
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 space-y-2">
                <div className="flex items-center gap-2 text-emerald-700 font-semibold text-sm">
                  <CheckCircle2 size={16} /> İçe Aktarma Tamamlandı
                </div>
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div>
                    <div className="text-xl font-bold text-emerald-600">{importResult.created}</div>
                    <div className="text-xs text-muted-foreground">Eklendi</div>
                  </div>
                  <div>
                    <div className="text-xl font-bold text-amber-600">{importResult.skipped}</div>
                    <div className="text-xs text-muted-foreground">Atlandı</div>
                  </div>
                  <div>
                    <div className="text-xl font-bold text-slate-600">{importResult.total}</div>
                    <div className="text-xs text-muted-foreground">Toplam Satır</div>
                  </div>
                </div>
                {importResult.errors.length > 0 && (
                  <div className="mt-2 text-xs text-red-600 space-y-0.5">
                    {importResult.errors.map((err, i) => <p key={i}>• {err}</p>)}
                  </div>
                )}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowImportDialog(false)} disabled={importing} className="rounded-xl">
              {importResult ? "Kapat" : "İptal"}
            </Button>
            {!importResult && (
              <Button onClick={handleImport} disabled={importing || !importFile} className="gap-2 rounded-xl">
                {importing ? <RefreshCw className="animate-spin" size={16} /> : <Upload size={16} />}
                {importing ? "İçe aktarılıyor..." : "İçe Aktar"}
              </Button>
            )}
            {importResult && (
              <Button onClick={() => window.location.reload()} className="gap-2 rounded-xl">
                <RefreshCw size={16} /> Sayfayı Yenile
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* ─── ACENTE SİL DİALOG ─── */}
      <Dialog open={showDeleteAgencyDialog} onOpenChange={setShowDeleteAgencyDialog}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle size={20} /> Acenteyi Sil
            </DialogTitle>
            <DialogDescription>
              <strong>&quot;{deletingAgency?.companyName}&quot;</strong> acentesini silmek istediğinize emin misiniz?
              Yazışması veya işlemi olan acenteler silinemez.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteAgencyDialog(false)} disabled={isDeleting} className="rounded-xl">
              Vazgeç
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteAgency}
              disabled={isDeleting}
              className="gap-2 rounded-xl"
            >
              {isDeleting ? <RefreshCw className="animate-spin" size={16} /> : <Trash2 size={16} />}
              Evet, Sil
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* ─── YENİ ACENTE DİALOG ─── */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="sm:max-w-lg rounded-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Building2 size={20} className="text-primary" />
              Yeni Acente Kaydet
            </DialogTitle>
            <DialogDescription>
              Acente bilgilerini girin. TÜRSAB numarası mükerrer olamaz.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2 md:col-span-2">
                <Label>Firma Adı *</Label>
                <Input
                  value={newCompanyName}
                  onChange={(e) => setNewCompanyName(e.target.value)}
                  placeholder="Örn: ABC Turizm Ltd. Şti."
                  className="rounded-xl"
                />
              </div>
              <div className="space-y-2">
                <Label>TÜRSAB / Belge No *</Label>
                <Input
                  value={newDocumentNo}
                  onChange={(e) => setNewDocumentNo(e.target.value)}
                  placeholder="Örn: 12345"
                  className="rounded-xl"
                />
              </div>
              <div className="space-y-2">
                <Label>Yetkili Kişi</Label>
                <Input
                  value={newAuthorized}
                  onChange={(e) => setNewAuthorized(e.target.value)}
                  placeholder="Ad Soyad"
                  className="rounded-xl"
                />
              </div>
              <div className="space-y-2">
                <Label>Telefon *</Label>
                <Input
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                  placeholder="0212 XXX XX XX"
                  className="rounded-xl"
                />
              </div>
              <div className="space-y-2">
                <Label>E-posta *</Label>
                <Input
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="info@firma.com"
                  className="rounded-xl"
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>Adres</Label>
                <Input
                  value={newAddress}
                  onChange={(e) => setNewAddress(e.target.value)}
                  placeholder="Cadde/Sokak No"
                  className="rounded-xl"
                />
              </div>
              <div className="space-y-2">
                <Label>İl</Label>
                <Input
                  value={newProvince}
                  onChange={(e) => setNewProvince(e.target.value)}
                  placeholder="İstanbul"
                  className="rounded-xl"
                />
              </div>
              <div className="space-y-2">
                <Label>İlçe</Label>
                <Input
                  value={newDistrict}
                  onChange={(e) => setNewDistrict(e.target.value)}
                  placeholder="Beyoğlu"
                  className="rounded-xl"
                />
              </div>
              <div className="space-y-2">
                <Label>Web Sitesi</Label>
                <Input
                  value={newWebsite}
                  onChange={(e) => setNewWebsite(e.target.value)}
                  placeholder="https://www.firma.com"
                  className="rounded-xl"
                />
              </div>
              <div className="space-y-2">
                <Label>Faaliyet Alanı</Label>
                <Select value={newSectorId} onValueChange={setNewSectorId}>
                  <SelectTrigger className="rounded-xl">
                    <SelectValue placeholder="Faaliyet alanı seçin..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Faaliyet alanı atama</SelectItem>
                    {sectors.map((s: any) => (
                      <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)} disabled={isCreating} className="rounded-xl">
              İptal
            </Button>
            <Button
              onClick={handleCreateAgency}
              disabled={isCreating || !newCompanyName.trim() || !newDocumentNo.trim() || !newPhone.trim() || !newEmail.trim()}
              className="gap-2 rounded-xl"
            >
              {isCreating ? <RefreshCw className="animate-spin" size={16} /> : <Plus size={16} />}
              Kaydet
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* ─── TEST SIFIRLAMA DIALOG ─── */}
      <Dialog open={showResetConfirmDialog} onOpenChange={setShowResetConfirmDialog}>
        <DialogContent className="sm:max-w-md rounded-2xl border-red-200">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600 font-black">
              <AlertTriangle size={20} /> Test Verilerini Sıfırla
            </DialogTitle>
            <DialogDescription className="text-slate-600 text-sm leading-relaxed mt-2">
              Sistemde yer alan, **hiçbir işlem görmemiş (yazışması, görevi, teklifi, mail kaydı bulunmayan) tüm pasif acenteler** ve onlara bağlı iletişim bilgileri kalıcı olarak silinecektir.
              <br /><br />
              <span className="text-red-700 font-extrabold">⚠️ DİKKAT:</span> Bu işlem geri alınamaz. Bu mod test/geliştirme aşaması bittiğinde canlı ortamda kaldırılacaktır.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setShowResetConfirmDialog(false)} disabled={isResetting} className="rounded-xl">
              Vazgeç
            </Button>
            <Button
              variant="destructive"
              onClick={handleResetBatchImport}
              disabled={isResetting}
              className="gap-2 rounded-xl bg-red-600 hover:bg-red-700"
            >
              {isResetting ? <RefreshCw className="animate-spin" size={16} /> : <Trash2 size={16} />}
              Evet, Sıfırla
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
