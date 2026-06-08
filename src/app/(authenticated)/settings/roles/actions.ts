"use server";

import prisma from "@/lib/prisma";
import { auth } from "@/auth";
import { revalidatePath } from "next/cache";

export async function createRoleAction(data: { name: string; description: string; permissions: string[] }) {
  const session = await auth();
  if (!session?.user) throw new Error("Yetkisiz erişim");

  const existing = await prisma.role.findUnique({ where: { name: data.name } });
  if (existing) throw new Error("Bu rol adı zaten kullanılıyor");

  await prisma.role.create({
    data: {
      name: data.name.trim(),
      description: data.description.trim(),
      permissions: data.permissions,
    },
  });

  revalidatePath("/settings/roles");
  return { success: true };
}

export async function updateRoleAction(id: string, data: { name: string; description: string; permissions: string[] }) {
  const session = await auth();
  if (!session?.user) throw new Error("Yetkisiz erişim");

  if (data.name === "Super Admin") {
    // Korumalı rol
    const existing = await prisma.role.findUnique({ where: { id } });
    if (existing?.name === "Super Admin" && !data.permissions.includes("*")) {
      throw new Error("SuperAdmin rolünden tam yetki (*) kaldırılamaz");
    }
  }

  await prisma.role.update({
    where: { id },
    data: {
      name: data.name.trim(),
      description: data.description.trim(),
      permissions: data.permissions,
    },
  });

  revalidatePath("/settings/roles");
  return { success: true };
}

export async function deleteRoleAction(id: string) {
  const session = await auth();
  if (!session?.user) throw new Error("Yetkisiz erişim");

  const role = await prisma.role.findUnique({
    where: { id },
    include: { _count: { select: { users: true } } },
  });

  if (!role) throw new Error("Rol bulunamadı");
  if (role.name === "Super Admin") throw new Error("SuperAdmin rolü silinemez");
  if (role._count.users > 0) {
    throw new Error(`Bu rolü kullanan ${role._count.users} kullanıcı var. Önce kullanıcıların rolünü değiştirin.`);
  }

  await prisma.role.delete({ where: { id } });

  revalidatePath("/settings/roles");
  return { success: true };
}
