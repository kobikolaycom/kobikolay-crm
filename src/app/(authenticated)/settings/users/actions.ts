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

export async function updateUserAction(userId: string, data: { name: string; email: string; roleId: string }) {
  const session = await auth();
  if (!session?.user) throw new Error("Yetkisiz erişim");

  const existing = await prisma.user.findUnique({ where: { email: data.email } });
  if (existing && existing.id !== userId) {
    throw new Error("Bu e-posta adresi başka bir kullanıcı tarafından kullanılıyor");
  }

  await prisma.user.update({
    where: { id: userId },
    data: {
      name: data.name,
      email: data.email,
      roleId: data.roleId,
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
    const details: string[] = [];
    if (user._count.assignedActivities > 0) details.push(`${user._count.assignedActivities} atanmış görev`);
    if (user._count.createdActivities > 0) details.push(`${user._count.createdActivities} oluşturulan aktivite`);
    if (user._count.assignedConversations > 0) details.push(`${user._count.assignedConversations} atanmış sohbet`);
    if (user._count.createdConversations > 0) details.push(`${user._count.createdConversations} oluşturulan sohbet`);
    if (user._count.sentMailLogs > 0) details.push(`${user._count.sentMailLogs} gönderilmiş e-posta`);

    throw new Error(
      `Bu personel silinemez. Sistemde şu kayıtları bulunuyor: ${details.join(", ")}. Silmek yerine hesabı pasife çekmenizi öneriyoruz.`
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

export async function toggleReportRecipientAction(userId: string) {
  const session = await auth();
  if (!session?.user) throw new Error("Yetkisiz erişim");

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new Error("Kullanıcı bulunamadı");

  await prisma.user.update({
    where: { id: userId },
    data: { receivesReports: !user.receivesReports },
  });

  revalidatePath("/settings/users");
  return { success: true, receivesReports: !user.receivesReports };
}
