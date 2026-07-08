import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Starting category migration...");

  try {
    // 1. Create or get the default category "Acenteler"
    let category = await prisma.businessCategory.findUnique({
      where: { slug: "acenteler" }
    });

    if (!category) {
      console.log("Creating default 'Acenteler' category...");
      category = await prisma.businessCategory.create({
        data: {
          name: "Acenteler",
          slug: "acenteler",
          description: "TURSAB'a kayıtlı seyahat acenteleri",
          icon: "Building2",
          color: "#4f46e5",
          sortOrder: 1,
        }
      });
      console.log("Created category:", category.name);
    } else {
      console.log("Category 'Acenteler' already exists.");
    }

    // 2. Link all agencies that don't have a category to 'Acenteler'
    console.log("Linking existing agencies to 'Acenteler' category...");
    const result = await prisma.agency.updateMany({
      where: { categoryId: null },
      data: { categoryId: category.id }
    });

    console.log(`Successfully linked ${result.count} agencies to the default category.`);
    console.log("Migration complete.");
  } catch (error) {
    console.error("Migration failed:", error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
