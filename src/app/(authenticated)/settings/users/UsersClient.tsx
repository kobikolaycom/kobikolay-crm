"use client";

import { useState, useTransition } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Users, Mail, ShieldCheck, CheckCircle2, XCircle,
  Plus, Trash2, Eye, EyeOff, KeyRound, UserPlus
} from "lucide-react";
import { toast } from "sonner";
import {
  createUserAction,
  updateUserAction,
  toggleUserStatusAction,
  deleteUserAction,
  updateUserPasswordAction,
} from "./actions";

interface UsersClientProps {
  users: any[];
  roles: any[];
}

export function UsersClient({ users, roles }: UsersClientProps) {
  const [isPending, startTransition] = useTransition();

  // New/Edit user dialog
  const [showNewDialog, setShowNewDialog] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingUserId, setEditingUserId] = useState("");
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newRoleId, setNewRoleId] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Password reset dialog
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [passwordUserId, setPasswordUserId] = useState("");
  const [passwordUserName, setPasswordUserName] = useState("");
  const [resetPassword, setResetPassword] = useState("");

  // Delete dialog
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteUserId, setDeleteUserId] = useState("");
  const [deleteUserName, setDeleteUserName] = useState("");

  const handleOpenCreate = () => {
    setIsEditing(false);
    setEditingUserId("");
    setNewName("");
    setNewEmail("");
    setNewPassword("");
    setNewRoleId("");
    setShowNewDialog(true);
  };

  const handleOpenEdit = (user: any) => {
    setIsEditing(true);
    setEditingUserId(user.id);
    setNewName(user.name || "");
    setNewEmail(user.email || "");
    setNewPassword(""); // Left empty for edit, meaning don't change if not provided
    setNewRoleId(user.roleId || "");
    setShowNewDialog(true);
  };

  const handleSaveUser = () => {
    if (!newName.trim() || !newEmail.trim() || !newRoleId) {
      toast.error("Ad, e-posta ve rol zorunludur");
      return;
    }
    if (!isEditing && !newPassword.trim()) {
      toast.error("Yeni personel için şifre zorunludur");
      return;
    }
    
    startTransition(async () => {
      try {
        if (isEditing) {
          await updateUserAction(editingUserId, {
            name: newName.trim(),
            email: newEmail.trim().toLowerCase(),
            roleId: newRoleId,
          });
          // Note: If they want to change password, they use the key icon separately
          toast.success("Personel güncellendi");
        } else {
          await createUserAction({
            name: newName.trim(),
            email: newEmail.trim().toLowerCase(),
            password: newPassword,
            roleId: newRoleId,
          });
          toast.success("Personel başarıyla oluşturuldu");
        }
        setShowNewDialog(false);
        window.location.reload();
      } catch (error: any) {
        toast.error(error.message || "İşlem başarısız");
      }
    });
  };

  const handleToggleStatus = (userId: string) => {
    startTransition(async () => {
      try {
        await toggleUserStatusAction(userId);
        toast.success("Durum güncellendi");
        window.location.reload();
      } catch (error: any) {
        toast.error(error.message || "Durum güncellenemedi");
      }
    });
  };

  const handleDelete = () => {
    startTransition(async () => {
      try {
        await deleteUserAction(deleteUserId);
        toast.success("Personel silindi");
        setShowDeleteDialog(false);
        window.location.reload();
      } catch (error: any) {
        toast.error(error.message || "Personel silinemedi");
      }
    });
  };

  const handlePasswordReset = () => {
    if (!resetPassword.trim() || resetPassword.length < 6) {
      toast.error("Şifre en az 6 karakter olmalıdır");
      return;
    }
    startTransition(async () => {
      try {
        await updateUserPasswordAction(passwordUserId, resetPassword);
        toast.success("Şifre güncellendi");
        setShowPasswordDialog(false);
        setResetPassword("");
      } catch (error: any) {
        toast.error(error.message || "Şifre güncellenemedi");
      }
    });
  };

  return (
    <>
      {/* Action Bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Users size={16} />
          <span>Toplam <strong className="text-slate-900">{users.length}</strong> personel</span>
        </div>
        <Button
          onClick={handleOpenCreate}
          className="gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white shadow-md"
        >
          <UserPlus size={16} /> Yeni Personel Ekle
        </Button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-slate-50/50">
                <th className="text-left px-6 py-3 font-semibold text-slate-600">Ad Soyad</th>
                <th className="text-left px-6 py-3 font-semibold text-slate-600">E-posta</th>
                <th className="text-left px-6 py-3 font-semibold text-slate-600">Rol</th>
                <th className="text-left px-6 py-3 font-semibold text-slate-600">Durum</th>
                <th className="text-left px-6 py-3 font-semibold text-slate-600">Kayıt Tarihi</th>
                <th className="text-right px-6 py-3 font-semibold text-slate-600">İşlemler</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {users.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-20">
                    <Users size={32} className="mx-auto text-muted-foreground/30 mb-3" />
                    <p className="text-muted-foreground">Personel bulunamadı</p>
                  </td>
                </tr>
              ) : (
                users.map((user: any) => (
                  <tr key={user.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white font-bold text-sm shadow-sm">
                          {user.name?.[0]?.toUpperCase() || "?"}
                        </div>
                        <span className="font-medium text-slate-900">{user.name || "—"}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-muted-foreground">
                      <div className="flex items-center gap-1.5">
                        <Mail size={14} />
                        {user.email}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <Badge variant="outline" className="gap-1 text-[10px]">
                        <ShieldCheck size={10} /> {user.role?.name || "—"}
                      </Badge>
                    </td>
                    <td className="px-6 py-4">
                      {user.isActive ? (
                        <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 text-[10px] gap-1">
                          <CheckCircle2 size={10} /> Aktif
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-[10px] gap-1 text-red-600">
                          <XCircle size={10} /> Pasif
                        </Badge>
                      )}
                    </td>
                    <td className="px-6 py-4 text-muted-foreground text-xs">
                      {new Date(user.createdAt).toLocaleDateString("tr-TR", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-indigo-50"
                          title="Düzenle"
                          onClick={() => handleOpenEdit(user)}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg>
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 rounded-lg text-slate-500 hover:text-amber-600 hover:bg-amber-50"
                          title="Şifre Sıfırla"
                          onClick={() => {
                            setPasswordUserId(user.id);
                            setPasswordUserName(user.name || user.email);
                            setResetPassword("");
                            setShowPasswordDialog(true);
                          }}
                        >
                          <KeyRound size={15} />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className={`h-8 w-8 rounded-lg ${
                            user.isActive
                              ? "text-slate-500 hover:text-orange-600 hover:bg-orange-50"
                              : "text-slate-500 hover:text-emerald-600 hover:bg-emerald-50"
                          }`}
                          title={user.isActive ? "Pasife Al" : "Aktif Et"}
                          onClick={() => handleToggleStatus(user.id)}
                          disabled={isPending}
                        >
                          {user.isActive ? <EyeOff size={15} /> : <Eye size={15} />}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 rounded-lg text-slate-500 hover:text-red-600 hover:bg-red-50"
                          title="Sil"
                          onClick={() => {
                            setDeleteUserId(user.id);
                            setDeleteUserName(user.name || user.email);
                            setShowDeleteDialog(true);
                          }}
                          disabled={isPending}
                        >
                          <Trash2 size={15} />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* New/Edit User Dialog */}
      <Dialog open={showNewDialog} onOpenChange={setShowNewDialog}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus size={20} className="text-indigo-600" />
              {isEditing ? "Personeli Düzenle" : "Yeni Personel Ekle"}
            </DialogTitle>
            <DialogDescription>
              {isEditing ? "Personel bilgilerini güncelleyin." : "Sisteme yeni bir personel ekleyin. Personel bu bilgilerle giriş yapabilecek."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-600">Ad Soyad *</Label>
              <Input
                placeholder="Örn: Ahmet Yılmaz"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="rounded-xl"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-600">E-posta *</Label>
              <Input
                type="email"
                placeholder="personel@kobikolay.com"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                className="rounded-xl"
              />
            </div>
            {!isEditing && (
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-600">Şifre *</Label>
                <div className="relative">
                  <Input
                    type={showPassword ? "text" : "password"}
                    placeholder="En az 6 karakter"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="rounded-xl pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
            )}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-600">Rol *</Label>
              <Select value={newRoleId} onValueChange={setNewRoleId}>
                <SelectTrigger className="rounded-xl">
                  <SelectValue placeholder="Rol seçin" />
                </SelectTrigger>
                <SelectContent>
                  {roles.map((role: any) => (
                    <SelectItem key={role.id} value={role.id}>
                      {role.name}
                      {role.description && (
                        <span className="text-muted-foreground ml-2">— {role.description}</span>
                      )}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewDialog(false)} className="rounded-xl">
              İptal
            </Button>
            <Button
              onClick={handleSaveUser}
              disabled={isPending}
              className="rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white gap-2"
            >
              <Plus size={16} /> {isEditing ? "Kaydet" : "Personel Oluştur"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Password Reset Dialog */}
      <Dialog open={showPasswordDialog} onOpenChange={setShowPasswordDialog}>
        <DialogContent className="sm:max-w-sm rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <KeyRound size={20} className="text-amber-600" />
              Şifre Sıfırla
            </DialogTitle>
            <DialogDescription>
              <strong>{passwordUserName}</strong> için yeni şifre belirleyin.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5 py-2">
            <Label className="text-xs font-semibold text-slate-600">Yeni Şifre</Label>
            <Input
              type="text"
              placeholder="Yeni şifre girin"
              value={resetPassword}
              onChange={(e) => setResetPassword(e.target.value)}
              className="rounded-xl"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPasswordDialog(false)} className="rounded-xl">
              İptal
            </Button>
            <Button
              onClick={handlePasswordReset}
              disabled={isPending}
              className="rounded-xl bg-amber-600 hover:bg-amber-700 text-white"
            >
              Şifreyi Güncelle
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
              Personeli Sil
            </DialogTitle>
            <DialogDescription>
              <strong>{deleteUserName}</strong> personelini silmek istediğinize emin misiniz? Bu işlem geri alınamaz.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)} className="rounded-xl">
              İptal
            </Button>
            <Button
              onClick={handleDelete}
              disabled={isPending}
              variant="destructive"
              className="rounded-xl"
            >
              Evet, Sil
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
