"use client";

import { useState, useEffect, useTransition, useRef, useCallback } from "react";
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
  Briefcase, MoreHorizontal, MessageCircle, MessageSquare,
  RotateCcw, Info, Save, X, Hash, ChevronRight, Search,
  User, Tag, Calendar, Inbox, Archive, Eye, Star
} from "lucide-react";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import Link from "next/link";
import { cn } from "@/lib/utils";
import {
  createActivityAction,
  completeTaskAction,
  addNoteAction,
  updateAgencyStatusAction,
  getActiveUsersForAssignAction,
  createAgencyConversationAction,
  addAgencyMessageAction,
  resolveAgencyConversationAction,
  reopenAgencyConversationAction,
  getAgencyConversationsAction,
  getAllSectorsAction,
  sendAgencyPitchAction,
} from "./actions";
import { Checkbox } from "@/components/ui/checkbox";

// ─── Channel Configuration ───
type ChannelType = "WHATSAPP" | "INSTAGRAM" | "MESSENGER" | "MANUAL_NOTE";

const channelConfig: Record<ChannelType, { label: string; icon: string; color: string; bgLight: string; bgDark: string; border: string; textColor: string }> = {
  WHATSAPP:    { label: "WhatsApp",   icon: "🟢", color: "text-green-700",  bgLight: "bg-green-50",  bgDark: "bg-green-100", border: "border-green-200", textColor: "text-green-700" },
  INSTAGRAM:   { label: "Instagram",  icon: "🟣", color: "text-purple-700", bgLight: "bg-purple-50", bgDark: "bg-purple-100", border: "border-purple-200", textColor: "text-purple-700" },
  MESSENGER:   { label: "Messenger",  icon: "🔵", color: "text-blue-700",   bgLight: "bg-blue-50",   bgDark: "bg-blue-100", border: "border-blue-200", textColor: "text-blue-700" },
  MANUAL_NOTE: { label: "Dahili Not", icon: "📝", color: "text-amber-700",  bgLight: "bg-amber-50",  bgDark: "bg-amber-100", border: "border-amber-200", textColor: "text-amber-700" },
};

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

function formatTime(dateInput: string | Date) {
  const d = new Date(dateInput);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "Az önce";
  if (diffMin < 60) return `${diffMin}dk`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `${diffH}sa`;
  const diffD = Math.floor(diffH / 24);
  if (diffD < 7) return `${diffD}g`;
  return d.toLocaleDateString("tr-TR");
}

// ─── Interfaces ───
interface ConversationMessage {
  id: string;
  content: string;
  senderType: string;
  senderName: string | null;
  isInternalNote: boolean;
  createdAt: string | Date;
}

interface Conversation {
  id: string;
  channelType: ChannelType;
  status: string;
  contactName: string | null;
  contactPhone: string | null;
  agencyId: string | null;
  assignedUser: { id: string; name: string | null } | null;
  createdByUser: { id?: string; name: string | null } | null;
  messages: ConversationMessage[];
  updatedAt: string | Date;
  createdAt: string | Date;
}

interface AgencyDetailClientProps {
  agency: any;
  notes: any[];
  conversations: Conversation[];
  activeIntegrations?: {
    whatsapp: boolean;
    instagram: boolean;
    messenger: boolean;
  };
}

// ══════════════════════════════════════════════════════════
// ─── MAIN COMPONENT ───
// ══════════════════════════════════════════════════════════
export function AgencyDetailClient({ agency, notes, conversations: initialConversations, activeIntegrations = { whatsapp: true, instagram: true, messenger: true } }: AgencyDetailClientProps) {
  const [isPending, startTransition] = useTransition();
  const [users, setUsers] = useState<{ id: string; name: string | null }[]>([]);

  // Tab State - 3 tabs: notes, communication, mails
  const [activeTab, setActiveTab] = useState<"notes" | "communication" | "mails">("notes");

  // Dialog states
  const [showNoteDialog, setShowNoteDialog] = useState(false);
  const [showCallDialog, setShowCallDialog] = useState(false);
  const [showTaskDialog, setShowTaskDialog] = useState(false);
  const [showReminderDialog, setShowReminderDialog] = useState(false);
  const [showNewConvoDialog, setShowNewConvoDialog] = useState(false);

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

  // ─── Omnichannel Hub State ───
  const [conversations, setConversations] = useState<Conversation[]>(initialConversations);
  const [hubChannel, setHubChannel] = useState<ChannelType | "ALL">("ALL");
  const [hubSearch, setHubSearch] = useState("");
  const [selectedConvoId, setSelectedConvoId] = useState<string | null>(null);
  const [hubMessageText, setHubMessageText] = useState("");
  const [hubSending, setHubSending] = useState(false);
  const hubIsNote = false;

  // New Conversation Dialog State
  const [newConvoChannel, setNewConvoChannel] = useState<ChannelType>("WHATSAPP");
  const [newConvoName, setNewConvoName] = useState("");
  const [newConvoPhone, setNewConvoPhone] = useState("");
  const [newConvoLoading, setNewConvoLoading] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // ─── Pitch (Tanıtım) Modal State ───
  const [showPitchDialog, setShowPitchDialog] = useState(false);
  const [allSectors, setAllSectors] = useState<any[]>([]);
  const [pitchSelectedSectorIds, setPitchSelectedSectorIds] = useState<string[]>([]);
  const [pitchSubject, setPitchSubject] = useState("");
  const [pitchBody, setPitchBody] = useState("");
  const [pitchSending, setPitchSending] = useState(false);

  useEffect(() => {
    getActiveUsersForAssignAction().then(setUsers).catch(() => {});
    getAllSectorsAction().then(setAllSectors).catch(() => {});
  }, []);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [selectedConvoId, conversations]);

  // Auto-refresh conversations every 15 seconds
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const fresh = await getAgencyConversationsAction(agency.id);
        setConversations(fresh);
      } catch {}
    }, 15000);
    return () => clearInterval(interval);
  }, [agency.id]);

  const contact = agency.contacts?.[0];
  const selectedConvo = conversations.find((c) => c.id === selectedConvoId) || null;

  // ─── Filter conversations for hub ───
  const filteredHubConversations = conversations.filter((c) => {
    if (c.channelType === "MANUAL_NOTE") return false;
    if (c.channelType === "WHATSAPP" && !activeIntegrations.whatsapp) return false;
    if (c.channelType === "INSTAGRAM" && !activeIntegrations.instagram) return false;
    if (c.channelType === "MESSENGER" && !activeIntegrations.messenger) return false;
    if (hubChannel !== "ALL" && c.channelType !== hubChannel) return false;
    if (hubSearch) {
      const term = hubSearch.toLowerCase();
      const matchName = c.contactName?.toLowerCase().includes(term);
      const matchPhone = c.contactPhone?.includes(term);
      const matchChannel = channelConfig[c.channelType]?.label.toLowerCase().includes(term);
      if (!matchName && !matchPhone && !matchChannel) return false;
    }
    return true;
  });

  // Channel counts
  const channelCounts = {
    ALL: conversations.filter((c) => c.channelType !== "MANUAL_NOTE").length,
    WHATSAPP: conversations.filter((c) => c.channelType === "WHATSAPP").length,
    INSTAGRAM: conversations.filter((c) => c.channelType === "INSTAGRAM").length,
    MESSENGER: conversations.filter((c) => c.channelType === "MESSENGER").length,
  };

  // ─── ACTION HANDLERS ───
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

  // ─── HUB ACTIONS ───
  const refreshConversations = useCallback(async () => {
    try {
      const fresh = await getAgencyConversationsAction(agency.id);
      setConversations(fresh);
    } catch {}
  }, [agency.id]);

  const handleHubSend = async () => {
    if (!hubMessageText.trim() || !selectedConvoId) return;
    setHubSending(true);
    try {
      const res = await addAgencyMessageAction(
        selectedConvoId,
        hubMessageText.trim(),
        "agent",
        false
      );
      if (res && !res.success) {
        toast.error(res.error || "Gönderilemedi");
        return;
      }
      setHubMessageText("");
      toast.success("Mesaj gönderildi");
      await refreshConversations();
    } catch (e: any) {
      toast.error(e?.message || "Gönderilemedi");
    } finally {
      setHubSending(false);
    }
  };

  const handleHubResolve = async () => {
    if (!selectedConvoId) return;
    try {
      await resolveAgencyConversationAction(selectedConvoId, agency.id);
      toast.success("Mesajlaşma sonlandırıldı");
      await refreshConversations();
    } catch { toast.error("İşlem başarısız"); }
  };

  const handleHubReopen = async () => {
    if (!selectedConvoId) return;
    try {
      await reopenAgencyConversationAction(selectedConvoId, agency.id);
      toast.success("Mesajlaşma yeniden başlatıldı");
      await refreshConversations();
    } catch { toast.error("İşlem başarısız"); }
  };

  const handleNewConversation = async () => {
    setNewConvoLoading(true);
    try {
      const res = await createAgencyConversationAction({
        agencyId: agency.id,
        channelType: newConvoChannel,
        contactName: newConvoName || agency.companyName,
        contactPhone: newConvoPhone || undefined,
      });

      if (!res.success) {
        toast.error(res.error || "Konuşma oluşturulamadı", { duration: 8000 });
        return;
      }

      toast.success("Yeni konuşma başlatıldı");
      setShowNewConvoDialog(false);
      setNewConvoName("");
      setNewConvoPhone("");
      setNewConvoChannel("WHATSAPP");
      await refreshConversations();
      if (res.conversation) {
        setSelectedConvoId(res.conversation.id);
        setActiveTab("communication");
      }
    } catch (e: any) {
      toast.error(e?.message || "Konuşma oluşturulamadı");
    } finally {
      setNewConvoLoading(false);
    }
  };

  // Pending tasks
  const pendingTasks = (agency.activities || []).filter((a: any) => a.status === "PENDING");
  const completedActivities = (agency.activities || []).filter((a: any) => a.status !== "PENDING");

  // Open conversation count for badge (excluding manual notes)
  const openConvoCount = conversations.filter(c => c.status === "OPEN" && c.channelType !== "MANUAL_NOTE").length;

  return (
    <div className="space-y-6">
      {/* ─── Back + Header ─── */}
      <div className="flex items-center gap-3">
        <Link href="/agents">
          <Button variant="ghost" size="icon" className="rounded-xl hover:bg-slate-100">
            <ArrowLeft size={18} />
          </Button>
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">{agency.companyName}</h1>
            {statusBadge(agency.status)}
          </div>
          {agency.documentNo && (
            <p className="text-sm text-slate-400 mt-0.5 font-medium">Belge No: {agency.documentNo}</p>
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
        <Button variant="outline" className="gap-2 rounded-xl text-sm font-bold hover:shadow-md transition-all" onClick={() => setShowNoteDialog(true)}>
          <StickyNote size={14} /> Not Ekle
        </Button>
        <Button variant="outline" className="gap-2 rounded-xl text-sm font-bold hover:shadow-md transition-all" onClick={() => setShowCallDialog(true)}>
          <PhoneCall size={14} /> Çağrı Notu
        </Button>
        <Button variant="outline" className="gap-2 rounded-xl text-sm font-bold hover:shadow-md transition-all" onClick={() => setShowTaskDialog(true)}>
          <UserPlus size={14} /> Görev Ata
        </Button>
        <Button variant="outline" className="gap-2 rounded-xl text-sm font-bold hover:shadow-md transition-all" onClick={() => setShowReminderDialog(true)}>
          <CalendarPlus size={14} /> Hatırlatıcı
        </Button>
      </div>

      {/* ─── Main Grid ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* ════════════════════════════════════════════ */}
        {/* LEFT SIDEBAR (3 cols) */}
        {/* ════════════════════════════════════════════ */}
        <div className="lg:col-span-3 space-y-5">

          {/* ─── Premium Agency Info Card ─── */}
          <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
            {/* Gradient Header with Avatar */}
            <div className="bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 px-6 py-8 text-center relative">
              <div className="w-20 h-20 rounded-full bg-white/20 backdrop-blur-sm border-2 border-white/30 mx-auto flex items-center justify-center text-3xl font-black text-white shadow-xl">
                {agency.companyName?.charAt(0)?.toUpperCase() || "?"}
              </div>
              <h2 className="text-lg font-black text-white mt-3 tracking-tight">{agency.companyName}</h2>
              {agency.documentNo && (
                <p className="text-white/60 text-xs font-medium mt-1">Belge No: {agency.documentNo}</p>
              )}
              <div className="mt-3">
                {statusBadge(agency.status)}
              </div>
            </div>

            {/* Colored Info Blocks */}
            <div className="p-5 space-y-2.5">
              {contact?.phone && (
                <div className="flex items-center gap-3 bg-blue-50 rounded-xl px-4 py-3 group hover:bg-blue-100 transition-colors">
                  <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
                    <Phone size={15} className="text-blue-600" />
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-blue-400 uppercase tracking-wider">Telefon</span>
                    <p className="text-sm font-bold text-blue-900">{contact.phone}</p>
                  </div>
                </div>
              )}
              {contact?.email && (
                <div className="flex items-center gap-3 bg-emerald-50 rounded-xl px-4 py-3 group hover:bg-emerald-100 transition-colors">
                  <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center">
                    <Mail size={15} className="text-emerald-600" />
                  </div>
                  <div className="min-w-0">
                    <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">E-posta</span>
                    <p className="text-sm font-bold text-emerald-900 truncate">{contact.email}</p>
                  </div>
                </div>
              )}
              {contact?.address && (
                <div className="flex items-start gap-3 bg-amber-50 rounded-xl px-4 py-3 group hover:bg-amber-100 transition-colors">
                  <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center shrink-0 mt-0.5">
                    <MapPin size={15} className="text-amber-600" />
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider">Adres</span>
                    <p className="text-sm font-bold text-amber-900">{[contact.address, contact.district, contact.province].filter(Boolean).join(", ")}</p>
                  </div>
                </div>
              )}
              {agency.website && (
                <a href={agency.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 bg-violet-50 rounded-xl px-4 py-3 group hover:bg-violet-100 transition-colors">
                  <div className="w-8 h-8 rounded-lg bg-violet-100 flex items-center justify-center">
                    <Globe size={15} className="text-violet-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="text-[10px] font-bold text-violet-400 uppercase tracking-wider">Website</span>
                    <p className="text-sm font-bold text-violet-900 truncate">{agency.website}</p>
                  </div>
                  <ExternalLink size={12} className="text-violet-400 shrink-0" />
                </a>
              )}
              {agency.authorizedPerson && (
                <div className="flex items-center gap-3 bg-rose-50 rounded-xl px-4 py-3 group hover:bg-rose-100 transition-colors">
                  <div className="w-8 h-8 rounded-lg bg-rose-100 flex items-center justify-center">
                    <User size={15} className="text-rose-600" />
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-rose-400 uppercase tracking-wider">Yetkili Kişi</span>
                    <p className="text-sm font-bold text-rose-900">{agency.authorizedPerson}</p>
                  </div>
                </div>
              )}
              {!contact?.phone && !contact?.email && !contact?.address && !agency.website && !agency.authorizedPerson && (
                <div className="text-center py-6">
                  <Building2 size={28} className="mx-auto text-slate-200 mb-2" />
                  <p className="text-xs text-slate-400 font-medium">İletişim bilgisi yok</p>
                </div>
              )}
            </div>
          </div>

          {/* ─── Sectors Card ─── */}
          <div className="bg-white rounded-2xl border shadow-sm p-5">
            <h3 className="font-bold text-[11px] text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
              <Tag size={12} /> Faaliyet Alanları
            </h3>
            {agency.sectors?.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {agency.sectors.map((s: any) => (
                  <Badge key={s.id} variant="secondary" className="bg-gradient-to-r from-indigo-50 to-purple-50 text-indigo-700 border-indigo-200 text-xs gap-1.5 px-3 py-1.5 font-bold">
                    <Briefcase size={10} /> {s.name}
                  </Badge>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-400 font-medium">Faaliyet alanı atanmamış</p>
            )}
          </div>

          {/* ─── Pending Tasks Widget ─── */}
          {pendingTasks.length > 0 && (
            <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl border border-amber-200 p-5">
              <h3 className="font-bold text-[11px] text-amber-600 uppercase tracking-widest mb-3 flex items-center gap-2">
                <Clock size={12} /> Bekleyen Görevler ({pendingTasks.length})
              </h3>
              <div className="space-y-2">
                {pendingTasks.map((task: any) => (
                  <div key={task.id} className="bg-white rounded-xl border border-amber-200 p-3 flex items-start justify-between gap-3 shadow-sm">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        {activityIcon(task.type)}
                        <span className="text-xs font-semibold text-slate-500">{activityLabel(task.type)}</span>
                      </div>
                      <p className="text-sm font-medium text-slate-800">{task.content}</p>
                      {task.dueDate && (
                        <p className="text-xs text-amber-600 mt-1 flex items-center gap-1">
                          <Clock size={10} /> {format(new Date(task.dueDate), "d MMM yyyy", { locale: tr })}
                        </p>
                      )}
                      {task.assignedTo && (
                        <p className="text-xs text-slate-400 mt-0.5">→ {task.assignedTo.name}</p>
                      )}
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      className="rounded-lg text-xs gap-1 shrink-0 hover:bg-emerald-50 hover:border-emerald-300 hover:text-emerald-700 transition-all"
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
        </div>

        {/* ════════════════════════════════════════════ */}
        {/* RIGHT CONTENT AREA (9 cols) */}
        {/* ════════════════════════════════════════════ */}
        <div className="lg:col-span-9 space-y-0">

          {/* ─── 3-Tab Apple-Style Switcher ─── */}
          <div className="flex items-center gap-1 p-1.5 bg-slate-100/80 backdrop-blur rounded-2xl mb-5">
            <button
              onClick={() => setActiveTab("notes")}
              className={cn(
                "flex-1 py-3 px-4 rounded-xl text-sm font-bold transition-all duration-300 flex items-center justify-center gap-2",
                activeTab === "notes"
                  ? "bg-white text-slate-900 shadow-lg"
                  : "text-slate-500 hover:text-slate-700"
              )}
            >
              <StickyNote size={16} /> Notlar
            </button>
            <button
              onClick={() => setActiveTab("communication")}
              className={cn(
                "flex-1 py-3 px-4 rounded-xl text-sm font-bold transition-all duration-300 flex items-center justify-center gap-2 relative",
                activeTab === "communication"
                  ? "bg-white text-slate-900 shadow-lg"
                  : "text-slate-500 hover:text-slate-700"
              )}
            >
              <MessageCircle size={16} /> İletişim
              {openConvoCount > 0 && (
                <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary text-white text-[10px] font-black px-1">
                  {openConvoCount}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab("mails")}
              className={cn(
                "flex-1 py-3 px-4 rounded-xl text-sm font-bold transition-all duration-300 flex items-center justify-center gap-2",
                activeTab === "mails"
                  ? "bg-white text-slate-900 shadow-lg"
                  : "text-slate-500 hover:text-slate-700"
              )}
            >
              <Mail size={16} /> Mailler
              {agency.mailLogs?.length > 0 && (
                <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-slate-300 text-slate-700 text-[10px] font-black px-1">
                  {agency.mailLogs.length}
                </span>
              )}
            </button>
          </div>

          {/* ══════════════════════════════════════════ */}
          {/* ─── TAB 1: NOTLAR ─── */}
          {/* ══════════════════════════════════════════ */}
          {activeTab === "notes" && (
            <div className="space-y-4">
              <div className="bg-white rounded-2xl border shadow-sm p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                      <StickyNote size={16} className="text-primary" />
                    </div>
                    Notlar & Aktivite Geçmişi
                  </h3>
                  <Button variant="outline" size="sm" className="rounded-xl text-xs gap-1.5 font-bold" onClick={() => setShowNoteDialog(true)}>
                    <Plus size={14} /> Not Ekle
                  </Button>
                </div>

                {(() => {
                  const allItems: any[] = [];
                  completedActivities.forEach((a: any) => {
                    allItems.push({
                      id: a.id, type: "activity", subType: a.type, content: a.content,
                      date: new Date(a.createdAt), user: a.creator?.name || "Sistem",
                      callStatus: a.callStatus, completionNote: a.completionNote,
                    });
                  });
                  notes.forEach((n: any) => {
                    const lastMsg = n.messages?.[n.messages.length - 1];
                    allItems.push({
                      id: n.id, type: "note", content: lastMsg?.content || "—",
                      date: new Date(n.updatedAt), user: n.createdByUser?.name || lastMsg?.senderName || "Personel",
                    });
                  });
                  allItems.sort((a, b) => b.date.getTime() - a.date.getTime());

                  if (allItems.length === 0) {
                    return (
                      <div className="text-center py-16">
                        <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                          <StickyNote size={28} className="text-slate-200" />
                        </div>
                        <p className="text-sm font-bold text-slate-500">Henüz not veya aktivite yok</p>
                        <p className="text-xs text-slate-400 mt-1">Yukarıdaki butonlarla not ekleyin veya görev oluşturun</p>
                      </div>
                    );
                  }

                  return (
                    <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
                      {allItems.map((item) => (
                        <div key={item.id} className="flex gap-3 group">
                          <div className={cn(
                            "w-9 h-9 rounded-full flex items-center justify-center shrink-0 mt-0.5 shadow-sm",
                            item.type === "note" ? "bg-primary/10" : item.subType === "CALL_LOG" ? "bg-blue-50" : item.subType === "TASK_ASSIGNMENT" ? "bg-purple-50" : "bg-amber-50"
                          )}>
                            {item.type === "note" ? <StickyNote size={14} className="text-primary" /> : activityIcon(item.subType)}
                          </div>
                          <div className="flex-1 border-b border-slate-100 pb-3">
                            <div className="flex items-center gap-2 mb-0.5">
                              <span className="text-xs font-bold text-slate-600">
                                {item.type === "note" ? "Not" : activityLabel(item.subType)}
                              </span>
                              {item.callStatus && (
                                <Badge variant="outline" className="text-[9px] font-bold">
                                  {item.callStatus === "REACHED" ? "✅ Ulaşıldı" : item.callStatus === "NO_ANSWER" ? "📵 Cevap Yok" : item.callStatus === "BUSY" ? "⏳ Meşgul" : item.callStatus}
                                </Badge>
                              )}
                              <span className="text-[10px] text-slate-400 font-medium ml-auto">
                                {format(item.date, "d MMM yyyy HH:mm", { locale: tr })}
                              </span>
                            </div>
                            <p className="text-sm text-slate-800 whitespace-pre-wrap leading-relaxed">{item.content}</p>
                            {item.completionNote && (
                              <div className="mt-2 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">
                                <p className="text-[10px] font-black text-emerald-700 mb-0.5 uppercase tracking-wider">📝 Tamamlama Notu</p>
                                <p className="text-xs text-emerald-800 whitespace-pre-wrap">{item.completionNote}</p>
                              </div>
                            )}
                            <p className="text-[10px] text-slate-400 mt-1 font-medium">— {item.user}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════ */}
          {/* ─── TAB 2: İLETİŞİM (Omnichannel Hub) ─── */}
          {/* ══════════════════════════════════════════ */}
          {activeTab === "communication" && (
            <div className="bg-white rounded-2xl border shadow-sm overflow-hidden" style={{ height: "calc(100vh - 20rem)" }}>
              <div className="flex h-full">

                {/* ─── Left: Conversation List ─── */}
                <div className="w-96 lg:w-[25rem] border-r flex flex-col bg-slate-50/70 shrink-0">
                  {/* Hub Header */}
                  <div className="p-4 pb-3 border-b bg-white">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-base font-black text-slate-900">Konuşmalar</h3>
                      <Button
                        size="sm"
                        className="rounded-xl gap-1.5 text-xs font-bold h-8 px-3"
                        onClick={() => {
                          setShowNewConvoDialog(true);
                          setNewConvoName(agency.authorizedPerson || agency.companyName);
                          setNewConvoPhone(contact?.phone || "");
                          if (activeIntegrations.whatsapp) setNewConvoChannel("WHATSAPP");
                          else if (activeIntegrations.instagram) setNewConvoChannel("INSTAGRAM");
                          else if (activeIntegrations.messenger) setNewConvoChannel("MESSENGER");
                        }}
                      >
                        <Plus size={14} /> Yeni
                      </Button>
                    </div>

                    {/* Channel filter pills */}
                    <div className="flex flex-wrap gap-1.5">
                      {(["ALL", "WHATSAPP", "INSTAGRAM", "MESSENGER"] as (ChannelType | "ALL")[]).filter((ch) => {
                        if (ch === "ALL") return true;
                        if (ch === "WHATSAPP" && !activeIntegrations.whatsapp) return false;
                        if (ch === "INSTAGRAM" && !activeIntegrations.instagram) return false;
                        if (ch === "MESSENGER" && !activeIntegrations.messenger) return false;
                        return true;
                      }).map((ch) => {
                        const count = channelCounts[ch as keyof typeof channelCounts] || 0;
                        const isActive = hubChannel === ch;
                        return (
                          <button
                            key={ch}
                            onClick={() => setHubChannel(ch)}
                            className={cn(
                              "px-3 py-1 rounded-full text-[11px] font-bold flex items-center gap-1 transition-all duration-200",
                              isActive
                                ? "bg-slate-800 text-white shadow-md"
                                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                            )}
                          >
                            {ch === "ALL" ? "Tümü" : <><span className="text-xs">{channelConfig[ch as ChannelType].icon}</span> {channelConfig[ch as ChannelType].label}</>}
                            {count > 0 && (
                              <span className={cn(
                                "ml-0.5 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[9px] font-black",
                                isActive ? "bg-white/20 text-white" : "bg-slate-200 text-slate-600"
                              )}>
                                {count}
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Conversation List */}
                  <div className="flex-1 overflow-y-auto">
                    {filteredHubConversations.length === 0 ? (
                      <div className="text-center py-16 px-4">
                        <MessageCircle size={36} className="mx-auto text-slate-300 mb-3" />
                        <p className="text-sm font-semibold text-slate-500">Konuşma bulunamadı</p>
                        <p className="text-xs text-slate-400 mt-1">Bu acente için henüz {hubChannel !== "ALL" ? channelConfig[hubChannel as ChannelType]?.label : ""} mesajı yok</p>
                      </div>
                    ) : (
                      <div className="py-1">
                        {filteredHubConversations.map((c) => {
                          const ch = channelConfig[c.channelType];
                          const nonNoteMessages = c.messages?.filter(m => !m.isInternalNote) || [];
                          const lastMsg = nonNoteMessages[nonNoteMessages.length - 1];
                          const isActive = selectedConvoId === c.id;
                          const isOpen = c.status === "OPEN";
                          const msgCount = nonNoteMessages.length;

                          return (
                            <button
                              key={c.id}
                              onClick={() => setSelectedConvoId(c.id)}
                              className={cn(
                                "w-full text-left px-4 py-3 transition-all duration-200 border-l-[3px] border-b border-b-slate-100",
                                isActive
                                  ? `${ch.bgLight} ${ch.border} shadow-inner`
                                  : `border-l-transparent hover:bg-slate-50`
                              )}
                            >
                              <div className="flex items-start gap-2.5">
                                <div className={cn(
                                  "w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold shrink-0 mt-0.5",
                                  ch.bgDark, ch.textColor
                                )}>
                                  {ch.icon}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center justify-between mb-0.5">
                                    <span className={cn(
                                      "text-sm font-bold truncate",
                                      isActive ? "text-slate-900" : "text-slate-700"
                                    )}>
                                      {c.contactName || "Bilinmeyen"}
                                    </span>
                                    <span className="text-[10px] font-medium text-slate-400 shrink-0 ml-2">
                                      {formatTime(c.updatedAt)}
                                    </span>
                                  </div>
                                  <p className="text-xs text-slate-500 truncate">
                                    {lastMsg?.content || "Mesaj yok"}
                                  </p>
                                  <div className="flex items-center gap-1.5 mt-1.5">
                                    <Badge variant="outline" className={cn("text-[9px] px-1.5 py-0 font-bold rounded-md", ch.border, ch.textColor, ch.bgLight)}>
                                      {ch.label}
                                    </Badge>
                                    {!isOpen && (
                                      <Badge variant="outline" className="text-[9px] px-1.5 py-0 bg-emerald-50 text-emerald-700 border-emerald-200 font-bold rounded-md">
                                        Sonlandırıldı
                                      </Badge>
                                    )}
                                    {msgCount > 0 && (
                                      <span className="text-[10px] text-slate-400 font-medium ml-auto">{msgCount} mesaj</span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>

                {/* ─── Right: Chat Detail ─── */}
                <div className="flex-1 flex flex-col bg-slate-50/30 min-w-0">
                  {!selectedConvo ? (
                    <div className="flex-1 flex items-center justify-center text-center">
                      <div className="max-w-xs">
                        <div className="w-20 h-20 bg-primary/5 rounded-full flex items-center justify-center mx-auto mb-5">
                          <MessageSquare size={36} className="text-primary/30" />
                        </div>
                        <h3 className="text-lg font-bold text-slate-900">Konuşma Seçin</h3>
                        <p className="text-sm text-slate-500 mt-2">
                          Sol panelden bir konuşma seçerek mesajları görüntüleyin ve yanıtlayın.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <>
                      {/* Chat Header */}
                      <div className={cn(
                        "px-5 py-3.5 border-b flex items-center justify-between gap-3 shrink-0",
                        channelConfig[selectedConvo.channelType]?.bgLight || "bg-white"
                      )}>
                        <div className="flex items-center gap-3 min-w-0">
                          <div className={cn(
                            "w-10 h-10 rounded-full flex items-center justify-center text-base font-bold shadow-sm",
                            channelConfig[selectedConvo.channelType]?.bgDark,
                            channelConfig[selectedConvo.channelType]?.textColor,
                          )}>
                            {(selectedConvo.contactName || "?").charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <h4 className="text-sm font-bold text-slate-900 truncate">
                              {selectedConvo.contactName || "Bilinmeyen"}
                            </h4>
                            <p className="text-[11px] text-slate-500 font-medium truncate">
                              {selectedConvo.contactPhone || "—"} • {channelConfig[selectedConvo.channelType]?.label} •{" "}
                              {selectedConvo.status === "OPEN" ? "Aktif" : "Sonlandırıldı"} •{" "}
                              {selectedConvo.messages.length} mesaj
                            </p>
                          </div>
                        </div>

                        {/* Header Actions */}
                        <div className="flex items-center gap-2 shrink-0">
                          {selectedConvo.status === "OPEN" ? (
                            <Button size="sm" variant="outline" className="rounded-xl gap-1.5 text-xs font-bold h-8" onClick={handleHubResolve}>
                              <CheckCircle2 size={13} /> Mesajlaşmayı Sonlandır
                            </Button>
                          ) : (
                            <Button size="sm" variant="outline" className="rounded-xl gap-1.5 text-xs font-bold h-8" onClick={handleHubReopen}>
                              <RotateCcw size={13} /> Yeniden Aç
                            </Button>
                          )}
                          <Link href={`/inbox?conversationId=${selectedConvo.id}`}>
                            <Button size="sm" variant="ghost" className="rounded-xl gap-1.5 text-xs font-bold h-8 text-slate-500">
                              <ExternalLink size={13} /> Inbox
                            </Button>
                          </Link>
                        </div>
                      </div>

                      {/* Messages */}
                      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
                        {(() => {
                          const chatMessages = selectedConvo.messages.filter(m => !m.isInternalNote);
                          if (chatMessages.length === 0) {
                            return (
                              <div className="text-center py-16">
                                <MessageCircle size={36} className="mx-auto text-slate-300 mb-3" />
                                <p className="text-sm font-medium text-slate-500">Bu konuşmada henüz mesaj yok.</p>
                              </div>
                            );
                          }
                          let lastDate = "";
                          return chatMessages.map((msg) => {
                            const msgDate = new Date(msg.createdAt).toLocaleDateString("tr-TR", { day: "numeric", month: "long", year: "numeric" });
                            const showDateHeader = msgDate !== lastDate;
                            lastDate = msgDate;
                            const isAgent = msg.senderType === "agent";

                            return (
                              <div key={msg.id}>
                                {showDateHeader && (
                                  <div className="flex items-center gap-3 my-4">
                                    <div className="flex-1 h-px bg-slate-200" />
                                    <span className="text-[10px] font-bold text-slate-400 tracking-wider uppercase">{msgDate}</span>
                                    <div className="flex-1 h-px bg-slate-200" />
                                  </div>
                                )}
                                <div
                                  className={cn(
                                    "max-w-[80%] flex flex-col",
                                    isAgent ? "ml-auto items-end" : "mr-auto items-start"
                                  )}
                                >
                                  <div
                                    className={cn(
                                      "px-4 py-2.5 rounded-[1.1rem] shadow-sm text-[14px] leading-relaxed",
                                      isAgent
                                        ? "bg-primary text-white rounded-tr-sm"
                                        : "bg-white text-slate-800 border border-slate-100 rounded-tl-sm"
                                    )}
                                  >
                                    <p className="whitespace-pre-wrap font-medium">{msg.content}</p>
                                  </div>
                                  <span className="text-[10px] font-medium text-slate-400 mt-1 px-1">
                                    {msg.senderName || (isAgent ? "Siz" : "Müşteri")} •{" "}
                                    {format(new Date(msg.createdAt), "HH:mm", { locale: tr })}
                                  </span>
                                </div>
                              </div>
                            );
                          });
                        })()}
                        <div ref={messagesEndRef} />
                      </div>

                      {/* Composer */}
                      <div className="bg-white border-t px-4 py-3 shrink-0">
                        <div className="flex items-end gap-2">
                          <div className="flex-1 relative">
                            <Textarea
                              placeholder="Mesajınızı yazın..."
                              className="w-full min-h-[42px] max-h-[120px] resize-none text-sm font-medium rounded-xl pl-3 pr-3 py-2.5 border-slate-200"
                              rows={1}
                              value={hubMessageText}
                              onChange={(e) => setHubMessageText(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter" && !e.shiftKey) {
                                  e.preventDefault();
                                  handleHubSend();
                                }
                              }}
                            />
                          </div>
                          <Button
                            className="shrink-0 h-10 px-4 rounded-xl gap-1.5 font-bold text-sm shadow-sm transition-all bg-primary text-white"
                            disabled={!hubMessageText.trim() || hubSending}
                            onClick={handleHubSend}
                          >
                            {hubSending ? (
                              <RefreshCw size={15} className="animate-spin" />
                            ) : (
                              <><Send size={15} /> Gönder</>
                            )}
                          </Button>
                        </div>
                        <p className="text-[10px] font-medium text-slate-400 mt-1.5 text-center">
                          <span className="bg-slate-100 px-1.5 py-0.5 rounded text-slate-500 mr-1">Enter</span>
                          ile gönder,
                          <span className="bg-slate-100 px-1.5 py-0.5 rounded text-slate-500 mx-1">Shift+Enter</span>
                          ile alt satır
                        </p>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════ */}
          {/* ─── TAB 3: MAİLLER (Giden Kutusu) ─── */}
          {/* ══════════════════════════════════════════ */}
          {activeTab === "mails" && (
            <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
              {/* Mail Header */}
              <div className="px-6 py-4 border-b bg-gradient-to-r from-slate-50 to-white flex items-center justify-between">
                <h3 className="font-black text-base text-slate-900 flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Send size={16} className="text-primary" />
                  </div>
                  Gönderilen Mailler
                </h3>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs font-bold bg-slate-50">
                    {agency.mailLogs?.length || 0} mail
                  </Badge>
                  <Button
                    size="sm"
                    className="gap-2 rounded-xl text-xs font-bold bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white shadow-md"
                    onClick={() => {
                      const agencySectorIds = agency.sectors?.map((s: any) => s.id) || [];
                      setPitchSelectedSectorIds(agencySectorIds);
                      setPitchSubject(`KobiKolay: ${agency.companyName} İçin Faaliyet Alanı Tanıtımı`);
                      // Build merged email body
                      const selectedSectors = allSectors.filter((s: any) => agencySectorIds.includes(s.id));
                      const authorizedPerson = agency.authorizedPerson || 'Yetkili';
                      let body = `Sayın ${authorizedPerson},\n\nDeğerli iş ortağımız ${agency.companyName} için hazırladığımız faaliyet alanı çözümlerimizi bilgilerinize sunarız.\n`;
                      if (selectedSectors.length > 0) {
                        selectedSectors.forEach((s: any) => {
                          body += `\n━━━ ${s.name.toUpperCase()} ━━━\n`;
                          if (s.coverLetter) { body += `${s.coverLetter}\n`; }
                          if (s.references?.length > 0) {
                            body += `\nReferanslarımız:\n`;
                            s.references.forEach((r: any) => { body += `  • ${r.name} (${r.domain})\n`; });
                          }
                        });
                      }
                      body += `\nSaygılarımızla,\nKobiKolay Ekibi`;
                      setPitchBody(body);
                      setShowPitchDialog(true);
                    }}
                  >
                    <Mail size={14} /> Tanıtım E-postası Gönder
                  </Button>
                </div>
              </div>

              {agency.mailLogs?.length > 0 ? (
                <div className="divide-y divide-slate-100 max-h-[600px] overflow-y-auto">
                  {agency.mailLogs.map((log: any) => (
                    <div key={log.id} className="px-6 py-4 hover:bg-slate-50/80 transition-colors group">
                      <div className="flex items-start gap-4">
                        {/* Mail Status Icon */}
                        <div className={cn(
                          "w-10 h-10 rounded-full flex items-center justify-center shrink-0 shadow-sm",
                          log.status === "SENT" ? "bg-emerald-100" : log.status === "FAILED" ? "bg-red-100" : "bg-amber-100"
                        )}>
                          <Mail size={18} className={cn(
                            log.status === "SENT" ? "text-emerald-600" : log.status === "FAILED" ? "text-red-600" : "text-amber-600"
                          )} />
                        </div>

                        <div className="flex-1 min-w-0">
                          {/* Subject + Status */}
                          <div className="flex items-center justify-between gap-3">
                            <h4 className="text-sm font-bold text-slate-900 truncate">
                              {log.subject || "Konusuz"}
                            </h4>
                            <Badge variant="outline" className={cn(
                              "text-[10px] shrink-0 font-bold",
                              log.status === "SENT" ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
                              log.status === "FAILED" ? "bg-red-50 text-red-700 border-red-200" :
                              "bg-amber-50 text-amber-700 border-amber-200"
                            )}>
                              {log.status === "SENT" ? "✅ Gönderildi" : log.status === "FAILED" ? "❌ Başarısız" : log.status}
                            </Badge>
                          </div>

                          {/* Recipient */}
                          <p className="text-xs text-slate-500 mt-1 flex items-center gap-1.5">
                            <User size={11} className="text-slate-400" />
                            Alıcı: <span className="font-semibold">{contact?.email || "—"}</span>
                          </p>

                          {/* Date */}
                          {log.sentAt && (
                            <p className="text-xs text-slate-400 mt-1 flex items-center gap-1.5">
                              <Calendar size={11} />
                              {format(new Date(log.sentAt), "d MMMM yyyy • HH:mm", { locale: tr })}
                            </p>
                          )}

                          {/* Tracking Status for sent mails */}
                          {log.status === "SENT" && (
                            <div className="mt-3 space-y-2">
                              {log.clickedAt ? (
                                <div className="bg-violet-50 rounded-xl px-4 py-2.5 flex items-start gap-2.5">
                                  <ExternalLink size={14} className="text-violet-500 mt-0.5 shrink-0" />
                                  <div>
                                    <p className="text-[11px] text-violet-700 font-bold">
                                      🎯 Linke Tıklandı!
                                    </p>
                                    <p className="text-[10px] text-violet-500">
                                      {format(new Date(log.clickedAt), "d MMMM yyyy • HH:mm", { locale: tr })}
                                    </p>
                                  </div>
                                </div>
                              ) : log.openedAt ? (
                                <div className="bg-blue-50 rounded-xl px-4 py-2.5 flex items-start gap-2.5">
                                  <Eye size={14} className="text-blue-500 mt-0.5 shrink-0" />
                                  <div>
                                    <p className="text-[11px] text-blue-700 font-bold">
                                      📬 E-posta Açıldı
                                    </p>
                                    <p className="text-[10px] text-blue-500">
                                      {format(new Date(log.openedAt), "d MMMM yyyy • HH:mm", { locale: tr })}
                                    </p>
                                  </div>
                                </div>
                              ) : (
                                <div className="bg-slate-50 rounded-xl px-4 py-2.5 flex items-start gap-2.5">
                                  <Info size={14} className="text-slate-400 mt-0.5 shrink-0" />
                                  <p className="text-[11px] text-slate-500 leading-relaxed font-medium">
                                    Mail gönderildi. Alıcı e-postayı açtığında veya linke tıkladığında buradan takip edebilirsiniz.
                                  </p>
                                </div>
                              )}
                            </div>
                          )}

                          {/* Failed notice */}
                          {log.status === "FAILED" && (
                            <div className="mt-3 bg-red-50 rounded-xl px-4 py-2.5 flex items-start gap-2.5">
                              <AlertTriangle size={14} className="text-red-500 mt-0.5 shrink-0" />
                              <p className="text-[11px] text-red-700 leading-relaxed font-medium">
                                Bu mail gönderilemedi. Lütfen alıcı adresini kontrol edip tekrar deneyin.
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-20">
                  <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Mail size={28} className="text-slate-200" />
                  </div>
                  <p className="text-sm font-bold text-slate-500">Henüz mail gönderilmemiş</p>
                  <p className="text-xs text-slate-400 mt-1">Bu acenteye gönderilen mailler burada görünecek</p>
                </div>
              )}

              {/* Offers Section (if any) */}
              {agency.offers?.length > 0 && (
                <div className="border-t">
                  <div className="px-6 py-4 bg-gradient-to-r from-indigo-50/50 to-purple-50/50 flex items-center justify-between">
                    <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                      <FileText size={16} className="text-indigo-600" />
                      Gönderilen Teklifler
                    </h3>
                    <Badge variant="outline" className="text-xs font-bold bg-indigo-50 text-indigo-700 border-indigo-200">
                      {agency.offers.length} teklif
                    </Badge>
                  </div>
                  <div className="divide-y divide-slate-100 max-h-[300px] overflow-y-auto">
                    {agency.offers.map((offer: any) => (
                      <div key={offer.id} className="px-6 py-3 hover:bg-slate-50 transition-colors flex items-center gap-4">
                        <div className="w-9 h-9 rounded-full bg-indigo-100 flex items-center justify-center shrink-0">
                          <FileText size={16} className="text-indigo-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-slate-900 truncate">{offer.name || offer.title || `Teklif #${offer.id.slice(0, 6)}`}</p>
                          {offer.sentAt && (
                            <p className="text-xs text-slate-400 mt-0.5">
                              {format(new Date(offer.sentAt), "d MMM yyyy HH:mm", { locale: tr })}
                            </p>
                          )}
                        </div>
                        <Badge variant="outline" className="text-[10px] font-bold">
                          {offer.status || "Gönderildi"}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ══════════════════════════════════════════ */}
      {/* ─── DIALOGS ─── */}
      {/* ══════════════════════════════════════════ */}

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

      {/* ─── YENİ GÖRÜŞME BAŞLAT DİALOG ─── */}
      <Dialog open={showNewConvoDialog} onOpenChange={setShowNewConvoDialog}>
        <DialogContent className="sm:max-w-lg rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus size={18} /> Yeni Görüşme Başlat
            </DialogTitle>
            <DialogDescription>
              Bu acente ile yeni bir mesajlaşma oturumu oluşturun.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-5 py-3">
            {/* Channel Selection */}
            <div className="space-y-2">
              <Label className="text-sm font-bold text-slate-700">Kanal Seçin</Label>
              <div className="grid grid-cols-2 gap-2">
                {(["WHATSAPP", "INSTAGRAM", "MESSENGER"] as ChannelType[]).filter((ch) => {
                  if (ch === "WHATSAPP" && !activeIntegrations.whatsapp) return false;
                  if (ch === "INSTAGRAM" && !activeIntegrations.instagram) return false;
                  if (ch === "MESSENGER" && !activeIntegrations.messenger) return false;
                  return true;
                }).map((ch) => {
                  const cfg = channelConfig[ch];
                  const isSelected = newConvoChannel === ch;
                  const isInstagram = ch === "INSTAGRAM";
                  return (
                    <button
                      key={ch}
                      onClick={() => setNewConvoChannel(ch)}
                      className={cn(
                        "relative flex items-center gap-2.5 p-3.5 rounded-xl border-2 transition-all duration-200 text-left",
                        isSelected
                          ? `${cfg.bgLight} ${cfg.border} shadow-md ring-1 ring-offset-1`
                          : "bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50",
                        isInstagram && "opacity-80"
                      )}
                    >
                      <span className="text-xl">{cfg.icon}</span>
                      <div>
                        <p className={cn("text-sm font-bold", isSelected ? cfg.textColor : "text-slate-700")}>{cfg.label}</p>
                        {isInstagram && (
                          <p className="text-[10px] text-orange-600 font-semibold mt-0.5">⚠️ API Kısıtlı</p>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Instagram Warning */}
            {newConvoChannel === "INSTAGRAM" && (
              <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 flex gap-3">
                <AlertTriangle size={20} className="text-orange-500 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-bold text-orange-800 mb-1">Instagram API Kısıtlaması</p>
                  <p className="text-xs text-orange-700 leading-relaxed">
                    Instagram DM politikası gereği, yeni konuşma başlatamazsınız. Yalnızca müşterinin size önce mesaj göndermesi halinde yanıt verebilirsiniz.
                    Müşterinizin size Instagram üzerinden mesaj göndermesini bekleyin, ardından Gelen Kutusu&apos;ndan yanıtlayın.
                  </p>
                </div>
              </div>
            )}

            {/* Contact Info */}
            {newConvoChannel !== "INSTAGRAM" && (
              <>
                <div className="space-y-2">
                  <Label className="text-sm font-bold text-slate-700">Kişi Adı</Label>
                  <Input
                    value={newConvoName}
                    onChange={(e) => setNewConvoName(e.target.value)}
                    placeholder="İsim girin..."
                    className="rounded-xl"
                  />
                </div>
                {(newConvoChannel === "WHATSAPP" || newConvoChannel === "MESSENGER") && (
                  <div className="space-y-2">
                    <Label className="text-sm font-bold text-slate-700">
                      {newConvoChannel === "WHATSAPP" ? "Telefon Numarası" : "Messenger ID"}
                    </Label>
                    <Input
                      value={newConvoPhone}
                      onChange={(e) => setNewConvoPhone(e.target.value)}
                      placeholder={newConvoChannel === "WHATSAPP" ? "+90 5XX XXX XXXX" : "Facebook PSID"}
                      className="rounded-xl"
                    />
                  </div>
                )}
              </>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewConvoDialog(false)} className="rounded-xl">
              İptal
            </Button>
            <Button
              onClick={handleNewConversation}
              disabled={newConvoLoading || newConvoChannel === "INSTAGRAM"}
              className={cn(
                "gap-2 rounded-xl",
                newConvoChannel === "INSTAGRAM" && "opacity-50 cursor-not-allowed"
              )}
            >
              {newConvoLoading ? <RefreshCw className="animate-spin" size={16} /> : <Plus size={16} />}
              Başlat
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── TANITIM E-POSTASI GÖNDER DİALOG ─── */}
      <Dialog open={showPitchDialog} onOpenChange={setShowPitchDialog}>
        <DialogContent className="sm:max-w-2xl rounded-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white">
                <Mail size={18} />
              </div>
              Tanıtım E-postası Gönder
            </DialogTitle>
            <DialogDescription>
              {agency.companyName} acentesine faaliyet alanlarına göre tanıtım e-postası gönderin.
              PDF broşürler otomatik eklenir.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5 py-4">
            {/* Recipient Info */}
            <div className="bg-slate-50 rounded-xl px-4 py-3 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-400 to-purple-400 flex items-center justify-center text-white font-black text-lg">
                {agency.companyName?.charAt(0)?.toUpperCase() || "?"}
              </div>
              <div>
                <p className="text-sm font-bold text-slate-900">{agency.companyName}</p>
                <p className="text-xs text-slate-500">{contact?.email || "E-posta tanımlı değil"}</p>
              </div>
            </div>

            {/* Sector Selection */}
            <div className="space-y-2">
              <Label className="text-sm font-bold text-slate-700">Faaliyet Alanı Seçimi</Label>
              <p className="text-[11px] text-slate-400 mb-2">Hangi alanların tanıtımını göndermek istiyorsunuz? Seçim değiştikçe e-posta içeriği otomatik güncellenir.</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {allSectors.map((sector: any) => {
                  const isChecked = pitchSelectedSectorIds.includes(sector.id);
                  return (
                    <label
                      key={sector.id}
                      className={`flex items-center gap-3 border rounded-xl px-4 py-3 cursor-pointer transition-all ${
                        isChecked
                          ? "bg-indigo-50 border-indigo-300 ring-1 ring-indigo-200"
                          : "bg-white border-slate-200 hover:border-slate-300"
                      }`}
                    >
                      <Checkbox
                        checked={isChecked}
                        onCheckedChange={(checked) => {
                          const newIds = checked
                            ? [...pitchSelectedSectorIds, sector.id]
                            : pitchSelectedSectorIds.filter((id: string) => id !== sector.id);
                          setPitchSelectedSectorIds(newIds);
                          // Rebuild email body
                          const selectedSectors = allSectors.filter((s: any) => newIds.includes(s.id));
                          const authorizedPerson = agency.authorizedPerson || "Yetkili";
                          let body = `Sayın ${authorizedPerson},\n\nDeğerli iş ortağımız ${agency.companyName} için hazırladığımız faaliyet alanı çözümlerimizi bilgilerinize sunarız.\n`;
                          if (selectedSectors.length > 0) {
                            selectedSectors.forEach((s: any) => {
                              body += `\n━━━ ${s.name.toUpperCase()} ━━━\n`;
                              if (s.coverLetter) body += `${s.coverLetter}\n`;
                              if (s.references?.length > 0) {
                                body += `\nReferanslarımız:\n`;
                                s.references.forEach((r: any) => { body += `  • ${r.name} (${r.domain})\n`; });
                              }
                            });
                          }
                          body += `\nSaygılarımızla,\nKobiKolay Ekibi`;
                          setPitchBody(body);
                        }}
                      />
                      <div className="flex-1 min-w-0">
                        <span className="text-sm font-bold text-slate-800">{sector.name}</span>
                        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                          {sector.pdfUrl && (
                            <span className="text-[10px] text-emerald-600 font-semibold flex items-center gap-0.5">
                              <FileText size={10} /> PDF
                            </span>
                          )}
                          {sector.coverLetter && (
                            <span className="text-[10px] text-blue-600 font-semibold flex items-center gap-0.5">
                              <Mail size={10} /> Ön yazı
                            </span>
                          )}
                          {sector.references?.length > 0 && (
                            <span className="text-[10px] text-purple-600 font-semibold flex items-center gap-0.5">
                              <Star size={10} /> {sector.references.length} referans
                            </span>
                          )}
                        </div>
                      </div>
                    </label>
                  );
                })}
              </div>
              {allSectors.length === 0 && (
                <div className="text-center py-6 bg-amber-50 rounded-xl border border-amber-200">
                  <AlertTriangle size={20} className="mx-auto text-amber-500 mb-2" />
                  <p className="text-xs text-amber-700 font-bold">Henüz faaliyet alanı tanımlanmamış.</p>
                  <p className="text-[10px] text-amber-600 mt-1">Ayarlar → Faaliyet Alanları bölümünden oluşturun.</p>
                </div>
              )}
            </div>

            {/* PDF Attachments Indicator */}
            {pitchSelectedSectorIds.length > 0 && (() => {
              const attachedPdfs = allSectors.filter((s: any) => pitchSelectedSectorIds.includes(s.id) && s.pdfUrl);
              if (attachedPdfs.length === 0) return null;
              return (
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3">
                  <p className="text-xs font-bold text-emerald-700 mb-1.5 flex items-center gap-1.5">
                    <FileText size={13} /> Otomatik Eklenecek PDF Broşürler
                  </p>
                  <div className="space-y-1">
                    {attachedPdfs.map((s: any) => (
                      <div key={s.id} className="flex items-center gap-2 text-xs text-emerald-800">
                        <FileText size={11} className="text-emerald-500" />
                        <span className="font-medium">{s.name} - Broşür</span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}

            {/* Email Subject */}
            <div className="space-y-2">
              <Label className="text-sm font-bold text-slate-700">E-posta Konusu</Label>
              <Input
                value={pitchSubject}
                onChange={(e) => setPitchSubject(e.target.value)}
                placeholder="E-posta konusu..."
                className="rounded-xl"
              />
            </div>

            {/* Email Body */}
            <div className="space-y-2">
              <Label className="text-sm font-bold text-slate-700">E-posta İçeriği (düzenlenebilir)</Label>
              <Textarea
                value={pitchBody}
                onChange={(e) => setPitchBody(e.target.value)}
                className="rounded-xl min-h-[240px] font-mono text-sm"
              />
              <p className="text-[10px] text-slate-400">
                Faaliyet alanı seçiminize göre ön yazılar, referanslar otomatik birleştirilmiştir. Göndermeden önce dilediğiniz gibi düzenleyebilirsiniz.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPitchDialog(false)} disabled={pitchSending} className="rounded-xl">
              İptal
            </Button>
            <Button
              onClick={async () => {
                if (pitchSelectedSectorIds.length === 0) {
                  toast.error("En az bir faaliyet alanı seçmelisiniz");
                  return;
                }
                if (!contact?.email) {
                  toast.error("Bu acentenin e-posta adresi tanımlı değil");
                  return;
                }
                setPitchSending(true);
                try {
                  await sendAgencyPitchAction({
                    agencyId: agency.id,
                    sectorIds: pitchSelectedSectorIds,
                  });
                  toast.success("Tanıtım e-postası başarıyla gönderildi! 🚀");
                  setShowPitchDialog(false);
                  window.location.reload();
                } catch (err: any) {
                  toast.error(err.message || "E-posta gönderilemedi");
                }
                setPitchSending(false);
              }}
              disabled={pitchSending || pitchSelectedSectorIds.length === 0 || !contact?.email}
              className="gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white shadow-md"
            >
              {pitchSending ? (
                <RefreshCw size={16} className="animate-spin" />
              ) : (
                <Send size={16} />
              )}
              Tanıtımı Gönder
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
