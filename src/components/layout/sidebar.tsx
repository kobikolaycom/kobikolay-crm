"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  LayoutDashboard, 
  Users, 
  Mail, 
  Briefcase, 
  Settings, 
  ChevronLeft, 
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Building2,
  Menu,
  X,
  MessageSquare,
  LogOut,
  FileText,
  ClipboardList
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { signOut } from "next-auth/react";

const navItems = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "İşletmeler", href: "/agents", icon: Building2, isDropdown: true },
  { name: "Mesajlar", href: "/inbox", icon: MessageSquare },
  { name: "Mail Şablonları", href: "/mail-sablonlari", icon: FileText },
  { name: "Faaliyet Geçmişi", href: "/activities", icon: ClipboardList },
  { name: "Kategoriler", href: "/categories", icon: Briefcase },
  { name: "Ayarlar", href: "/settings", icon: Settings },
];

export function Sidebar({ logoUrl, categories = [] }: { logoUrl?: string | null; categories?: { id: string; name: string }[] }) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isIsletmelerOpen, setIsIsletmelerOpen] = useState(true);
  const pathname = usePathname();

  const toggleSidebar = () => setIsCollapsed(!isCollapsed);
  const toggleMobile = () => setIsMobileOpen(!isMobileOpen);
  if (pathname === "/") return null;

  return (
    <>
      {/* Mobile Hamburger */}
      <div className="fixed top-0 left-0 right-0 z-40 md:hidden bg-white/90 backdrop-blur-md border-b shadow-sm px-4 py-2.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={toggleMobile} className="h-9 w-9 rounded-xl">
            {isMobileOpen ? <X size={20} /> : <Menu size={20} />}
          </Button>
          {logoUrl ? (
            <img src={logoUrl} alt="Logo" className="h-6 max-w-[120px] object-contain" />
          ) : (
            <span className="text-base font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">KobiKolay</span>
          )}
        </div>
        <button
          onClick={() => signOut({ callbackUrl: "/" })}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-500 hover:text-red-600 hover:bg-red-50 transition-all"
        >
          <LogOut className="h-3.5 w-3.5" />
          <span>Çıkış</span>
        </button>
      </div>

      {/* Top-right Logout */}
      <div className="fixed top-4 right-4 z-50 hidden md:flex">
        <button
          onClick={() => signOut({ callbackUrl: "/" })}
          className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/80 backdrop-blur border shadow-sm text-sm font-medium text-slate-500 hover:text-red-600 hover:border-red-200 hover:bg-red-50 transition-all"
        >
          <LogOut className="h-4 w-4" />
          <span className="hidden sm:inline">Çıkış</span>
        </button>
      </div>

      {/* Desktop Sidebar */}
      <aside
        className={cn(
          "hidden md:flex flex-col h-screen bg-background border-r transition-all duration-300 sticky top-0",
          isCollapsed ? "w-[80px]" : "w-[260px]"
        )}
      >
        {/* Brand / Logo */}
        <div className="flex items-center justify-between p-6 border-b">
          {!isCollapsed && (
            logoUrl ? (
              <img src={logoUrl} alt="Logo" className="h-8 max-w-[160px] object-contain" />
            ) : (
              <span className="text-xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                KobiKolay
              </span>
            )
          )}
          {isCollapsed && logoUrl && (
            <img src={logoUrl} alt="Logo" className="h-6 w-auto object-contain mx-auto" />
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleSidebar}
            className={cn("mx-auto", !isCollapsed && "ml-auto")}
          >
            {isCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
          </Button>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 space-y-1 p-4">
          {navItems.map((item) => {
            if (item.isDropdown) {
              const isActive = pathname.startsWith("/agents");
              return (
                <div key={item.name} className="flex flex-col space-y-1">
                  <div
                    onClick={() => setIsIsletmelerOpen(!isIsletmelerOpen)}
                    className={cn(
                      "flex items-center justify-between rounded-lg px-3 py-2 text-sm font-medium transition-all hover:bg-accent hover:text-accent-foreground cursor-pointer",
                      isActive ? "bg-accent text-accent-foreground" : "text-muted-foreground"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <item.icon className="h-4 w-4" />
                      {!isCollapsed && <span>{item.name}</span>}
                    </div>
                    {!isCollapsed && (
                      isIsletmelerOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />
                    )}
                  </div>
                  {!isCollapsed && isIsletmelerOpen && (
                    <div className="flex flex-col ml-6 space-y-1 mt-1 border-l pl-2">
                      <Link href="/agents">
                        <div className={cn("px-3 py-2 rounded-lg text-sm transition-all hover:bg-accent hover:text-accent-foreground", pathname === "/agents" && typeof window !== "undefined" && !window.location.search ? "bg-accent/50 text-accent-foreground font-medium" : "text-muted-foreground")}>
                          Tümü
                        </div>
                      </Link>
                      {categories.map(cat => (
                        <Link key={cat.id} href={`/agents?categoryId=${cat.id}`}>
                          <div className={cn("px-3 py-2 rounded-lg text-sm transition-all hover:bg-accent hover:text-accent-foreground", typeof window !== "undefined" && window.location.search.includes(cat.id) ? "bg-accent/50 text-accent-foreground font-medium" : "text-muted-foreground")}>
                            {cat.name}
                          </div>
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              );
            }

            const isActive = item.href === "/settings"
              ? pathname === "/settings" || pathname.startsWith("/settings/")
              : pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Link key={item.name} href={item.href} prefetch={false}>
                <div
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all hover:bg-accent hover:text-accent-foreground",
                    isActive ? "bg-accent text-accent-foreground" : "text-muted-foreground"
                  )}
                >
                  <item.icon className="h-4 w-4" />
                  {!isCollapsed && <span>{item.name}</span>}
                </div>
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* Mobile Overlay */}
      {isMobileOpen && (
        <>
          <div
            onClick={toggleMobile}
            className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm md:hidden animate-in fade-in duration-200"
          />
          <aside className="fixed inset-y-0 left-0 z-50 w-[280px] bg-background border-r p-6 shadow-xl md:hidden animate-in slide-in-from-left duration-300">
            <div className="flex items-center justify-between mb-8">
              {logoUrl ? (
                <img src={logoUrl} alt="Logo" className="h-8 max-w-[160px] object-contain" />
              ) : (
                <span className="text-2xl font-bold text-primary">KobiKolay</span>
              )}
              <Button variant="ghost" size="icon" onClick={toggleMobile}>
                <X size={24} />
              </Button>
            </div>
            <nav className="space-y-4">
              {navItems.map((item) => {
                if (item.isDropdown) {
                  const isActive = pathname.startsWith("/agents");
                  return (
                    <div key={item.name} className="flex flex-col space-y-2">
                      <div
                        onClick={() => setIsIsletmelerOpen(!isIsletmelerOpen)}
                        className={cn(
                          "flex items-center justify-between rounded-xl p-4 text-lg transition-all cursor-pointer",
                          isActive ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"
                        )}
                      >
                        <div className="flex items-center gap-4">
                          <item.icon size={24} />
                          <span>{item.name}</span>
                        </div>
                        {isIsletmelerOpen ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                      </div>
                      {isIsletmelerOpen && (
                        <div className="flex flex-col ml-8 space-y-2 border-l-2 pl-4">
                          <Link href="/agents" onClick={toggleMobile}>
                            <div className="py-2 text-base text-muted-foreground hover:text-primary">Tümü</div>
                          </Link>
                          {categories.map(cat => (
                            <Link key={cat.id} href={`/agents?categoryId=${cat.id}`} onClick={toggleMobile}>
                              <div className="py-2 text-base text-muted-foreground hover:text-primary">{cat.name}</div>
                            </Link>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                }

                const isActive = item.href === "/settings"
                  ? pathname === "/settings" || pathname.startsWith("/settings/")
                  : pathname === item.href || pathname.startsWith(item.href + "/");
                return (
                  <Link key={item.name} href={item.href} onClick={toggleMobile} prefetch={false}>
                    <div
                      className={cn(
                        "flex items-center gap-4 rounded-xl p-4 text-lg transition-all",
                        isActive ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"
                      )}
                    >
                      <item.icon size={24} />
                      <span>{item.name}</span>
                    </div>
                  </Link>
                );
              })}
            </nav>
            <div className="mt-6 pt-4 border-t">
              <button
                onClick={() => signOut({ callbackUrl: "/" })}
                className="flex items-center gap-4 rounded-xl p-4 text-lg text-red-500 hover:bg-red-50 transition-all w-full"
              >
                <LogOut size={24} />
                <span>Çıkış Yap</span>
              </button>
            </div>
          </aside>
        </>
      )}
    </>
  );
}
