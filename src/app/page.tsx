"use client";

import { useState, Suspense } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ShieldCheck, Mail, Lock, ArrowRight, Loader2 } from "lucide-react";
import { signIn, useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { useEffect } from "react";

function LoginFormContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { status } = useSession();
  const callbackUrl = searchParams.get("callbackUrl") || "/dashboard";

  useEffect(() => {
    if (status === "authenticated") {
      router.replace(callbackUrl);
    }
  }, [status, router, callbackUrl]);

  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState("admin@kobikolay.com");
  const [password, setPassword] = useState("Amazon.90");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const res = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (res?.error) {
        toast.error("Giriş başarısız", {
          description: `Hata: ${res.error}. Lütfen bilgilerinizi ve DB bağlantısını kontrol edin.`,
        });
      } else {
        toast.success("Giriş başarılı", {
          description: "Dashboard'a yönlendiriliyorsunuz...",
        });
        router.push(callbackUrl);
      }
    } catch (err: any) {
      toast.error("Sistemsel Hata", {
        description: err.message || "Bilinmeyen bir hata oluştu.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900 p-4">
      <div className="w-full max-w-md bg-white dark:bg-slate-800 rounded-2xl border shadow-xl p-8 relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-primary" />
        
        <div className="text-center mb-8">
          <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center mx-auto mb-4">
            <ShieldCheck size={28} />
          </div>
          <h2 className="text-2xl font-bold text-slate-950 dark:text-white">KobiKolay CRM</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1.5">Hesabınıza giriş yapın</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">E-posta</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                id="email"
                type="email"
                className="pl-10 h-11 bg-background/50"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="password">Şifre</Label>
              <a href="#" className="text-xs text-primary hover:underline font-medium">Şifremi Unuttum</a>
            </div>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                id="password"
                type="password"
                className="pl-10 h-11 bg-background/50"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
          </div>

          <Button type="submit" className="w-full h-11 mt-4 gap-2 text-base font-medium" disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" /> Giriş Yapılıyor...
              </>
            ) : (
              <>
                Giriş Yap <ArrowRight className="w-4 h-4" />
              </>
            )}
          </Button>
        </form>

        <div className="mt-8 pt-6 border-t text-center text-xs text-slate-400">
          <p>Sisteme erişim yetkiniz yoksa yöneticinizle iletişime geçin.</p>
          <p className="mt-2 text-amber-600 font-medium bg-amber-500/10 p-2 rounded-lg">
            Not: Eğer veritabanı boşsa (Seed edilmediyse) giriş yapamazsınız. Bypass etmek için NextAuth middleware'ini devredışı bırakın.
          </p>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
      </div>
    }>
      <LoginFormContent />
    </Suspense>
  );
}
