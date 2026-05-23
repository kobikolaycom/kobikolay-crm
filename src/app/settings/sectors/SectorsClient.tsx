"use client";

import { useState, useRef, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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
  Briefcase, FileText, Globe, Plus, Pencil, Trash2,
  Upload, X, RefreshCw, AlertTriangle, ExternalLink,
} from "lucide-react";
import { createSectorAction, updateSectorAction, deleteSectorAction } from "./actions";

interface Sector {
  id: string;
  name: string;
  description: string | null;
  pdfUrl: string | null;
  templates: any[];
  _count: { agencies: number };
}

export function SectorsClient({ sectors: initialSectors }: { sectors: Sector[] }) {
  const [sectors, setSectors] = useState(initialSectors);
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
  const [formPdfFile, setFormPdfFile] = useState<File | null>(null);
  const [removePdf, setRemovePdf] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const resetForm = () => {
    setFormName("");
    setFormDescription("");
    setFormPdfFile(null);
    setRemovePdf(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const openAdd = () => {
    resetForm();
    setShowAddDialog(true);
  };

  const openEdit = (sector: Sector) => {
    setEditingSector(sector);
    setFormName(sector.name);
    setFormDescription(sector.description || "");
    setFormPdfFile(null);
    setRemovePdf(false);
    setShowEditDialog(true);
  };

  const openDelete = (sector: Sector) => {
    setDeletingSector(sector);
    setShowDeleteDialog(true);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.type !== "application/pdf") {
        toast.error("Sadece PDF dosyası yüklenebilir");
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        toast.error("Dosya boyutu 10MB'ı geçemez");
        return;
      }
      setFormPdfFile(file);
      setRemovePdf(false);
    }
  };

  // ─── EKLE ───
  const handleAdd = () => {
    if (!formName.trim()) {
      toast.error("Sektör adı zorunludur");
      return;
    }
    startTransition(async () => {
      try {
        const fd = new FormData();
        fd.append("name", formName.trim());
        fd.append("description", formDescription.trim());
        if (formPdfFile) fd.append("pdf", formPdfFile);

        await createSectorAction(fd);
        toast.success(`"${formName}" sektörü eklendi`);
        setShowAddDialog(false);
        resetForm();
        // Reload page to refresh data
        window.location.reload();
      } catch (err: any) {
        toast.error(err.message || "Ekleme başarısız");
      }
    });
  };

  // ─── DÜZENLE ───
  const handleEdit = () => {
    if (!formName.trim() || !editingSector) {
      toast.error("Sektör adı zorunludur");
      return;
    }
    startTransition(async () => {
      try {
        const fd = new FormData();
        fd.append("id", editingSector.id);
        fd.append("name", formName.trim());
        fd.append("description", formDescription.trim());
        if (removePdf) fd.append("removePdf", "true");
        if (formPdfFile) fd.append("pdf", formPdfFile);

        await updateSectorAction(fd);
        toast.success(`"${formName}" güncellendi`);
        setShowEditDialog(false);
        setEditingSector(null);
        resetForm();
        window.location.reload();
      } catch (err: any) {
        toast.error(err.message || "Güncelleme başarısız");
      }
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
      } catch (err: any) {
        toast.error(err.message || "Silme başarısız");
      }
    });
  };

  return (
    <>
      {/* Header + Add Button */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">Sektör Yönetimi</h2>
          <p className="text-sm text-slate-500">Tanıtım sektörlerini ve PDF şablonlarını yönetin.</p>
        </div>
        <Button onClick={openAdd} className="gap-2 rounded-xl">
          <Plus size={16} /> Yeni Sektör Ekle
        </Button>
      </div>

      {/* Sectors Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {sectors.length === 0 ? (
          <div className="col-span-full text-center py-20 bg-white rounded-2xl border">
            <Briefcase size={40} className="mx-auto text-muted-foreground/30 mb-3" />
            <p className="text-muted-foreground mb-4">Henüz sektör eklenmemiş.</p>
            <Button onClick={openAdd} variant="outline" className="gap-2 rounded-xl">
              <Plus size={16} /> İlk Sektörü Ekle
            </Button>
          </div>
        ) : (
          sectors.map((sector) => (
            <div
              key={sector.id}
              className="bg-white rounded-2xl border shadow-sm p-6 space-y-4 hover:shadow-md transition-shadow group"
            >
              {/* Header */}
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
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
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 rounded-lg text-muted-foreground hover:text-primary"
                    onClick={() => openEdit(sector)}
                    title="Düzenle"
                  >
                    <Pencil size={14} />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 rounded-lg text-muted-foreground hover:text-red-600"
                    onClick={() => openDelete(sector)}
                    title="Sil"
                  >
                    <Trash2 size={14} />
                  </Button>
                </div>
              </div>

              {/* Description */}
              {sector.description && (
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {sector.description}
                </p>
              )}

              {/* Badges */}
              <div className="flex items-center gap-2 pt-2 flex-wrap">
                {sector.pdfUrl ? (
                  <a
                    href={sector.pdfUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex"
                  >
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
            </div>
          ))
        )}
      </div>

      {/* ─── EKLE DİALOG ─── */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="sm:max-w-lg rounded-2xl">
          <DialogHeader>
            <DialogTitle>Yeni Sektör Ekle</DialogTitle>
            <DialogDescription>
              Yeni bir tanıtım sektörü oluşturun ve isteğe bağlı PDF broşür yükleyin.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="add-name">Sektör Adı *</Label>
              <Input
                id="add-name"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="Örn: Otel Rezervasyonu"
                className="rounded-xl"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="add-desc">Açıklama</Label>
              <Textarea
                id="add-desc"
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                placeholder="Sektör hakkında kısa açıklama..."
                className="rounded-xl min-h-[80px]"
              />
            </div>

            <div className="space-y-2">
              <Label>PDF Broşür (isteğe bağlı)</Label>
              <div className="border-2 border-dashed rounded-xl p-4 text-center hover:border-primary/50 transition-colors">
                {formPdfFile ? (
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 text-sm">
                      <FileText size={16} className="text-primary" />
                      <span className="font-medium truncate">{formPdfFile.name}</span>
                      <span className="text-muted-foreground text-xs">
                        ({(formPdfFile.size / 1024).toFixed(0)} KB)
                      </span>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 rounded-lg"
                      onClick={() => {
                        setFormPdfFile(null);
                        if (fileInputRef.current) fileInputRef.current.value = "";
                      }}
                    >
                      <X size={14} />
                    </Button>
                  </div>
                ) : (
                  <label className="cursor-pointer block">
                    <Upload size={24} className="mx-auto text-muted-foreground/50 mb-2" />
                    <p className="text-sm text-muted-foreground">
                      PDF dosyasını seçin veya sürükleyin
                    </p>
                    <p className="text-xs text-muted-foreground/70 mt-1">Maks. 10MB</p>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".pdf,application/pdf"
                      className="hidden"
                      onChange={handleFileChange}
                    />
                  </label>
                )}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)} disabled={isPending} className="rounded-xl">
              İptal
            </Button>
            <Button onClick={handleAdd} disabled={isPending || !formName.trim()} className="gap-2 rounded-xl">
              {isPending ? <RefreshCw className="animate-spin" size={16} /> : <Plus size={16} />}
              Sektörü Ekle
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── DÜZENLE DİALOG ─── */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="sm:max-w-lg rounded-2xl">
          <DialogHeader>
            <DialogTitle>Sektör Düzenle</DialogTitle>
            <DialogDescription>
              &quot;{editingSector?.name}&quot; sektörünü düzenleyin.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Sektör Adı *</Label>
              <Input
                id="edit-name"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                className="rounded-xl"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-desc">Açıklama</Label>
              <Textarea
                id="edit-desc"
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                className="rounded-xl min-h-[80px]"
              />
            </div>

            <div className="space-y-2">
              <Label>PDF Broşür</Label>

              {/* Existing PDF */}
              {editingSector?.pdfUrl && !removePdf && !formPdfFile && (
                <div className="flex items-center justify-between gap-2 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3">
                  <div className="flex items-center gap-2 text-sm text-emerald-700">
                    <FileText size={16} />
                    <span className="font-medium">Mevcut PDF yüklü</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg text-xs gap-1"
                    onClick={() => setRemovePdf(true)}
                  >
                    <Trash2 size={12} /> Kaldır
                  </Button>
                </div>
              )}

              {removePdf && !formPdfFile && (
                <div className="flex items-center justify-between gap-2 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
                  <span className="text-sm text-amber-700">PDF kaldırılacak</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-primary hover:bg-primary/10 rounded-lg text-xs"
                    onClick={() => setRemovePdf(false)}
                  >
                    Geri Al
                  </Button>
                </div>
              )}

              {/* Upload new */}
              <div className="border-2 border-dashed rounded-xl p-4 text-center hover:border-primary/50 transition-colors">
                {formPdfFile ? (
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 text-sm">
                      <FileText size={16} className="text-primary" />
                      <span className="font-medium truncate">{formPdfFile.name}</span>
                      <span className="text-muted-foreground text-xs">
                        ({(formPdfFile.size / 1024).toFixed(0)} KB)
                      </span>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 rounded-lg"
                      onClick={() => setFormPdfFile(null)}
                    >
                      <X size={14} />
                    </Button>
                  </div>
                ) : (
                  <label className="cursor-pointer block">
                    <Upload size={24} className="mx-auto text-muted-foreground/50 mb-2" />
                    <p className="text-sm text-muted-foreground">
                      {editingSector?.pdfUrl && !removePdf ? "Yeni PDF ile değiştir" : "PDF dosyası yükle"}
                    </p>
                    <input
                      type="file"
                      accept=".pdf,application/pdf"
                      className="hidden"
                      onChange={handleFileChange}
                    />
                  </label>
                )}
              </div>
            </div>
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
              <AlertTriangle size={20} /> Sektörü Sil
            </DialogTitle>
            <DialogDescription>
              <strong>&quot;{deletingSector?.name}&quot;</strong> sektörünü silmek istediğinize emin misiniz?
              Bu işlem geri alınamaz ve bağlı şablonlar da silinir.
            </DialogDescription>
          </DialogHeader>

          {deletingSector && deletingSector._count.agencies > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-700 flex items-start gap-2">
              <AlertTriangle size={16} className="mt-0.5 shrink-0" />
              <span>
                Bu sektöre bağlı <strong>{deletingSector._count.agencies} acente</strong> var.
                Silmeden önce acente bağlantılarını kaldırmanız gerekebilir.
              </span>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)} disabled={isPending} className="rounded-xl">
              Vazgeç
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={isPending}
              className="gap-2 rounded-xl"
            >
              {isPending ? <RefreshCw className="animate-spin" size={16} /> : <Trash2 size={16} />}
              Evet, Sil
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
