"use client";

import { useState } from "react";
import { format, isToday, isTomorrow, isPast, isFuture } from "date-fns";
import { tr } from "date-fns/locale";
import { Clock, Target, CheckCircle2, ChevronRight, Calendar as CalendarIcon, Bell } from "lucide-react";
import { completeTaskAction } from "@/app/dashboard/actions";
import { toast } from "sonner";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

export function CalendarWidget({ tasks }: { tasks: any[] }) {
  const [loadingIds, setLoadingIds] = useState<Set<string>>(new Set());
  const [completingTask, setCompletingTask] = useState<any>(null);
  const [note, setNote] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleComplete = async () => {
    if (!completingTask) return;
    const taskId = completingTask.id;
    
    setIsSubmitting(true);
    setLoadingIds(prev => new Set(prev).add(taskId));
    try {
      const res = await completeTaskAction(taskId, note);
      if (res.success) {
        toast.success("Görev tamamlandı ve not eklendi.");
        setCompletingTask(null);
        setNote("");
      } else {
        toast.error(res.error || "Hata oluştu.");
      
<truncated 6271 bytes>
y={t.id} task={t} />)}
            </div>
          </div>
        )}

        {later.length > 0 && (
          <div className="pt-2 border-t border-slate-100 opacity-80">
            <GroupTitle title="Gelecek" count={later.length} />
            <div className="space-y-1">
              {later.map(t => <TaskItem key={t.id} task={t} />)}
            </div>
          </div>
        )}
      </div>

      <Dialog open={!!completingTask} onOpenChange={(open) => {
        if (!open && !isSubmitting) {
          setCompletingTask(null);
          setNote("");
        }
      }}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Görevi Tamamla</DialogTitle>
            <DialogDescription>
              Bu görevi/hatırlatıcıyı tamamlarken acente için bir CRM notu düşmek ister misiniz? 
              Bıraktığınız not çağrı geçmişine kaydedilecektir.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Textarea
              placeholder="Ne işlem yapıldı? (İsteğe bağlı)"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="min-h-[100px] resize-none"
              disabled={isSubmitting}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setCompletingTask(null); setNote(""); }} disabled={isSubmitting}>İptal</Button>
            <Button onClick={handleComplete} disabled={isSubmitting}>
              {isSubmitting ? "Kaydediliyor..." : "Tamamla ve Kaydet"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
