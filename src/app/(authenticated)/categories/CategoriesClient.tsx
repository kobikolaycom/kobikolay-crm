"use client";

import { useState, useTransition } from "react";
import { Plus, Edit2, Trash2, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { createCategoryAction, updateCategoryAction, deleteCategoryAction, migrateAgenciesAction } from "./actions";

interface Category {
  id: string;
  name: string;
  description: string | null;
  createdAt: Date;
}

export function CategoriesClient({ initialCategories }: { initialCategories: Category[] }) {
  const [categories, setCategories] = useState<Category[]>(initialCategories);
  const [isPending, startTransition] = useTransition();

  // Modals state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);

  // Form state
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  const handleCreate = () => {
    if (!name.trim()) return toast.error("Kategori adı zorunludur.");
    startTransition(async () => {
      try {
        await createCategoryAction(name, description);
        toast.success("Kategori eklendi.");
        setShowCreateModal(false);
        // In a real app we might rely on router.refresh() but let's just trigger a reload to update Sidebar too
        window.location.reload();
      } catch (err: any) {
        toast.error(err.message || "Ekleme başarısız.");
      }
    });
  };

  const handleEdit = () => {
    if (!selectedCategory) return;
    if (!name.trim()) return toast.error("Kategori adı zorunludur.");
    startTransition(async () => {
      try {
        await updateCategoryAction(selectedCategory.id, name, description);
        toast.success("Kategori güncellendi.");
        setShowEditModal(false);
        window.location.reload();
      } catch (err: any) {
        toast.error(err.message || "Güncelleme başarısız.");
      }
    });
  };

  
  const handleMigrate = () => {
    startTransition(async () => {
      try {
        const count = await migrateAgenciesAction();
        toast.success(count + " adet kategorisiz işletme 'Seyahat Acenteleri TR' kategorisine taşındı.");
        window.location.reload();
      } catch (err: any) {
        toast.error("Taşıma başarısız: " + err.message);
      }
    });
  };

  const handleDelete = () => {
    if (!selectedCategory) return;
    startTransition(async () => {
      try {
        await deleteCategoryAction(selectedCategory.id);
        toast.success("Kategori silindi.");
        setShowDeleteModal(false);
        window.location.reload();
      } catch (err: any) {
        toast.error(err.message || "Silme başarısız. Kategori kullanımda olabilir.");
      }
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-white p-4 rounded-xl shadow-sm border">
        <div className="flex items-center gap-3 text-slate-700">
          <div className="bg-primary/10 p-2 rounded-lg text-primary">
            <Building2 size={20} />
          </div>
          <div>
            <h3 className="font-semibold">Toplam Kategori</h3>
            <p className="text-sm text-slate-500">{categories.length} adet kategori mevcut</p>
          </div>
        </div>
        
        <div className="flex gap-2">
          <Button variant="outline" className="border-blue-200 text-blue-700 hover:bg-blue-50" onClick={handleMigrate} disabled={isPending}>
            Eski Kayıtları Aktar
          </Button>
          <Button onClick={() => { setName(""); setDescription(""); setShowCreateModal(true); }}>
            <Plus size={16} className="mr-2" />
            Yeni Ekle
          </Button>
        </div>

      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {categories.map((cat) => (
          <div key={cat.id} className="bg-white p-5 rounded-xl border shadow-sm flex flex-col justify-between group hover:shadow-md transition-all">
            <div>
              <div className="flex justify-between items-start mb-2">
                <h4 className="font-bold text-lg text-slate-800">{cat.name}</h4>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8 text-slate-500 hover:text-primary"
                    onClick={() => {
                      setSelectedCategory(cat);
                      setName(cat.name);
                      setDescription(cat.description || "");
                      setShowEditModal(true);
                    }}
                  >
                    <Edit2 size={14} />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8 text-slate-500 hover:text-red-500"
                    onClick={() => {
                      setSelectedCategory(cat);
                      setShowDeleteModal(true);
                    }}
                  >
                    <Trash2 size={14} />
                  </Button>
                </div>
              </div>
              <p className="text-sm text-slate-500 line-clamp-2">
                {cat.description || "Açıklama bulunmuyor."}
              </p>
            </div>
            <div className="mt-4 pt-4 border-t text-xs text-slate-400">
              Eklenme: {new Date(cat.createdAt).toLocaleDateString("tr-TR")}
            </div>
          </div>
        ))}
      </div>

      {/* Create Modal */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Yeni Kategori Ekle</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Kategori Adı *</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Örn: Oteller" />
            </div>
            <div className="space-y-2">
              <Label>Açıklama</Label>
              <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="İsteğe bağlı açıklama..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateModal(false)}>İptal</Button>
            <Button onClick={handleCreate} disabled={isPending}>Kaydet</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Modal */}
      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Kategoriyi Düzenle</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Kategori Adı *</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Açıklama</Label>
              <Textarea value={description} onChange={(e) => setDescription(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditModal(false)}>İptal</Button>
            <Button onClick={handleEdit} disabled={isPending}>Güncelle</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Modal */}
      <Dialog open={showDeleteModal} onOpenChange={setShowDeleteModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Kategoriyi Sil</DialogTitle>
            <DialogDescription>
              Bu kategoriyi silmek istediğinize emin misiniz? Kategoriyi silerseniz, bu kategoriye bağlı kayıtların kategori bilgisi boşalacaktır (kayıtlar silinmez).
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteModal(false)}>İptal</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={isPending}>Sil</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
