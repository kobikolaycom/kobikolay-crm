"use server";

import { auth } from "@/auth";
import { SectorService } from "@/services/SectorService";
import { revalidatePath } from "next/cache";

export async function createSectorAction(formData: FormData) {
  const session = await auth();
  if (!session?.user) throw new Error("Yetkisiz erişim");

  const name = formData.get("name") as string;
  const description = (formData.get("description") as string) || undefined;
  const coverLetter = (formData.get("coverLetter") as string) || undefined;
  const pdfUrl = (formData.get("pdfUrl") as string) || undefined;

  if (!name || name.trim().length === 0) {
    throw new Error("Faaliyet alanı adı zorunludur");
  }

  await SectorService.create({
    name: name.trim(),
    description,
    pdfUrl: pdfUrl?.trim() || undefined,
    coverLetter,
  });
  revalidatePath("/settings/sectors");
  return { success: true };
}

export async function updateSectorAction(formData: FormData) {
  const session = await auth();
  if (!session?.user) throw new Error("Yetkisiz erişim");

  const id = formData.get("id") as string;
  const name = formData.get("name") as string;
  const description = (formData.get("description") as string) || undefined;
  const coverLetter = (formData.get("coverLetter") as string) || undefined;
  const pdfUrl = (formData.get("pdfUrl") as string) || undefined;
  const removePdf = formData.get("removePdf") === "true";

  if (!id) throw new Error("Faaliyet alanı ID gerekli");
  if (!name || name.trim().length === 0) throw new Error("Faaliyet alanı adı zorunludur");

  const updateData: { name: string; description?: string; pdfUrl?: string | null; coverLetter?: string | null } = {
    name: name.trim(),
    description,
    coverLetter: coverLetter || null,
  };

  if (removePdf) {
    updateData.pdfUrl = null;
  } else if (pdfUrl?.trim()) {
    updateData.pdfUrl = pdfUrl.trim();
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

// ─── Reference Actions ───

export async function addReferenceAction(sectorId: string, data: { name: string; domain: string }) {
  const session = await auth();
  if (!session?.user) throw new Error("Yetkisiz erişim");

  if (!data.name?.trim() || !data.domain?.trim()) {
    throw new Error("Referans adı ve domain alanı zorunludur");
  }

  await SectorService.addReference(sectorId, {
    name: data.name.trim(),
    domain: data.domain.trim(),
  });
  revalidatePath("/settings/sectors");
  return { success: true };
}

export async function deleteReferenceAction(id: string) {
  const session = await auth();
  if (!session?.user) throw new Error("Yetkisiz erişim");

  await SectorService.deleteReference(id);
  revalidatePath("/settings/sectors");
  return { success: true };
}
