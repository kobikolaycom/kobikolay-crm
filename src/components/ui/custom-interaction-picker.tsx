"use client";

import React, { useState, useRef, useEffect } from "react";
import { Mail, ChevronDown } from "lucide-react";
import { Button } from "./button";

interface CustomInteractionPickerProps {
  initialFilter?: string;
  onApply: (filter: string) => void;
}

export const interactionOptions = [
  { id: "all", label: "Tümü", icon: "📧" },
  { id: "unsubscribed", label: "Abonelikten Ayrılanlar", icon: "🔕" },
  { id: "clicked", label: "İletişim Kuruldu", icon: "🔗" },
  { id: "opened", label: "Maili Açtı", icon: "👁️" },
  { id: "sent_only", label: "Gönderildi (Açılmadı)", icon: "✉️" },
  { id: "no_mail", label: "Mail Gönderilmemiş", icon: "⚪" },
];

export function CustomInteractionPicker({
  initialFilter = "all",
  onApply,
}: CustomInteractionPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // State for the picker form
  const [selectedFilter, setSelectedFilter] = useState(initialFilter);

  // Sync state when props change
  useEffect(() => {
    setSelectedFilter(initialFilter);
  }, [initialFilter]);

  // Click outside to close
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const handleApply = () => {
    setIsOpen(false);
    onApply(selectedFilter);
  };

  const getDisplayText = () => {
    if (initialFilter !== "all") {
      const opt = interactionOptions.find(o => o.id === initialFilter);
      if (opt) return `${opt.icon} ${opt.label}`;
    }
    return "📧 Etkileşim Seç";
  };

  const isActiveFilter = initialFilter !== "all";

  return (
    <div className="relative inline-block text-left" ref={containerRef}>
      <Button
        variant={isActiveFilter ? "default" : "outline"}
        onClick={() => setIsOpen(!isOpen)}
        className="rounded-xl h-9 text-xs font-medium gap-2 shadow-sm border-slate-200"
      >
        {getDisplayText()}
        <ChevronDown size={14} className={isActiveFilter ? "text-white/80" : "text-slate-400"} />
      </Button>

      {isOpen && (
        <div className="absolute left-0 top-full mt-2 z-50 bg-white rounded-2xl shadow-[0_4px_24px_rgba(0,0,0,0.12)] border border-slate-100 w-[280px] overflow-hidden animate-in fade-in zoom-in-95 duration-200 origin-top-left">
          
          {/* Header */}
          <div className="px-5 pt-4 pb-2 border-b border-slate-100">
            <h3 className="text-[15px] font-medium text-slate-800 tracking-tight">Etkileşim Durumu</h3>
          </div>
          
          {/* Body */}
          <div className="flex flex-col bg-white">
            <div className="py-2 px-2">
              <div className="space-y-1">
                {interactionOptions.map((opt) => (
                  <label
                    key={opt.id}
                    onClick={() => setSelectedFilter(opt.id)}
                    className="flex items-center gap-3 px-3 py-2 cursor-pointer rounded-lg hover:bg-slate-50 transition-colors group"
                  >
                    <div className={`w-4 h-4 rounded-full border-[1.5px] flex items-center justify-center flex-shrink-0 transition-colors ${selectedFilter === opt.id ? 'border-[#1a73e8]' : 'border-slate-400 group-hover:border-slate-500'}`}>
                      {selectedFilter === opt.id && (
                        <div className="w-2 h-2 bg-[#1a73e8] rounded-full" />
                      )}
                    </div>
                    <span className="text-[13px] text-slate-700 font-medium tracking-wide flex items-center gap-2">
                      <span>{opt.icon}</span> {opt.label}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-between items-center px-4 py-3 border-t border-slate-100 bg-slate-50/50">
              <button 
                onClick={() => setIsOpen(false)}
                className="text-[#1a73e8] text-[12px] font-medium hover:bg-slate-100 px-3 py-1.5 rounded-md transition-colors"
              >
                İptal
              </button>
              <button 
                onClick={handleApply}
                className="bg-[#1a73e8] text-white hover:bg-[#1557b0] text-[12px] font-medium px-4 py-1.5 rounded-full transition-colors shadow-sm"
              >
                Uygula
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
