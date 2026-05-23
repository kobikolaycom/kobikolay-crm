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
  LogOut
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { signOut } from "next-auth/react";

const navItems = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Acenteler", href: "/agents", icon: Users },
  { name: "Mesajlar", href: "/inbox", icon: MessageSquare },
  { name: "Tanıtım", href: "/tanitim", icon: Mail },
  { name: "Sektörler", href: "/settings/sectors", icon: Briefcase },
  { name: "Ayarlar", href: "/settings", icon: Settings },
];

export function Sidebar() {
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
            <span className="text-xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
              KobiKolay
            </span>
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
            const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
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

        {/* Footer / Profile & Logout */}
        <div className="p-4 border-t">
          <Button
            variant="ghost"
            className={cn("w-full justify-start text-muted-foreground hover:text-destructive", isCollapsed ? "px-0 justify-center" : "")}
            onClick={() => signOut({ callbackUrl: "/" })}
          >
            <LogOut className="h-4 w-4" />
            {!isCollapsed && <span className="ml-2 text-xs font-semibold">Çıkış Yap</span>}
          </Button>
        </div>
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
              <span className="text-2xl font-bold text-primary">KobiKolay</span>
              <Button variant="ghost" size="icon" onClick={toggleMobile}>
                <X size={24} />
              </Button>
            </div>
            <nav className="space-y-4">
              {navItems.map((item) => {
                const isActive = pathname === item.href;
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
          </aside>
        </>
      )}
    </>
  );
}
