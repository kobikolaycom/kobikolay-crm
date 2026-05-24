import prisma from "@/lib/prisma";
import { PageHeader } from "@/components/layout/PageHeader";
import { RolesClient } from "./RolesClient";
import { PERMISSIONS_LIST } from "@/services/RoleService";

export const dynamic = "force-dynamic";

export default async function RolesPage() {
  const roles = await prisma.role.findMany({
    include: { _count: { select: { users: true } } },
    orderBy: { name: "asc" },
  });

  const serializedRoles = roles.map((r) => ({
    ...r,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Rol Yönetimi"
        description="Sistemdeki rolleri ve izinleri yönetin."
      />
      <RolesClient roles={serializedRoles} permissions={PERMISSIONS_LIST} />
    </div>
  );
}
