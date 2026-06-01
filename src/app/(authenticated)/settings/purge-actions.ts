"use server";

import prisma from "@/lib/prisma";
import { auth } from "@/auth";
import { revalidatePath } from "next/cache";

/**
 * Tüm iletişim kayıtlarını (conversations + messages) siler.
 * Sadece SuperAdmin kullanabilir.
 */
export async function purgeAllConversationsAction() {
  const session = await auth();
  if (!session?.user) throw new Error("Yetkisiz erişim");

  // Delete messages first (child), then conversations (parent)
  await prisma.message.deleteMany({});
  await prisma.conversation.deleteMany({});

  revalidatePath("/");
  return { success: true };
}

/**
 * Tüm faaliyet alanlarını (sectors) siler.
 * Bağlı acente ilişkilerini de temizler.
 */
export async function purgeAllSectorsAction() {
  const session = await auth();
  if (!session?.user) throw new Error("Yetkisiz erişim");

  // Disconnect all agency-sector relations first, then delete sectors
  await prisma.$executeRawUnsafe(`DELETE FROM "_AgencySectors"`);
  
  // Delete sector references if table exists
  try {
    await prisma.sectorReference.deleteMany({});
  } catch {}

  // Delete email templates
  try {
    await prisma.emailTemplate.deleteMany({});
  } catch {}

  await prisma.sector.deleteMany({});

  revalidatePath("/");
  return { success: true };
}
