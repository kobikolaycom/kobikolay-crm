"use client";

import { useState, useEffect, useTransition } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Mail, MessageCircle, Hash, Globe, Save, Eye, EyeOff,
  CheckCircle2, AlertCircle, RefreshCw, Server, X
} from "lucide-react";

interface IntegrationSettings {
  smtp: Record<string, string>;
  whatsapp: Record<string, string>;
  meta: Record<string, string>;
  meta_capi: Record<string, string>;
  system?: Record<string, string>;
  userRole?: string | null;
}

async function loadSettings(): Promise<IntegrationSettings> {
  const res = await fetch("/api/settings/integrations");
  if (!res.ok) return { smtp: {}, whatsapp: {}, meta: {}, meta_capi: {}, system: {}, userRole: null };
  return res.json();
}

async function saveSettings(category: string, entries: { key: string; value: string }[]) {
  const res = await fetch("/api/settings/integrations", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ category, entries }),
  });
  return res.json();
}

const PasswordInput = ({ value, onChange, placeholder }: { value: string, onChange: (val: string) => void, placeholder?: string, field?: string }) => {
  const [isFocused, setIsFocused] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="relative flex items-center">
      <Input
        type={showPassword ? "text" : "password"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setTimeout(() => setIsFocused(false), 150)}
        className="pr-16 rounded-xl font-mono text-sm"
      />
      <div className="absolute right-3 flex items-center gap-1.5 select-none">
        {isFocused && value && (
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => onChange("")}
            className="text-slate-400 hover:text-slate-600 transition-all rounded-full p-0.5"
            title="Temizle"
          >
            <X size={12} className="bg-slate-100 hover:bg-slate-200 text-slate-500 rounded-full p-0.5" />
          </button>
        )}
        <button
          type="button"
          onClick={() => setShowPassword(!showPassword)}
          className="text-muted-foreground hover:text-foreground p-0.5 rounded-lg transition-all"
        >
          {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      </div>
    </div>
  );
};

export default function IntegrationsPage() {
  const [isPending, startTransition] = useTransition();

  // SMTP Settings
  const [smtpHost, setSmtpHost] = useState("");
  const [smtpPort, setSmtpPort] = useState("587");
  const [smtpUser, setSmtpUser] = useState("");
  const [smtpPass, setSmtpPass] = useState("");
  const [smtpFrom, setSmtpFrom] = useState("");
  const [smtpFromName, setSmtpFromName] = useState("");
  const [smtpEncryption, setSmtpEncryption] = useState("NONE");
  const [testEmail, setTestEmail] = useState("");
  
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [isSendingTest, setIsSendingTest] = useState(false);

  // WhatsApp Settings
  const [waPhoneId, setWaPhoneId] = useState("");
  const [waToken, setWaToken] = useState("");
  const [waWebhookSecret, setWaWebhookSecret] = useState("");

  // Meta / Instagram Settings
  const [metaAppId, setMetaAppId] = useState("");
  const [metaAppSecret, setMetaAppSecret] = useState("");
  const [metaPageToken, setMetaPageToken] = useState("");
  const [igAccountId, setIgAccountId] = useState("");
  const [metaWebhookVerifyToken, setMetaWebhookVerifyToken] = useState("");

  // Meta Conversions API (CAPI) Settings
  const [capiAccessToken, setCapiAccessToken] = useState("");
  const [capiDatasetId, setCapiDatasetId] = useState("");
  const [capiTestEventCode, setCapiTestEventCode] = useState("");
  const [isTestingCapi, setIsTestingCapi] = useState(false);

  const [loaded, setLoaded] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [testMode, setTestMode] = useState(false);
  const [isTestModePending, setIsTestModePending] = useState(false);

  // Load on mount
  useEffect(() => {
    loadSettings().then((data) => {
      if (data.smtp) {
        setSmtpHost(data.smtp.host || "");
        setSmtpPort(data.smtp.port || "587");
        setSmtpUser(data.smtp.user || "");
        setSmtpPass(data.smtp.pass || "");
        setSmtpFrom(data.smtp.from || "");
        setSmtpFromName(data.smtp.fromName || "");
        setSmtpEncryption(data.smtp.encryption || "NONE");
      }
      if (data.whatsapp) {
        setWaPhoneId(data.whatsapp.phoneId || "");
        setWaToken(data.whatsapp.token || "");
        setWaWebhookSecret(data.whatsapp.webhookSecret || "");
      }
      if (data.meta) {
        setMetaAppId(data.meta.appId || "");
        setMetaAppSecret(data.meta.appSecret || "");
        setMetaPageToken(data.meta.pageToken || "");
        setIgAccountId(data.meta.igAccountId || "");
        setMetaWebhookVerifyToken(data.meta.webhookVerifyToken || "");
      }
      if (data.meta_capi) {
        setCapiAccessToken(data.meta_capi.accessToken || "");
        setCapiDatasetId(data.meta_capi.datasetId || "");
        setCapiTestEventCode(data.meta_capi.testEventCode || "");
      }
      if (data.system) {
        setTestMode(data.system.testMode === "true");
      }
      if (data.userRole) {
        setUserRole(data.userRole);
      }
      setLoaded(true);
    });
  }, []);

  const handleToggleTestMode = async (checked: boolean) => {
    setIsTestModePending(true);
    try {
      await saveSettings("system", [
        { key: "testMode", value: checked ? "true" : "false" },
      ]);
      setTestMode(checked);
      toast.success(checked ? "Test modu aktif edildi. İşletmeler artık bağlı kayıtlarıyla birlikte silinebilir." : "Test modu kapatıldı. Canlı veri koruması aktif.");
    } catch {
      toast.error("İşlem gerçekleştirilemedi");
    } finally {
      setIsTestModePending(false);
    }
  };

  const [isPurgingMessages, setIsPurgingMessages] = useState(false);

  const handlePurgeMessages = async () => {
    const confirmDelete = window.confirm(
      "⚠️ DİKKAT: Sistemdeki tüm WhatsApp, Instagram, Messenger sohbetleri ve mesaj geçmişi kalıcı olarak silinecektir! Bu işlem geri alınamaz.\n\nDevam etmek istediğinizden emin misiniz?"
    );
    if (!confirmDelete) return;

    setIsPurgingMessages(true);
    try {
      const res = await fetch("/api/purge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ target: "conversations" }),
      });

      const data = await res.json();
      if (res.ok) {
        toast.success(data.results?.[0] || "Tüm mesajlaşma verileri başarıyla temizlendi!");
      } else {
        toast.error(data.error || "Temizleme işlemi gerçekleştirilemedi");
      }
    } catch {
      toast.error("Bir hata oluştu");
    } finally {
      setIsPurgingMessages(false);
    }
  };



  const handleSaveSmtp = () => {
    startTransition(async () => {
      try {
        const cleanHost = smtpHost.trim();
        const cleanPort = smtpPort.trim();
        const cleanUser = smtpUser.trim();
        let cleanPass = smtpPass.trim();
        const cleanFrom = smtpFrom.trim();
        const cleanFromName = smtpFromName.trim();

        // 16 haneli Gmail Uygulama Şifresi girildiyse aradaki boşlukları otomatik temizle
        if (cleanHost.includes("gmail") || cleanUser.includes("gmail")) {
          const strippedPass = cleanPass.replace(/\s+/g, "");
          if (strippedPass.length === 16) {
            cleanPass = strippedPass;
          }
        }

        // State'leri temizlenmiş halleriyle güncelle
        setSmtpHost(cleanHost);
        setSmtpPort(cleanPort);
        setSmtpUser(cleanUser);
        setSmtpPass(cleanPass);
        setSmtpFrom(cleanFrom);
        setSmtpFromName(cleanFromName);

        await saveSettings("smtp", [
          { key: "host", value: cleanHost },
          { key: "port", value: cleanPort },
          { key: "user", value: cleanUser },
          { key: "pass", value: cleanPass },
          { key: "from", value: cleanFrom },
          { key: "fromName", value: cleanFromName },
          { key: "encryption", value: smtpEncryption },
        ]);
        toast.success("SMTP ayarları kaydedildi");
      } catch {
        toast.error("Kaydetme başarısız");
      }
    });
  };

  const handleTestSmtp = async (action: "connect" | "send") => {
    if (action === "connect") setIsTestingConnection(true);
    else setIsSendingTest(true);

    const cleanHost = smtpHost.trim();
    const cleanPort = smtpPort.trim();
    const cleanUser = smtpUser.trim();
    let cleanPass = smtpPass.trim();
    const cleanFrom = smtpFrom.trim();
    const cleanFromName = smtpFromName.trim();
    const cleanTestEmail = testEmail.trim();

    // 16 haneli Gmail Uygulama Şifresi girildiyse aradaki boşlukları otomatik temizle
    if (cleanHost.includes("gmail") || cleanUser.includes("gmail")) {
      const strippedPass = cleanPass.replace(/\s+/g, "");
      if (strippedPass.length === 16) {
        cleanPass = strippedPass;
      }
    }

    // State'leri temizlenmiş halleriyle güncelle
    setSmtpHost(cleanHost);
    setSmtpPort(cleanPort);
    setSmtpUser(cleanUser);
    setSmtpPass(cleanPass);
    setSmtpFrom(cleanFrom);
    setSmtpFromName(cleanFromName);
    setTestEmail(cleanTestEmail);

    try {
      const res = await fetch("/api/settings/integrations/smtp-test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          host: cleanHost,
          port: cleanPort,
          user: cleanUser,
          pass: cleanPass,
          from: cleanFrom,
          fromName: cleanFromName,
          encryption: smtpEncryption,
          testEmail: cleanTestEmail,
          action,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        toast.success(data.message);
      } else {
        toast.error(data.error || "Bağlantı başarısız");
      }
    } catch (error) {
      toast.error("Bir hata oluştu");
    } finally {
      if (action === "connect") setIsTestingConnection(false);
      else setIsSendingTest(false);
    }
  };

  const handleSaveWhatsApp = () => {
    startTransition(async () => {
      try {
        await saveSettings("whatsapp", [
          { key: "phoneId", value: waPhoneId },
          { key: "token", value: waToken },
          { key: "webhookSecret", value: waWebhookSecret },
        ]);
        toast.success("WhatsApp ayarları kaydedildi");
      } catch {
        toast.error("Kaydetme başarısız");
      }
    });
  };

  const handleSaveMeta = () => {
    startTransition(async () => {
      try {
        await saveSettings("meta", [
          { key: "appId", value: metaAppId },
          { key: "appSecret", value: metaAppSecret },
          { key: "pageToken", value: metaPageToken },
          { key: "igAccountId", value: igAccountId },
          { key: "webhookVerifyToken", value: metaWebhookVerifyToken },
        ]);
        toast.success("Meta/Instagram ayarları kaydedildi");
      } catch {
        toast.error("Kaydetme başarısız");
      }
    });
  };

  const handleSaveMetaCapi = () => {
    startTransition(async () => {
      try {
        await saveSettings("meta_capi", [
          { key: "accessToken", value: capiAccessToken.trim() },
          { key: "datasetId", value: capiDatasetId.trim() },
          { key: "testEventCode", value: capiTestEventCode.trim() },
        ]);
        toast.success("Meta Dönüşüm API ayarları kaydedildi");
      } catch {
        toast.error("Kaydetme başarısız");
      }
    });
  };

  const handleTestCapi = async () => {
    setIsTestingCapi(true);
    try {
      const res = await fetch("/api/settings/integrations/meta-capi-test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accessToken: capiAccessToken.trim(),
          datasetId: capiDatasetId.trim(),
          testEventCode: capiTestEventCode.trim(),
        }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(data.message || "Test olayı başarıyla gönderildi!");
      } else {
        toast.error(data.error || "Test başarısız");
      }
    } catch {
      toast.error("Bağlantı hatası");
    } finally {
      setIsTestingCapi(false);
    }
  };



  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <PageHeader
        title="API & Entegrasyonlar"
        description="E-posta sunucusu, WhatsApp Business ve Meta API bağlantılarını yapılandırın."
      />

      {/* Test Mode Toggle - Only for Super Admin */}
      {userRole === "Super Admin" && (
        <div className="bg-gradient-to-r from-violet-50 to-indigo-50 dark:from-slate-900 dark:to-slate-800 rounded-2xl border border-indigo-100 dark:border-slate-700 shadow-sm overflow-hidden p-6">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-sm transition-all duration-300 ${testMode ? 'bg-amber-500 text-white animate-pulse' : 'bg-indigo-600 text-white'}`}>
                {testMode ? <RefreshCw size={24} /> : <Server size={24} />}
              </div>
              <div>
                <h3 className="font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2 text-lg">
                  Sistem Çalışma Modu (İşletme Silme Kilidi)
                  {testMode ? (
                    <Badge className="bg-amber-500 hover:bg-amber-600 border-none text-white text-[10px] font-bold px-2 py-0.5 rounded-full animate-bounce">TEST / SEED MODU</Badge>
                  ) : (
                    <Badge className="bg-indigo-600 hover:bg-indigo-700 border-none text-white text-[10px] font-bold px-2 py-0.5 rounded-full">CANLI KORUMA MODU</Badge>
                  )}
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-300 mt-1 max-w-2xl leading-relaxed">
                  {testMode 
                    ? "⚠️ DİKKAT: Test modu aktif! Adminler işletmeleri silerken bağlı tüm geçmiş yazışmaları, teklifleri ve aktiviteleri veritabanından kalıcı olarak temizler (Cascade Delete)." 
                    : "🔒 GÜVENLİ: Canlı mod aktif. İşletmeler yanlışlıkla silinemez; bağlı herhangi bir geçmiş yazışma veya işlem varsa silme işlemi engellenir."
                  }
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-3 shrink-0 self-end md:self-center">
              <span className={`text-xs font-bold uppercase tracking-wider transition-colors duration-300 ${testMode ? 'text-amber-600' : 'text-slate-500'}`}>
                {testMode ? 'Test Modu Açık' : 'Güvenli Kilit Aktif'}
              </span>
              <button
                disabled={isTestModePending}
                onClick={() => handleToggleTestMode(!testMode)}
                className={`relative inline-flex h-7 w-14 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-300 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-opacity-75 ${
                  testMode ? 'bg-amber-500 animate-pulse' : 'bg-slate-300 dark:bg-slate-700'
                }`}
              >
                <span className="sr-only">Toggle Test Mode</span>
                <span
                  aria-hidden="true"
                  className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-lg ring-0 transition-transform duration-300 ease-in-out ${
                    testMode ? 'translate-x-7' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>
          {testMode && (
            <div className="mt-5 pt-4 border-t border-amber-200/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-in slide-in-from-top-2 duration-300">
              <div>
                <h4 className="font-bold text-slate-800 dark:text-slate-200 text-sm">💬 Mesajlaşma & Sohbet Temizliği</h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Sistemde birikmiş tüm omnichannel canlı sohbetleri ve mesajlaşma geçmişini tek tıkla veritabanından kalıcı olarak silebilirsiniz.</p>
              </div>
              <Button
                disabled={isPurgingMessages}
                onClick={handlePurgeMessages}
                variant="outline"
                className="rounded-xl text-rose-600 border-rose-200 hover:bg-rose-50 hover:text-rose-700 hover:border-rose-300 w-full sm:w-auto shrink-0 font-bold transition-all flex items-center justify-center gap-2"
              >
                {isPurgingMessages ? <RefreshCw className="animate-spin" size={16} /> : <AlertCircle size={16} />}
                Tüm Mesajlaşmaları Temizle
              </Button>
            </div>
          )}
        </div>
      )}

      {/* SMTP */}
      <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
        <div className="px-6 py-5 border-b flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-600">
              <Mail size={20} />
            </div>
            <div>
              <h3 className="font-semibold text-slate-900">SMTP Ayarları</h3>
              <p className="text-xs text-muted-foreground">E-posta gönderimleri için kullanılacak SMTP altyapısını buradan yönetebilirsin.</p>
            </div>
          </div>
          <Badge variant="outline" className="bg-emerald-50 text-emerald-600 border-emerald-200 text-[10px]">Configured</Badge>
        </div>
        <div className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            <div className="space-y-2">
              <Label className="flex flex-col gap-1">
                <span>Mail Sunucu</span>
                <span className="text-[10px] font-normal text-muted-foreground">Mail sunucusu ismi</span>
              </Label>
              <Input value={smtpHost} onChange={(e) => setSmtpHost(e.target.value)} placeholder="everest.mxrouting.net" className="rounded-xl" />
            </div>

            <div className="space-y-2">
              <Label className="flex flex-col gap-1">
                <span>Mail Tanım</span>
                <span className="text-[10px] font-normal text-muted-foreground">Mail atıldığında görülecek isim</span>
              </Label>
              <Input value={smtpFromName} onChange={(e) => setSmtpFromName(e.target.value)} placeholder="İşletme Yazilim" className="rounded-xl" />
            </div>

            <div className="space-y-2">
              <Label className="flex flex-col gap-1">
                <span>Bağlantı</span>
                <span className="text-[10px] font-normal text-muted-foreground">Güvenli bağlantı için ssl normal bağlantı için tls</span>
              </Label>
              <select 
                value={smtpEncryption}
                onChange={(e) => setSmtpEncryption(e.target.value)}
                className="flex h-10 w-full items-center justify-between rounded-xl border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
              >
                <option value="NONE">NONE</option>
                <option value="SSL">SSL</option>
                <option value="TLS">TLS</option>
              </select>
            </div>

            <div className="space-y-2">
              <Label className="flex flex-col gap-1">
                <span>Mail Adresi</span>
                <span className="text-[10px] font-normal text-muted-foreground">Mail adresinizin kullanıcı adı</span>
              </Label>
              <Input value={smtpFrom} onChange={(e) => setSmtpFrom(e.target.value)} placeholder="no-reply@sirket.com" className="rounded-xl" />
            </div>

            <div className="space-y-2">
              <Label className="flex flex-col gap-1">
                <span>Port</span>
                <span className="text-[10px] font-normal text-muted-foreground">Güvenli bağlantı için 465 Normal bağlantı için 587</span>
              </Label>
              <Input value={smtpPort} onChange={(e) => setSmtpPort(e.target.value)} placeholder="587" className="rounded-xl" />
            </div>

            <div className="space-y-2">
              <Label className="flex flex-col gap-1">
                <span>Şifre</span>
                <span className="text-[10px] font-normal text-muted-foreground">Mail adresinizin şifresi</span>
              </Label>
              <PasswordInput value={smtpPass} onChange={setSmtpPass} placeholder="Boş bırakırsan değişmez" />
            </div>

            <div className="space-y-2">
              <Label className="flex flex-col gap-1">
                <span>Kullanıcı Adı</span>
                <span className="text-[10px] font-normal text-muted-foreground">SMTP girişinde kullanılacak e-posta veya kullanıcı adı.</span>
              </Label>
              <Input value={smtpUser} onChange={(e) => setSmtpUser(e.target.value)} placeholder="no-reply@sirket.com" className="rounded-xl" />
            </div>

          </div>

          <div className="flex flex-col md:flex-row gap-4 items-end bg-slate-50 p-5 rounded-2xl border">
            <div className="space-y-2 flex-1 w-full">
              <Label>Test E-Posta Adresi</Label>
              <Input value={testEmail} onChange={(e) => setTestEmail(e.target.value)} placeholder="test@example.com" className="rounded-xl bg-white" />
            </div>
            <div className="flex gap-3 w-full md:w-auto">
              <Button onClick={() => handleTestSmtp("connect")} disabled={isTestingConnection} variant="outline" className="rounded-xl w-full md:w-auto">
                {isTestingConnection ? <RefreshCw className="animate-spin mr-2" size={16} /> : null}
                Bağlantıyı Test Et
              </Button>
              <Button onClick={() => handleTestSmtp("send")} disabled={isSendingTest} variant="outline" className="rounded-xl text-rose-600 border-rose-200 hover:bg-rose-50 hover:text-rose-700 w-full md:w-auto">
                {isSendingTest ? <RefreshCw className="animate-spin mr-2" size={16} /> : null}
                Test Mail Gönder
              </Button>
            </div>
          </div>

          <div className="flex justify-end pt-2 border-t">
            <Button onClick={handleSaveSmtp} disabled={isPending} className="gap-2 rounded-xl">
              {isPending ? <RefreshCw className="animate-spin" size={16} /> : <Save size={16} />}
              SMTP Ayarlarını Kaydet
            </Button>
          </div>
        </div>
      </div>

      {/* WhatsApp */}
      <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
        <div className="px-6 py-5 border-b flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center text-green-600">
            <MessageCircle size={20} />
          </div>
          <div>
            <h3 className="font-semibold text-slate-900">WhatsApp Business API</h3>
            <p className="text-xs text-muted-foreground">Meta WhatsApp Cloud API bağlantı ayarları</p>
          </div>
          <Badge variant="outline" className="ml-auto text-[10px] bg-amber-50 text-amber-700 border-amber-200">Beta</Badge>
        </div>
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Phone Number ID</Label>
              <Input value={waPhoneId} onChange={(e) => setWaPhoneId(e.target.value)} placeholder="123456789012345" className="rounded-xl font-mono text-sm" />
            </div>
            <div className="space-y-2">
              <Label>Permanent Access Token</Label>
              <PasswordInput value={waToken} onChange={setWaToken} field="waToken" placeholder="EAABs..." />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Webhook Verify Token</Label>
              <Input value={waWebhookSecret} onChange={(e) => setWaWebhookSecret(e.target.value)} placeholder="my_webhook_verify_token" className="rounded-xl font-mono text-sm" />
            </div>
          </div>
          <div className="flex justify-end pt-2">
            <Button onClick={handleSaveWhatsApp} disabled={isPending} className="gap-2 rounded-xl">
              {isPending ? <RefreshCw className="animate-spin" size={16} /> : <Save size={16} />}
              WhatsApp Ayarlarını Kaydet
            </Button>
          </div>
        </div>
      </div>

      {/* Meta / Instagram */}
      <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
        <div className="px-6 py-5 border-b flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-600">
              <Hash size={20} />
            </div>
            <div>
              <h3 className="font-semibold text-slate-900">Meta & Instagram API</h3>
              <p className="text-xs text-muted-foreground">Facebook ve Instagram mesaj entegrasyonu</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {metaPageToken && igAccountId ? (
              <Badge variant="outline" className="text-[10px] bg-emerald-50 text-emerald-600 border-emerald-200">Aktif</Badge>
            ) : (
              <Badge variant="outline" className="text-[10px] bg-amber-50 text-amber-700 border-amber-200">Yapılandırılmadı</Badge>
            )}
          </div>
        </div>
        <div className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>App ID</Label>
              <Input value={metaAppId} onChange={(e) => setMetaAppId(e.target.value)} placeholder="123456789" className="rounded-xl font-mono text-sm" />
            </div>
            <div className="space-y-2">
              <Label>App Secret</Label>
              <PasswordInput value={metaAppSecret} onChange={setMetaAppSecret} placeholder="••••••••" />
            </div>
            <div className="space-y-2">
              <Label>Page Access Token</Label>
              <PasswordInput value={metaPageToken} onChange={setMetaPageToken} placeholder="EAABs..." />
            </div>
            <div className="space-y-2">
              <Label>Instagram Business Account ID</Label>
              <Input value={igAccountId} onChange={(e) => setIgAccountId(e.target.value)} placeholder="17841..." className="rounded-xl font-mono text-sm" />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Webhook Verify Token</Label>
              <Input value={metaWebhookVerifyToken} onChange={(e) => setMetaWebhookVerifyToken(e.target.value)} placeholder="my_custom_verify_token" className="rounded-xl font-mono text-sm" />
              <p className="text-[10px] text-muted-foreground">Meta Developer panelinde webhook ayarlarına gireceğiniz doğrulama tokeni</p>
            </div>
          </div>

          <div className="bg-slate-50 rounded-2xl border p-5 space-y-3">
            <div className="space-y-1">
              <Label className="text-xs font-medium text-slate-700">Webhook URL</Label>
              <p className="text-[10px] text-muted-foreground">Meta Developer panelinde bu URL&apos;i webhook callback olarak girin</p>
            </div>
            <div className="flex items-center gap-2">
              <code className="flex-1 bg-white border rounded-xl px-4 py-2.5 text-xs font-mono text-slate-700 select-all">
                {loaded && typeof window !== "undefined" ? `${window.location.origin}/api/webhooks/instagram` : "/api/webhooks/instagram"}
              </code>
              <Button
                variant="outline"
                size="sm"
                className="rounded-xl shrink-0"
                onClick={() => {
                  navigator.clipboard.writeText(`${window.location.origin}/api/webhooks/instagram`);
                  toast.success("Kopyalandı");
                }}
              >
                Kopyala
              </Button>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <Button onClick={handleSaveMeta} disabled={isPending} className="gap-2 rounded-xl">
              {isPending ? <RefreshCw className="animate-spin" size={16} /> : <Save size={16} />}
              Meta Ayarlarını Kaydet
            </Button>
          </div>
        </div>
      </div>

      {/* Meta Conversions API (CAPI) */}
      <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
        <div className="px-6 py-5 border-b flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center text-blue-600">
              <Globe size={20} />
            </div>
            <div>
              <h3 className="font-semibold text-slate-900">Meta Dönüşüm API (CAPI)</h3>
              <p className="text-xs text-muted-foreground">Instagram/Facebook reklam dönüşümlerini otomatik bildirir</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {capiAccessToken && capiDatasetId ? (
              <Badge variant="outline" className="text-[10px] bg-emerald-50 text-emerald-600 border-emerald-200 gap-1"><CheckCircle2 size={10} /> Aktif</Badge>
            ) : (
              <Badge variant="outline" className="text-[10px] bg-amber-50 text-amber-700 border-amber-200">Yapılandırılmadı</Badge>
            )}
          </div>
        </div>
        <div className="p-6 space-y-6">
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-xs text-blue-800 leading-relaxed">
            <strong>Nasıl Çalışır:</strong> Bir işletmeye ulaşıldığında veya görev atandığında, bu olay otomatik olarak Meta&apos;ya gönderilir. 
            Meta bu verileri kullanarak Instagram/Facebook reklamlarınızı optimize eder ve benzer müşterilere ulaşmanızı sağlar.
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="flex flex-col gap-1">
                <span>Erişim Jetonu (Access Token)</span>
                <span className="text-[10px] font-normal text-muted-foreground">Meta Olay Yöneticisi&apos;nden oluşturulan jeton</span>
              </Label>
              <PasswordInput value={capiAccessToken} onChange={setCapiAccessToken} placeholder="EAABs..." />
            </div>
            <div className="space-y-2">
              <Label className="flex flex-col gap-1">
                <span>Veri Seti Kodu (Dataset ID)</span>
                <span className="text-[10px] font-normal text-muted-foreground">Piksel/Veri seti kimlik numarası</span>
              </Label>
              <Input value={capiDatasetId} onChange={(e) => setCapiDatasetId(e.target.value)} placeholder="1467921251160714" className="rounded-xl font-mono text-sm" />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label className="flex flex-col gap-1">
                <span>Test Olay Kodu (Opsiyonel)</span>
                <span className="text-[10px] font-normal text-muted-foreground">Meta Olay Yöneticisi&apos;ndeki Test Olayları sekmesinden alın. Canlıya geçince boş bırakın.</span>
              </Label>
              <Input value={capiTestEventCode} onChange={(e) => setCapiTestEventCode(e.target.value)} placeholder="TEST12345" className="rounded-xl font-mono text-sm" />
            </div>
          </div>

          <div className="bg-slate-50 rounded-2xl border p-5 space-y-3">
            <div className="space-y-1">
              <Label className="text-xs font-medium text-slate-700">API Uç Noktası</Label>
              <p className="text-[10px] text-muted-foreground">Olaylar bu adrese otomatik gönderilir</p>
            </div>
            <code className="block bg-white border rounded-xl px-4 py-2.5 text-xs font-mono text-slate-700 select-all break-all">
              {capiDatasetId ? `https://graph.facebook.com/v25.0/${capiDatasetId}/events` : 'https://graph.facebook.com/v25.0/{DATASET_ID}/events'}
            </code>
          </div>

          <div className="bg-slate-50 rounded-2xl border p-5">
            <h4 className="text-xs font-bold text-slate-700 mb-3">🔔 Otomatik Tetikleyiciler</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
              <div className="flex items-center gap-2 text-slate-600"><CheckCircle2 size={14} className="text-emerald-500" /> İşletmeye ulaşıldığında (Çağrı → Ulaşıldı)</div>
              <div className="flex items-center gap-2 text-slate-600"><CheckCircle2 size={14} className="text-emerald-500" /> Görev ataması yapıldığında</div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row justify-between gap-3 pt-2 border-t">
            <Button 
              onClick={handleTestCapi} 
              disabled={isTestingCapi || !capiAccessToken || !capiDatasetId} 
              variant="outline" 
              className="gap-2 rounded-xl"
            >
              {isTestingCapi ? <RefreshCw className="animate-spin" size={16} /> : <AlertCircle size={16} />}
              Test Olayı Gönder
            </Button>
            <Button onClick={handleSaveMetaCapi} disabled={isPending} className="gap-2 rounded-xl">
              {isPending ? <RefreshCw className="animate-spin" size={16} /> : <Save size={16} />}
              CAPI Ayarlarını Kaydet
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
