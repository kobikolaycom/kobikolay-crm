"use client";

import { useState, useEffect, useRef } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Send, Clock, Phone, Target } from "lucide-react";
import { createActivityAction } from "@/app/agents/[id]/actions";
import { ActivityType, CallStatus } from "@prisma/client";
import { useSession } from "next-auth/react";
import { usePermission } from "@/hooks/usePermission";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { tr } from "date-fns/locale";

const activitySchema = z.object({
  actionType: z.enum(["CALL_LOG", "TASK_ASSIGNMENT", "SELF_REMINDER"]),
  content: z.string().min(1, "Lütfen bir içerik girin."),
  callStatus: z.enum(["GOOD", "NORMAL", "BAD"]).nullable().optional(),
  assignedToId: z.string().optional(),
  dueDate: z.string().optional(),
}).superRefine((data, ctx) => {
  if (data.actionType === "TASK_ASSIGNMENT" || data.actionType === "SELF_REMINDER") {
    if (!data.dueDate) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Lütfen bir tarih/saat seçin.",
        path: ["dueDate"]
      });
    }
  }
  if (data.actionType 
<truncated 8222 bytes>
          className="h-8 text-[12px] border-slate-200 shadow-sm w-auto px-2"
                        disabled={isSubmitting}
                      />
                    )}
                  />
                  <div className="flex items-center gap-1">
                    <button type="button" onClick={() => handleQuickDate("1h")} className="px-2 py-1 bg-white border border-slate-200 shadow-sm hover:bg-slate-50 text-slate-600 text-[10px] font-semibold rounded-md transition-colors whitespace-nowrap">+1 Saat</button>
                    <button type="button" onClick={() => handleQuickDate("tomorrow")} className="px-2 py-1 bg-white border border-slate-200 shadow-sm hover:bg-slate-50 text-slate-600 text-[10px] font-semibold rounded-md transition-colors whitespace-nowrap">Yarın 09:00</button>
                    <button type="button" onClick={() => handleQuickDate("next_week")} className="px-2 py-1 bg-white border border-slate-200 shadow-sm hover:bg-slate-50 text-slate-600 text-[10px] font-semibold rounded-md transition-colors whitespace-nowrap">Haftaya Pzt</button>
                  </div>
                </div>
              )}
            </div>

            {/* Save Button */}
            <Button 
              type="submit"
              size="sm" 
              disabled={isSubmitting || !content?.trim() || (actionType === "TASK_ASSIGNMENT" && !assignedToId) || ((actionType === "TASK_ASSIGNMENT" || actionType === "SELF_REMINDER") && !dueDate)}
              className="h-8 px-5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white shadow-sm font-medium transition-all"
            >
              <Send size={14} className="mr-1.5" /> 
              {isSubmitting ? "Kaydediliyor..." : "Kaydet"}
            </Button>

          </div>
        </div>
      </form>
    </div>
  );
}
