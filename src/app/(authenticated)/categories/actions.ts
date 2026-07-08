"use server";

import { BusinessCategoryService } from "@/services/BusinessCategoryService";
import { revalidatePath } from "next/cache";

export async function createCategoryAction(name: string, description?: string) {
  if (!name || name.trim().length === 0) {
    throw new Error("Kategori adı boş olamaz.");
  }
  await BusinessCategoryService.create({ name: name.trim(), slug: name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-"), description: description?.trim() });
  revalidatePath("/categories");
  revalidatePath("/agents");
}

export async function updateCategoryAction(id: string, name: string, description?: string) {
  if (!name || name.trim().length === 0) {
    throw new Error("Kategori adı boş olamaz.");
  }
  await BusinessCategoryService.update(id, { name: name.trim(), slug: name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-"), description: description?.trim() });
  revalidatePath("/categories");
  revalidatePath("/agents");
}

export async function deleteCategoryAction(id: string) {
  await BusinessCategoryService.delete(id);
  revalidatePath("/categories");
  revalidatePath("/agents");
}
