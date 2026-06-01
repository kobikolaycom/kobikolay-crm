"use client";

import { useState, useRef, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Upload, Trash2, Image, RefreshCw, CheckCircle2 } from "lucide-react";
import { uploadLogoAction, deleteLogoAction } from "./actions";

interface CorporateClientProps {
  logoUrl: string | null;
}

export function CorporateClient({ logoUrl: initialLogoUrl }: CorporateClientProps) {
  const [logoUrl, setLogoUrl] = useState<string | null>(initialLogoUrl);
  const [isPending, startTransition] = useTransition();
  const [preview, setPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate on client
    const allowed = ["image/png", "image/jpeg", "image/svg+xml", "image/webp"];
    if (!allowed.includes(file.type)) {
      toast.error("Sadece PNG, JPG, SVG veya WebP dosyaları yüklenebilir");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Dosya boyutu en fazla 2MB olabilir");
      return;
    }

    // Show preview
    const reader = new FileReader();
    reader.onload = () => setPreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleUpload = () => {
    const file = fileInputRef.current?.files?.[0];
    if (!file) {
      toast.error("Lütfen bir dosya seçin");
      return;
    }

    const formData = new FormData();
    formData.append("logo", file);

    startTransition(async () => {
      try {
        const result = await uploadLogoAction(formData);
        if (result.success && result.url) {
          setLogoUrl(result.url);
          setPreview(null);
          if (fileInputRef.current) fileInputRef.current.value = "";
          toast.success("Logo başarıyla yüklendi!");
        } else {
          toast.error(result.error || "Logo yüklenemedi");
        }
      } catch (err: any) {
        toast.error(err.message || "Logo yüklenirken bir hata oluştu");
      }
    });
  };

  const handleDelete = () => {
    startTransition(async () => {
      try {
        const result = await deleteLogoAction();
        if (result.success) {
          setLogoUrl(null);
          setPreview(null);
          toast.success("Logo silindi");
        } else {
          toast.error(result.error || "Logo silinemedi");
        }
      } catch (err: any) {
        toast.error(err.message || "Logo silinirken bir hata oluştu");
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* Logo Card */}
      <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
        <div className="bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 px-6 py-4">
          <h3 className="text-white font-bold text-lg flex items-center gap-2">
            <Image size={20} /> Kurumsal Logo
          </h3>
          <p className="text-white/70 text-sm mt-0.5">
            Yüklediğiniz logo dashboard ve e-posta şablonlarında kullanılacaktır.
          </p>
        </div>

        <div className="p-6 space-y-6">
          {/* Current Logo */}
          <div className="flex flex-col items-center gap-4">
            <div className="w-full max-w-sm bg-slate-50 border-2 border-dashed rounded-2xl p-8 flex flex-col items-center justify-center min-h-[200px]">
              {preview ? (
                <>
                  <img src={preview} alt="Önizleme" className="max-h-32 max-w-[280px] object-contain" />
                  <Badge variant="outline" className="mt-3 text-xs bg-amber-50 text-amber-700 border-amber-200">
                    Önizleme — henüz kaydedilmedi
                  </Badge>
                </>
              ) : logoUrl ? (
                <>
                  <img src={logoUrl} alt="Kurumsal Logo" className="max-h-32 max-w-[280px] object-contain" />
                  <Badge variant="outline" className="mt-3 text-xs bg-emerald-50 text-emerald-700 border-emerald-200 gap-1">
                    <CheckCircle2 size={10} /> Aktif Logo
                  </Badge>
                </>
              ) : (
                <>
                  <Image size={48} className="text-slate-200 mb-3" />
                  <p className="text-sm text-slate-400 font-medium">Logo yüklenmemiş</p>
                  <p className="text-xs text-slate-300 mt-1">PNG, JPG, SVG veya WebP • Maks. 2MB</p>
                </>
              )}
            </div>
          </div>

          {/* Upload Controls */}
          <div className="flex flex-wrap items-center justify-center gap-3">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/svg+xml,image/webp"
              onChange={handleFileSelect}
              className="hidden"
            />
            <Button
              variant="outline"
              className="gap-2 rounded-xl"
              onClick={() => fileInputRef.current?.click()}
              disabled={isPending}
            >
              <Upload size={14} /> Dosya Seç
            </Button>

            {preview && (
              <Button
                className="gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700"
                onClick={handleUpload}
                disabled={isPending}
              >
                {isPending ? <RefreshCw size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                {isPending ? "Yükleniyor..." : "Kaydet"}
              </Button>
            )}

            {logoUrl && !preview && (
              <Button
                variant="destructive"
                className="gap-2 rounded-xl"
                onClick={handleDelete}
                disabled={isPending}
              >
                {isPending ? <RefreshCw size={14} className="animate-spin" /> : <Trash2 size={14} />}
                Logoyu Sil
              </Button>
            )}
          </div>

          {/* Guidelines */}
          <div className="bg-slate-50 rounded-xl p-4 text-xs text-slate-500 space-y-1">
            <p className="font-semibold text-slate-600 mb-2">📐 Öneriler</p>
            <p>• Şeffaf arka planlı PNG veya SVG formatı önerilir</p>
            <p>• Minimum 200×60 piksel çözünürlük</p>
            <p>• Yatay (landscape) format en iyi sonucu verir</p>
          </div>
        </div>
      </div>
    </div>
  );
}
