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
  { name: "Acenteler", href: "/agents", icon: Users },
  { name: "Mesajlar", href: "/inbox", icon: MessageSquare },
  { name: "Tanıtım", href: "/tanitim", icon: Mail },
  { name: "Mail Şablonları", href: "/mail-sablonlari", icon: FileText },
  { name: "Faaliyet Alanları", href: "/settings/sectors", icon: Briefcase },
  { name: "Faaliyet Geçmişi", href: "/activities", icon: ClipboardList },
  { name: "Ayarlar", href: "/settings", icon: Settings },
];

export function Sidebar({ logoUrl }: { logoUrl?: string | null }) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const pathname = usePathname();

  const toggleSidebar = () => setIsCollapsed(!isCollapsed);
  const toggleMobile = () => setIsMobileOpen(!isMobileOpen);
  if (pathname === "/") return null;

  return (
    <>
      {/* Mobile Hamburger */}
      <div className="fixed top-4 left-4 z-50 md:hidden">
        <Button variant="outline" size="icon" onClick={toggleMobile}>
          {isMobileOpen ? <X size={20} /> : <Menu size={20} />}
        </Button>
      </div>

      {/* Top-right Logout */}
      <div className="fixed top-4 right-4 z-50">
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
            const isActive = item.href === "/settings"
              ? pathname === "/settings"
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
                const isActive = item.href === "/settings"
                  ? pathname === "/settings"
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
