"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { ShieldCheck, Users, Plus, Edit2, Trash2, ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import { createRoleAction, updateRoleAction, deleteRoleAction } from "./actions";

interface RolesClientProps {
  roles: any[];
  permissions: { key: string; label: string; group: string; description: string }[];
}

export function RolesClient({ roles, permissions }: RolesClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Group permissions for rendering
  const groupedPermissions = permissions.reduce((acc, p) => {
    if (!acc[p.group]) acc[p.group] = [];
    acc[p.group].push(p);
    return acc;
  }, {} as Record<string, typeof permissions>);

  const [showDialog, setShowDialog] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState("");
  
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [selectedPerms, setSelectedPerms] = useState<string[]>([]);

  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteId, setDeleteId] = useState("");
  const [deleteName, setDeleteName] = useState("");

  const handleOpenCreate = () => {
    setIsEditing(false);
    setEditingId("");
    setName("");
    setDescription("");
    setSelectedPerms([]);
    setShowDialog(true);
  };

  const handleOpenEdit = (role: any) => {
    setIsEditing(true);
    setEditingId(role.id);
    setName(role.name);
    setDescription(role.description || "");
    setSelectedPerms(role.permissions || []);
    setShowDialog(true);
  };

  const togglePermission = (key: string) => {
    setSelectedPerms(prev => 
      prev.includes(key) ? prev.filter(p => p !== key) : [...prev, key]
    );
  };

  const handleSave = () => {
    if (!name.trim()) {
      toast.error("Rol adı zorunludur");
      return;
    }
    if (selectedPerms.length === 0) {
      toast.error("En az bir yetki seçmelisiniz");
      return;
    }

    startTransition(async () => {
      try {
        if (isEditing) {
          await updateRoleAction(editingId, { name, description, permissions: selectedPerms });
          toast.success("Rol güncellendi");
        } else {
          await createRoleAction({ name, description, permissions: selectedPerms });
          toast.success("Rol oluşturuldu");
        }
        setShowDialog(false);
        router.refresh();
      } catch (error: any) {
        toast.error(error.message || "İşlem başarısız");
      }
    });
  };

  const handleDelete = () => {
    startTransition(async () => {
      try {
        await deleteRoleAction(deleteId);
        toast.success("Rol silindi");
        setShowDeleteDialog(false);
        router.refresh();
      } catch (error: any) {
        toast.error(error.message || "Silme başarısız");
      }
    });
  };

  return (
    <>
      <div className="flex justify-end mb-6">
        <Button onClick={handleOpenCreate} className="gap-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl">
          <Plus size={16} /> Yeni Rol Ekle
        </Button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {roles.map((role: any) => {
          const isSuperAdmin = role.name === "Super Admin";
          
          return (
            <div key={role.id} className="bg-white rounded-2xl border shadow-sm flex flex-col overflow-hidden">
              <div className="px-6 py-5 border-b bg-slate-50/50 flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isSuperAdmin ? 'bg-amber-100 text-amber-600' : 'bg-indigo-100 text-indigo-600'}`}>
                    {isSuperAdmin ? <ShieldAlert size={20} /> : <ShieldCheck size={20} />}
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900">{role.name}</h3>
                    {role.description && (
                      <p className="text-xs text-muted-foreground">{role.description}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant="secondary" className="gap-1 text-xs whitespace-nowrap">
                    <Users size={12} /> {role._count?.users || 0} personel
                  </Badge>
                  <div className="flex gap-1">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50"
                      onClick={() => handleOpenEdit(role)}
                    >
                      <Edit2 size={14} />
                    </Button>
                    {!isSuperAdmin && (
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8 text-slate-500 hover:text-red-600 hover:bg-red-50"
                        onClick={() => {
                          setDeleteId(role.id);
                          setDeleteName(role.name);
                          setShowDeleteDialog(true);
                        }}
                      >
                        <Trash2 size={14} />
                      </Button>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="p-6 flex-1 bg-white">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-4">Yetkiler</p>
                <div className="flex flex-wrap gap-2">
                  {role.permissions.includes("*") ? (
                    <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 text-xs px-3 py-1">
                      ⭐ Tam Yetki (Tüm Sisteme Erişim)
                    </Badge>
                  ) : (
                    role.permissions.map((perm: string) => {
                      const match = permissions.find((p) => p.key === perm);
                      return (
                        <Badge key={perm} variant="outline" className="text-[11px] px-2 py-1 bg-slate-50">
                          {match?.label || perm}
                        </Badge>
                      );
                    })
                  )}
                  {role.permissions.length === 0 && (
                    <span className="text-xs text-muted-foreground italic">Yetki tanımlanmamış</span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Rol Düzenleme / Ekleme Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-3xl rounded-2xl max-h-[90vh] flex flex-col overflow-hidden">
          <DialogHeader className="shrink-0 pb-4 border-b">
            <DialogTitle className="flex items-center gap-2 text-xl">
              {isEditing ? <Edit2 size={20} className="text-indigo-600" /> : <Plus size={20} className="text-indigo-600" />}
              {isEditing ? "Rolü Düzenle" : "Yeni Rol Oluştur"}
            </DialogTitle>
            <DialogDescription>
              {isEditing ? "Mevcut rolün yetkilerini ve bilgilerini güncelleyin." : "Sistemde kullanılmak üzere yeni bir rol ve yetki seti oluşturun."}
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex-1 overflow-y-auto py-4 space-y-6 pr-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-600">Rol Adı *</Label>
                <Input
                  placeholder="Örn: Operasyon Sorumlusu"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="rounded-xl"
                  disabled={isEditing && name === "Super Admin"}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-600">Açıklama</Label>
                <Input
                  placeholder="Kısa bir açıklama..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="rounded-xl"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-4">
                <Label className="text-sm font-bold text-slate-800">Yetkiler *</Label>
                
                {name === "Super Admin" && (
                  <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100">SuperAdmin rolü tüm yetkilere sahiptir</Badge>
                )}
                
                <div className="flex gap-2">
                   <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setSelectedPerms(permissions.map(p => p.key))} disabled={name === "Super Admin"}>
                     Tümünü Seç
                   </Button>
                   <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setSelectedPerms([])} disabled={name === "Super Admin"}>
                     Temizle
                   </Button>
                </div>
              </div>

              {name === "Super Admin" ? (
                 <div className="p-6 bg-slate-50 rounded-xl border border-dashed border-slate-200 text-center">
                    <ShieldAlert size={48} className="mx-auto text-amber-500 mb-3 opacity-50" />
                    <p className="font-medium text-slate-700">Bu rol sistemdeki tüm işlemleri yapabilir.</p>
                    <p className="text-xs text-muted-foreground mt-1">SuperAdmin yetkileri kısıtlanamaz.</p>
                 </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                  {Object.entries(groupedPermissions).map(([groupName, perms]) => (
                    <div key={groupName} className="space-y-3">
                      <h4 className="font-semibold text-slate-700 text-sm pb-1 border-b capitalize">{groupName}</h4>
                      <div className="space-y-2.5">
                        {perms.map(p => (
                          <div key={p.key} className="flex items-start space-x-3">
                            <Checkbox 
                              id={`perm-${p.key}`} 
                              checked={selectedPerms.includes(p.key) || selectedPerms.includes("*")}
                              onCheckedChange={() => togglePermission(p.key)}
                              disabled={selectedPerms.includes("*")}
                            />
                            <div className="grid gap-0.5 leading-none">
                              <label
                                htmlFor={`perm-${p.key}`}
                                className="text-sm font-medium leading-none cursor-pointer peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                              >
                                {p.label}
                              </label>
                              <p className="text-[10px] text-muted-foreground">
                                {p.description}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                  
                  {/* Tam yetki seçeneği */}
                  <div className="md:col-span-2 pt-4 border-t border-dashed">
                    <div className="flex items-start space-x-3 bg-amber-50 p-4 rounded-xl border border-amber-200/50">
                      <Checkbox 
                        id="perm-star" 
                        checked={selectedPerms.includes("*")}
                        onCheckedChange={() => togglePermission("*")}
                        className="data-[state=checked]:bg-amber-500 data-[state=checked]:border-amber-500 mt-1"
                      />
                      <div className="grid gap-1 leading-none">
                        <label
                          htmlFor="perm-star"
                          className="text-sm font-bold text-amber-900 cursor-pointer"
                        >
                          ⭐ Tam Yetki (Tüm Modüllere Erişim)
                        </label>
                        <p className="text-xs text-amber-700/80">
                          Bu seçenek işaretlendiğinde kullanıcı sistemdeki mevcut ve gelecekte eklenecek tüm yetkilere otomatik sahip olur.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
          
          <DialogFooter className="shrink-0 pt-4 border-t">
            <Button variant="outline" onClick={() => setShowDialog(false)} className="rounded-xl">
              İptal
            </Button>
            <Button
              onClick={handleSave}
              disabled={isPending}
              className="rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              {isEditing ? "Değişiklikleri Kaydet" : "Rolü Oluştur"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="sm:max-w-sm rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <Trash2 size={20} />
              Rolü Sil
            </DialogTitle>
            <DialogDescription>
              <strong>{deleteName}</strong> rolünü silmek istediğinize emin misiniz?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)} className="rounded-xl">İptal</Button>
            <Button onClick={handleDelete} disabled={isPending} variant="destructive" className="rounded-xl">Evet, Sil</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
