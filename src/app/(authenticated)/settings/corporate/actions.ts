"use server";

import prisma from "@/lib/prisma";
import { auth } from "@/auth";
import { put, del } from "@vercel/blob";
import { revalidatePath } from "next/cache";

export async function getLogoAction(): Promise<string | null> {
  try {
    const setting = await prisma.systemSetting.findUnique({
      where: { category_key: { category: "corporate", key: "logo_url" } },
    });
    return setting?.value || null;
  } catch {
    return null;
  }
}

export async function uploadLogoAction(formData: FormData): Promise<{ success: boolean; url?: string; error?: string }> {
  const session = await auth();
  if (!session?.user) return { success: false, error: "Yetkisiz erişim" };

  const file = formData.get("logo") as File;
  if (!file || file.size === 0) {
    return { success: false, error: "Lütfen bir dosya seçin" };
  }

  // Validate file type
  const allowed = ["image/png", "image/jpeg", "image/svg+xml", "image/webp"];
  if (!allowed.includes(file.type)) {
    return { success: false, error: "Sadece PNG, JPG, SVG veya WebP dosyaları yüklenebilir" };
  }

  // Max 2MB
  if (file.size > 2 * 1024 * 1024) {
    return { success: false, error: "Dosya boyutu en fazla 2MB olabilir" };
  }

  try {
    // Delete old logo from Blob if exists
    const oldSetting = await prisma.systemSetting.findUnique({
      where: { category_key: { category: "corporate", key: "logo_url" } },
    });
    if (oldSetting?.value) {
      try { await del(oldSetting.value); } catch {}
    }

    // Upload new logo
    const blob = await put(`corporate/logo-${Date.now()}.${file.type.split("/")[1]}`, file, {
      access: "public",
    });

    // Save URL to SystemSetting
    await prisma.systemSetting.upsert({
      where: { category_key: { category: "corporate", key: "logo_url" } },
      create: { category: "corporate", key: "logo_url", value: blob.url },
      update: { value: blob.url },
    });

    revalidatePath("/settings/corporate");
    revalidatePath("/dashboard");
    return { success: true, url: blob.url };
  } catch (error: any) {
    console.error("Logo yükleme hatası:", error);
    return { success: false, error: error.message || "Logo yüklenirken bir hata oluştu" };
  }
}

export async function deleteLogoAction(): Promise<{ success: boolean; error?: string }> {
  const session = await auth();
  if (!session?.user) return { success: false, error: "Yetkisiz erişim" };

  try {
    const setting = await prisma.systemSetting.findUnique({
      where: { category_key: { category: "corporate", key: "logo_url" } },
    });

    if (setting?.value) {
      try { await del(setting.value); } catch {}
    }

    await prisma.systemSetting.deleteMany({
      where: { category: "corporate", key: "logo_url" },
    });

    revalidatePath("/settings/corporate");
    revalidatePath("/dashboard");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || "Logo silinirken bir hata oluştu" };
  }
}
