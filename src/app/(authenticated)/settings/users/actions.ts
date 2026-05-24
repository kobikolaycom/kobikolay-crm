"use server";

import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { auth } from "@/auth";
import { revalidatePath } from "next/cache";

export async function createUserAction(data: {
  name: string;
  email: string;
  password: string;
  roleId: string;
}) {
  const session = await auth();
  if (!session?.user) throw new Error("Yetkisiz erişim");

  // Check if email already exists
  const existing = await prisma.user.findUnique({
    where: { email: data.email },
  });
  if (existing) throw new Error("Bu e-posta adresi zaten kayıtlı");

  const hashedPassword = await bcrypt.hash(data.password, 12);

  await prisma.user.create({
    data: {
      name: data.name,
      email: data.email,
      password: hashedPassword,
      roleId: data.roleId,
      isActive: true,
    },
  });

  revalidatePath("/settings/users");
  return { success: true };
}

export async function toggleUserStatusAction(userId: string) {
  const session = await auth();
  if (!session?.user) throw new Error("Yetkisiz erişim");

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new Error("Kullanıcı bulunamadı");

  // Don't allow deactivating yourself
  if (user.id === session.user.id) {
    throw new Error("Kendi hesabınızı pasife alamazsınız");
  }

  await prisma.user.update({
    where: { id: userId },
    data: { isActive: !user.isActive },
  });

  revalidatePath("/settings/users");
  return { success: true };
}

export async function deleteUserAction(userId: string) {
  const session = await auth();
  if (!session?.user) throw new Error("Yetkisiz erişim");

  if (userId === session.user.id) {
    throw new Error("Kendi hesabınızı silemezsiniz");
  }

  // Check for related records
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      _count: {
        select: {
          assignedActivities: true,
          createdActivities: true,
          assignedConversations: true,
          createdConversations: true,
          sentMailLogs: true,
        },
      },
    },
  });

  if (!user) throw new Error("Kullanıcı bulunamadı");

  const total =
    user._count.assignedActivities +
    user._count.createdActivities +
    user._count.assignedConversations +
    user._count.createdConversations +
    user._count.sentMailLogs;

  if (total > 0) {
    throw new Error(
      "Bu kullanıcının sistemde işlem geçmişi bulunduğu için silinemez. Pasife çekmeyi tercih edin."
    );
  }

  await prisma.user.delete({ where: { id: userId } });

  revalidatePath("/settings/users");
  return { success: true };
}

export async function getRolesAction() {
  return prisma.role.findMany({ orderBy: { name: "asc" } });
}

export async function updateUserPasswordAction(userId: string, newPassword: string) {
  const session = await auth();
  if (!session?.user) throw new Error("Yetkisiz erişim");

  const hashedPassword = await bcrypt.hash(newPassword, 12);
  await prisma.user.update({
    where: { id: userId },
    data: { password: hashedPassword },
  });

  revalidatePath("/settings/users");
  return { success: true };
}
