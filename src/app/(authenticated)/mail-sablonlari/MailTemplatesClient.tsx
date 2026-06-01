"use client";

import { useState, useTransition, useMemo, useRef } from "react";
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
  Plus,
  Pencil,
  Trash2,
  RefreshCw,
  AlertTriangle,
  Mail,
  Eye,
  Code2,
  FileText,
} from "lucide-react";
import {
  createTemplateAction,
  updateTemplateAction,
  deleteTemplateAction,
} from "./actions";

// ─── Tipler ───
interface EmailTemplate {
  id: string;
  name: string;
  category: string;
  subject?: string | null;
  content: string;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

// ─── Örnek veriler (önizleme için) ───
const SAMPLE_DATA: Record<string, string> = {
  companyName: "ABC Turizm Ltd.",
  authorizedPerson: "Ahmet Bey",
  documentNo: "12345",
  sectorNames: "Yazılım, Turizm",
  currentDate: new Date().toLocaleDateString("tr-TR"),
  unsubscribeUrl: "#",
};

const PLACEHOLDERS = [
  "{{companyName}}",
  "{{authorizedPerson}}",
  "{{documentNo}}",
  "{{sectorNames}}",
  "{{currentDate}}",
  "{{unsubscribeUrl}}",
];

const CATEGORY_LABELS: Record<string, string> = {
  offer_intro: "Teklif Ön Yazısı",
  promotion_intro: "Tanıtım Ön Yazısı",
  special: "Özel Gün Şablonu",
};

// ─── Yardımcı: placeholder'ları değiştir ───
function parseTemplate(content: string): string {
  let parsed = content;
  for (const [key, value] of Object.entries(SAMPLE_DATA)) {
    parsed = parsed.replace(new RegExp(`\\{\\{${key}\\}\\}`, "g"), value);
  }
  return parsed;
}

// ─── Ana Bileşen ───
export function MailTemplatesClient({ templates }: { templates: EmailTemplate[] }) {
  const [isPending, startTransition] = useTransition();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [activeField, setActiveField] = useState<"subject" | "content">("content");

  const insertPlaceholder = (placeholder: string) => {
    if (activeField === "subject") {
      const input = document.getElementById("form-subject") as HTMLInputElement;
      if (!input) {
        setFormSubject((prev) => prev + placeholder);
        return;
      }

      const start = input.selectionStart ?? 0;
      const end = input.selectionEnd ?? 0;
      const text = input.value;
      const before = text.substring(0, start);
      const after = text.substring(end, text.length);

      const newSubject = before + placeholder + after;
      setFormSubject(newSubject);

      setTimeout(() => {
        input.focus();
        input.setSelectionRange(start + placeholder.length, start + placeholder.length);
      }, 0);
    } else {
      const textarea = textareaRef.current;
      if (!textarea) {
        setFormContent((prev) => prev + placeholder);
        return;
      }

      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const text = textarea.value;
      const before = text.substring(0, start);
      const after = text.substring(end, text.length);

      const newContent = before + placeholder + after;
      setFormContent(newContent);

      // Maintain selection and focus
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(start + placeholder.length, start + placeholder.length);
      }, 0);
    }
  };

  // Dialog durumları
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<EmailTemplate | null>(null);

  // Form durumları
  const [formName, setFormName] = useState("");
  const [formCategory, setFormCategory] = useState("special");
  const [formSubject, setFormSubject] = useState("");
  const [formContent, setFormContent] = useState("");
  const [formIsDefault, setFormIsDefault] = useState(false);

  // Şablonları kategoriye göre ayır
  const offerIntro = templates.find(
    (t) => t.category === "offer_intro" && t.isDefault
  );
  const promotionIntro = templates.find(
    (t) => t.category === "promotion_intro" && t.isDefault
  );
  const specialTemplates = templates.filter((t) => t.category === "special");

  // Önizleme
  const previewContent = useMemo(() => parseTemplate(formContent), [formContent]);

  // ─── Form işlemleri ───
  const openCreate = () => {
    setEditingTemplate(null);
    setFormName("");
    setFormCategory("special");
    setFormSubject("");
    setFormContent("");
    setFormIsDefault(false);
    setShowEditDialog(true);
  };

  const openEdit = (template: EmailTemplate) => {
    setEditingTemplate(template);
    setFormName(template.name);
    setFormCategory(template.category);
    setFormSubject(template.subject || "");
    setFormContent(template.content);
    setFormIsDefault(template.isDefault);
    setShowEditDialog(true);
  };

  const handleSave = () => {
    if (!formName.trim() || !formContent.trim()) {
      toast.error("Ad ve içerik alanları zorunludur");
      return;
    }

    startTransition(async () => {
      try {
        const fd = new FormData();
        fd.set("name", formName.trim());
        fd.set("category", formCategory);
        fd.set("subject", formSubject.trim());
        fd.set("content", formContent);
        fd.set("isDefault", String(formIsDefault));

        if (editingTemplate) {
          fd.set("id", editingTemplate.id);
          await updateTemplateAction(fd);
          toast.success("Şablon güncellendi");
        } else {
          await createTemplateAction(fd);
          toast.success("Şablon oluşturuldu");
        }
        setShowEditDialog(false);
        window.location.reload();
      } catch (err: any) {
        toast.error(err.message || "İşlem başarısız");
      }
    });
  };

  const handleDelete = (template: EmailTemplate) => {
    setEditingTemplate(template);
    setShowDeleteDialog(true);
  };

  const confirmDelete = () => {
    if (!editingTemplate) return;
    startTransition(async () => {
      try {
        await deleteTemplateAction(editingTemplate.id);
        toast.success("Şablon silindi");
        setShowDeleteDialog(false);
        window.location.reload();
      } catch (err: any) {
        toast.error(err.message || "Silme başarısız");
      }
    });
  };

  const isEditingDefault =
    editingTemplate !== null &&
    (editingTemplate.category === "offer_intro" ||
      editingTemplate.category === "promotion_intro");

  return (
    <>
      {/* ─── ÜST BÖLÜM: Teklif & Tanıtım Ön Yazıları ─── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Teklif Maili Ön Yazısı */}
        <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
          <div className="px-6 py-5 border-b flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-xl">
              📋
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-slate-900">
                  Teklif Maili Ön Yazısı
                </h3>
                <Badge
                  variant="outline"
                  className="text-[10px] font-semibold bg-blue-100 text-blue-700 border-blue-200"
                >
                  Varsayılan
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Teklif e-postalarında kullanılan giriş metni
              </p>
            </div>
          </div>
          <div className="px-6 py-4">
            {offerIntro ? (
              <>
                <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap line-clamp-4">
                  {offerIntro.content.slice(0, 200)}
                  {offerIntro.content.length > 200 && "..."}
                </p>
                <div className="mt-4">
                  <Button
                    variant="outline"
                    className="gap-2 rounded-xl"
                    onClick={() => openEdit(offerIntro)}
                  >
                    <Pencil size={14} /> Düzenle
                  </Button>
                </div>
              </>
            ) : (
              <p className="text-sm text-muted-foreground italic">
                Henüz bir teklif ön yazısı tanımlanmamış.
              </p>
            )}
          </div>
        </div>

        {/* Tanıtım Maili Ön Yazısı */}
        <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
          <div className="px-6 py-5 border-b flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-xl">
              📢
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-slate-900">
                  Tanıtım Maili Ön Yazısı
                </h3>
                <Badge
                  variant="outline"
                  className="text-[10px] font-semibold bg-emerald-100 text-emerald-700 border-emerald-200"
                >
                  Varsayılan
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Tanıtım e-postalarında kullanılan giriş metni
              </p>
            </div>
          </div>
          <div className="px-6 py-4">
            {promotionIntro ? (
              <>
                <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap line-clamp-4">
                  {promotionIntro.content.slice(0, 200)}
                  {promotionIntro.content.length > 200 && "..."}
                </p>
                <div className="mt-4">
                  <Button
                    variant="outline"
                    className="gap-2 rounded-xl"
                    onClick={() => openEdit(promotionIntro)}
                  >
                    <Pencil size={14} /> Düzenle
                  </Button>
                </div>
              </>
            ) : (
              <p className="text-sm text-muted-foreground italic">
                Henüz bir tanıtım ön yazısı tanımlanmamış.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* ─── ALT BÖLÜM: Özel Gün Şablonları ─── */}
      <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
        <div className="px-6 py-5 border-b flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-600">
              <FileText size={20} />
            </div>
            <div>
              <h3 className="font-semibold text-slate-900">
                Özel Gün Şablonları
              </h3>
              <p className="text-xs text-muted-foreground">
                Bayram, yılbaşı ve özel gün e-postaları
              </p>
            </div>
          </div>
          <Button onClick={openCreate} className="gap-2 rounded-xl">
            <Plus size={16} /> Yeni Şablon
          </Button>
        </div>

        {specialTemplates.length === 0 ? (
          <div className="text-center py-16">
            <Mail
              size={40}
              className="mx-auto text-muted-foreground/30 mb-3"
            />
            <p className="text-sm text-muted-foreground">
              Henüz özel gün şablonu eklenmemiş
            </p>
            <Button
              variant="outline"
              className="mt-4 gap-2 rounded-xl"
              onClick={openCreate}
            >
              <Plus size={16} /> Şablon Ekle
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-6">
            {specialTemplates.map((template) => (
              <div
                key={template.id}
                className="border rounded-xl p-4 hover:shadow-md transition-shadow group"
              >
                <div className="flex items-start justify-between mb-2">
                  <h4 className="font-semibold text-slate-900 text-sm">
                    {template.name}
                  </h4>
                  <div className="flex items-center gap-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 rounded-lg text-muted-foreground hover:text-primary"
                      onClick={() => openEdit(template)}
                    >
                      <Pencil size={13} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 rounded-lg text-muted-foreground hover:text-red-600"
                      onClick={() => handleDelete(template)}
                    >
                      <Trash2 size={13} />
                    </Button>
                  </div>
                </div>
                {template.subject && (
                  <p className="text-xs text-muted-foreground mb-1.5 line-clamp-1">
                    Konu: {template.subject}
                  </p>
                )}
                <p className="text-xs text-slate-500 leading-relaxed whitespace-pre-wrap line-clamp-3">
                  {template.content.slice(0, 200)}
                  {template.content.length > 200 && "..."}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ─── PLACEHOLDER REFERANS KUTUSU ─── */}
      <div className="bg-slate-50 border rounded-2xl px-6 py-4">
        <div className="flex items-center gap-2 mb-3">
          <Code2 size={16} className="text-muted-foreground" />
          <h4 className="text-sm font-semibold text-slate-700">
            Kullanılabilir Değişkenler
          </h4>
        </div>
        <div className="flex flex-wrap gap-2">
          {PLACEHOLDERS.map((p) => (
            <code
              key={p}
              className="text-xs bg-white border rounded-lg px-2.5 py-1 text-slate-600 font-mono"
            >
              {p}
            </code>
          ))}
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          Bu değişkenler e-posta gönderilirken otomatik olarak gerçek verilerle
          değiştirilir.
        </p>
      </div>

      {/* ─── DÜZENLE / OLUŞTUR DİALOG ─── */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="sm:max-w-4xl max-h-[85vh] overflow-hidden flex flex-col rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Mail size={20} className="text-primary" />
              {editingTemplate ? "Şablonu Düzenle" : "Yeni Şablon Oluştur"}
            </DialogTitle>
            <DialogDescription>
              {editingTemplate
                ? "Şablon içeriğini güncelleyin. Değişkenler otomatik doldurulacaktır."
                : "Yeni bir e-posta şablonu oluşturun. Sağ panelde önizlemesini görebilirsiniz."}
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto py-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Sol: Form Alanları */}
              <div className="space-y-4">
                {/* Ad */}
                <div className="space-y-2">
                  <Label>Şablon Adı *</Label>
                  <Input
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="Örn: Yılbaşı Kutlaması"
                    className="rounded-xl"
                  />
                </div>

                {/* Kategori */}
                <div className="space-y-2">
                  <Label>Kategori</Label>
                  <Select
                    value={formCategory}
                    onValueChange={setFormCategory}
                    disabled={isEditingDefault}
                  >
                    <SelectTrigger className="rounded-xl">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="offer_intro">
                        Teklif Ön Yazısı
                      </SelectItem>
                      <SelectItem value="promotion_intro">
                        Tanıtım Ön Yazısı
                      </SelectItem>
                      <SelectItem value="special">
                        Özel Gün Şablonu
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  {isEditingDefault && (
                    <p className="text-xs text-muted-foreground">
                      Varsayılan şablonların kategorisi değiştirilemez.
                    </p>
                  )}
                </div>

                {/* Konu */}
                <div className="space-y-2">
                  <Label>Konu (opsiyonel)</Label>
                  <Input
                    id="form-subject"
                    value={formSubject}
                    onChange={(e) => setFormSubject(e.target.value)}
                    onFocus={() => setActiveField("subject")}
                    placeholder="Örn: {{companyName}} - Mutlu Yıllar! 🎄"
                    className="rounded-xl"
                  />
                </div>

                {/* İçerik */}
                <div className="space-y-2">
                  <div className="flex flex-col gap-1.5">
                    <div className="flex items-center justify-between">
                      <Label>İçerik *</Label>
                      <span className="text-[10px] text-slate-400">Metne eklemek istediğiniz değişkene tıklayın:</span>
                    </div>
                    <div className="flex flex-wrap gap-1 bg-slate-50 border p-2 rounded-xl">
                      <button
                        type="button"
                        onClick={() => insertPlaceholder("Sayın {{authorizedPerson}},\n\n")}
                        className="text-[11px] font-semibold bg-violet-50 hover:bg-violet-100 text-violet-700 border border-violet-200 transition-all rounded-lg px-2.5 py-1 flex items-center gap-1 cursor-pointer"
                        title="Sayın Yetkili veya Sayın Ahmet Bey karşılama satırı ekler"
                      >
                        👋 Karşılama (Sayın...)
                      </button>
                      <button
                        type="button"
                        onClick={() => insertPlaceholder("{{companyName}}")}
                        className="text-[11px] bg-white hover:bg-primary/10 hover:text-primary border hover:border-primary/30 transition-all rounded-lg px-2 py-1 text-slate-600 font-medium cursor-pointer"
                      >
                        🏢 Şirket Adı
                      </button>
                      <button
                        type="button"
                        onClick={() => insertPlaceholder("{{authorizedPerson}}")}
                        className="text-[11px] bg-white hover:bg-primary/10 hover:text-primary border hover:border-primary/30 transition-all rounded-lg px-2 py-1 text-slate-600 font-medium cursor-pointer"
                      >
                        👤 Yetkili Kişi
                      </button>
                      <button
                        type="button"
                        onClick={() => insertPlaceholder("{{documentNo}}")}
                        className="text-[11px] bg-white hover:bg-primary/10 hover:text-primary border hover:border-primary/30 transition-all rounded-lg px-2 py-1 text-slate-600 font-medium cursor-pointer"
                      >
                        📄 TÜRSAB No
                      </button>
                      <button
                        type="button"
                        onClick={() => insertPlaceholder("{{sectorNames}}")}
                        className="text-[11px] bg-white hover:bg-primary/10 hover:text-primary border hover:border-primary/30 transition-all rounded-lg px-2 py-1 text-slate-600 font-medium cursor-pointer"
                      >
                        💼 Sektörler
                      </button>
                      <button
                        type="button"
                        onClick={() => insertPlaceholder("{{currentDate}}")}
                        className="text-[11px] bg-white hover:bg-primary/10 hover:text-primary border hover:border-primary/30 transition-all rounded-lg px-2 py-1 text-slate-600 font-medium cursor-pointer"
                      >
                        📅 Tarih
                      </button>
                      <button
                        type="button"
                        onClick={() => insertPlaceholder("{{unsubscribeUrl}}")}
                        className="text-[11px] bg-white hover:bg-primary/10 hover:text-primary border hover:border-primary/30 transition-all rounded-lg px-2 py-1 text-slate-600 font-medium cursor-pointer"
                      >
                        🔕 Ayrılma Linki
                      </button>
                    </div>
                  </div>
                  <Textarea
                    ref={textareaRef}
                    value={formContent}
                    onChange={(e) => setFormContent(e.target.value)}
                    onFocus={() => setActiveField("content")}
                    className="rounded-xl min-h-[220px] font-mono text-sm leading-relaxed"
                    placeholder="Sayın {{authorizedPerson}},&#10;&#10;Şablon içeriğinizi buraya yazın..."
                  />
                </div>

                {/* Varsayılan Checkbox */}
                {(formCategory === "offer_intro" ||
                  formCategory === "promotion_intro") && (
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="isDefault"
                      checked={formIsDefault}
                      onCheckedChange={(checked) =>
                        setFormIsDefault(checked === true)
                      }
                    />
                    <Label htmlFor="isDefault" className="text-sm cursor-pointer">
                      Varsayılan şablon olarak ayarla
                    </Label>
                  </div>
                )}
              </div>

              {/* Sağ: Önizleme Paneli */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Eye size={16} className="text-muted-foreground" />
                  <Label className="text-sm font-semibold">
                    Canlı Önizleme
                  </Label>
                </div>
                <div className="bg-slate-50 border rounded-xl p-4">
                  {formSubject && (
                    <p className="text-xs text-muted-foreground mb-3">
                      Konu:{" "}
                      <strong>{parseTemplate(formSubject)}</strong>
                    </p>
                  )}
                  <div className="bg-white border rounded-lg p-4 text-sm leading-relaxed whitespace-pre-wrap min-h-[200px] max-h-[350px] overflow-y-auto">
                    {previewContent || (
                      <span className="text-muted-foreground italic">
                        İçerik yazdıkça önizleme burada görünecek...
                      </span>
                    )}
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-1.5">
                    <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-widest">
                      Örnek Veriler (Metne eklemek için tıkla):
                    </span>
                    {Object.entries(SAMPLE_DATA).map(([key, val]) => (
                      <button
                        key={key}
                        type="button"
                        onClick={() => insertPlaceholder(`{{${key}}}`)}
                        className="text-[10px] bg-white hover:bg-primary/[0.04] hover:text-primary border hover:border-primary/30 rounded px-1.5 py-0.5 text-slate-500 font-medium cursor-pointer transition-all active:scale-95 flex items-center"
                        title={`Metne {{${key}}} eklemek için tıklayın`}
                      >
                        {key}: {val}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="border-t pt-4">
            <Button
              variant="outline"
              onClick={() => setShowEditDialog(false)}
              disabled={isPending}
              className="rounded-xl"
            >
              İptal
            </Button>
            <Button
              onClick={handleSave}
              disabled={isPending || !formName.trim() || !formContent.trim()}
              className="gap-2 rounded-xl"
            >
              {isPending ? (
                <RefreshCw className="animate-spin" size={16} />
              ) : (
                <Pencil size={16} />
              )}
              {isPending
                ? "Kaydediliyor..."
                : editingTemplate
                ? "Güncelle"
                : "Oluştur"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── SİL DİALOG ─── */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle size={20} /> Şablonu Sil
            </DialogTitle>
            <DialogDescription>
              &quot;{editingTemplate?.name}&quot; şablonunu silmek istediğinize
              emin misiniz? Bu işlem geri alınamaz.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowDeleteDialog(false)}
              disabled={isPending}
              className="rounded-xl"
            >
              Vazgeç
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDelete}
              disabled={isPending}
              className="gap-2 rounded-xl"
            >
              {isPending ? (
                <RefreshCw className="animate-spin" size={16} />
              ) : (
                <Trash2 size={16} />
              )}
              Evet, Sil
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
