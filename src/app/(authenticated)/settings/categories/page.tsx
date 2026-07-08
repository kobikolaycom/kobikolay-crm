import { PageHeader } from "@/components/layout/PageHeader";
import { BusinessCategoryService } from "@/services/BusinessCategoryService";
import { CategoriesClient } from "./CategoriesClient";

export const dynamic = "force-dynamic";

export default async function CategoriesPage() {
  const categories = await BusinessCategoryService.list();

  return (
    <div className="space-y-6 animate-in fade-in duration-500 p-6 lg:p-8">
      <PageHeader 
        title="Kategoriler" 
        description="Sistemdeki işletme kategorilerini (Acenteler, Oteller vb.) yönetin." 
      />
      <CategoriesClient initialCategories={categories} />
    </div>
  );
}
