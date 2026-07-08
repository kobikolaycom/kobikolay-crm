"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import Link from "next/link";
import {
  Search, Inbox, MessageCircle, CheckCircle2, Send, Paperclip, Zap,
  UserPlus, MoreVertical, ChevronDown, Save, Clock,
  StickyNote, ExternalLink, RefreshCw, Users, Mail,
  X, Building2, UserCheck, Plus, Trash2, Settings, ArrowLeft
} from "lucide-react";
import {
  getConversationsAction, getConversationByIdAction, addMessageAction,
  resolveConversationAction, searchAgenciesForLinkAction, linkAgencyAction,
  getActiveUsersAction, assignConversationAction, sendDirectEmailAction,
  getSectorsAction, getAgencyConversationNotesAction,
  getQuickRepliesAction, saveQuickReplyAction, deleteQuickReplyAction, QuickReply
} from "./actions";
import { useSearchParams } from "next/navigation";

type ChannelType = "WHATSAPP" | "INSTAGRAM" | "MESSENGER" | "MANUAL_NOTE";
type FilterType = "unread" | "resolved";

const channelConfig: Record<ChannelType, { label: string; icon: string; color: string; badge: string }> = {
  WHATSAPP:    { label: "WhatsApp", icon: "🟢", color: "text-green-600 bg-green-50", badge: "bg-green-100 text-green-700 border-green-200" },
  INSTAGRAM:   { label: "Instagram", icon: "🟣", color: "text-purple-600 bg-purple-50", badge: "bg-purple-100 text-purple-700 border-purple-200" },
  MESSENGER:   { label: "Messenger", icon: "🔵", color: "text-blue-600 bg-blue-50", badge: "bg-blue-100 text-blue-700 border-blue-200" },
  MANUAL_NOTE: { label: "Not", icon: "📝", color: "text-amber-600 bg-amber-50", badge: "bg-amber-100 text-amber-700 border-amber-200" },
};

interface Conversation {
  id: string;
  channelType: ChannelType;
  status: string;
  contactName: string | null;
  contactPhone: string | null;
  agencyId: string | null;
  agency: { companyName: string } | null;
  assignedUser: { id: string; name: string | null } | null;
  messages: Message[];
  updatedAt: string | Date;
  createdAt: string | Date;
}

interface Message {
  id: string;
  content: string;
  senderType: string;
  senderName: string | null;
  isInternalNote: boolean;
  createdAt: string | Date;
}

interface AgencyResult {
  id: string;
  companyName: string;
  documentNo: string;
}

interface UserResult {
  id: string;
  name: string | null;
  role: { name: string };
}

export function InboxClient({ initialConversations }: { initialConversations: Conversation[] }) {
  const searchParams = useSearchParams();
  const [conversations, setConversations] = useState<Conversation[]>(initialConversations);
  const [selectedId, setSelectedId] = useState<string | null>(searchParams.get("conversationId"));
  const [selectedConvo, setSelectedConvo] = useState<Conversation | null>(null);
  const [messageText, setMessageText] = useState("");
  const [sending, setSending] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filter, setFilter] = useState<FilterType>("unread");
  const [activeChannel, setActiveChannel] = useState<ChannelType | "ALL">("ALL");
  const [isManual, setIsManual] = useState(false);
  const [loading, setLoading] = useState(false);

  // ─── Unread Tracking (Local Session) ───
  const [readConvos, setReadConvos] = useState<Set<string>>(new Set());

  // ─── Quick Replies State ───
  const [quickReplies, setQuickReplies] = useState<QuickReply[]>([]);
  const [showQuickReplies, setShowQuickReplies] = useState(false);
  const [manageQuickReplies, setManageQuickReplies] = useState(false);
  const [newQrLabel, setNewQrLabel] = useState("");
  const [newQrValue, setNewQrValue] = useState("");
  const [savingQr, setSavingQr] = useState(false);

  // ─── Agency Linking State ───
  const [showLinkPanel, setShowLinkPanel] = useState(false);
  const [agencySearchTerm, setAgencySearchTerm] = useState("");
  const [agencyResults, setAgencyResults] = useState<AgencyResult[]>([]);
  const [loadingAgencies, setLoadingAgencies] = useState(false);
  const [linkingAgencyId, setLinkingAgencyId] = useState<string | null>(null);
  const linkPanelRef = useRef<HTMLDivElement>(null);

  // ─── User Assignment State ───
  const [showAssignPanel, setShowAssignPanel] = useState(false);
  const [activeUsers, setActiveUsers] = useState<UserResult[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const assignPanelRef = useRef<HTMLDivElement>(null);

  // Mesaj alanını otomatik en alta kaydır
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // ─── Fetch Initial Settings ───
  useEffect(() => {
    getQuickRepliesAction().then(setQuickReplies).catch(() => {});
  }, []);

  // ─── Auto-scroll to bottom when messages change ───
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [selectedConvo?.messages]);

  // ─── Click outside to close panels ───
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (linkPanelRef.current && !linkPanelRef.current.contains(e.target as Node)) {
        setShowLinkPanel(false);
      }
      if (assignPanelRef.current && !assignPanelRef.current.contains(e.target as Node)) {
        setShowAssignPanel(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // ─── Fetch conversations ───
  const refreshConversations = useCallback(async () => {
    try {
      const data = await getConversationsAction();
      setConversations(data);
    } catch (e) {
      console.error("Failed to refresh conversations", e);
    }
  }, []);

  // ─── Auto-refresh: Poll every 10 seconds ───
  useEffect(() => {
    const interval = setInterval(async () => {
      await refreshConversations();
      if (selectedId) {
        try {
          const updated = await getConversationByIdAction(selectedId);
          setSelectedConvo(updated);
        } catch {}
      }
    }, 10000);
    return () => clearInterval(interval);
  }, [refreshConversations, selectedId]);

  // ─── Select and Load Conversation ───
  const handleSelectConvo = (id: string) => {
    setSelectedId(id);
    setReadConvos((prev) => {
      const newSet = new Set(prev);
      newSet.add(id);
      return newSet;
    });
  };

  useEffect(() => {
    if (!selectedId) {
      setSelectedConvo(null);
      return;
    }
    setLoading(true);
    setShowLinkPanel(false);
    setShowAssignPanel(false);
    getConversationByIdAction(selectedId)
      .then((data) => {
        setSelectedConvo(data);
        setLoading(false);
      })
      .catch(() => {
        toast.error("Konuşma yüklenemedi");
        setLoading(false);
      });
  }, [selectedId]);

  // ─── Send message ───
  const handleSend = async () => {
    if (!messageText.trim() || !selectedId) return;
    setSending(true);
    try {
      const res = await addMessageAction(selectedId, messageText, isManual ? "agent" : "agent", isManual);
      if (res && !res.success) {
        toast.error(res.error || "Gönderilemedi");
        return;
      }
      setMessageText("");
      const updated = await getConversationByIdAction(selectedId);
      setSelectedConvo(updated);
      await refreshConversations();
      toast.success(isManual ? "Not kaydedildi" : "Mesaj gönderildi");
    } catch (e: any) {
      toast.error(e?.message || "Gönderilemedi");
    } finally {
      setSending(false);
    }
  };

  // ─── Resolve conversation ───
  const handleResolve = async () => {
    if (!selectedId) return;
    try {
      await resolveConversationAction(selectedId);
      toast.success("Mesajlaşma sonlandırıldı");
      await refreshConversations();
      setSelectedId(null);
    } catch (e) {
      toast.error("İşlem başarısız");
    }
  };

  // ─── Quick Replies Actions ───
  const handleAddQuickReply = async () => {
    if (!newQrLabel.trim() || !newQrValue.trim()) return;
    setSavingQr(true);
    try {
      const updated = await saveQuickReplyAction({ label: newQrLabel, value: newQrValue });
      setQuickReplies(updated);
      setNewQrLabel("");
      setNewQrValue("");
      toast.success("Hızlı yanıt eklendi");
    } catch {
      toast.error("Eklenemedi");
    } finally {
      setSavingQr(false);
    }
  };

  const handleDeleteQuickReply = async (id: string) => {
    try {
      const updated = await deleteQuickReplyAction(id);
      setQuickReplies(updated);
      toast.success("Silindi");
    } catch {
      toast.error("Silinemedi");
    }
  };

  // ─── Agency Search & Link ───
  const handleAgencySearch = useCallback(async (term: string) => {
    setAgencySearchTerm(term);
    if (term.trim().length < 2) {
      setAgencyResults([]);
      return;
    }
    setLoadingAgencies(true);
    try {
      const results = await searchAgenciesForLinkAction(term);
      setAgencyResults(results);
    } catch {
      setAgencyResults([]);
    } finally {
      setLoadingAgencies(false);
    }
  }, []);

  const handleLinkAgency = async (agencyId: string) => {
    if (!selectedId) return;
    setLinkingAgencyId(agencyId);
    try {
      await linkAgencyAction(selectedId, agencyId);
      toast.success("Konuşma işletmeye bağlandı");
      const updated = await getConversationByIdAction(selectedId);
      setSelectedConvo(updated);
      await refreshConversations();
      setShowLinkPanel(false);
      setAgencySearchTerm("");
      setAgencyResults([]);
    } catch (e) {
      toast.error("Bağlama başarısız");
    } finally {
      setLinkingAgencyId(null);
    }
  };

  // ─── User Assignment ───
  const handleOpenAssignPanel = async () => {
    if (showAssignPanel) {
      setShowAssignPanel(false);
      return;
    }
    setShowAssignPanel(true);
    setLoadingUsers(true);
    try {
      const users = await getActiveUsersAction();
      setActiveUsers(users);
    } catch {
      toast.error("Kullanıcı listesi yüklenemedi");
    } finally {
      setLoadingUsers(false);
    }
  };

  const handleAssignUser = async (userId: string) => {
    if (!selectedId) return;
    try {
      await assignConversationAction(selectedId, userId);
      toast.success("Konuşma personele atandı");
      const updated = await getConversationByIdAction(selectedId);
      setSelectedConvo(updated);
      await refreshConversations();
      setShowAssignPanel(false);
    } catch (e) {
      toast.error("Atama başarısız");
    }
  };

  // ─── Filter conversations ───
  const filteredConversations = conversations.filter((c) => {
    if (c.channelType === "MANUAL_NOTE") return false;
    if (activeChannel !== "ALL" && c.channelType !== activeChannel) return false;
    if (filter === "resolved" && c.status !== "RESOLVED") return false;
    if (filter === "unread" && c.status === "RESOLVED") return false;
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      const matchName = c.contactName?.toLowerCase().includes(term);
      const matchAgency = c.agency?.companyName?.toLowerCase().includes(term);
      const matchPhone = c.contactPhone?.includes(term);
      if (!matchName && !matchAgency && !matchPhone) return false;
    }
    return true;
  });

  const getUnreadCount = (ch: ChannelType) => {
    return conversations.filter((c) => c.channelType === ch && c.status === "OPEN" && !readConvos.has(c.id)).length;
  };

  const formatTime = (dateInput: string | Date) => {
    const d = new Date(dateInput);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 1) return "Az önce";
    if (diffMin < 60) return `${diffMin}dk`;
    const diffH = Math.floor(diffMin / 60);
    if (diffH < 24) return `${diffH}sa`;
    return d.toLocaleDateString("tr-TR");
  };

  // Mobile back handler
  const handleMobileBack = () => {
    setSelectedId(null);
    setSelectedConvo(null);
  };

  return (
    <div className="flex h-[calc(100dvh-3.5rem)] md:h-[calc(100vh-6rem)] bg-white md:rounded-[2rem] md:border md:shadow-sm overflow-hidden">
      {/* Left Sidebar - Conversation List (hidden on mobile when chat is open) */}
      <div className={cn(
        "w-full md:w-80 lg:w-[400px] md:border-r flex flex-col shrink-0 bg-slate-50/50",
        selectedId ? "hidden md:flex" : "flex"
      )}>
        
        {/* Apple-style Top Header */}
        <div className="p-5 pb-3">
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 mb-4">Gelen Kutusu</h2>
          
          <div className="relative mb-4">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <Input
              placeholder="Ara (İsim, Telefon, İşletme)..."
              className="pl-10 h-10 rounded-2xl bg-white border-slate-200 shadow-sm focus-visible:ring-primary/20"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {/* Channel Filters (Apple-like pills) */}
          <div className="flex flex-wrap gap-2 pb-2">
            <button
              onClick={() => setActiveChannel("ALL")}
              className={cn(
                "px-4 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all duration-200",
                activeChannel === "ALL" 
                  ? "bg-slate-800 text-white shadow-md" 
                  : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-100"
              )}
            >
              Tümü
            </button>
            {(["WHATSAPP", "INSTAGRAM", "MESSENGER"] as ChannelType[]).map((ch) => {
              const unreadCount = getUnreadCount(ch);
              return (
                <button
                  key={ch}
                  onClick={() => setActiveChannel(ch)}
                  className={cn(
                    "px-4 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap transition-all duration-200",
                    activeChannel === ch 
                      ? "bg-slate-800 text-white shadow-md" 
                      : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-100"
                  )}
                >
                  <span>{channelConfig[ch].icon}</span> {channelConfig[ch].label}
                  {unreadCount > 0 && (
                    <span className={cn(
                      "ml-1 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[9px] font-bold",
                      activeChannel === ch ? "bg-white text-slate-900" : "bg-primary text-white"
                    )}>
                      {unreadCount}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          <div className="flex gap-1 mt-3 p-1 bg-slate-200/50 rounded-xl">
            {(["unread", "resolved"] as FilterType[]).map((f) => (
              <button
                key={f}
                className={cn(
                  "flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all",
                  filter === f ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
                )}
                onClick={() => setFilter(f)}
              >
                {f === "unread" ? "Aktif Görüşmeler" : "Tamamlanan Görüşmeler"}
              </button>
            ))}
          </div>
        </div>

        {/* Conversation List */}
        <div className="flex-1 overflow-y-auto px-3 pb-4">
          {filteredConversations.length === 0 ? (
            <div className="text-center py-20">
              <Inbox size={40} className="mx-auto text-slate-300 mb-4" />
              <p className="text-sm font-medium text-slate-500">Konuşma bulunamadı</p>
            </div>
          ) : (
            <div className="space-y-1.5">
              {filteredConversations.map((c) => {
                const ch = channelConfig[c.channelType] || channelConfig.MANUAL_NOTE;
                const lastMsg = c.messages?.[0]?.content || "Mesaj yok";
                const isActive = selectedId === c.id;
                const isUnread = c.status === "OPEN" && !readConvos.has(c.id);
                
                return (
                  <button
                    key={c.id}
                    onClick={() => handleSelectConvo(c.id)}
                    className={cn(
                      "w-full text-left p-3.5 rounded-2xl transition-all duration-200 border relative",
                      isActive 
                        ? "bg-white border-primary/20 shadow-[0_2px_12px_-4px_rgba(0,0,0,0.1)] ring-1 ring-primary/10" 
                        : "bg-transparent border-transparent hover:bg-white hover:border-slate-200 hover:shadow-sm"
                    )}
                  >
                    {isUnread && (
                      <span className="absolute top-3 right-3 w-2 h-2 rounded-full bg-primary animate-pulse" />
                    )}
                    <div className="flex items-start gap-3">
                      <div className="relative">
                        <div className={cn(
                          "w-12 h-12 rounded-full flex items-center justify-center text-lg shadow-inner",
                          ch.color
                        )}>
                          {(c.contactName || c.agency?.companyName || "?").charAt(0).toUpperCase()}
                        </div>
                        <div className="absolute -bottom-1 -right-1 text-sm bg-white rounded-full p-0.5 shadow-sm">
                          {ch.icon}
                        </div>
                      </div>
                      <div className="flex-1 min-w-0 pt-0.5">
                        <div className="flex items-center justify-between mb-0.5">
                          <p className={cn("text-sm font-semibold truncate", isActive ? "text-primary" : "text-slate-900")}>
                            {c.contactName || c.agency?.companyName || "Bilinmeyen"}
                          </p>
                          <span className="text-[10px] font-medium text-slate-400 shrink-0 ml-2">
                            {formatTime(c.updatedAt)}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 truncate">{lastMsg}</p>
                        
                        <div className="flex flex-wrap gap-1 mt-2">
                          {c.agency && (
                            <Badge variant="outline" className="text-[9px] px-1.5 py-0 bg-sky-50 text-sky-700 border-sky-200 font-semibold rounded-md">
                              {c.agency.companyName}
                            </Badge>
                          )}
                          {c.status === "RESOLVED" && (
                            <Badge variant="outline" className="text-[9px] px-1.5 py-0 bg-emerald-50 text-emerald-700 border-emerald-200 font-semibold rounded-md">
                              Sonlandırıldı
                            </Badge>
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

      {/* Right - Chat Detail (full screen on mobile when selected) */}
      <div className={cn(
        "flex-1 flex flex-col bg-slate-50 relative",
        selectedId ? "flex" : "hidden md:flex"
      )}>
        {!selectedConvo ? (
          <div className="flex-1 flex items-center justify-center text-center">
            <div className="max-w-xs">
              <div className="w-24 h-24 bg-primary/5 rounded-full flex items-center justify-center mx-auto mb-6">
                <MessageCircle size={40} className="text-primary/40" />
              </div>
              <h3 className="text-xl font-bold text-slate-900">Sohbet Seçin</h3>
              <p className="text-sm text-slate-500 mt-2">Gelen kutusundaki mesajları yanıtlamak için sol panelden bir konuşma seçin.</p>
            </div>
          </div>
        ) : (
          <>
            {/* Apple/Google Style Header */}
            <div className="px-3 md:px-6 py-3 md:py-4 bg-white border-b sticky top-0 z-10 flex flex-col gap-2 md:gap-3 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 md:gap-4 min-w-0">
                  {/* Mobile back button */}
                  <button
                    onClick={handleMobileBack}
                    className="md:hidden shrink-0 -ml-1 p-1.5 rounded-xl text-primary hover:bg-primary/10 transition-colors"
                  >
                    <ArrowLeft size={22} />
                  </button>
                  <div className="relative shrink-0">
                    <div className={cn(
                      "w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center text-base md:text-lg font-bold shadow-inner",
                      channelConfig[selectedConvo.channelType]?.color || "bg-slate-100 text-slate-600"
                    )}>
                      {(selectedConvo.contactName || selectedConvo.agency?.companyName || "?").charAt(0).toUpperCase()}
                    </div>
                    <div className="absolute -bottom-1 -right-1 text-xs md:text-sm bg-white rounded-full p-0.5 shadow-sm">
                      {channelConfig[selectedConvo.channelType]?.icon}
                    </div>
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-sm md:text-lg font-bold text-slate-900 leading-tight truncate">
                      {selectedConvo.contactName || selectedConvo.agency?.companyName || "Bilinmeyen"}
                    </h3>
                    <p className="text-[10px] md:text-xs font-medium text-slate-500 mt-0.5 truncate">
                      {selectedConvo.contactPhone || "Telefon bilgisi yok"} • {channelConfig[selectedConvo.channelType]?.label}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center gap-1.5 md:gap-2 shrink-0 mr-16 md:mr-20">
                  {selectedConvo.status !== "RESOLVED" && (
                    <Button size="sm" className="rounded-xl gap-1 md:gap-1.5 text-[10px] md:text-xs font-semibold bg-slate-900 text-white hover:bg-slate-800 px-2 md:px-3 h-8" onClick={handleResolve}>
                      <CheckCircle2 size={14} />
                      <span className="hidden sm:inline">Mesajlaşmayı Sonlandır</span>
                      <span className="sm:hidden">Bitir</span>
                    </Button>
                  )}
                </div>
              </div>

              {/* ─── Agency Link & User Assign Bar ─── */}
              <div className="flex items-center gap-2 md:gap-3 pt-2 md:pt-3 border-t border-slate-100 flex-wrap">
                {/* Agency Link Section */}
                <div className="relative" ref={linkPanelRef}>
                  {selectedConvo.agency ? (
                    <Link
                      href={`/agents/${selectedConvo.agencyId}`}
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-sky-700 bg-sky-50 hover:bg-sky-100 px-3 py-1.5 rounded-lg transition-colors"
                    >
                      <Building2 size={14} />
                      {selectedConvo.agency.companyName}
                      <ExternalLink size={10} />
                    </Link>
                  ) : (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="rounded-lg gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 hover:bg-slate-100"
                      onClick={() => { setShowLinkPanel(!showLinkPanel); setShowAssignPanel(false); }}
                    >
                      <Building2 size={14} /> İşletmeye Bağla
                    </Button>
                  )}

                  {/* Agency Search Dropdown */}
                  {showLinkPanel && (
                    <div className="absolute top-full left-0 mt-2 w-80 bg-white border rounded-2xl shadow-xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                      <div className="p-3 border-b bg-slate-50">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-bold text-slate-700">İşletme Ara & Bağla</span>
                          <button onClick={() => setShowLinkPanel(false)} className="text-slate-400 hover:text-slate-900 bg-white rounded-full p-1 shadow-sm">
                            <X size={12} />
                          </button>
                        </div>
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                          <Input
                            placeholder="Firma adı veya belge no..."
                            className="pl-9 h-9 text-sm rounded-xl border-slate-200"
                            value={agencySearchTerm}
                            onChange={(e) => handleAgencySearch(e.target.value)}
                            autoFocus
                          />
                        </div>
                      </div>
                      <div className="max-h-48 overflow-y-auto">
                        {loadingAgencies ? (
                          <div className="px-4 py-6 text-center">
                            <RefreshCw className="animate-spin mx-auto text-slate-400 mb-2" size={18} />
                          </div>
                        ) : agencyResults.length === 0 ? (
                          <div className="px-4 py-6 text-center text-xs text-slate-500 font-medium">
                            {agencySearchTerm.length < 2 ? "En az 2 karakter yazın" : "Sonuç bulunamadı"}
                          </div>
                        ) : (
                          agencyResults.map((ag) => (
                            <button
                              key={ag.id}
                              disabled={linkingAgencyId === ag.id}
                              onClick={() => handleLinkAgency(ag.id)}
                              className="w-full text-left px-4 py-3 hover:bg-slate-50 transition-colors flex items-center justify-between group border-b last:border-b-0"
                            >
                              <div>
                                <p className="text-sm font-bold text-slate-700 group-hover:text-primary transition-colors">{ag.companyName}</p>
                                <p className="text-[10px] font-medium text-slate-500">Belge: {ag.documentNo}</p>
                              </div>
                              {linkingAgencyId === ag.id ? (
                                <RefreshCw className="animate-spin text-primary" size={14} />
                              ) : (
                                <span className="text-[10px] font-bold text-primary opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                                  Bağla →
                                </span>
                              )}
                            </button>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </div>

                <div className="w-px h-4 bg-slate-200" />

                {/* User Assignment Section */}
                <div className="relative" ref={assignPanelRef}>
                  {selectedConvo.assignedUser ? (
                    <button
                      onClick={handleOpenAssignPanel}
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-lg transition-colors"
                    >
                      <UserCheck size={14} />
                      {selectedConvo.assignedUser.name}
                      <ChevronDown size={10} />
                    </button>
                  ) : (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="rounded-lg gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 hover:bg-slate-100"
                      onClick={handleOpenAssignPanel}
                    >
                      <UserPlus size={14} /> Personele Ata
                    </Button>
                  )}

                  {/* User Assignment Dropdown */}
                  {showAssignPanel && (
                    <div className="absolute top-full left-0 mt-2 w-64 bg-white border rounded-2xl shadow-xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                      <div className="px-4 py-3 border-b bg-slate-50 flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-700">Personele Ata</span>
                        <button onClick={() => setShowAssignPanel(false)} className="text-slate-400 hover:text-slate-900 bg-white rounded-full p-1 shadow-sm">
                          <X size={12} />
                        </button>
                      </div>
                      <div className="max-h-48 overflow-y-auto">
                        {loadingUsers ? (
                          <div className="px-4 py-6 text-center">
                            <RefreshCw className="animate-spin mx-auto text-slate-400 mb-2" size={18} />
                          </div>
                        ) : activeUsers.length === 0 ? (
                          <div className="px-4 py-6 text-center text-xs text-slate-500 font-medium">Aktif personel bulunamadı</div>
                        ) : (
                          activeUsers.map((user) => {
                            const isAssigned = selectedConvo.assignedUser?.id === user.id;
                            return (
                              <button
                                key={user.id}
                                onClick={() => handleAssignUser(user.id)}
                                className={cn(
                                  "w-full text-left px-4 py-3 hover:bg-slate-50 transition-colors flex items-center justify-between group border-b last:border-b-0",
                                  isAssigned && "bg-emerald-50 hover:bg-emerald-50"
                                )}
                              >
                                <div className="flex items-center gap-2.5">
                                  <div className={cn(
                                    "w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shadow-inner",
                                    isAssigned ? "bg-emerald-200 text-emerald-800" : "bg-slate-200 text-slate-700"
                                  )}>
                                    {(user.name || "?").charAt(0).toUpperCase()}
                                  </div>
                                  <div>
                                    <p className="text-sm font-bold text-slate-700">{user.name || "İsimsiz"}</p>
                                    <p className="text-[10px] font-medium text-slate-500">{user.role.name}</p>
                                  </div>
                                </div>
                              </button>
                            );
                          })
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-3 md:p-6 space-y-4 md:space-y-6">
              {loading ? (
                <div className="text-center py-20">
                  <RefreshCw className="animate-spin mx-auto text-slate-400" size={32} />
                </div>
              ) : selectedConvo.messages.length === 0 ? (
                <div className="text-center py-20">
                  <MessageCircle size={40} className="mx-auto text-slate-300 mb-4" />
                  <p className="text-sm font-medium text-slate-500">Bu konuşmada henüz mesaj yok.</p>
                </div>
              ) : (
                [...selectedConvo.messages].reverse().map((msg) => {
                  const isAgent = msg.senderType === "agent";
                  return (
                    <div
                      key={msg.id}
                      className={cn(
                        "max-w-[80%] flex flex-col",
                        msg.isInternalNote ? "mx-auto max-w-full items-center" : (isAgent ? "ml-auto items-end" : "mr-auto items-start")
                      )}
                    >
                      <div
                        className={cn(
                          "px-5 py-3 rounded-[1.25rem] shadow-sm text-[15px] leading-relaxed",
                          msg.isInternalNote
                            ? "bg-amber-100 text-amber-900 border border-amber-200 rounded-xl"
                            : isAgent
                            ? "bg-primary text-white rounded-tr-sm"
                            : "bg-white text-slate-800 border border-slate-100 rounded-tl-sm"
                        )}
                      >
                        {msg.isInternalNote && (
                          <div className="flex items-center gap-1.5 text-[10px] font-black tracking-widest text-amber-700 mb-1.5 uppercase">
                            <StickyNote size={12} /> Dahili Not
                          </div>
                        )}
                        <p className="whitespace-pre-wrap font-medium">{msg.content}</p>
                      </div>
                      <span
                        className={cn(
                          "text-[11px] font-medium mt-1.5 px-1",
                          msg.isInternalNote ? "text-amber-600/70" : "text-slate-400"
                        )}
                      >
                        {msg.senderName || (isAgent ? "Siz" : "Müşteri")} • {formatTime(msg.createdAt)}
                      </span>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input & Quick Replies */}
            {selectedConvo.status !== "RESOLVED" && (
              <div className="bg-white border-t p-4 relative">
                
                {/* Quick Replies Popup Overlay */}
                {showQuickReplies && !isManual && (
                  <div className="absolute bottom-full left-0 w-full p-4 pb-2 animate-in slide-in-from-bottom-2 fade-in duration-200">
                    <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-4 max-h-72 overflow-y-auto">
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="font-bold text-slate-800 flex items-center gap-2"><Zap size={16} className="text-amber-500" /> Hızlı Yanıtlar</h4>
                        <Button variant="ghost" size="sm" className="h-8 rounded-lg text-xs font-semibold" onClick={() => setManageQuickReplies(!manageQuickReplies)}>
                          <Settings size={14} className="mr-1.5" /> Yönet
                        </Button>
                      </div>

                      {manageQuickReplies ? (
                        <div className="space-y-4 animate-in fade-in">
                          <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 space-y-2">
                            <Input placeholder="Başlık (örn: Selamlaşma)" className="h-8 text-xs bg-white rounded-lg" value={newQrLabel} onChange={(e) => setNewQrLabel(e.target.value)} />
                            <Textarea placeholder="Mesaj içeriği..." className="h-16 text-xs resize-none bg-white rounded-lg" value={newQrValue} onChange={(e) => setNewQrValue(e.target.value)} />
                            <Button size="sm" className="w-full h-8 text-xs rounded-lg font-bold" onClick={handleAddQuickReply} disabled={savingQr}>
                              <Plus size={14} className="mr-1" /> Yeni Ekle
                            </Button>
                          </div>
                          <div className="space-y-2 mt-4">
                            {quickReplies.map((qr) => (
                              <div key={qr.id} className="flex items-center justify-between bg-white border rounded-xl p-2.5">
                                <div>
                                  <p className="text-xs font-bold text-slate-700">{qr.label}</p>
                                  <p className="text-[10px] text-slate-500 line-clamp-1">{qr.value}</p>
                                </div>
                                <Button variant="ghost" size="icon" className="h-6 w-6 text-red-500 hover:bg-red-50" onClick={() => handleDeleteQuickReply(qr.id)}>
                                  <Trash2 size={12} />
                                </Button>
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-wrap gap-2">
                          {quickReplies.map((qr) => (
                            <button
                              key={qr.id}
                              onClick={() => { setMessageText(qr.value); setShowQuickReplies(false); }}
                              className="text-left px-4 py-2.5 rounded-xl text-sm font-semibold text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 transition-colors shadow-sm"
                            >
                              {qr.label}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <div className="flex items-end gap-2 md:gap-3 max-w-5xl mx-auto">
                  {!isManual && (
                    <Button
                      variant={showQuickReplies ? "default" : "secondary"}
                      size="icon"
                      className="shrink-0 h-10 w-10 md:h-12 md:w-12 rounded-2xl shadow-sm transition-colors"
                      onClick={() => { setShowQuickReplies(!showQuickReplies); setManageQuickReplies(false); }}
                    >
                      <Zap size={20} className={showQuickReplies ? "text-white" : "text-amber-500"} />
                    </Button>
                  )}
                  
                  <div className="flex-1 relative">
                    <Textarea
                      placeholder={isManual ? "Özel bir not girin..." : "Mesajınızı buraya yazın..."}
                      className={cn(
                        "w-full min-h-[48px] max-h-[160px] resize-none text-[15px] font-medium rounded-2xl pl-4 pr-12 py-3.5 shadow-sm border-slate-200 focus-visible:ring-primary/20",
                        isManual && "bg-amber-50 border-amber-200 placeholder:text-amber-700/50"
                      )}
                      rows={1}
                      value={messageText}
                      onChange={(e) => setMessageText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          handleSend();
                        }
                      }}
                    />
                    <Button variant="ghost" size="icon" className="absolute right-2 top-2 h-8 w-8 text-slate-400 rounded-xl hover:bg-slate-100" disabled title="Yakında">
                      <Paperclip size={18} />
                    </Button>
                  </div>

                  <Button
                    className={cn(
                      "shrink-0 h-10 md:h-12 px-4 md:px-6 rounded-2xl gap-1.5 md:gap-2 font-bold shadow-md transition-all text-sm md:text-base",
                      isManual ? "bg-amber-500 hover:bg-amber-600 text-white" : "bg-primary text-white"
                    )}
                    disabled={!messageText.trim() || sending}
                    onClick={handleSend}
                  >
                    {isManual ? <><Save size={18} /> Kaydet</> : <><Send size={18} /> Gönder</>}
                  </Button>
                </div>
                
                <p className="hidden md:flex text-[10px] font-medium text-slate-400 mt-2 px-1 text-center items-center justify-center gap-1.5">
                  <span className="bg-slate-100 px-1.5 py-0.5 rounded text-slate-500">Enter</span> ile {isManual ? "kaydet" : "gönder"}, 
                  <span className="bg-slate-100 px-1.5 py-0.5 rounded text-slate-500">Shift + Enter</span> ile alt satıra geç
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
