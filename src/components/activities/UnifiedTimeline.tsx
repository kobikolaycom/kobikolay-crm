"use client";

import { CheckCircle2, Clock, XCircle, Mail, Phone, CalendarIcon, Target, MessageCircle, FileText, ArrowRight, User } from "lucide-react";
import { format } from "date-fns";
import { tr } from "date-fns/locale";

type FeedItem = {
  id: string;
  timestamp: Date;
  type: "MAIL" | "ACTIVITY" | "CONVERSATION";
  data: any; 
};

interface UnifiedTimelineProps {
  mailLogs: any[];
  offers?: any[]; 
  activities: any[];
  conversations?: any[];
}

export function UnifiedTimeline({ mailLogs, activities, conversations = [] }: UnifiedTimelineProps) {
  
  const feed: FeedItem[] = [
    ...mailLogs.map(log => ({ id: log.id, timestamp: new Date(log.createdAt), type: "MAIL" as const, data: log })),
    ...activities.map(act => ({ id: act.id, timestamp: new Date(act.createdAt), type: "ACTIVITY" as const, data: act })),
    ...conversations.map(c => ({ id: c.id, timestamp: new Date(c.updatedAt || c.createdAt), type: "CONVERSATION" as const, data: c })),
  ].sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

  const formatTime = (date: Date) => format(date, "HH:mm");
  const formatDateStr = (date: Date) => format(date, "dd MMMM yyyy, EEEE", { locale: tr });

  // Premium Card Component
  const TimelineCard = ({ 
    icon, iconBg, title, time, content, children, isOverdue = false, isMessage = false 
  }: any) => (
    <div className={`bg-white rounded-2xl p-4 shadow-[0_2px_10px_-4px_rgb
<truncated 6938 bytes>
[10px] font-medium text-slate-400">
              İşlem Yapan: {convo.createdByUser.name}
            </span>
          )}
        </div>
      </TimelineCard>
    );
  };

  const groupedFeed: Record<string, FeedItem[]> = {};
  feed.forEach(item => {
    const dateKey = formatDateStr(item.timestamp);
    if (!groupedFeed[dateKey]) groupedFeed[dateKey] = [];
    groupedFeed[dateKey].push(item);
  });

  if (feed.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
        <FileText size={32} className="text-slate-300 mb-3" />
        <p className="text-[13px] font-medium text-slate-600">Henüz kayıt bulunmuyor.</p>
        <p className="text-[11px] text-slate-400 mt-1">Görüşmeleriniz ve notlarınız burada listelenecektir.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {Object.entries(groupedFeed).map(([dateStr, items]) => (
        <div key={dateStr}>
          <div className="flex items-center justify-center mb-4">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest bg-slate-100/50 px-3 py-1 rounded-full">
              {dateStr}
            </span>
          </div>
          <div className="space-y-3">
            {items.map((item) => (
              <div key={`${item.type}-${item.id}`}>
                {item.type === "MAIL" && renderMail(item.data)}
                {item.type === "ACTIVITY" && renderActivity(item.data)}
                {item.type === "CONVERSATION" && renderConversation(item.data)}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
