"use server";

import { auth } from "@/auth";
import { SectorService } from "@/services/SectorService";
import { revalidatePath } from "next/cache";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

export async function createSectorAction(formData: FormData) {
  const session = await auth();
  if (!session?.user) throw new Error("Yetkisiz erişim");

  const name = formData.get("name") as string;
  const description = (formData.get("description") as string) || undefined;
  const pdfFile = formData.get("pdf") as File | null;

  if (!name || name.trim().length === 0) {
    throw new Error("Sektör adı zorunludur");
  }

  let pdfUrl: string | undefined;

  if (pdfFile && pdfFile.size > 0) {
    pdfUrl = await savePdfFile(pdfFile, name);
  }

  await SectorService.create({ name: name.trim(), description, pdfUrl });
  revalidatePath("/settings/sectors");
  return { success: true };
}

export async function updateSectorAction(formData: FormData) {
  const session = await auth();
  if (!session?.user) throw new Error("Yetkisiz erişim");

  const id = formData.get("id") as string;
  const name = formData.get("name") as string;
  const description = (formData.get("description") as string) || undefined;
  const pdfFile = formData.get("pdf") as File | null;
  const removePdf = formData.get("removePdf") === "true";

  if (!id) throw new Error("Sektör ID gerekli");
  if (!name || name.trim().length === 0) throw new Error("Sektör adı zorunludur");

  const updateData: { name: string; description?: string; pdfUrl?: string | null } = {
    name: name.trim(),
    description,
  };

  if (removePdf) {
    updateData.pdfUrl = null as any;
  } else if (pdfFile && pdfFile.size > 0) {
    updateData.pdfUrl = await savePdfFile(pdfFile, name);
  }

  await SectorService.update(id, updateData);
  revalidatePath("/settings/sectors");
  return { success: true };
}

export async function deleteSectorAction(id: string) {
  const session = await auth();
  if (!session?.user) throw new Error("Yetkisiz erişim");

  await SectorService.delete(id);
  revalidatePath("/settings/sectors");
  return { success: true };
}

// ─── Helper: Save PDF ───
async function savePdfFile(file: File, sectorName: string): Promise<string> {
  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);

  const uploadsDir = path.join(process.cwd(), "public", "uploads", "sectors");
  await mkdir(uploadsDir, { recursive: true });

  const safeName = sectorName
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "_")
    .replace(/_+/g, "_");
  const timestamp = Date.now();
  const ext = path.extname(file.name) || ".pdf";
  const fileName = `${safeName}_${timestamp}${ext}`;
  const filePath = path.join(uploadsDir, fileName);

  await writeFile(filePath, buffer);
  return `/uploads/sectors/${fileName}`;
}
