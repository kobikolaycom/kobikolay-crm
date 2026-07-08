import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { Sidebar } from "@/components/layout/sidebar";
import { AutoLogout } from "@/components/layout/AutoLogout";
import prisma from "@/lib/prisma";

export default async function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session) {
    redirect("/");
  }

  let logoUrl: string | null = null;
  let categories: { id: string; name: string }[] = [];
  try {
    const logoSetting = await prisma.systemSetting.findFirst({ where: { category: "corporate", key: "logo_url" } });
    logoUrl = logoSetting?.value || null;
    categories = await prisma.businessCategory.findMany({ select: { id: true, name: true }, orderBy: { name: 'asc' } });
  } catch {}

  return (
    <div className="flex h-screen bg-slate-50">
      <Sidebar logoUrl={logoUrl} categories={categories} />
      <AutoLogout />
      <main className="flex-1 overflow-y-auto pt-14 md:pt-0">
        {children}
      </main>
    </div>
  );
}
