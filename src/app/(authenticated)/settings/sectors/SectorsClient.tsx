"use client";

import { useState, useRef, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  Briefcase, FileText, Globe, Plus, Pencil, Trash2,
  Upload, X, RefreshCw, AlertTriangle, ExternalLink,
  Mail, Link2, Star,
} from "lucide-react";
import { createSectorAction, updateSectorAction, deleteSectorAction, addReferenceAction, deleteReferenceAction } from "./actions";

interface SectorReference {
  id: string;
  name: string;
  domain: string;
  logoUrl: string | null;
}

interface Sector {
  id: string;
  name: string;
  description: string | null;
  pdfUrl: string | null;
  coverLetter: string | null;
  templates: any[];
  references: SectorReference[];
  _count: { agencies: number };
}

export function SectorsClient({ sectors: initialSectors }: { sectors: Sector[] }) {
  const [sectors] = useState(initialSectors);
  const [isPending, startTransition] = useTransition();

  // Dialog states
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [editingSector, setEditingSector] = useState<Sector | null>(null);
  const [deletingSector, setDeletingSector] = useState<Sector | null>(null);

  // Form fields
  const [formName, setFormName] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formCoverLetter, setFormCoverLetter] = useState("");
  const [formPdfFile, setFormPdfFile] = useState<File | null>(null);
  const [removePdf, setRemovePdf] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Reference dialog
  const [showRefDialog, setShowRefDialog] = useState(false);
  const [refSectorId, setRefSectorId] = useState("");
  const [refName, setRefName] = useState("");
  const [refDomain, setRefDomain] = useState("");

  const resetForm = () => {
    setFormName("");
    setFormDescription("");
    setFormCoverLetter("");
    setFormPdfFile(null);
    setRemovePdf(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const openAdd = () => { resetForm(); setShowAddDialog(true); };

  const openEdit = (sector: Sector) => {
    setEditingSector(sector);
    setFormName(sector.name);
    setFormDescription(sector.description || "");
    setFormCoverLetter(sector.coverLetter || "");
    setFormPdfFile(null);
    setRemovePdf(false);
    setShowEditDialog(true);
  };

  const openDelete = (sector: Sector) => { setDeletingSector(sector); setShowDeleteDialog(true); };

  const openRefDialog = (sectorId: string) => {
    setRefSectorId(sectorId);
    setRefName("");
    setRefDomain("");
    setShowRefDialog(true);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.type !== "application/pdf") { toast.error("Sadece PDF dosyası yüklenebilir"); return; }
      if (file.size > 10 * 1024 * 1024) { toast.error("Dosya boyutu 10MB'ı geçemez"); return; }
      setFormPdfFile(file);
      setRemovePdf(false);
    }
  };

  // ─── EKLE ───
  const handleAdd = () => {
    if (!formName.trim()) { toast.error("Faaliyet alanı adı zorunludur"); return; }
    startTransition(async () => {
      try {
        const fd = new FormData();
        fd.append("name", formName.trim());
        fd.append("description", formDescription.trim());
        fd.append("coverLetter", formCoverLetter.trim());
        if (formPdfFile) fd.append("pdf", formPdfFile);
        await createSectorAction(fd);
        toast.success(`"${formName}" faaliyet alanı eklendi`);
        setShowAddDialog(false);
        resetForm();
        window.location.reload();
      } catch (err: any) { toast.error(err.message || "Ekleme başarısız"); }
    });
  };

  // ─── DÜZENLE ───
  const handleEdit = () => {
    if (!formName.trim() || !editingSector) { toast.error("Faaliyet alanı adı zorunludur"); return; }
    startTransition(async () => {
      try {
        const fd = new FormData();
        fd.append("id", editingSector.id);
        fd.append("name", formName.trim());
        fd.append("description", formDescription.trim());
        fd.append("coverLetter", formCoverLetter.trim());
        if (removePdf) fd.append("removePdf", "true");
        if (formPdfFile) fd.append("pdf", formPdfFile);
        await updateSectorAction(fd);
        toast.success(`"${formName}" güncellendi`);
        setShowEditDialog(false);
        setEditingSector(null);
        resetForm();
        window.location.reload();
      } catch (err: any) { toast.error(err.message || "Güncelleme başarısız"); }
    });
  };

  // ─── SİL ───
  const handleDelete = () => {
    if (!deletingSector) return;
    startTransition(async () => {
      try {
        await deleteSectorAction(deletingSector.id);
        toast.success(`"${deletingSector.name}" silindi`);
        setShowDeleteDialog(false);
        setDeletingSector(null);
        window.location.reload();
      } catch (err: any) { toast.error(err.message || "Silme başarısız"); }
    });
  };

  // ─── REFERANS EKLE ───
  const handleAddReference = () => {
    if (!refName.trim() || !refDomain.trim()) { toast.error("Referans adı ve domain zorunludur"); return; }
    startTransition(async () => {
      try {
        await addReferenceAction(refSectorId, { name: refName.trim(), domain: refDomain.trim() });
        toast.success(`"${refName}" referansı eklendi`);
        setShowRefDialog(false);
        setRefName(""); setRefDomain("");
        window.location.reload();
      } catch (err: any) { toast.error(err.message || "Referans eklenemedi"); }
    });
  };

  // ─── REFERANS SİL ───
  const handleDeleteReference = (refId: string, name: string) => {
    startTransition(async () => {
      try {
        await deleteReferenceAction(refId);
        toast.success(`"${name}" referansı silindi`);
        window.location.reload();
      } catch (err: any) { toast.error(err.message || "Referans silinemedi"); }
    });
  };

  // ─── PDF Upload Area (shared between add/edit) ───
  const renderPdfUpload = (isEdit: boolean) => (
    <div className="space-y-2">
      <Label>PDF Broşür (isteğe bağlı)</Label>

      {/* Existing PDF (edit mode only) */}
      {isEdit && editingSector?.pdfUrl && !removePdf && !formPdfFile && (
        <div className="flex items-center justify-between gap-2 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3">
          <div className="flex items-center gap-2 text-sm text-emerald-700">
            <FileText size={16} />
            <span className="font-medium">Mevcut PDF yüklü</span>
          </div>
          <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg text-xs gap-1" onClick={() => setRemovePdf(true)}>
            <Trash2 size={12} /> Kaldır
          </Button>
        </div>
      )}

      {isEdit && removePdf && !formPdfFile && (
        <div className="flex items-center justify-between gap-2 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
          <span className="text-sm text-amber-700">PDF kaldırılacak</span>
          <Button variant="ghost" size="sm" className="text-primary hover:bg-primary/10 rounded-lg text-xs" onClick={() => setRemovePdf(false)}>
            Geri Al
          </Button>
        </div>
      )}

      <div className="border-2 border-dashed rounded-xl p-4 text-center hover:border-primary/50 transition-colors">
        {formPdfFile ? (
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-sm">
              <FileText size={16} className="text-primary" />
              <span className="font-medium truncate">{formPdfFile.name}</span>
              <span className="text-muted-foreground text-xs">({(formPdfFile.size / 1024).toFixed(0)} KB)</span>
            </div>
            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg" onClick={() => { setFormPdfFile(null); if (fileInputRef.current) fileInputRef.current.value = ""; }}>
              <X size={14} />
            </Button>
          </div>
        ) : (
          <label className="cursor-pointer block">
            <Upload size={24} className="mx-auto text-muted-foreground/50 mb-2" />
            <p className="text-sm text-muted-foreground">
              {isEdit && editingSector?.pdfUrl && !removePdf ? "Yeni PDF ile değiştir" : "PDF dosyasını seçin veya sürükleyin"}
            </p>
            <p className="text-xs text-muted-foreground/70 mt-1">Maks. 10MB</p>
            <input ref={fileInputRef} type="file" accept=".pdf,application/pdf" className="hidden" onChange={handleFileChange} />
          </label>
        )}
      </div>
    </div>
  );

  return (
    <>
      {/* Header + Add Button */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">Faaliyet Alanı Yönetimi</h2>
          <p className="text-sm text-slate-500">Faaliyet alanlarını, tanıtım PDF&apos;lerini, ön yazıları ve referansları yönetin.</p>
        </div>
        <Button onClick={openAdd} className="gap-2 rounded-xl">
          <Plus size={16} /> Yeni Faaliyet Alanı Ekle
        </Button>
      </div>

      {/* Sectors Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {sectors.length === 0 ? (
          <div className="col-span-full text-center py-20 bg-white rounded-2xl border">
            <Briefcase size={40} className="mx-auto text-muted-foreground/30 mb-3" />
            <p className="text-muted-foreground mb-4">Henüz faaliyet alanı eklenmemiş.</p>
            <Button onClick={openAdd} variant="outline" className="gap-2 rounded-xl">
              <Plus size={16} /> İlk Faaliyet Alanını Ekle
            </Button>
          </div>
        ) : (
          sectors.map((sector) => (
            <div
              key={sector.id}
              className="bg-white rounded-2xl border shadow-sm p-6 space-y-4 hover:shadow-md transition-shadow group flex flex-col"
            >
              {/* Header */}
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center text-indigo-600">
                    <Briefcase size={20} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900">{sector.name}</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {sector.templates?.length || 0} şablon
                    </p>
                  </div>
                </div>
                {/* Action Buttons */}
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-muted-foreground hover:text-primary" onClick={() => openEdit(sector)} title="Düzenle">
                    <Pencil size={14} />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-muted-foreground hover:text-red-600" onClick={() => openDelete(sector)} title="Sil">
                    <Trash2 size={14} />
                  </Button>
                </div>
              </div>

              {/* Description */}
              {sector.description && (
                <p className="text-sm text-muted-foreground line-clamp-2">{sector.description}</p>
              )}

              {/* Cover Letter Status */}
              <div className="flex items-center gap-2">
                {sector.coverLetter ? (
                  <Badge variant="outline" className="gap-1 text-xs bg-blue-50 text-blue-700 border-blue-200">
                    <Mail size={12} /> Ön yazı tanımlı
                  </Badge>
                ) : (
                  <Badge variant="outline" className="gap-1 text-xs text-amber-600 border-amber-200 bg-amber-50">
                    <Mail size={12} /> Ön yazı yok
                  </Badge>
                )}
              </div>

              {/* PDF + Agency Badges */}
              <div className="flex items-center gap-2 flex-wrap">
                {sector.pdfUrl ? (
                  <a href={sector.pdfUrl} target="_blank" rel="noopener noreferrer" className="inline-flex">
                    <Badge variant="outline" className="gap-1 text-xs hover:bg-primary/5 cursor-pointer">
                      <FileText size={12} /> PDF Broşür <ExternalLink size={10} />
                    </Badge>
                  </a>
                ) : (
                  <Badge variant="outline" className="gap-1 text-xs text-amber-600 border-amber-200 bg-amber-50">
                    <FileText size={12} /> PDF Yok
                  </Badge>
                )}
                <Badge variant="secondary" className="text-xs">
                  <Globe size={12} className="mr-1" />
                  {sector._count?.agencies || 0} acente
                </Badge>
              </div>

              {/* ─── References Section ─── */}
              <div className="border-t pt-3 mt-auto">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-bold text-[11px] text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                    <Star size={11} /> Referanslar ({sector.references?.length || 0})
                  </h4>
                  <Button variant="ghost" size="sm" className="h-7 rounded-lg text-xs gap-1 text-primary hover:bg-primary/5 font-bold px-2" onClick={() => openRefDialog(sector.id)} disabled={isPending}>
                    <Plus size={12} /> Ekle
                  </Button>
                </div>
                {sector.references?.length > 0 ? (
                  <div className="space-y-1.5">
                    {sector.references.map((ref) => (
                      <div key={ref.id} className="flex items-center gap-2 bg-slate-50 rounded-lg px-3 py-2 group/ref hover:bg-slate-100 transition-colors">
                        <Globe size={13} className="text-slate-400 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold text-slate-700 truncate">{ref.name}</p>
                          <p className="text-[10px] text-slate-400 truncate">{ref.domain}</p>
                        </div>
                        <a href={ref.domain.startsWith("http") ? ref.domain : `https://${ref.domain}`} target="_blank" rel="noopener noreferrer" className="shrink-0">
                          <ExternalLink size={12} className="text-slate-400 hover:text-primary transition-colors" />
                        </a>
                        <Button variant="ghost" size="icon" className="h-6 w-6 rounded shrink-0 opacity-0 group-hover/ref:opacity-100 transition-opacity text-slate-400 hover:text-red-600" onClick={() => handleDeleteReference(ref.id, ref.name)} disabled={isPending}>
                          <X size={12} />
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-[11px] text-slate-400 italic">Referans eklenmemiş</p>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* ─── EKLE DİALOG ─── */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="sm:max-w-lg rounded-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Yeni Faaliyet Alanı Ekle</DialogTitle>
            <DialogDescription>
              Yeni bir faaliyet alanı oluşturun, isteğe bağlı PDF broşür ve ön yazı ekleyin.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="add-name">Faaliyet Alanı Adı *</Label>
              <Input
                id="add-name"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="Örn: Kültür Turu"
                className="rounded-xl"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="add-desc">Açıklama</Label>
              <Textarea
                id="add-desc"
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                placeholder="Faaliyet alanı hakkında kısa açıklama..."
                className="rounded-xl min-h-[80px]"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="add-cover">E-posta Ön Yazısı</Label>
              <Textarea
                id="add-cover"
                value={formCoverLetter}
                onChange={(e) => setFormCoverLetter(e.target.value)}
                placeholder={"Bu faaliyet alanı için tanıtım e-postasında kullanılacak varsayılan metin...\n\nÖrnek: Değerli iş ortağımız, kültür turu alanındaki çözümlerimizi..."}
                className="rounded-xl min-h-[120px]"
              />
              <p className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                <Mail size={11} className="text-blue-500" />
                Bu metin, acentelere tanıtım e-postası gönderirken varsayılan olarak kullanılır.
              </p>
            </div>

            {renderPdfUpload(false)}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)} disabled={isPending} className="rounded-xl">
              İptal
            </Button>
            <Button onClick={handleAdd} disabled={isPending || !formName.trim()} className="gap-2 rounded-xl">
              {isPending ? <RefreshCw className="animate-spin" size={16} /> : <Plus size={16} />}
              Faaliyet Alanını Ekle
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── DÜZENLE DİALOG ─── */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="sm:max-w-lg rounded-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Faaliyet Alanı Düzenle</DialogTitle>
            <DialogDescription>
              &quot;{editingSector?.name}&quot; faaliyet alanını düzenleyin.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Faaliyet Alanı Adı *</Label>
              <Input id="edit-name" value={formName} onChange={(e) => setFormName(e.target.value)} className="rounded-xl" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-desc">Açıklama</Label>
              <Textarea id="edit-desc" value={formDescription} onChange={(e) => setFormDescription(e.target.value)} className="rounded-xl min-h-[80px]" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-cover">E-posta Ön Yazısı</Label>
              <Textarea
                id="edit-cover"
                value={formCoverLetter}
                onChange={(e) => setFormCoverLetter(e.target.value)}
                placeholder="Bu faaliyet alanı için tanıtım e-postasında kullanılacak varsayılan metin..."
                className="rounded-xl min-h-[120px]"
              />
              <p className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                <Mail size={11} className="text-blue-500" />
                Bu metin, acentelere tanıtım e-postası gönderirken varsayılan olarak kullanılır.
              </p>
            </div>

            {renderPdfUpload(true)}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)} disabled={isPending} className="rounded-xl">
              İptal
            </Button>
            <Button onClick={handleEdit} disabled={isPending || !formName.trim()} className="gap-2 rounded-xl">
              {isPending ? <RefreshCw className="animate-spin" size={16} /> : <Pencil size={16} />}
              Kaydet
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── SİL DİALOG ─── */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle size={20} /> Faaliyet Alanını Sil
            </DialogTitle>
            <DialogDescription>
              <strong>&quot;{deletingSector?.name}&quot;</strong> faaliyet alanını silmek istediğinize emin misiniz?
              Bu işlem geri alınamaz ve bağlı şablonlar ile referanslar da silinir.
            </DialogDescription>
          </DialogHeader>

          {deletingSector && deletingSector._count.agencies > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-700 flex items-start gap-2">
              <AlertTriangle size={16} className="mt-0.5 shrink-0" />
              <span>
                Bu faaliyet alanına bağlı <strong>{deletingSector._count.agencies} acente</strong> var.
                Silmeden önce acente bağlantılarını kaldırmanız gerekebilir.
              </span>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)} disabled={isPending} className="rounded-xl">
              Vazgeç
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={isPending} className="gap-2 rounded-xl">
              {isPending ? <RefreshCw className="animate-spin" size={16} /> : <Trash2 size={16} />}
              Evet, Sil
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── REFERANS EKLE DİALOG ─── */}
      <Dialog open={showRefDialog} onOpenChange={setShowRefDialog}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Link2 size={18} /> Referans Ekle
            </DialogTitle>
            <DialogDescription>
              Bu faaliyet alanı için bir referans müşteri/iş ortağı ekleyin.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="ref-name">Referans Adı *</Label>
              <Input
                id="ref-name"
                value={refName}
                onChange={(e) => setRefName(e.target.value)}
                placeholder="Örn: ABC Turizm"
                className="rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ref-domain">Website / Domain *</Label>
              <Input
                id="ref-domain"
                value={refDomain}
                onChange={(e) => setRefDomain(e.target.value)}
                placeholder="Örn: www.abcturizm.com"
                className="rounded-xl"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRefDialog(false)} disabled={isPending} className="rounded-xl">
              İptal
            </Button>
            <Button onClick={handleAddReference} disabled={isPending || !refName.trim() || !refDomain.trim()} className="gap-2 rounded-xl">
              {isPending ? <RefreshCw className="animate-spin" size={16} /> : <Plus size={16} />}
              Referansı Ekle
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
