"use server";
import { EmailTemplateService } from "@/services/EmailTemplateService";
import { revalidatePath } from "next/cache";

export async function createTemplateAction(formData: FormData) {
  const name = formData.get("name") as string;
  const category = formData.get("category") as string;
  const subject = formData.get("subject") as string || undefined;
  const content = formData.get("content") as string;
  const isDefault = formData.get("isDefault") === "true";
  
  await EmailTemplateService.create({ name, category, subject, content, isDefault });
  revalidatePath("/mail-sablonlari");
  return { success: true };
}

export async function updateTemplateAction(formData: FormData) {
  const id = formData.get("id") as string;
  const name = formData.get("name") as string;
  const category = formData.get("category") as string;
  const subject = formData.get("subject") as string || undefined;
  const content = formData.get("content") as string;
  const isDefault = formData.get("isDefault") === "true";
  
  await EmailTemplateService.update(id, { name, category, subject, content, isDefault });
  revalidatePath("/mail-sablonlari");
  return { success: true };
}

export async function deleteTemplateAction(id: string) {
  await EmailTemplateService.delete(id);
  revalidatePath("/mail-sablonlari");
  return { success: true };
}

export async function seedDefaultsAction() {
  await EmailTemplateService.seedDefaults();
  revalidatePath("/mail-sablonlari");
  return { success: true };
}
