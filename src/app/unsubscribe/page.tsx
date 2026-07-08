"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { MailX, AlertTriangle, CheckCircle2, ShieldAlert, Loader2 } from "lucide-react";

function UnsubscribeContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [agencyData, setAgencyData] = useState<{ companyName: string; isUnsubscribed: boolean } | null>(null);
  const [confirmUnsubscribe, setConfirmUnsubscribe] = useState(false);
  const [success, setSuccess] = useState(false);

  // Token'ı doğrula
  useEffect(() => {
    if (!token) {
      setError("Geçersiz veya eksik bağlantı token'ı. Lütfen e-postanızdaki bağlantıyı kontrol edin.");
      setLoading(false);
      return;
    }

    fetch(`/api/unsubscribe?token=${token}`)
      .then((res) => {
        if (!res.ok) {
          throw new Error("İşletme bulunamadı veya bağlantı süresi dolmuş.");
        }
        return res.json();
      })
      .then((data) => {
        setAgencyData(data);
        if (data.isUnsubscribed) {
          setSuccess(true);
        }
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message || "İşletme bilgileri alınamadı.");
        setLoading(false);
      });
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!confirmUnsubscribe) {
      alert("Lütfen e-posta listesinden çıkmak istediğinizi onaylayın.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/unsubscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, confirm: true }),
      });

      if (!res.ok) {
        throw new Error("Abonelikten çıkma işlemi başarısız oldu.");
      }

      setSuccess(true);
    } catch (err: any) {
      setError(err.message || "Bir sunucu hatası oluştu.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-8 min-h-[300px]">
        <Loader2 className="h-10 w-10 animate-spin text-primary mb-4" />
        <p className="text-sm text-slate-500 font-medium animate-pulse">İşletme bilgileri doğrulanıyor...</p>
      </div>
    );
  }

  if (error && !success) {
    return (
      <div className="text-center p-6 sm:p-10">
        <div className="w-16 h-16 rounded-2xl bg-red-50 text-red-500 flex items-center justify-center mx-auto mb-6 border border-red-100">
          <ShieldAlert size={28} />
        </div>
        <h2 className="text-xl font-bold text-slate-900 mb-2">Bağlantı Hatası</h2>
        <p className="text-sm text-slate-500 leading-relaxed max-w-sm mx-auto mb-6">{error}</p>
        <div className="text-xs text-muted-foreground bg-slate-50 p-3 rounded-xl border">
          Destek veya manuel ayrılma talepleri için lütfen <strong>destek@acenteyazilim.com</strong> ile iletişime geçin.
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="text-center p-6 sm:p-10 animate-in fade-in zoom-in duration-500">
        <div className="w-16 h-16 rounded-2xl bg-emerald-50 text-emerald-500 flex items-center justify-center mx-auto mb-6 border border-emerald-100 shadow-sm">
          <CheckCircle2 size={28} className="animate-bounce" />
        </div>
        <h2 className="text-xl font-bold text-slate-900 mb-2">Abonelikten Ayrıldınız</h2>
        <p className="text-sm text-slate-500 leading-relaxed max-w-md mx-auto mb-6">
          <strong>{agencyData?.companyName || "İşletmeniz"}</strong> başarıyla e-posta listemizden çıkarılmıştır. 
          Bundan sonra tarafınıza bilgilendirme, teklif veya tanıtım e-postası gönderilmeyecektir.
        </p>
        <p className="text-xs text-muted-foreground border-t pt-4">
          Fikrinizi değiştirirseniz müşteri temsilcinizle iletişime geçerek listenize tekrar dahil olabilirsiniz.
        </p>
      </div>
    );
  }

  return (
    <div className="p-6 sm:p-10 animate-in fade-in duration-300">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 rounded-2xl bg-violet-50 text-violet-600 flex items-center justify-center border border-violet-100 shadow-sm">
          <MailX size={20} />
        </div>
        <div>
          <h2 className="text-lg font-bold text-slate-900">E-posta Listesinden Çık</h2>
          <p className="text-xs text-slate-500">Abonelik tercihlerinizi hızlıca güncelleyin.</p>
        </div>
      </div>

      <p className="text-sm text-slate-600 leading-relaxed mb-6">
        Sayın <strong>{agencyData?.companyName}</strong> Yetkilisi,<br />
        Gereksiz e-posta trafiği oluşturarak vaktinizi almak istemiyoruz. Tercihinizi onayladığınız takdirde e-posta listemizden derhal çıkarılacaksınız.
      </p>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div 
          onClick={() => setConfirmUnsubscribe(!confirmUnsubscribe)}
          className={`flex items-start gap-3 p-4 rounded-xl border transition-all cursor-pointer select-none ${
            confirmUnsubscribe 
              ? "bg-violet-50/50 border-violet-200 ring-2 ring-violet-50" 
              : "bg-slate-50/50 hover:bg-slate-50 border-slate-200"
          }`}
        >
          <Checkbox 
            id="confirm" 
            checked={confirmUnsubscribe}
            onCheckedChange={(checked) => setConfirmUnsubscribe(checked === true)}
            className="mt-0.5"
          />
          <div className="grid gap-1">
            <Label htmlFor="confirm" className="text-sm font-semibold text-slate-900 cursor-pointer">
              E-posta listesinden çıkmak istiyorum.
            </Label>
            <p className="text-xs text-slate-500 leading-relaxed">
              Bu kutuyu işaretleyerek tarafınıza gönderilecek tüm bilgilendirme ve yazılım kampanya maillerini durdurmayı onaylıyorsunuz.
            </p>
          </div>
        </div>

        <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 text-xs text-amber-700 flex items-start gap-2.5">
          <AlertTriangle size={15} className="mt-0.5 shrink-0" />
          <span>
            <strong>Lütfen Dikkat:</strong> Abonelikten ayrıldığınızda güncel teknolojilerimizden, özel indirim fırsatlarımızdan ve işletmenizin dijital altyapısını güçlendirecek kritik güncellemelerden haberdar olamayacaksınız.
          </span>
        </div>

        <div className="flex flex-col sm:flex-row gap-2 pt-2">
          <Button 
            type="submit" 
            disabled={submitting || !confirmUnsubscribe} 
            className="flex-1 bg-violet-600 hover:bg-violet-700 text-white rounded-xl shadow-lg shadow-violet-100 py-6 text-sm font-bold gap-2"
          >
            {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
            Aboneliği Sonlandır
          </Button>
          <Button 
            type="button" 
            variant="outline" 
            onClick={() => window.close()}
            className="rounded-xl border-slate-200 text-slate-600 hover:bg-slate-50 py-6"
          >
            Sayfayı Kapat
          </Button>
        </div>
      </form>
    </div>
  );
}

export default function UnsubscribePage() {
  return (
    <div className="min-h-screen bg-slate-50/50 flex flex-col items-center justify-center p-4">
      {/* Background Gradients for Modern Premium Vibe */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(124,58,237,0.05),transparent_50%),radial-gradient(ellipse_at_bottom_left,rgba(79,70,229,0.05),transparent_50%)] pointer-events-none" />
      
      <div className="w-full max-w-lg bg-white rounded-3xl border shadow-xl shadow-slate-100/50 overflow-hidden relative z-10">
        {/* Brand Header */}
        <div className="bg-gradient-to-r from-violet-600 to-indigo-600 p-6 text-center text-white">
          <h1 className="font-extrabold text-lg tracking-tight">acenteyazılım.com</h1>
          <p className="text-[10px] text-white/70 uppercase tracking-widest font-semibold mt-1">Dijital Teknoloji Partneriniz</p>
        </div>

        {/* Dynamic Content */}
        <Suspense fallback={
          <div className="flex flex-col items-center justify-center p-8 min-h-[300px]">
            <Loader2 className="h-10 w-10 animate-spin text-primary mb-4" />
            <p className="text-sm text-slate-500 font-medium">Sayfa yükleniyor...</p>
          </div>
        }>
          <UnsubscribeContent />
        </Suspense>
      </div>

      <p className="text-center text-[10px] text-slate-400 mt-6 font-medium">
        © 2026 acenteyazilim.com | Tüm Hakları Saklıdır.
      </p>
    </div>
  );
}
