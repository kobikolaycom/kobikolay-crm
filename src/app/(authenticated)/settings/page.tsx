import { PageHeader } from "@/components/layout/PageHeader";
import { ShieldCheck, Server, Key, Paintbrush, ArrowRight } from "lucide-react";
import Link from "next/link";

export default function SettingsPage() {
  return (
    <div className="space-y-8 animate-in fade-in duration-500 p-6 lg:p-8">
      <PageHeader
        title="Sistem Ayarları"
        description="KobiKolay CRM platformunun genel ayarlarını ve API anahtarlarını yönetin."
      />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="glass-card rounded-2xl p-6 border shadow-sm flex gap-4">
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
            <Paintbrush />
          </div>
          <div>
            <h3 className="font-semibold mb-1">Kurumsal Kimlik</h3>
            <p className="text-sm text-muted-foreground mb-4">Logo, marka renkleri and e-posta şablonlarındaki kurumsal imzalar.</p>
            <span className="text-xs font-medium bg-muted px-2 py-1 rounded">Yakında</span>
          </div>
        </div>

        <Link href="/settings/integrations" className="glass-card rounded-2xl p-6 border shadow-sm flex gap-4 hover:border-primary/50 hover:bg-primary/[0.02] transition-all cursor-pointer">
          <div className="w-12 h-12 rounded-xl bg-orange-500/10 flex items-center justify-center text-orange-600 shrink-0">
            <Key />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold mb-1">API & Entegrasyonlar</h3>
            <p className="text-sm text-muted-foreground mb-4">SMTP e-posta sunucusu, Meta ve Instagram API ayarları.</p>
            <div className="flex items-center text-xs font-semibold text-primary">
              Yönet <ArrowRight className="ml-1 w-3 h-3" />
            </div>
          </div>
        </Link>

        <Link href="/settings/roles" className="glass-card rounded-2xl p-6 border shadow-sm flex gap-4 hover:border-primary/50 hover:bg-primary/[0.02] transition-all cursor-pointer">
          <div className="w-12 h-12 rounded-xl bg-green-500/10 flex items-center justify-center text-green-600 shrink-0">
            <ShieldCheck />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold mb-1">Yetki Paketleri</h3>
            <p className="text-sm text-muted-foreground mb-4">Sistemdeki yetki seviyelerini ve rol matrisini yönetin.</p>
            <div className="flex items-center text-xs font-semibold text-primary">
              Yönet <ArrowRight className="ml-1 w-3 h-3" />
            </div>
          </div>
        </Link>

        <Link href="/settings/users" className="glass-card rounded-2xl p-6 border shadow-sm flex gap-4 hover:border-primary/50 hover:bg-primary/[0.02] transition-all cursor-pointer">
          <div className="w-12 h-12 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-600 shrink-0">
            <Server />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold mb-1">Personel Yönetimi</h3>
            <p className="text-sm text-muted-foreground mb-4">Şirket çalışanlarını ekleyin, pasife çekin veya rollerini güncelleyin.</p>
            <div className="flex items-center text-xs font-semibold text-primary">
              Yönet <ArrowRight className="ml-1 w-3 h-3" />
            </div>
          </div>
        </Link>
      </div>
    </div>
  );
}
