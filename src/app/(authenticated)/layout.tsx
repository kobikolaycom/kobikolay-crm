import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { Sidebar } from "@/components/layout/sidebar";
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
  try {
    const logoSetting = await prisma.systemSetting.findFirst({ where: { category: "corporate", key: "logo_url" } });
    logoUrl = logoSetting?.value || null;
  } catch {}

  return (
    <div className="flex h-screen bg-slate-50">
      <Sidebar logoUrl={logoUrl} />
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
