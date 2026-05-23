"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import {
  Clock, CheckCircle2, Calendar, Users, UserPlus,
  PhoneCall, StickyNote, ArrowUpRight, AlertTriangle
} from "lucide-react";

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
    case "CALL_LOG": return "Çağrı";
    case "TASK_ASSIGNMENT": return "Görev";
    case "SELF_REMINDER": return "Hatırlatıcı";
    default: return type;
  }
}

function getCountdown(dueDate: string) {
  const now = new Date();
  const due = new Date(dueDate);
  const diff = due.getTime() - now.getTime();
  if (diff <= 0) return "Süresi geçti";
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  if (days > 0) return `${days} gün ${hours} saat`;
  const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  return `${hours} saat ${mins} dk`;
}

function getOverdueText(dueDate: string) {
  const now = new Date();
  const due = new Date(dueDate);
  const diff = now.getTime() - due.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (days === 0) return "Bugün son gündü";
  if (days === 1) return "1 gün gecikmiş";
  return `${days} gün gecikmiş`;
}

interface TaskItem {
  id: string;
  type: string;
  content: string;
  dueDate: string | null;
  agency: { id: string; companyName: string } | null;
  assignedTo: { name: string } | null;
  creator: { name: string } | null;
}

interface DashboardTasksClientProps {
  overdueTasks: TaskItem[];
  todayTasks: TaskItem[];
  upcomingTasks: TaskItem[];
}

export function DashboardTasksClient({ overdueTasks, todayTasks, upcomingTasks }: DashboardTasksClientProps) {
  const [tab, setTab] = useState<"overdue" | "today" | "upcoming">(
    overdueTasks.length > 0 ? "overdue" : "today"
  );
  const tasks = tab === "overdue" ? overdueTasks : tab === "today" ? todayTasks : upcomingTasks;
  const isOverdue = tab === "overdue";

  return (
    <div className="glass-card rounded-3xl border shadow-sm overflow-hidden flex flex-col h-[400px]">
      <div className="px-5 py-4 border-b flex items-center justify-between">
        <h3 className="font-bold text-slate-900 flex items-center gap-2">
          <Calendar size={18} className="text-primary" /> Görevler
        </h3>
        <div className="flex gap-1">
          <Button
            size="sm"
            variant={tab === "overdue" ? "default" : "outline"}
            className={`rounded-lg text-xs h-7 px-2.5 ${
              tab === "overdue" && overdueTasks.length > 0
                ? "bg-red-600 hover:bg-red-700 text-white"
                : overdueTasks.length > 0
                ? "text-red-600 border-red-300"
                : ""
            }`}
            onClick={() => setTab("overdue")}
          >
            {overdueTasks.length > 0 && <span className="animate-pulse mr-1">🔴</span>}
            Geçmiş ({overdueTasks.length})
          </Button>
          <Button
            size="sm"
            variant={tab === "today" ? "default" : "outline"}
            className="rounded-lg text-xs h-7 px-2.5"
            onClick={() => setTab("today")}
          >
            Bugün ({todayTasks.length})
          </Button>
          <Button
            size="sm"
            variant={tab === "upcoming" ? "default" : "outline"}
            className="rounded-lg text-xs h-7 px-2.5"
            onClick={() => setTab("upcoming")}
          >
            Yaklaşan ({upcomingTasks.length})
          </Button>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {tasks.length === 0 ? (
          <div className="text-center py-16">
            <CheckCircle2 size={32} className="mx-auto text-muted-foreground/30 mb-3" />
            <p className="text-sm text-muted-foreground">
              {tab === "overdue"
                ? "Gecikmiş görev yok ✅"
                : tab === "today"
                ? "Bugün için görev yok 🎉"
                : "Yaklaşan görev yok"}
            </p>
          </div>
        ) : (
          tasks.map((task) => (
            <Link
              key={task.id}
              href={task.agency ? `/agents/${task.agency.id}` : "#"}
              className={`flex gap-3 items-start p-3 rounded-xl border transition-colors cursor-pointer ${
                isOverdue
                  ? "bg-red-50/80 border-red-200 hover:bg-red-100/80"
                  : "bg-slate-50/50 hover:bg-primary/5 hover:border-primary/20"
              }`}
            >
              <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                isOverdue ? "bg-red-100" : "bg-white border"
              }`}>
                {isOverdue ? (
                  <AlertTriangle size={14} className="text-red-600 animate-pulse" />
                ) : (
                  activityIcon(task.type)
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className={`text-[10px] font-semibold uppercase ${isOverdue ? "text-red-600" : "text-muted-foreground"}`}>
                    {activityLabel(task.type)}
                  </span>
                  {isOverdue && task.dueDate && (
                    <span className="text-[10px] bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-bold animate-pulse">
                      ⚠ {getOverdueText(task.dueDate)}
                    </span>
                  )}
                  {tab === "upcoming" && task.dueDate && (
                    <span className="text-[10px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">
                      ⏳ {getCountdown(task.dueDate)}
                    </span>
                  )}
                </div>
                <p className={`text-sm font-medium leading-snug ${isOverdue ? "text-red-900" : "text-slate-900"}`}>
                  {task.content}
                </p>
                <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                  {task.agency && (
                    <span className={`text-xs flex items-center gap-1 ${isOverdue ? "text-red-600" : "text-primary"}`}>
                      <Users size={10} /> {task.agency.companyName}
                    </span>
                  )}
                  {task.dueDate && (
                    <span className={`text-[10px] flex items-center gap-1 ${isOverdue ? "text-red-500" : "text-muted-foreground"}`}>
                      <Clock size={10} /> {new Date(task.dueDate).toLocaleDateString("tr-TR")}
                    </span>
                  )}
                  {task.assignedTo && (
                    <span className="text-[10px] text-muted-foreground">
                      → {task.assignedTo.name}
                    </span>
                  )}
                </div>
              </div>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
