import prisma from "@/lib/prisma";

export interface SettingEntry {
  key: string;
  value: string;
}

export class SystemSettingService {
  /**
   * Bir kategorideki tüm ayarları getir.
   */
  static async getByCategory(category: string): Promise<Record<string, string>> {
    const settings = await prisma.systemSetting.findMany({
      where: { category },
    });
    const result: Record<string, string> = {};
    settings.forEach(s => { result[s.key] = s.value; });
    return result;
  }

  /**
   * Bir kategorideki ayarları toplu güncelle (upsert).
   */
  static async saveCategory(category: string, entries: SettingEntry[]) {
    const operations = entries.map(entry =>
      prisma.systemSetting.upsert({
        where: { category_key: { category, key: entry.key } },
        update: { value: entry.value },
        create: { category, key: entry.key, value: entry.value },
      })
    );
    await prisma.$transaction(operations);
    return { success: true };
  }

  /**
   * Tek bir ayar getir.
   */
  static async get(category: string, key: string): Promise<string | null> {
    const setting = await prisma.systemSetting.findUnique({
      where: { category_key: { category, key } },
    });
    return setting?.value ?? null;
  }
}
