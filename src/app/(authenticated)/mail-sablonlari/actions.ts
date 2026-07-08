"use server";
import { EmailTemplateService } from "@/services/EmailTemplateService";
import { auth } from "@/auth";
import { revalidatePath } from "next/cache";

export async function createTemplateAction(formData: FormData) {
  const session = await auth();
  if (!session?.user) throw new Error("Yetkisiz erişim");

  const name = formData.get("name") as string;
  const category = formData.get("category") as string;
  const subject = formData.get("subject") as string || undefined;
  const content = formData.get("content") as string;
  const isDefault = formData.get("isDefault") === "true";
  
  await EmailTemplateService.create({ name, category, subject, content, isDefault });
  revalidatePath("/mail-sablonlari");
  revalidatePath("/tanitim");
  return { success: true };
}

export async function updateTemplateAction(formData: FormData) {
  const session = await auth();
  if (!session?.user) throw new Error("Yetkisiz erişim");

  const id = formData.get("id") as string;
  const name = formData.get("name") as string;
  const category = formData.get("category") as string;
  const subject = formData.get("subject") as string || undefined;
  const content = formData.get("content") as string;
  const isDefault = formData.get("isDefault") === "true";
  
  await EmailTemplateService.update(id, { name, category, subject, content, isDefault });
  revalidatePath("/mail-sablonlari");
  revalidatePath("/tanitim");
  return { success: true };
}

export async function deleteTemplateAction(id: string) {
  const session = await auth();
  if (!session?.user) throw new Error("Yetkisiz erişim");

  await EmailTemplateService.delete(id);
  revalidatePath("/mail-sablonlari");
  revalidatePath("/tanitim");
  return { success: true };
}

export async function seedDefaultsAction() {
  const session = await auth();
  if (!session?.user) throw new Error("Yetkisiz erişim");

  await EmailTemplateService.seedDefaults();
  revalidatePath("/mail-sablonlari");
  return { success: true };
}

export async function setDefaultTemplateAction(id: string) {
  const session = await auth();
  if (!session?.user) throw new Error("Yetkisiz erişim");

  await EmailTemplateService.setDefault(id);
  revalidatePath("/mail-sablonlari");
  revalidatePath("/tanitim");
  return { success: true };
}

export async function duplicateTemplateAction(id: string) {
  const session = await auth();
  if (!session?.user) throw new Error("Yetkisiz erişim");

  await EmailTemplateService.duplicate(id);
  revalidatePath("/mail-sablonlari");
  revalidatePath("/tanitim");
  return { success: true };
}
