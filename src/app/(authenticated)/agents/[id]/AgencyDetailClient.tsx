"use client";

import { useState, useEffect, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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
import { toast } from "sonner";
import {
  ArrowLeft, Phone, Mail, Globe, MapPin, Building2, FileText,
  Clock, CheckCircle2, Plus, Send, AlertTriangle, StickyNote,
  CalendarPlus, PhoneCall, UserPlus, RefreshCw, ExternalLink,
  Briefcase, MoreHorizontal
} from "lucide-react";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import Link from "next/link";
import {
  createActivityAction,
  completeTaskAction,
  addNoteAction,
  updateAgencyStatusAction,
  getActiveUsersForAssignAction,
} from "./actions";

// ─── Status Badge ───
function statusBadge(status: string) {
  const map: Record<string, { label: string; cls: string }> = {
    ACTIVE: { label: "Aktif", cls: "bg-emerald-100 text-emerald-700 border-emerald-200" },
    PASSIVE: { label: "Pasif", cls: "bg-slate-100 text-slate-600 border-slate-200" },
    LEAD: { label: "Lead", cls: "bg-blue-100 text-blue-700 border-blue-200" },
    BLOCKED: { label: "Engelli", cls: "bg-red-100 text-red-700 border-red-200" },
    REJECTED: { label: "Reddedildi", cls: "bg-orange-100 text-orange-700 border-orange-200" },
  };
  const v = map[status] || { label: status, cls: "bg-muted text-muted-foreground" };
  return <Badge variant="outline" className={`text-[10px] font-semibold ${v.cls}`}>{v.label}</Badge>;
}

function activityIcon(type: string) {
  switch (type) {
    case "CALL_LOG": return <PhoneCall size={14} className="text-blue-600" />;
    case "TASK_ASSIGNMENT": return <UserPlus size={14} className="text-purple-600" />;
    case "SELF_REMINDER": return <Clock size={14} className="text-amber-600" />;
    default: return <StickyNote size={14} className="text-slate-600" />;
  }
}

function activityLabel(type: string) {
  switch (type) {
    case "CALL_LOG": return "Çağrı Notu";
    case "TASK_ASSIGNMENT": return "Görev Ataması";
    case "SELF_REMINDER": return "Hatırlatıcı";
    default: return type;
  }
}

interface AgencyDetailClientProps {
  agency: any;
  notes: any[];
}

export function AgencyDetailClient({ agency, notes }: AgencyDetailClientProps) {
  const [isPending, startTransition] = useTransition();
  const [users, setUsers] = useState<{ id: string; name: string }[]>([]);

  // Dialog states
  const [showNoteDialog, setShowNoteDialog] = useState(false);
  const [showCallDialog, setShowCallDialog] = useState(false);
  const [showTaskDialog, setShowTaskDialog] = useState(false);
  const [showReminderDialog, setShowReminderDialog] = useState(false);

  // Form fields
  const [noteContent, setNoteContent] = useState("");
  const [callContent, setCallContent] = useState("");
  const [callStatus, setCallStatus] = useState("REACHED");
  const [taskContent, setTaskContent] = useState("");
  const [taskAssignee, setTaskAssignee] = useState("");
  const [taskDueDate, setTaskDueDate] = useState("");
  const [reminderContent, setReminderContent] = useState("");
  const [reminderDate, setReminderDate] = useState("");

  // Completion dialog
  const [showCompleteDialog, setShowCompleteDialog] = useState(false);
  const [completingTask, setCompletingTask] = useState<any>(null);
  const [completionNote, setCompletionNote] = useState("");

  useEffect(() => {
    getActiveUsersForAssignAction().then(setUsers).catch(() => {});
  }, []);

  const contact = agency.contacts?.[0];

  // ─── ACTIONS ───
  const handleAddNote = () => {
    if (!noteContent.trim()) return;
    startTransition(async () => {
      try {
        await addNoteAction(agency.id, noteContent.trim());
        toast.success("Not eklendi");
        setShowNoteDialog(false);
        setNoteContent("");
        window.location.reload();
      } catch (e: any) { toast.error(e?.message || "Not eklenemedi"); }
    });
  };

  const handleAddCall = () => {
    if (!callContent.trim()) return;
    startTransition(async () => {
      try {
        await createActivityAction({
          agencyId: agency.id,
          type: "CALL_LOG",
          content: callContent.trim(),
          callStatus: callStatus as any,
        });
        toast.success("Çağrı notu eklendi");
        setShowCallDialog(false);
        setCallContent("");
        window.location.reload();
      } catch (e: any) { toast.error(e?.message || "Çağrı notu eklenemedi"); }
    });
  };

  const handleAddTask = () => {
    if (!taskContent.trim()) return;
    startTransition(async () => {
      try {
        await createActivityAction({
          agencyId: agency.id,
          type: "TASK_ASSIGNMENT",
          content: taskContent.trim(),
          assignedToId: taskAssignee || undefined,
          dueDate: taskDueDate || undefined,
        });
        toast.success("Görev atandı");
        setShowTaskDialog(false);
        setTaskContent("");
        setTaskAssignee("");
        setTaskDueDate("");
        window.location.reload();
      } catch (e: any) { toast.error(e?.message || "Görev atanamadı"); }
    });
  };

  const handleAddReminder = () => {
    if (!reminderContent.trim() || !reminderDate) return;
    startTransition(async () => {
      try {
        await createActivityAction({
          agencyId: agency.id,
          type: "SELF_REMINDER",
          content: reminderContent.trim(),
          dueDate: reminderDate,
        });
        toast.success("Hatırlatıcı oluşturuldu");
        setShowReminderDialog(false);
        setReminderContent("");
        setReminderDate("");
        window.location.reload();
      } catch (e: any) { toast.error(e?.message || "Hatırlatıcı oluşturulamadı"); }
    });
  };

  const handleCompleteTask = () => {
    if (!completingTask) return;
    startTransition(async () => {
      try {
        await completeTaskAction(completingTask.id, agency.id, completionNote.trim() || undefined);
        toast.success("Görev tamamlandı");
        setShowCompleteDialog(false);
        setCompletingTask(null);
        setCompletionNote("");
        window.location.reload();
      } catch (e: any) { toast.error(e?.message || "Görev tamamlanamadı"); }
    });
  };

  const handleStatusChange = (newStatus: string) => {
    startTransition(async () => {
      try {
        await updateAgencyStatusAction(agency.id, newStatus);
        toast.success("Durum güncellendi");
        window.location.reload();
      } catch (e: any) { toast.error(e?.message || "Durum güncellenemedi"); }
    });
  };

  // Pending tasks
  const pendingTasks = (agency.activities || []).filter((a: any) => a.status === "PENDING");
  const completedActivities = (agency.activities || []).filter((a: any) => a.status !== "PENDING");

  return (
    <div className="space-y-6">
      {/* ─── Back + Header ─── */}
      <div className="flex items-center gap-3">
        <Link href="/agents">
          <Button variant="ghost" size="icon" className="rounded-xl">
            <ArrowLeft size={18} />
          </Button>
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-slate-900">{agency.companyName}</h1>
            {statusBadge(agency.status)}
          </div>
          {agency.documentNo && (
            <p className="text-sm text-muted-foreground mt-0.5">Belge No: {agency.documentNo}</p>
          )}
        </div>
        <Select value={agency.status} onValueChange={handleStatusChange}>
          <SelectTrigger className="w-40 rounded-xl">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ACTIVE">Aktif</SelectItem>
            <SelectItem value="PASSIVE">Pasif</SelectItem>
            <SelectItem value="LEAD">Lead</SelectItem>
            <SelectItem value="BLOCKED">Engelli</SelectItem>
            <SelectItem value="REJECTED">Reddedildi</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* ─── Quick Actions ─── */}
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" className="gap-2 rounded-xl text-sm" onClick={() => setShowNoteDialog(true)}>
          <StickyNote size={14} /> Not Ekle
        </Button>
        <Button variant="outline" className="gap-2 rounded-xl text-sm" onClick={() => setShowCallDialog(true)}>
          <PhoneCall size={14} /> Çağrı Notu
        </Button>
        <Button variant="outline" className="gap-2 rounded-xl text-sm" onClick={() => setShowTaskDialog(true)}>
          <UserPlus size={14} /> Görev Ata
        </Button>
        <Button variant="outline" className="gap-2 rounded-xl text-sm" onClick={() => setShowReminderDialog(true)}>
          <CalendarPlus size={14} /> Hatırlatıcı
        </Button>
      </div>

      {/* ─── Main Grid ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* LEFT: Info + Contact */}
        <div className="space-y-4">
          {/* Contact Card */}
          <div className="bg-white rounded-2xl border shadow-sm p-5 space-y-3">
            <h3 className="font-semibold text-sm text-slate-700 uppercase tracking-widest">İletişim</h3>
            {contact ? (
              <div className="space-y-2.5 text-sm">
                {contact.phone && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Phone size={14} /> <span>{contact.phone}</span>
                  </div>
                )}
                {contact.email && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Mail size={14} /> <span>{contact.email}</span>
                  </div>
                )}
                {contact.address && (
                  <div className="flex items-start gap-2 text-muted-foreground">
                    <MapPin size={14} className="mt-0.5 shrink-0" />
                    <span>{[contact.address, contact.district, contact.province].filter(Boolean).join(", ")}</span>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">İletişim bilgisi yok</p>
            )}
            {agency.website && (
              <a href={agency.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-primary hover:underline">
                <Globe size={14} /> {agency.website}
              </a>
            )}
            {agency.authorizedPerson && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground pt-1 border-t">
                <Building2 size={14} /> <span>Yetkili: <strong>{agency.authorizedPerson}</strong></span>
              </div>
            )}
          </div>

          {/* Sectors */}
          <div className="bg-white rounded-2xl border shadow-sm p-5 space-y-3">
            <h3 className="font-semibold text-sm text-slate-700 uppercase tracking-widest">Sektörler</h3>
            {agency.sectors?.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {agency.sectors.map((s: any) => (
                  <Badge key={s.id} variant="secondary" className="text-xs gap-1">
                    <Briefcase size={10} /> {s.name}
                  </Badge>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">Sektör atanmamış</p>
            )}
          </div>

          {/* Mail History */}
          <div className="bg-white rounded-2xl border shadow-sm p-5 space-y-3">
            <h3 className="font-semibold text-sm text-slate-700 uppercase tracking-widest">Mail Geçmişi</h3>
            {agency.mailLogs?.length > 0 ? (
              <div className="space-y-2 max-h-[200px] overflow-y-auto">
                {agency.mailLogs.slice(0, 10).map((log: any) => (
                  <div key={log.id} className="text-xs border-b pb-2 last:border-0">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{log.subject}</span>
                      <Badge variant="outline" className="text-[9px]">{log.status}</Badge>
                    </div>
                    {log.sentAt && (
                      <span className="text-muted-foreground">{format(new Date(log.sentAt), "d MMM yyyy HH:mm", { locale: tr })}</span>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">Henüz mail gönderilmemiş</p>
            )}
          </div>
        </div>

        {/* CENTER: Pending Tasks + Activity Timeline */}
        <div className="lg:col-span-2 space-y-4">

          {/* Pending Tasks */}
          {pendingTasks.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 space-y-3">
              <h3 className="font-semibold text-sm text-amber-800 uppercase tracking-widest flex items-center gap-2">
                <Clock size={14} /> Bekleyen Görevler ({pendingTasks.length})
              </h3>
              <div className="space-y-2">
                {pendingTasks.map((task: any) => (
                  <div key={task.id} className="bg-white rounded-xl border border-amber-200 p-3 flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        {activityIcon(task.type)}
                        <span className="text-xs font-semibold text-muted-foreground">{activityLabel(task.type)}</span>
                      </div>
                      <p className="text-sm">{task.content}</p>
                      {task.dueDate && (
                        <p className="text-xs text-amber-600 mt-1 flex items-center gap-1">
                          <Clock size={10} /> {format(new Date(task.dueDate), "d MMM yyyy", { locale: tr })}
                        </p>
                      )}
                      {task.assignedTo && (
                        <p className="text-xs text-muted-foreground mt-0.5">→ {task.assignedTo.name}</p>
                      )}
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      className="rounded-lg text-xs gap-1 shrink-0"
                      onClick={() => { setCompletingTask(task); setShowCompleteDialog(true); setCompletionNote(""); }}
                      disabled={isPending}
                    >
                      <CheckCircle2 size={12} /> Tamamla
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Geçmiş Aktiviteler */}
          <div className="bg-white rounded-2xl border shadow-sm p-5 space-y-4">
            <h3 className="font-semibold text-sm text-slate-700 uppercase tracking-widest flex items-center gap-2">
              <CheckCircle2 size={14} className="text-emerald-500" /> Tamamlanan Aktiviteler & Notlar
            </h3>

            {/* Merged Timeline */}
            {(() => {
              const allItems: any[] = [];

              // Add activities
              completedActivities.forEach((a: any) => {
                 allItems.push({
                  id: a.id,
                  type: "activity",
                  subType: a.type,
                  content: a.content,
                  date: new Date(a.createdAt),
                  user: a.creator?.name || "Sistem",
                  callStatus: a.callStatus,
                  completionNote: a.completionNote,
                });
              });

              // Add notes
              notes.forEach((n: any) => {
                const lastMsg = n.messages?.[n.messages.length - 1];
                allItems.push({
                  id: n.id,
                  type: "note",
                  content: lastMsg?.content || "—",
                  date: new Date(n.updatedAt),
                  user: n.createdByUser?.name || lastMsg?.senderName || "Personel",
                });
              });

              // Sort by date descending
              allItems.sort((a, b) => b.date.getTime() - a.date.getTime());

              if (allItems.length === 0) {
                return (
                  <div className="text-center py-10">
                    <StickyNote size={32} className="mx-auto text-muted-foreground/30 mb-2" />
                    <p className="text-muted-foreground text-sm">Henüz aktivite veya not yok</p>
                  </div>
                );
              }

              return (
                <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
                  {allItems.map((item) => (
                    <div key={item.id} className="flex gap-3 group">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${item.type === "activity" ? "bg-emerald-50" : "bg-slate-100"}`}>
                        {item.type === "note" ? (
                          <StickyNote size={14} className="text-primary" />
                        ) : (
                          activityIcon(item.subType)
                        )}
                      </div>
                      <div className="flex-1 border-b pb-3">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-xs font-semibold text-slate-600">
                            {item.type === "note" ? "Not" : activityLabel(item.subType)}
                          </span>
                          {item.callStatus && (
                            <Badge variant="outline" className="text-[9px]">
                              {item.callStatus === "REACHED" ? "Ulaşıldı" : item.callStatus === "NO_ANSWER" ? "Cevap Yok" : item.callStatus}
                            </Badge>
                          )}
                          <span className="text-[10px] text-muted-foreground ml-auto">
                            {format(item.date, "d MMM yyyy HH:mm", { locale: tr })}
                          </span>
                        </div>
                        <p className="text-sm text-slate-800 whitespace-pre-wrap">{item.content}</p>
                        {item.completionNote && (
                          <div className="mt-1.5 bg-emerald-50 border border-emerald-200 rounded-lg px-2.5 py-1.5">
                            <p className="text-[10px] font-semibold text-emerald-700 mb-0.5">📝 Tamamlama Notu:</p>
                            <p className="text-xs text-emerald-800 whitespace-pre-wrap">{item.completionNote}</p>
                          </div>
                        )}
                        <p className="text-[10px] text-muted-foreground mt-1">— {item.user}</p>
                      </div>
                    </div>
                  ))}
                </div>
              );
            })()}
          </div>
        </div>
      </div>

      {/* ─── NOT EKLE DİALOG ─── */}
      <Dialog open={showNoteDialog} onOpenChange={setShowNoteDialog}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><StickyNote size={18} /> Not Ekle</DialogTitle>
          </DialogHeader>
          <Textarea
            value={noteContent}
            onChange={(e) => setNoteContent(e.target.value)}
            placeholder="Acente hakkında not yazın..."
            className="min-h-[120px] rounded-xl"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNoteDialog(false)} className="rounded-xl">İptal</Button>
            <Button onClick={handleAddNote} disabled={isPending || !noteContent.trim()} className="gap-2 rounded-xl">
              {isPending ? <RefreshCw className="animate-spin" size={16} /> : <Plus size={16} />} Kaydet
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── ÇAĞRI NOTU DİALOG ─── */}
      <Dialog open={showCallDialog} onOpenChange={setShowCallDialog}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><PhoneCall size={18} /> Çağrı Notu</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Çağrı Durumu</Label>
              <Select value={callStatus} onValueChange={setCallStatus}>
                <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="REACHED">✅ Ulaşıldı</SelectItem>
                  <SelectItem value="NO_ANSWER">📵 Cevap Yok</SelectItem>
                  <SelectItem value="BUSY">⏳ Meşgul</SelectItem>
                  <SelectItem value="WRONG_NUMBER">❌ Yanlış Numara</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Çağrı Notu</Label>
              <Textarea
                value={callContent}
                onChange={(e) => setCallContent(e.target.value)}
                placeholder="Görüşme hakkında notlar..."
                className="min-h-[100px] rounded-xl"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCallDialog(false)} className="rounded-xl">İptal</Button>
            <Button onClick={handleAddCall} disabled={isPending || !callContent.trim()} className="gap-2 rounded-xl">
              {isPending ? <RefreshCw className="animate-spin" size={16} /> : <PhoneCall size={16} />} Kaydet
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── GÖREV ATA DİALOG ─── */}
      <Dialog open={showTaskDialog} onOpenChange={setShowTaskDialog}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><UserPlus size={18} /> Görev Ata</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Görev Açıklaması *</Label>
              <Textarea
                value={taskContent}
                onChange={(e) => setTaskContent(e.target.value)}
                placeholder="Yapılacak iş..."
                className="min-h-[80px] rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <Label>Atanacak Kişi</Label>
              <Select value={taskAssignee} onValueChange={setTaskAssignee}>
                <SelectTrigger className="rounded-xl"><SelectValue placeholder="Kişi seçin..." /></SelectTrigger>
                <SelectContent>
                  {users.map((u) => (
                    <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Son Tarih</Label>
              <div className="flex gap-2">
                <Input type="date" value={taskDueDate} onChange={(e) => setTaskDueDate(e.target.value)} min={new Date().toISOString().split('T')[0]} className="rounded-xl flex-1" />
              </div>
              <div className="flex gap-1.5">
                <Button type="button" size="sm" variant="outline" className="text-xs h-7 px-2.5 rounded-lg" onClick={() => { const d = new Date(); setTaskDueDate(d.toISOString().split('T')[0]); }}>Bugün</Button>
                <Button type="button" size="sm" variant="outline" className="text-xs h-7 px-2.5 rounded-lg" onClick={() => { const d = new Date(); d.setDate(d.getDate() + 1); setTaskDueDate(d.toISOString().split('T')[0]); }}>Yarın</Button>
                <Button type="button" size="sm" variant="outline" className="text-xs h-7 px-2.5 rounded-lg" onClick={() => { const d = new Date(); const day = d.getDay(); const diff = day === 0 ? 1 : 8 - day; d.setDate(d.getDate() + diff); setTaskDueDate(d.toISOString().split('T')[0]); }}>Pazartesi</Button>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowTaskDialog(false)} className="rounded-xl">İptal</Button>
            <Button onClick={handleAddTask} disabled={isPending || !taskContent.trim()} className="gap-2 rounded-xl">
              {isPending ? <RefreshCw className="animate-spin" size={16} /> : <UserPlus size={16} />} Ata
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── HATIRLATICI DİALOG ─── */}
      <Dialog open={showReminderDialog} onOpenChange={setShowReminderDialog}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><CalendarPlus size={18} /> Hatırlatıcı Oluştur</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Hatırlatma İçeriği *</Label>
              <Textarea
                value={reminderContent}
                onChange={(e) => setReminderContent(e.target.value)}
                placeholder="Ne hatırlatılsın?"
                className="min-h-[80px] rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <Label>Tarih *</Label>
              <div className="flex gap-2">
                <Input type="date" value={reminderDate} onChange={(e) => setReminderDate(e.target.value)} min={new Date().toISOString().split('T')[0]} className="rounded-xl flex-1" />
              </div>
              <div className="flex gap-1.5">
                <Button type="button" size="sm" variant="outline" className="text-xs h-7 px-2.5 rounded-lg" onClick={() => { const d = new Date(); setReminderDate(d.toISOString().split('T')[0]); }}>Bugün</Button>
                <Button type="button" size="sm" variant="outline" className="text-xs h-7 px-2.5 rounded-lg" onClick={() => { const d = new Date(); d.setDate(d.getDate() + 1); setReminderDate(d.toISOString().split('T')[0]); }}>Yarın</Button>
                <Button type="button" size="sm" variant="outline" className="text-xs h-7 px-2.5 rounded-lg" onClick={() => { const d = new Date(); const day = d.getDay(); const diff = day === 0 ? 1 : 8 - day; d.setDate(d.getDate() + diff); setReminderDate(d.toISOString().split('T')[0]); }}>Pazartesi</Button>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowReminderDialog(false)} className="rounded-xl">İptal</Button>
            <Button onClick={handleAddReminder} disabled={isPending || !reminderContent.trim() || !reminderDate} className="gap-2 rounded-xl">
              {isPending ? <RefreshCw className="animate-spin" size={16} /> : <CalendarPlus size={16} />} Oluştur
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* ─── GÖREV TAMAMLA DİALOG ─── */}
      <Dialog open={showCompleteDialog} onOpenChange={setShowCompleteDialog}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><CheckCircle2 size={18} className="text-emerald-600" /> Görevi Tamamla</DialogTitle>
            <DialogDescription>
              Ne yapıldı, ne konuşuldu? Kısa bir not bırakın.
            </DialogDescription>
          </DialogHeader>
          {completingTask && (
            <div className="bg-slate-50 rounded-xl p-3 text-sm">
              <p className="font-medium">{completingTask.content}</p>
              {completingTask.dueDate && (
                <p className="text-xs text-muted-foreground mt-1">Son tarih: {new Date(completingTask.dueDate).toLocaleString("tr-TR")}</p>
              )}
            </div>
          )}
          <Textarea
            value={completionNote}
            onChange={(e) => setCompletionNote(e.target.value)}
            placeholder="Yapılan iş hakkında not yazın... (opsiyonel)"
            className="min-h-[100px] rounded-xl"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCompleteDialog(false)} className="rounded-xl">İptal</Button>
            <Button onClick={handleCompleteTask} disabled={isPending} className="gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700">
              {isPending ? <RefreshCw className="animate-spin" size={16} /> : <CheckCircle2 size={16} />} Tamamla
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
