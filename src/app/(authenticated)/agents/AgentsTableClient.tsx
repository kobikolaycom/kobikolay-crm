"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { CustomDateRangePicker } from "@/components/ui/custom-date-picker";
import { CustomInteractionPicker } from "@/components/ui/custom-interaction-picker";
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
  Search, ChevronLeft, ChevronRight, Users, Mail, MailX,
  Upload, FileSpreadsheet, CheckCircle2, FileText,
  ExternalLink, Trash2, AlertTriangle, Plus, Building2, Phone,
  Pencil, Eye, ArrowUpDown, ArrowUp, ArrowDown, Clock, MapPin
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
import { dispatchBulkPitchChunkAction, deleteAgencyAction, createAgencyAction, resetBatchImportedAgenciesAction, updateAgencyAction } from "./actions";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useDebounce } from "use-debounce";

interface AgentsTableClientProps {
  agencies: any[];
  sectors: any[];
  users: any[];
  btkZones: string[];
  provinces: string[];
  total: number;
  currentPage: number;
  pageSize: number;
  initialCampaignFilter?: string;
  initialDateFrom?: string;
  initialDateTo?: string;
  initialMailInteraction?: string;
  initialRepresentativeId?: string;
  initialCallStatusFilter?: string;
  initialBtkZone?: string;
  initialProvince?: string;
  initialDistrict?: string;
  initialSortBy?: string;
  initialSortOrder?: string;
  initialSector?: string;
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

function callStatusBadge(status: string | null | undefined) {
  if (!status) return <span className="text-[10px] text-slate-300">—</span>;
  const map: Record<string, { label: string; cls: string }> = {
    REACHED:      { label: "Ulaşıldı", cls: "bg-emerald-100 text-emerald-700 border-emerald-200" },
    NO_ANSWER:    { label: "Cevap Yok", cls: "bg-amber-100 text-amber-700 border-amber-200" },
    BUSY:         { label: "Meşgul", cls: "bg-orange-100 text-orange-700 border-orange-200" },
    WRONG_NUMBER: { label: "Yanlış Numara", cls: "bg-red-100 text-red-700 border-red-200" },
    NORMAL:       { label: "Tekrar aranacak", cls: "bg-blue-100 text-blue-700 border-blue-200" },
  };
  const v = map[status] || { label: status, cls: "bg-muted text-muted-foreground" };
  return <Badge variant="outline" className={`text-[10px] font-semibold ${v.cls}`}>{v.label}</Badge>;
}

export function AgentsTableClient({ agencies, sectors, users, btkZones, provinces, total, currentPage, pageSize, initialCampaignFilter = "all", initialDateFrom = "", initialDateTo = "", initialMailInteraction = "all", initialRepresentativeId = "", initialCallStatusFilter = "all", initialBtkZone = "all", initialProvince = "all", initialDistrict = "all", initialSortBy = "", initialSortOrder = "", initialSector = "all" }: AgentsTableClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState(searchParams.get("search") || "");
  const [debouncedSearch] = useDebounce(searchTerm, 400);

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
  const [newBtkZone, setNewBtkZone] = useState("");
  const [newSectorIds, setNewSectorIds] = useState<string[]>([]);

  // Edit Agency State
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingAgency, setEditingAgency] = useState<any>(null);
  const [editCompanyName, setEditCompanyName] = useState("");
  const [editDocumentNo, setEditDocumentNo] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editAddress, setEditAddress] = useState("");
  const [editProvince, setEditProvince] = useState("");
  const [editDistrict, setEditDistrict] = useState("");
  const [editAuthorized, setEditAuthorized] = useState("");
  const [editWebsite, setEditWebsite] = useState("");
  const [editBtkZone, setEditBtkZone] = useState("");
  const [editSectorIds, setEditSectorIds] = useState<string[]>([]);

  // District dynamic loading
  const [districts, setDistricts] = useState<string[]>([]);
  const [loadingDistricts, setLoadingDistricts] = useState(false);

  // Load districts when province changes
  useEffect(() => {
    if (initialProvince && initialProvince !== "all") {
      setLoadingDistricts(true);
      fetch(`/api/agencies/districts?province=${encodeURIComponent(initialProvince)}`)
        .then(res => res.json())
        .then(data => setDistricts(data.districts || []))
        .catch(() => setDistricts([]))
        .finally(() => setLoadingDistricts(false));
    } else {
      setDistricts([]);
    }
  }, [initialProvince]);

  const openEditDialog = (agency: any) => {
    setEditingAgency(agency);
    setEditCompanyName(agency.companyName || "");
    setEditDocumentNo(agency.documentNo || "");
    setEditAuthorized(agency.authorizedPerson || "");
    setEditWebsite(agency.website || "");
    setEditBtkZone(agency.btkZone || "");
    
    const contact = agency.contacts?.[0];
    setEditPhone(contact?.phone || "");
    setEditEmail(contact?.email || "");
    setEditAddress(contact?.address || "");
    setEditProvince(contact?.province || "");
    setEditDistrict(contact?.district || "");
    
    const sectorIds = agency.sectors?.map((s: any) => s.id) || [];
    setEditSectorIds(sectorIds);
    
    setShowEditDialog(true);
  };

  const handleUpdateAgency = async () => {
    if (!editingAgency) return;
    if (!editCompanyName.trim() || !editDocumentNo.trim() || !editPhone.trim() || !editEmail.trim()) {
      toast.error("Firma adı, TÜRSAB numarası, telefon ve e-posta zorunludur");
      return;
    }
    setIsEditing(true);
    try {
      await updateAgencyAction(editingAgency.id, {
        companyName: editCompanyName.trim(),
        documentNo: editDocumentNo.trim(),
        phone: editPhone.trim() || undefined,
        email: editEmail.trim() || undefined,
        address: editAddress.trim() || undefined,
        province: editProvince.trim() || undefined,
        district: editDistrict.trim() || undefined,
        authorizedPerson: editAuthorized.trim() || undefined,
        website: editWebsite.trim() || undefined,
        btkZone: editBtkZone.trim() || undefined,
        sectorIds: editSectorIds,
      });
      toast.success(`"${editCompanyName.trim()}" başarıyla güncellendi`);
      setShowEditDialog(false);
      setEditingAgency(null);
      router.refresh();
    } catch (err: any) {
      toast.error(err.message || "Acente güncellenemedi");
    } finally {
      setIsEditing(false);
    }
  };

  // Modal State
  const [selectedSectorIds, setSelectedSectorIds] = useState<string[]>([]);
  const [coverLetter, setCoverLetter] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [progress, setProgress] = useState(0);

  const openBulkSendModal = () => {
    // Gather all sector IDs assigned to any of the selected agencies
    const preselectedSectors: string[] = [];
    agencies.forEach(agency => {
      if (selectedIds.includes(agency.id)) {
        agency.sectors?.forEach((s: any) => {
          if (!preselectedSectors.includes(s.id)) {
            preselectedSectors.push(s.id);
          }
        });
      }
    });
    setSelectedSectorIds(preselectedSectors);
    
    // Generate default cover letter by merging all preselected sectors' cover letters
    let mergedLetter = "";
    const selectedSectors = sectors.filter(s => preselectedSectors.includes(s.id));
    
    if (selectedSectors.length > 0) {
      const coverLettersText = selectedSectors
        .map(s => `[${s.name} Faaliyet Alanı]\n${s.coverLetter || ""}`)
        .filter(Boolean)
        .join("\n\n");
        
      mergedLetter = `Değerli İş Ortağımız,\n\nFirmamızın size özel faaliyet alanı çözümlerini aşağıda bulabilirsiniz:\n\n${coverLettersText}\n\nSaygılarımızla,\nKobiKolay Ekibi`;
    } else {
      mergedLetter = "Sayın Yetkili,\n\nDeğerli iş ortağımız için hazırladığımız faaliyet alanı çözümlerimizi incelemenizi rica ederiz.\n\nSaygılarımızla,\nKobiKolay Ekibi";
    }
    
    setCoverLetter(mergedLetter);
    setIsModalOpen(true);
  };

  // URL based search — only trigger when the search term itself changes
  const prevSearchRef = useRef(debouncedSearch);
  useEffect(() => {
    // Skip if debouncedSearch hasn't actually changed
    if (prevSearchRef.current === debouncedSearch) return;
    prevSearchRef.current = debouncedSearch;

    const params = new URLSearchParams(searchParams.toString());
    if (debouncedSearch) {
      params.set("search", debouncedSearch);
    } else {
      params.delete("search");
    }
    // Reset to page 1 only when search term changes
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
    const selectableAgencies = agencies.filter(a => !a.isUnsubscribed);
    if (selectedIds.length === selectableAgencies.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(selectableAgencies.map((a) => a.id));
    }
  };

  // Pagination
  const totalPages = Math.ceil(total / pageSize);
  const goToPage = (page: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", String(page));
    router.push(`${pathname}?${params.toString()}`);
  };

  // Sort by column
  const toggleSort = (column: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (initialSortBy === column && initialSortOrder === "asc") {
      params.set("sortBy", column);
      params.set("sortOrder", "desc");
    } else if (initialSortBy === column && initialSortOrder === "desc") {
      params.delete("sortBy");
      params.delete("sortOrder");
    } else {
      params.set("sortBy", column);
      params.set("sortOrder", "asc");
    }

    router.push(`${pathname}?${params.toString()}`);
  };

  // Bulk Send
  const handleBulkSend = async () => {
    if (selectedIds.length === 0) return;
    setIsSending(true);
    setProgress(0);

    const chunkSize = 5;
    const totalChunks = Math.ceil(selectedIds.length / chunkSize);

    try {
      for (let i = 0; i < totalChunks; i++) {
        await dispatchBulkPitchChunkAction(
          selectedIds,
          selectedSectorIds,
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
      // Refresh page to show updated mail status
      router.refresh();
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
      router.refresh();
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
      router.refresh();
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
        btkZone: newBtkZone.trim() || undefined,
        sectorIds: newSectorIds,
      });
      toast.success(`"${newCompanyName.trim()}" başarıyla eklendi`);
      setShowCreateDialog(false);
      resetCreateForm();
      router.refresh();
    } catch (err: any) {
      toast.error(err.message || "Acente eklenemedi");
    } finally {
      setIsCreating(false);
    }
  };

  const resetCreateForm = () => {
    setNewCompanyName(""); setNewDocumentNo(""); setNewPhone(""); setNewEmail("");
    setNewAddress(""); setNewProvince(""); setNewDistrict("");
    setNewAuthorized(""); setNewWebsite(""); setNewBtkZone(""); setNewSectorIds([]);
  };

  return (
    <>
      {/* Search Bar & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
        <div className="relative flex-1 sm:max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
          <Input
            placeholder="Acente ara (isim, belge no)..."
            className="pl-9 rounded-xl"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="outline"
            onClick={() => { resetCreateForm(); setShowCreateDialog(true); }}
            className="gap-1.5 rounded-xl text-xs sm:text-sm"
          >
            <Plus size={16} /> <span className="hidden sm:inline">Yeni Acente</span><span className="sm:hidden">Yeni</span>
          </Button>
          <Button
            variant="outline"
            onClick={() => { resetImport(); setShowImportDialog(true); }}
            className="gap-1.5 rounded-xl text-xs sm:text-sm"
          >
            <FileSpreadsheet size={16} /> <span className="hidden sm:inline">Excel ile Aktar</span><span className="sm:hidden">Excel</span>
          </Button>
          <Button
            variant="outline"
            onClick={() => setShowResetConfirmDialog(true)}
            className="gap-1.5 rounded-xl text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700 font-bold text-xs sm:text-sm"
          >
            <RefreshCw size={16} /> <span className="hidden sm:inline">Test Verisini Sıfırla</span><span className="sm:hidden">Sıfırla</span>
          </Button>
          {selectedIds.length > 0 && (
            <Button
              onClick={openBulkSendModal}
              className="gap-1.5 rounded-xl text-xs sm:text-sm"
            >
              <Send size={16} />
              {selectedIds.length} <span className="hidden sm:inline">Acenteye Tanıtım Gönder</span><span className="sm:hidden">Gönder</span>
            </Button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <CustomDateRangePicker
          initialFilter={initialCampaignFilter}
          initialDateFrom={initialDateFrom}
          initialDateTo={initialDateTo}
          onApply={(filter, from, to) => {
            const params = new URLSearchParams(searchParams.toString());
            params.delete("page");
            if (filter === "all") {
              params.delete("campaignFilter");
            } else {
              params.set("campaignFilter", filter);
            }
            if (from) params.set("dateFrom", from); else params.delete("dateFrom");
            if (to) params.set("dateTo", to); else params.delete("dateTo");
            router.push(`${pathname}?${params.toString()}`);
          }}
          onClear={() => {
            const params = new URLSearchParams(searchParams.toString());
            params.delete("campaignFilter");
            params.delete("dateFrom");
            params.delete("dateTo");
            params.delete("page");
            router.push(`${pathname}?${params.toString()}`);
          }}
        />

        <CustomInteractionPicker
          initialFilter={initialMailInteraction}
          onApply={(filter) => {
            const params = new URLSearchParams(searchParams.toString());
            params.delete("page");
            if (filter === "all") {
              params.delete("mailInteraction");
            } else {
              params.set("mailInteraction", filter);
            }
            router.push(`${pathname}?${params.toString()}`);
          }}
        />

        {/* Sector (Faaliyet Alanı) filter */}
        <Select
          value={initialSector || "all"}
          onValueChange={(value) => {
            const params = new URLSearchParams(searchParams.toString());
            params.delete("page");
            if (value === "all") {
              params.delete("sector");
            } else {
              params.set("sector", value);
            }
            router.push(`${pathname}?${params.toString()}`);
          }}
        >
          <SelectTrigger className="w-[180px] rounded-xl text-xs h-9">
            <div className="flex items-center gap-1.5">
              <Building2 size={14} className="text-muted-foreground shrink-0" />
              <SelectValue placeholder="Faaliyet Alanı" />
            </div>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tüm Faaliyet Alanları</SelectItem>
            {sectors.map((sec: any) => (
              <SelectItem key={sec.id} value={sec.id}>
                {sec.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Representative filter */}
        <Select
          value={initialRepresentativeId || "all"}
          onValueChange={(value) => {
            const params = new URLSearchParams(searchParams.toString());
            params.delete("page");
            if (value === "all") {
              params.delete("representativeId");
            } else {
              params.set("representativeId", value);
            }
            router.push(`${pathname}?${params.toString()}`);
          }}
        >
          <SelectTrigger className="w-[180px] rounded-xl text-xs h-9">
            <div className="flex items-center gap-1.5">
              <Users size={14} className="text-muted-foreground shrink-0" />
              <SelectValue placeholder="Temsilci" />
            </div>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tüm Temsilciler</SelectItem>
            {users.map((user: any) => (
              <SelectItem key={user.id} value={user.id}>
                {user.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Call status filter */}
        <Select
          value={initialCallStatusFilter || "all"}
          onValueChange={(value) => {
            const params = new URLSearchParams(searchParams.toString());
            params.delete("page");
            if (value === "all") {
              params.delete("callStatusFilter");
            } else {
              params.set("callStatusFilter", value);
            }
            router.push(`${pathname}?${params.toString()}`);
          }}
        >
          <SelectTrigger className="w-[180px] rounded-xl text-xs h-9">
            <div className="flex items-center gap-1.5">
              <Phone size={14} className="text-muted-foreground shrink-0" />
              <SelectValue placeholder="Arama Durumu" />
            </div>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tüm Arama Durumları</SelectItem>
            <SelectItem value="none">Hiç Aranmadı</SelectItem>
            <SelectItem value="REACHED">Ulaşıldı</SelectItem>
            <SelectItem value="NO_ANSWER">Cevap Yok</SelectItem>
            <SelectItem value="BUSY">Meşgul</SelectItem>
            <SelectItem value="WRONG_NUMBER">Yanlış Numara</SelectItem>
            <SelectItem value="NORMAL">Tekrar aranacak</SelectItem>
          </SelectContent>
        </Select>

        {/* BTK Zone filter */}
        <Select
          value={initialBtkZone || "all"}
          onValueChange={(value) => {
            const params = new URLSearchParams(searchParams.toString());
            params.delete("page");
            if (value === "all") {
              params.delete("btkZone");
            } else {
              params.set("btkZone", value);
            }
            router.push(`${pathname}?${params.toString()}`);
          }}
        >
          <SelectTrigger className="w-[180px] rounded-xl text-xs h-9">
            <div className="flex items-center gap-1.5">
              <MapPin size={14} className="text-muted-foreground shrink-0" />
              <SelectValue placeholder="BTK Bölgesi" />
            </div>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tüm BTK Bölgeleri</SelectItem>
            {btkZones.map((zone) => (
              <SelectItem key={zone} value={zone}>
                {zone}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Province (İl) filter */}
        <Select
          value={initialProvince || "all"}
          onValueChange={(value) => {
            const params = new URLSearchParams(searchParams.toString());
            params.delete("page");
            if (value === "all") {
              params.delete("province");
              params.delete("district");
            } else {
              params.set("province", value);
              params.delete("district");
            }
            router.push(`${pathname}?${params.toString()}`);
          }}
        >
          <SelectTrigger className="w-[160px] rounded-xl text-xs h-9">
            <div className="flex items-center gap-1.5">
              <MapPin size={14} className="text-muted-foreground shrink-0" />
              <SelectValue placeholder="İl" />
            </div>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tüm İller</SelectItem>
            {provinces.map((prov) => (
              <SelectItem key={prov} value={prov}>
                {prov}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* District (İlçe) filter — only shown when a province is selected */}
        {initialProvince && initialProvince !== "all" && (
          <Select
            value={initialDistrict || "all"}
            onValueChange={(value) => {
              const params = new URLSearchParams(searchParams.toString());
              params.delete("page");
              if (value === "all") {
                params.delete("district");
              } else {
                params.set("district", value);
              }
              router.push(`${pathname}?${params.toString()}`);
            }}
          >
            <SelectTrigger className="w-[160px] rounded-xl text-xs h-9">
              <div className="flex items-center gap-1.5">
                <MapPin size={14} className="text-muted-foreground shrink-0" />
                <SelectValue placeholder={loadingDistricts ? "Yükleniyor..." : "İlçe"} />
              </div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tüm İlçeler</SelectItem>
              {districts.map((dist) => (
                <SelectItem key={dist} value={dist}>
                  {dist}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {/* Mobile Pagination & Sort Bar */}
      <div className="md:hidden mb-3">
        {totalPages > 1 && (() => {
          const pages: (number | "...")[] = [];
          const showAround = 1;
          for (let i = 1; i <= totalPages; i++) {
            if (i <= 2 || i > totalPages - 2 || (i >= currentPage - showAround && i <= currentPage + showAround)) {
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
            <div className="bg-white rounded-2xl border shadow-sm p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-muted-foreground">
                  <strong>{total.toLocaleString()}</strong> acente · Sayfa {currentPage}/{totalPages}
                </span>
                <button
                  onClick={() => toggleSort("documentNo")}
                  className="flex items-center gap-1 text-xs font-medium text-slate-600 px-2 py-1 rounded-lg hover:bg-slate-100 transition-colors"
                >
                  {initialSortBy === "documentNo" ? (
                    initialSortOrder === "asc" ? <ArrowUp size={12} /> : <ArrowDown size={12} />
                  ) : <ArrowUpDown size={12} />}
                  Belge No
                </button>
              </div>
              <div className="flex items-center gap-1 overflow-x-auto pb-1">
                <Link
                  href={currentPage > 1 ? buildPageUrl(currentPage - 1) : "#"}
                  className={`inline-flex items-center justify-center rounded-lg h-9 w-9 border text-sm transition-colors shrink-0 ${
                    currentPage <= 1 ? "pointer-events-none opacity-40 border-slate-200" : "hover:bg-primary hover:text-white hover:border-primary border-slate-200 active:scale-95"
                  }`}
                >
                  <ChevronLeft size={16} />
                </Link>
                {pages.map((p, i) =>
                  p === "..." ? (
                    <span key={`dots-${i}`} className="px-1 text-muted-foreground select-none text-xs">…</span>
                  ) : (
                    <Link
                      key={p}
                      href={buildPageUrl(p)}
                      className={`inline-flex items-center justify-center rounded-lg h-9 min-w-[36px] px-2 text-xs font-medium border transition-all active:scale-95 shrink-0 ${
                        p === currentPage
                          ? "bg-primary text-white border-primary pointer-events-none shadow-sm"
                          : "border-slate-200 text-slate-700 hover:bg-primary hover:text-white hover:border-primary"
                      }`}
                    >
                      {p}
                    </Link>
                  )
                )}
                <Link
                  href={currentPage < totalPages ? buildPageUrl(currentPage + 1) : "#"}
                  className={`inline-flex items-center justify-center rounded-lg h-9 w-9 border text-sm transition-colors shrink-0 ${
                    currentPage >= totalPages ? "pointer-events-none opacity-40 border-slate-200" : "hover:bg-primary hover:text-white hover:border-primary border-slate-200 active:scale-95"
                  }`}
                >
                  <ChevronRight size={16} />
                </Link>
              </div>
            </div>
          );
        })()}
      </div>

      {/* Mobile Card View */}
      <div className="md:hidden space-y-3 mb-4">
        {agencies.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-2xl border">
            <Users size={32} className="mx-auto text-muted-foreground/30 mb-3" />
            <p className="text-muted-foreground">Acente bulunamadı</p>
          </div>
        ) : (
          agencies.map((agency) => {
            const lastMail = agency.mailLogs?.[0];
            const anyClicked = agency.mailLogs?.some((m: any) => m.clickedAt);
            const anyOpened = agency.mailLogs?.some((m: any) => m.openedAt);
            return (
              <div key={agency.id} className="bg-white rounded-2xl border shadow-sm p-4">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-start gap-3 min-w-0">
                    <Checkbox
                      checked={selectedIds.includes(agency.id)}
                      onCheckedChange={() => toggleSelect(agency.id)}
                      disabled={agency.isUnsubscribed}
                      className="mt-1"
                    />
                    <div className="min-w-0">
                      <Link href={`/agents/${agency.id}`} className="font-bold text-sm text-slate-900 hover:text-primary transition-colors block truncate">
                        {agency.companyName}
                      </Link>
                      <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                        {agency.documentNo}
                        {agency.contacts?.[0]?.province && (
                          <span className="ml-1.5 font-sans text-slate-500">📍 {agency.contacts[0].province}</span>
                        )}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0 flex-wrap justify-end">
                    {statusBadge(agency.status)}
                    {agency.isUnsubscribed && (
                      <Badge variant="outline" className="text-[9px] font-semibold bg-red-50 text-red-600 border-red-200 gap-0.5">
                        <MailX size={9} /> Ayrıldı
                      </Badge>
                    )}
                  </div>
                </div>
                {agency.authorizedPerson && (
                  <p className="text-xs text-slate-500 mb-2">👤 {agency.authorizedPerson}</p>
                )}
                <div className="flex flex-wrap gap-1 mb-3">
                  {agency.sectors?.map((s: any) => (
                    <Badge key={s.id} variant="secondary" className="text-[9px]">{s.name}</Badge>
                  ))}
                </div>
                <div className="flex flex-wrap items-center gap-2 mb-3 text-[10px] text-slate-500">
                  {agency.lastCallAt && (
                    <span className="flex items-center gap-1">
                      <Phone size={10} className="text-blue-500" />
                      {new Date(agency.lastCallAt).toLocaleDateString("tr-TR", { day: "2-digit", month: "short" })}
                    </span>
                  )}
                  {agency.activities?.[0]?.callStatus && callStatusBadge(agency.activities[0].callStatus)}
                  {agency.representative && (
                    <span className="flex items-center gap-1">👤 {agency.representative.name}</span>
                  )}
                </div>
                <div className="flex items-center justify-between border-t pt-3">
                  <div className="flex flex-wrap gap-1.5">
                    {lastMail?.status === "SENT" && (
                      <Badge variant="outline" className="text-[9px] font-bold bg-emerald-50 text-emerald-700 border-emerald-200 gap-1">
                        <CheckCircle2 size={9} /> Gönderildi
                      </Badge>
                    )}
                    {anyClicked ? (
                      <Badge variant="outline" className="text-[9px] font-bold bg-violet-50 text-violet-700 border-violet-200 gap-1">
                        <ExternalLink size={9} /> 🎯 Tıkladı
                      </Badge>
                    ) : anyOpened ? (
                      <Badge variant="outline" className="text-[9px] font-bold bg-blue-50 text-blue-700 border-blue-200 gap-1">
                        <Eye size={9} /> 📬 Açtı
                      </Badge>
                    ) : null}
                  </div>
                  <div className="flex items-center gap-1">
                    <Link href={`/agents/${agency.id}`}>
                      <Button variant="ghost" size="icon" className="h-10 w-10 rounded-lg text-slate-500 hover:text-primary"><Eye size={16} /></Button>
                    </Link>
                    <Button variant="ghost" size="icon" className="h-10 w-10 rounded-lg text-slate-500 hover:text-amber-600" onClick={() => openEditDialog(agency)}><Pencil size={16} /></Button>
                    <Button variant="ghost" size="icon" className="h-10 w-10 rounded-lg text-slate-500 hover:text-red-600" onClick={() => { setDeletingAgency(agency); setShowDeleteAgencyDialog(true); }}><Trash2 size={16} /></Button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Desktop Table */}
      <div className="hidden md:block bg-white rounded-2xl border shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-slate-50/50">
                <th className="text-left px-4 py-3 w-10">
                  <Checkbox
                    checked={
                      agencies.length > 0 &&
                      selectedIds.length === agencies.filter(a => !a.isUnsubscribed).length
                    }
                    onCheckedChange={toggleAll}
                  />
                </th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600">Şirket Adı</th>
                <th
                  className="text-left px-4 py-3 font-semibold text-slate-600 cursor-pointer select-none hover:text-primary transition-colors group"
                  onClick={() => toggleSort("documentNo")}
                  title="Belge No'ya göre sırala"
                >
                  <span className="inline-flex items-center gap-1">
                    Belge No
                    {initialSortBy === "documentNo" ? (
                      initialSortOrder === "asc" ? (
                        <ArrowUp size={14} className="text-primary" />
                      ) : (
                        <ArrowDown size={14} className="text-primary" />
                      )
                    ) : (
                      <ArrowUpDown size={14} className="text-slate-300 group-hover:text-slate-500 transition-colors" />
                    )}
                  </span>
                </th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600">Yetkili</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600">Faaliyet Alanları</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600">Durum</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600">Son Mail</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600">Etkileşim</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600">Temsilci</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600">Son İşlem</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600">Son Arama</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600">Arama Detayı</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600">Şehir</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600">İletişim</th>
                <th className="text-right px-4 py-3 w-10"></th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {agencies.length === 0 ? (
                <tr>
                  <td colSpan={15} className="text-center py-20">
                    <Users size={32} className="mx-auto text-muted-foreground/30 mb-3" />
                    <p className="text-muted-foreground">Acente bulunamadı</p>
                  </td>
                </tr>
              ) : (
                agencies.map((agency) => {
                  const lastMail = agency.mailLogs?.[0];
                  const anyClicked = agency.mailLogs?.some((m: any) => m.clickedAt);
                  const anyOpened = agency.mailLogs?.some((m: any) => m.openedAt);
                  return (
                  <tr key={agency.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-4 py-3">
                      <Checkbox
                        checked={selectedIds.includes(agency.id)}
                        onCheckedChange={() => toggleSelect(agency.id)}
                        disabled={agency.isUnsubscribed}
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
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {statusBadge(agency.status)}
                        {agency.isUnsubscribed && (
                          <Badge variant="outline" className="text-[10px] font-semibold bg-red-50 text-red-600 border-red-200 gap-1 shrink-0">
                            <MailX size={9} /> Ayrıldı
                          </Badge>
                        )}
                      </div>
                    </td>
                    {/* Son Mail */}
                    <td className="px-4 py-3">
                      {lastMail ? (
                        <div className="flex flex-col gap-0.5">
                          {lastMail.status === "SENT" ? (
                            <Badge variant="outline" className="text-[9px] font-bold bg-emerald-50 text-emerald-700 border-emerald-200 gap-1">
                              <CheckCircle2 size={9} /> Gönderildi
                            </Badge>
                          ) : lastMail.status === "FAILED" ? (
                            <Badge variant="outline" className="text-[9px] font-bold bg-red-50 text-red-700 border-red-200 gap-1">
                              <AlertCircle size={9} /> Başarısız
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-[9px] font-bold bg-amber-50 text-amber-700 border-amber-200">
                              Bekliyor
                            </Badge>
                          )}
                          {lastMail.sentAt && (
                            <span className="text-[9px] text-slate-400">
                              {new Date(lastMail.sentAt).toLocaleDateString("tr-TR")}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-[10px] text-slate-300">—</span>
                      )}
                    </td>
                    {/* Etkileşim — tüm mailleri kontrol et */}
                    <td className="px-4 py-3">
                      {agency.mailLogs?.length > 0 ? (
                        <div className="flex flex-col gap-0.5">
                          {anyClicked ? (() => {
                            const clickedMail = agency.mailLogs?.find((m: any) => m.clickedAt);
                            return (
                              <>
                                <Badge variant="outline" className="text-[9px] font-bold bg-violet-50 text-violet-700 border-violet-200 gap-1">
                                  <ExternalLink size={9} /> 🎯 Linke Tıkladı
                                </Badge>
                                {clickedMail?.clickedAt && (
                                  <span className="text-[9px] text-violet-500">
                                    {new Date(clickedMail.clickedAt).toLocaleDateString("tr-TR", { day: "numeric", month: "short", year: "numeric" })}
                                  </span>
                                )}
                              </>
                            );
                          })() : anyOpened ? (() => {
                            const openedMail = agency.mailLogs?.find((m: any) => m.openedAt);
                            return (
                              <>
                                <Badge variant="outline" className="text-[9px] font-bold bg-blue-50 text-blue-700 border-blue-200 gap-1">
                                  <Eye size={9} /> 📬 Maili Açtı
                                </Badge>
                                {openedMail?.openedAt && (
                                  <span className="text-[9px] text-blue-500">
                                    {new Date(openedMail.openedAt).toLocaleDateString("tr-TR", { day: "numeric", month: "short", year: "numeric" })}
                                  </span>
                                )}
                              </>
                            );
                          })() : (
                            <span className="text-[9px] text-slate-400">Henüz etkileşim yok</span>
                          )}
                        </div>
                      ) : (
                        <span className="text-[10px] text-slate-300">—</span>
                      )}
                    </td>
                    {/* Temsilci */}
                    <td className="px-4 py-3">
                      {agency.representative?.name ? (
                        <span className="text-[10px] text-indigo-600 font-semibold flex items-center gap-1">
                          👤 {agency.representative.name}
                        </span>
                      ) : (
                        <span className="text-[10px] text-slate-300">—</span>
                      )}
                    </td>
                    {/* Son İşlem */}
                    <td className="px-4 py-3">
                      {agency.lastInteractionAt ? (
                        <span className="text-[10px] text-slate-600 flex items-center gap-1">
                          <Clock size={11} />
                          {new Date(agency.lastInteractionAt).toLocaleDateString("tr-TR", { day: "2-digit", month: "short", year: "numeric" })}
                        </span>
                      ) : (
                        <span className="text-[10px] text-slate-300">—</span>
                      )}
                    </td>
                    {/* Son Arama */}
                    <td className="px-4 py-3">
                      {agency.lastCallAt ? (
                        <span className="text-[10px] text-blue-600 font-medium flex items-center gap-1">
                          <Phone size={11} />
                          {new Date(agency.lastCallAt).toLocaleDateString("tr-TR", { day: "2-digit", month: "short", year: "numeric" })}
                        </span>
                      ) : (
                        <span className="text-[10px] text-slate-300">—</span>
                      )}
                    </td>
                    {/* Arama Detayı */}
                    <td className="px-4 py-3">
                      {callStatusBadge(agency.activities?.[0]?.callStatus)}
                    </td>
                    {/* Şehir */}
                    <td className="px-4 py-3">
                      {agency.contacts?.[0]?.province ? (
                        <span className="text-xs text-slate-600">{agency.contacts[0].province}</span>
                      ) : (
                        <span className="text-[10px] text-slate-300">—</span>
                      )}
                    </td>
                    {/* İletişim */}
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
                       <div className="flex items-center justify-end gap-1.5">
                         <Link href={`/agents/${agency.id}`}>
                           <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-slate-500 hover:text-primary hover:bg-slate-100 transition-colors" title="Detayına Git">
                             <Eye size={15} />
                           </Button>
                         </Link>
                         <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-slate-500 hover:text-amber-600 hover:bg-amber-50 transition-colors" onClick={() => openEditDialog(agency)} title="Acenteyi Güncelle">
                           <Pencil size={15} />
                         </Button>
                         <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-slate-500 hover:text-red-600 hover:bg-red-50 transition-colors" onClick={() => { setDeletingAgency(agency); setShowDeleteAgencyDialog(true); }} title="Acenteyi Sil">
                           <Trash2 size={15} />
                         </Button>
                       </div>
                     </td>
                  </tr>
                  );
                })
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
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden">
            <div className="p-6 border-b flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Toplu Tanıtım Gönderimi</h3>
                <p className="text-sm text-muted-foreground mt-0.5">
                  {selectedIds.length} acente seçildi — her acenteye kişiselleştirilmiş e-posta gönderilecek
                </p>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setIsModalOpen(false)} className="rounded-full">
                <X size={18} />
              </Button>
            </div>

            <div className="p-6 space-y-5 max-h-[65vh] overflow-y-auto">
              {/* Sector Checkboxes */}
              <div className="space-y-2">
                <Label className="text-sm font-semibold">Gönderilecek Faaliyet Alanları</Label>
                <div className="grid grid-cols-2 gap-2 mt-1">
                  {sectors.map((s: any) => {
                    const isChecked = selectedSectorIds.includes(s.id);
                    return (
                      <label
                        key={s.id}
                        className={`flex items-center gap-3 px-4 py-3 rounded-xl border text-sm font-medium cursor-pointer transition-all ${
                          isChecked
                            ? "bg-primary/5 border-primary text-primary shadow-sm"
                            : "border-slate-200 text-slate-600 hover:bg-slate-50"
                        }`}
                      >
                        <Checkbox
                          checked={isChecked}
                          onCheckedChange={() => {
                            setSelectedSectorIds(prev =>
                              prev.includes(s.id)
                                ? prev.filter(id => id !== s.id)
                                : [...prev, s.id]
                            );
                          }}
                        />
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="truncate">{s.name}</span>
                          {s.pdfUrl && (
                            <Badge variant="secondary" className="text-[9px] shrink-0 bg-emerald-50 text-emerald-700 border-emerald-200">PDF</Badge>
                          )}
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-2">
                  <Label className="text-sm font-semibold flex items-center gap-2">
                    <Mail size={14} />
                    E-posta Önizleme
                  </Label>
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 text-sm space-y-3">
                    <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-lg p-4 text-center text-white">
                      <p className="font-bold text-base">acenteyazılım.com</p>
                      <p className="text-xs text-white/70">Dijital Seyahat Altyapı Çözümleri</p>
                    </div>
                    <div className="space-y-2 mt-3">
                      <p className="font-semibold text-slate-700">Sayın <span className="text-primary">[Yetkili Kişi]</span>,</p>
                      <p className="text-slate-400 italic text-xs leading-relaxed">
                        [Varsayılan Teklif Ön Yazısı şablonunuz buraya otomatik olarak yerleştirilecektir.]
                      </p>
                    </div>
                    <hr className="border-slate-200" />
                    {sectors
                      .filter((s: any) => selectedSectorIds.includes(s.id))
                      .map((s: any) => (
                        <div key={s.id} className="bg-white rounded-lg border border-slate-200 p-3 space-y-1">
                          <p className="font-bold text-slate-800 text-xs flex items-center gap-2">
                            <span className="w-1 h-4 bg-indigo-500 rounded-full inline-block"></span>
                            {s.name}
                          </p>
                          <p className="text-[11px] text-slate-400 line-clamp-2">
                            {s.coverLetter ? s.coverLetter.substring(0, 120) + "..." : "İçerik tanımlanmamış"}
                          </p>
                          {s.pdfUrl && (
                            <span className="text-[10px] text-emerald-600 font-semibold">📎 PDF Broşür Eklenecek</span>
                          )}
                        </div>
                      ))}
                    <div className="text-center text-xs text-slate-400 pt-2 border-t border-slate-200">
                      Saygılarımızla, <strong>KobiKolay Ekibi</strong>
                    </div>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    ℹ️ Her acente için kişi adı ve acente adı otomatik olarak doldurulacaktır. Yetkili kişi tanımlı değilse &quot;Sayın Yetkili&quot; yazılacaktır.
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
              <Button onClick={handleBulkSend} disabled={isSending} className="gap-2 rounded-xl">
                {isSending ? <RefreshCw className="animate-spin" size={16} /> : <Send size={16} />}
                {isSending ? "İşleniyor..." : `${selectedIds.length} Acenteye Gönder`}
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
              <Button onClick={() => router.refresh()} className="gap-2 rounded-xl">
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
                <Label>BTK Bölgesi</Label>
                <Input
                  value={newBtkZone}
                  onChange={(e) => setNewBtkZone(e.target.value)}
                  placeholder="BTK bölge kodu"
                  className="rounded-xl"
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label className="text-sm font-semibold">Faaliyet Alanları</Label>
                <div className="grid grid-cols-2 gap-2 mt-1">
                  {sectors.map((s: any) => {
                    const isChecked = newSectorIds.includes(s.id);
                    return (
                      <label
                        key={s.id}
                        className={`flex items-center gap-3 px-4 py-3 rounded-xl border text-sm font-medium cursor-pointer transition-all ${
                          isChecked
                            ? "bg-primary/5 border-primary text-primary shadow-sm"
                            : "border-slate-200 text-slate-600 hover:bg-slate-50"
                        }`}
                      >
                        <Checkbox
                          checked={isChecked}
                          onCheckedChange={() => {
                            setNewSectorIds(prev =>
                              prev.includes(s.id) ? prev.filter(id => id !== s.id) : [...prev, s.id]
                            );
                          }}
                        />
                        <span className="truncate">{s.name}</span>
                      </label>
                    );
                  })}
                </div>
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
      {/* ─── ACENTE GÜNCELLE DIALOG ─── */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="sm:max-w-lg rounded-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Building2 size={20} className="text-primary" />
              Acente Bilgilerini Güncelle
            </DialogTitle>
            <DialogDescription>
              Acente bilgilerini güncelleyin. TÜRSAB numarası mükerrer olamaz.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2 md:col-span-2">
                <Label>Firma Adı *</Label>
                <Input
                  value={editCompanyName}
                  onChange={(e) => setEditCompanyName(e.target.value)}
                  placeholder="Örn: ABC Turizm Ltd. Şti."
                  className="rounded-xl"
                />
              </div>
              <div className="space-y-2">
                <Label>TÜRSAB / Belge No *</Label>
                <Input
                  value={editDocumentNo}
                  onChange={(e) => setEditDocumentNo(e.target.value)}
                  placeholder="Örn: 12345"
                  className="rounded-xl"
                />
              </div>
              <div className="space-y-2">
                <Label>Yetkili Kişi</Label>
                <Input
                  value={editAuthorized}
                  onChange={(e) => setEditAuthorized(e.target.value)}
                  placeholder="Ad Soyad"
                  className="rounded-xl"
                />
              </div>
              <div className="space-y-2">
                <Label>Telefon *</Label>
                <Input
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  placeholder="0212 XXX XX XX"
                  className="rounded-xl"
                />
              </div>
              <div className="space-y-2">
                <Label>E-posta *</Label>
                <Input
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  placeholder="info@firma.com"
                  className="rounded-xl"
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>Adres</Label>
                <Input
                  value={editAddress}
                  onChange={(e) => setEditAddress(e.target.value)}
                  placeholder="Cadde/Sokak No"
                  className="rounded-xl"
                />
              </div>
              <div className="space-y-2">
                <Label>İl</Label>
                <Input
                  value={editProvince}
                  onChange={(e) => setEditProvince(e.target.value)}
                  placeholder="İstanbul"
                  className="rounded-xl"
                />
              </div>
              <div className="space-y-2">
                <Label>İlçe</Label>
                <Input
                  value={editDistrict}
                  onChange={(e) => setEditDistrict(e.target.value)}
                  placeholder="Beyoğlu"
                  className="rounded-xl"
                />
              </div>
              <div className="space-y-2">
                <Label>Web Sitesi</Label>
                <Input
                  value={editWebsite}
                  onChange={(e) => setEditWebsite(e.target.value)}
                  placeholder="https://www.firma.com"
                  className="rounded-xl"
                />
              </div>
              <div className="space-y-2">
                <Label>BTK Bölgesi</Label>
                <Input
                  value={editBtkZone}
                  onChange={(e) => setEditBtkZone(e.target.value)}
                  placeholder="BTK bölge kodu"
                  className="rounded-xl"
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label className="text-sm font-semibold">Faaliyet Alanları</Label>
                <div className="grid grid-cols-2 gap-2 mt-1">
                  {sectors.map((s: any) => {
                    const isChecked = editSectorIds.includes(s.id);
                    return (
                      <label
                        key={s.id}
                        className={`flex items-center gap-3 px-4 py-3 rounded-xl border text-sm font-medium cursor-pointer transition-all ${
                          isChecked
                            ? "bg-primary/5 border-primary text-primary shadow-sm"
                            : "border-slate-200 text-slate-600 hover:bg-slate-50"
                        }`}
                      >
                        <Checkbox
                          checked={isChecked}
                          onCheckedChange={() => {
                            setEditSectorIds(prev =>
                              prev.includes(s.id) ? prev.filter(id => id !== s.id) : [...prev, s.id]
                            );
                          }}
                        />
                        <span className="truncate">{s.name}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)} disabled={isEditing} className="rounded-xl">
              İptal
            </Button>
            <Button
              onClick={handleUpdateAgency}
              disabled={isEditing || !editCompanyName.trim() || !editDocumentNo.trim() || !editPhone.trim() || !editEmail.trim()}
              className="gap-2 rounded-xl"
            >
              {isEditing ? <RefreshCw className="animate-spin" size={16} /> : <Plus size={16} />}
              Güncelle
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
