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
  X, Building2, UserCheck,
} from "lucide-react";
import {
  getConversationsAction, getConversationByIdAction, addMessageAction,
  resolveConversationAction, searchAgenciesForLinkAction, linkAgencyAction,
  getActiveUsersAction, assignConversationAction, sendDirectEmailAction,
  getSectorsAction, getAgencyConversationNotesAction
} from "./actions";
import { useSearchParams } from "next/navigation";

type ChannelType = "WHATSAPP" | "INSTAGRAM" | "MESSENGER" | "MANUAL_NOTE";
type FilterType = "all" | "unread" | "resolved";

const channelConfig: Record<ChannelType, { label: string; icon: string; color: string }> = {
  WHATSAPP:    { label: "WhatsApp", icon: "🟢", color: "bg-green-100 text-green-700" },
  INSTAGRAM:   { label: "Instagram", icon: "🟣", color: "bg-purple-100 text-purple-700" },
  MESSENGER:   { label: "Messenger", icon: "🔵", color: "bg-blue-100 text-blue-700" },
  MANUAL_NOTE: { label: "Not", icon: "📝", color: "bg-amber-100 text-amber-700" },
};

interface Conversation {
  id: string;
  channelType: ChannelType;
  status: string;
  contactName: string | null;
  contactPhone: string | null;
  agencyId: string | null;
  agency: { companyName: string } | null;
  assignedUser: { id: string; name: string } | null;
  messages: Message[];
  updatedAt: string;
  createdAt: string;
}

interface Message {
  id: string;
  content: string;
  senderType: string;
  senderName: string | null;
  isInternalNote: boolean;
  createdAt: string;
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
  const [filter, setFilter] = useState<FilterType>("all");
  const [showQuickReplies, setShowQuickReplies] = useState(false);
  const [isManual, setIsManual] = useState(false);
  const [loading, setLoading] = useState(false);

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
      // Seçili konuşma varsa mesajları da güncelle
      if (selectedId) {
        try {
          const updated = await getConversationByIdAction(selectedId);
          setSelectedConvo(updated);
        } catch {}
      }
    }, 10000);
    return () => clearInterval(interval);
  }, [refreshConversations, selectedId]);

  // ─── Load selected conversation ───
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
      toast.success("Konuşma çözüldü olarak işaretlendi");
      await refreshConversations();
      setSelectedId(null);
    } catch (e) {
      toast.error("İşlem başarısız");
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
      toast.success("Konuşma acenteye bağlandı");
      // Refresh
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

  const quickReplies = [
    { label: "Merhaba! Nasıl yardımcı olabilirim?", value: "Merhaba! Nasıl yardımcı olabilirim?" },
    { label: "Teşekkürler, bilgilerinizi aldık.", value: "Teşekkürler, bilgilerinizi aldık." },
    { label: "Teklifimizi en kısa sürede göndereceğiz.", value: "Teklifimizi en kısa sürede göndereceğiz." },
    { label: "Size dönüş yapacağız.", value: "Size geri dönüş yapacağız, teşekkürler." },
  ];

  const formatTime = (dateStr: string) => {
    const d = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 1) return "Az önce";
    if (diffMin < 60) return `${diffMin}dk`;
    const diffH = Math.floor(diffMin / 60);
    if (diffH < 24) return `${diffH}sa`;
    return d.toLocaleDateString("tr-TR");
  };

  return (
    <div className="flex h-full bg-white rounded-2xl border shadow-sm overflow-hidden">
      {/* Left Sidebar - Conversation List */}
      <div className="w-80 lg:w-96 border-r flex flex-col shrink-0">
        {/* Search & Filters */}
        <div className="p-4 border-b space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
            <Input
              placeholder="Ara..."
              className="pl-9 rounded-xl"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex gap-1">
            {(["all", "unread", "resolved"] as FilterType[]).map((f) => (
              <Button
                key={f}
                size="sm"
                variant={filter === f ? "default" : "ghost"}
                className="rounded-lg text-xs flex-1"
                onClick={() => setFilter(f)}
              >
                {f === "all" ? "Tümü" : f === "unread" ? "Açık" : "Çözüldü"}
              </Button>
            ))}
          </div>
        </div>

        {/* Conversation List */}
        <div className="flex-1 overflow-y-auto divide-y">
          {filteredConversations.length === 0 ? (
            <div className="text-center py-20">
              <Inbox size={32} className="mx-auto text-muted-foreground/30 mb-3" />
              <p className="text-sm text-muted-foreground">Konuşma bulunamadı</p>
            </div>
          ) : (
            filteredConversations.map((c) => {
              const ch = channelConfig[c.channelType] || channelConfig.MANUAL_NOTE;
              const lastMsg = c.messages?.[0]?.content || "Mesaj yok";
              return (
                <button
                  key={c.id}
                  onClick={() => setSelectedId(c.id)}
                  className={cn(
                    "w-full text-left px-4 py-3.5 hover:bg-slate-50 transition-colors",
                    selectedId === c.id && "bg-primary/5 border-l-2 border-l-primary"
                  )}
                >
                  <div className="flex items-start gap-3">
                    <span className="text-lg mt-0.5">{ch.icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium truncate">
                          {c.contactName || c.agency?.companyName || "Bilinmeyen"}
                        </p>
                        <span className="text-[10px] text-muted-foreground shrink-0 ml-2">
                          {formatTime(c.updatedAt)}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground truncate mt-0.5">{lastMsg}</p>
                      <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                        <Badge variant="outline" className={cn("text-[9px] px-1.5 py-0", ch.color)}>
                          {ch.label}
                        </Badge>
                        {c.agency && (
                          <Badge variant="outline" className="text-[9px] px-1.5 py-0 bg-sky-50 text-sky-600 border-sky-200">
                            {c.agency.companyName}
                          </Badge>
                        )}
                        {c.status === "RESOLVED" && (
                          <Badge variant="outline" className="text-[9px] px-1.5 py-0 bg-emerald-50 text-emerald-600 border-emerald-200">
                            Çözüldü
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Right - Chat Detail */}
      <div className="flex-1 flex flex-col">
        {!selectedConvo ? (
          <div className="flex-1 flex items-center justify-center text-center">
            <div>
              <MessageCircle size={48} className="mx-auto text-muted-foreground/20 mb-4" />
              <h3 className="font-semibold text-slate-900">Bir sohbet seçin</h3>
              <p className="text-sm text-muted-foreground mt-1">Sol panelden bir konuşma seçerek başlayın</p>
            </div>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="px-6 py-4 border-b bg-white">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-xl">{channelConfig[selectedConvo.channelType]?.icon}</span>
                  <div>
                    <h3 className="font-semibold text-slate-900">
                      {selectedConvo.contactName || selectedConvo.agency?.companyName || "Bilinmeyen"}
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      {selectedConvo.contactPhone || "Telefon yok"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {selectedConvo.status !== "RESOLVED" && (
                    <Button size="sm" variant="outline" className="rounded-lg gap-1.5 text-xs" onClick={handleResolve}>
                      <CheckCircle2 size={14} /> Çözüldü
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant={isManual ? "default" : "outline"}
                    className="rounded-lg gap-1.5 text-xs"
                    onClick={() => setIsManual(!isManual)}
                  >
                    <StickyNote size={14} /> {isManual ? "Not Modu" : "Not Ekle"}
                  </Button>
                </div>
              </div>

              {/* ─── Agency Link & User Assign Bar ─── */}
              <div className="flex items-center gap-3 mt-3 pt-3 border-t border-dashed border-slate-200">
                {/* Agency Link Section */}
                <div className="relative" ref={linkPanelRef}>
                  {selectedConvo.agency ? (
                    <Link
                      href={`/agents/${selectedConvo.agencyId}`}
                      className="inline-flex items-center gap-1.5 text-xs font-medium text-primary bg-primary/5 hover:bg-primary/10 border border-primary/20 px-3 py-1.5 rounded-lg transition-colors"
                    >
                      <Building2 size={13} />
                      {selectedConvo.agency.companyName}
                      <ExternalLink size={10} />
                    </Link>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      className="rounded-lg gap-1.5 text-xs border-dashed border-amber-300 text-amber-700 hover:bg-amber-50"
                      onClick={() => { setShowLinkPanel(!showLinkPanel); setShowAssignPanel(false); }}
                    >
                      <Building2 size={13} /> Acenteye Bağla
                    </Button>
                  )}

                  {/* Agency Search Dropdown */}
                  {showLinkPanel && (
                    <div className="absolute top-full left-0 mt-2 w-80 bg-white border rounded-xl shadow-xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                      <div className="p-3 border-b bg-slate-50">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-semibold text-slate-700">Acente Ara & Bağla</span>
                          <button onClick={() => setShowLinkPanel(false)} className="text-muted-foreground hover:text-slate-900">
                            <X size={14} />
                          </button>
                        </div>
                        <div className="relative">
                          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" size={14} />
                          <Input
                            placeholder="Firma adı veya belge no..."
                            className="pl-8 h-9 text-sm rounded-lg"
                            value={agencySearchTerm}
                            onChange={(e) => handleAgencySearch(e.target.value)}
                            autoFocus
                          />
                        </div>
                      </div>
                      <div className="max-h-48 overflow-y-auto">
                        {loadingAgencies ? (
                          <div className="px-4 py-6 text-center">
                            <RefreshCw className="animate-spin mx-auto text-muted-foreground mb-2" size={18} />
                            <p className="text-xs text-muted-foreground">Aranıyor...</p>
                          </div>
                        ) : agencyResults.length === 0 ? (
                          <div className="px-4 py-6 text-center">
                            <Building2 size={20} className="mx-auto text-muted-foreground/30 mb-2" />
                            <p className="text-xs text-muted-foreground">
                              {agencySearchTerm.length < 2 ? "En az 2 karakter yazın" : "Sonuç bulunamadı"}
                            </p>
                          </div>
                        ) : (
                          agencyResults.map((ag) => (
                            <button
                              key={ag.id}
                              disabled={linkingAgencyId === ag.id}
                              onClick={() => handleLinkAgency(ag.id)}
                              className="w-full text-left px-4 py-3 hover:bg-primary/5 transition-colors flex items-center justify-between group border-b last:border-b-0"
                            >
                              <div>
                                <p className="text-sm font-medium group-hover:text-primary transition-colors">{ag.companyName}</p>
                                <p className="text-[10px] text-muted-foreground">Belge: {ag.documentNo}</p>
                              </div>
                              {linkingAgencyId === ag.id ? (
                                <RefreshCw className="animate-spin text-primary" size={14} />
                              ) : (
                                <span className="text-[10px] font-medium text-primary opacity-0 group-hover:opacity-100 transition-opacity">
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

                {/* Divider */}
                <div className="w-px h-5 bg-slate-200" />

                {/* User Assignment Section */}
                <div className="relative" ref={assignPanelRef}>
                  {selectedConvo.assignedUser ? (
                    <button
                      onClick={handleOpenAssignPanel}
                      className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-3 py-1.5 rounded-lg transition-colors"
                    >
                      <UserCheck size={13} />
                      {selectedConvo.assignedUser.name}
                      <ChevronDown size={10} />
                    </button>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      className="rounded-lg gap-1.5 text-xs border-dashed border-blue-300 text-blue-700 hover:bg-blue-50"
                      onClick={handleOpenAssignPanel}
                    >
                      <UserPlus size={13} /> Personele Ata
                    </Button>
                  )}

                  {/* User Assignment Dropdown */}
                  {showAssignPanel && (
                    <div className="absolute top-full left-0 mt-2 w-64 bg-white border rounded-xl shadow-xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                      <div className="px-4 py-3 border-b bg-slate-50 flex items-center justify-between">
                        <span className="text-xs font-semibold text-slate-700">Personele Ata</span>
                        <button onClick={() => setShowAssignPanel(false)} className="text-muted-foreground hover:text-slate-900">
                          <X size={14} />
                        </button>
                      </div>
                      <div className="max-h-48 overflow-y-auto">
                        {loadingUsers ? (
                          <div className="px-4 py-6 text-center">
                            <RefreshCw className="animate-spin mx-auto text-muted-foreground mb-2" size={18} />
                            <p className="text-xs text-muted-foreground">Yükleniyor...</p>
                          </div>
                        ) : activeUsers.length === 0 ? (
                          <div className="px-4 py-6 text-center">
                            <Users size={20} className="mx-auto text-muted-foreground/30 mb-2" />
                            <p className="text-xs text-muted-foreground">Aktif personel bulunamadı</p>
                          </div>
                        ) : (
                          activeUsers.map((user) => {
                            const isAssigned = selectedConvo.assignedUser?.id === user.id;
                            return (
                              <button
                                key={user.id}
                                onClick={() => handleAssignUser(user.id)}
                                className={cn(
                                  "w-full text-left px-4 py-3 hover:bg-primary/5 transition-colors flex items-center justify-between group border-b last:border-b-0",
                                  isAssigned && "bg-emerald-50"
                                )}
                              >
                                <div className="flex items-center gap-2.5">
                                  <div className={cn(
                                    "w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold",
                                    isAssigned ? "bg-emerald-200 text-emerald-700" : "bg-slate-100 text-slate-500"
                                  )}>
                                    {(user.name || "?").charAt(0).toUpperCase()}
                                  </div>
                                  <div>
                                    <p className="text-sm font-medium">{user.name || "İsimsiz"}</p>
                                    <p className="text-[10px] text-muted-foreground">{user.role.name}</p>
                                  </div>
                                </div>
                                {isAssigned ? (
                                  <Badge variant="outline" className="text-[9px] bg-emerald-100 text-emerald-600 border-emerald-200">
                                    Atanmış
                                  </Badge>
                                ) : (
                                  <span className="text-[10px] font-medium text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                                    Ata →
                                  </span>
                                )}
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
            <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-slate-50/50">
              {loading ? (
                <div className="text-center py-20">
                  <RefreshCw className="animate-spin mx-auto text-muted-foreground" size={24} />
                </div>
              ) : selectedConvo.messages.length === 0 ? (
                <div className="text-center py-20">
                  <MessageCircle size={32} className="mx-auto text-muted-foreground/20 mb-3" />
                  <p className="text-sm text-muted-foreground">Henüz mesaj yok</p>
                </div>
              ) : (
                [...selectedConvo.messages].reverse().map((msg) => (
                  <div
                    key={msg.id}
                    className={cn(
                      "max-w-[75%] rounded-2xl p-4 text-sm",
                      msg.isInternalNote
                        ? "mx-auto bg-amber-50 border border-amber-200 text-amber-900 max-w-full"
                        : msg.senderType === "agent"
                        ? "ml-auto bg-primary text-white"
                        : "mr-auto bg-white border shadow-sm"
                    )}
                  >
                    {msg.isInternalNote && (
                      <div className="flex items-center gap-1.5 text-[10px] font-semibold text-amber-600 mb-1">
                        <StickyNote size={10} /> DAHİLİ NOT
                      </div>
                    )}
                    <p className="whitespace-pre-wrap">{msg.content}</p>
                    <p
                      className={cn(
                        "text-[10px] mt-2 opacity-70",
                        msg.senderType === "agent" && !msg.isInternalNote ? "text-white/70" : "text-muted-foreground"
                      )}
                    >
                      {msg.senderName || (msg.senderType === "agent" ? "Siz" : "Müşteri")} • {formatTime(msg.createdAt)}
                    </p>
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            {selectedConvo.status !== "RESOLVED" && (
              <div className="border-t p-4 bg-white space-y-2">
                {showQuickReplies && (
                  <div className="flex flex-wrap gap-2 pb-2">
                    {quickReplies.map((qr, i) => (
                      <button
                        key={i}
                        onClick={() => { setMessageText(qr.value); setShowQuickReplies(false); }}
                        className="text-left px-3 py-2 rounded-lg text-sm hover:bg-muted transition-colors border"
                      >
                        {qr.label}
                      </button>
                    ))}
                  </div>
                )}
                <div className="flex items-end gap-2">
                  {!isManual && (
                    <>
                      <Button
                        variant="ghost"
                        size="icon"
                        className={cn("shrink-0 h-10 w-10 rounded-xl", showQuickReplies ? "bg-primary/10 text-primary" : "text-muted-foreground")}
                        onClick={() => setShowQuickReplies(!showQuickReplies)}
                      >
                        <Zap size={18} />
                      </Button>
                      <Button variant="ghost" size="icon" className="shrink-0 h-10 w-10 rounded-xl text-muted-foreground">
                        <Paperclip size={18} />
                      </Button>
                    </>
                  )}
                  <Textarea
                    placeholder={isManual ? "Not yazın..." : "Mesajınızı yazın..."}
                    className="flex-1 min-h-[40px] max-h-[120px] resize-none text-sm rounded-xl"
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
                  <Button
                    className="shrink-0 h-10 rounded-xl gap-1.5 px-4"
                    disabled={!messageText.trim() || sending}
                    onClick={handleSend}
                  >
                    {isManual ? <><Save size={16} /> Kaydet</> : <Send size={18} />}
                  </Button>
                </div>
                <p className="text-[10px] text-muted-foreground mt-2 px-1 flex items-center gap-1">
                  <ChevronDown size={10} /> Enter ile {isManual ? "kaydet" : "gönder"} • Shift+Enter ile yeni satır
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
