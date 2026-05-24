import { UserService } from "@/services/UserService";
import { PageHeader } from "@/components/layout/PageHeader";
import { UsersClient } from "./UsersClient";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function UsersPage() {
  const [users, roles] = await Promise.all([
    UserService.getAllUsers(),
    prisma.role.findMany({ orderBy: { name: "asc" } }),
  ]);

  // Serialize dates for client
  const serializedUsers = users.map((u: any) => ({
    ...u,
    createdAt: u.createdAt.toISOString(),
    updatedAt: u.updatedAt.toISOString(),
    role: u.role ? { ...u.role, createdAt: u.role.createdAt.toISOString(), updatedAt: u.role.updatedAt.toISOString() } : null,
  }));

  const serializedRoles = roles.map((r) => ({
    ...r,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Personel Yönetimi"
        description="Sistem kullanıcılarını görüntüleyin, ekleyin ve yönetin."
      />
      <UsersClient users={serializedUsers} roles={serializedRoles} />
    </div>
  );
}
