"use client";

import React, { useState, useRef, useEffect } from "react";
import { Calendar as CalendarIcon, ChevronDown } from "lucide-react";
import { format, subMonths, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subDays } from "date-fns";
import { tr } from "date-fns/locale";
import { CustomCalendar } from "./custom-calendar";
import { Button } from "./button";

interface CustomDateRangePickerProps {
  initialFilter?: string;
  initialDateFrom?: string;
  initialDateTo?: string;
  onApply: (filter: string, dateFrom: string, dateTo: string) => void;
  onClear: () => void;
}

export const filterOptions = [
  { id: "all", label: "Tümü" },
  { id: "today", label: "Bugün Gönderilenler" },
  { id: "week", label: "Bu Hafta" },
  { id: "month", label: "Bu Ay" },
  { id: "last_6_months", label: "Son 6 ay" },
  { id: "last_12_months", label: "Son 12 ay" },
  { id: "last_16_months", label: "Son 16 ay" },
  { id: "never", label: "Hiç İşlem Yapılmamış" },
  { id: "custom", label: "Özel" },
];

export function CustomDateRangePicker({
  initialFilter = "all",
  initialDateFrom = "",
  initialDateTo = "",
  onApply,
  onClear,
}: CustomDateRangePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // State for the picker form
  const [selectedFilter, setSelectedFilter] = useState(
    (initialDateFrom || initialDateTo) ? "custom" : initialFilter
  );
  
  const [dateFrom, setDateFrom] = useState<Date | null>(initialDateFrom ? new Date(initialDateFrom) : null);
  const [dateTo, setDateTo] = useState<Date | null>(initialDateTo ? new Date(initialDateTo) : null);
  
  const [activeCalendar, setActiveCalendar] = useState<"from" | "to" | null>(null);

  // Sync state when props change
  useEffect(() => {
    if (initialDateFrom || initialDateTo) {
      setSelectedFilter("custom");
      setDateFrom(initialDateFrom ? new Date(initialDateFrom) : null);
      setDateTo(initialDateTo ? new Date(initialDateTo) : null);
    } else {
      setSelectedFilter(initialFilter);
      setDateFrom(null);
      setDateTo(null);
    }
  }, [initialFilter, initialDateFrom, initialDateTo]);

  // Click outside to close
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setActiveCalendar(null);
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
    let finalFilter = selectedFilter;
    let finalFrom = "";
    let finalTo = "";

    if (selectedFilter === "custom") {
      finalFilter = "all";
      if (dateFrom) finalFrom = format(dateFrom, "yyyy-MM-dd");
      if (dateTo) finalTo = format(dateTo, "yyyy-MM-dd");
    } else if (selectedFilter === "all") {
      finalFilter = "all";
    } else {
      // It's a preset. We don't send dateFrom/dateTo, we send the campaignFilter key
      finalFilter = selectedFilter;
    }
    
    setIsOpen(false);
    onApply(finalFilter, finalFrom, finalTo);
  };

  const getDisplayText = () => {
    if (initialDateFrom || initialDateTo) {
      const fromStr = initialDateFrom ? format(new Date(initialDateFrom), "d MMM yyyy", { locale: tr }) : "...";
      const toStr = initialDateTo ? format(new Date(initialDateTo), "d MMM yyyy", { locale: tr }) : "...";
      return `${fromStr} - ${toStr}`;
    }
    if (initialFilter !== "all") {
      return filterOptions.find(o => o.id === initialFilter)?.label || "Tarih / Filtre";
    }
    return "Tarih Aralığı Seç";
  };

  const isActiveFilter = initialFilter !== "all" || initialDateFrom || initialDateTo;

  return (
    <div className="relative inline-block text-left" ref={containerRef}>
      <Button
        variant={isActiveFilter ? "default" : "outline"}
        onClick={() => setIsOpen(!isOpen)}
        className="rounded-xl h-9 text-xs font-medium gap-2 shadow-sm border-slate-200"
      >
        <CalendarIcon size={15} className={isActiveFilter ? "text-white" : "text-slate-500"} />
        {getDisplayText()}
        <ChevronDown size={14} className={isActiveFilter ? "text-white/80" : "text-slate-400"} />
      </Button>

      {isOpen && (
        <div className="absolute left-0 top-full mt-2 z-50 bg-white rounded-2xl shadow-[0_4px_24px_rgba(0,0,0,0.12)] border border-slate-100 w-[580px] overflow-hidden animate-in fade-in zoom-in-95 duration-200 origin-top-left">
          
          {/* Header */}
          <div className="px-6 pt-5 pb-3">
            <h3 className="text-xl font-normal text-slate-800 tracking-tight">Tarih aralığı</h3>
          </div>
          
          {/* Tabs */}
          <div className="px-6 border-b border-slate-100 flex gap-6">
            <div className="pb-3 border-b-2 border-[#1a73e8] text-[#1a73e8] text-sm font-medium cursor-pointer">
              Filtre uygula
            </div>
            {/* Karşılaştır tab removed per user request */}
          </div>

          {/* Body */}
          <div className="flex bg-white">
            {/* Left sidebar with radio buttons */}
            <div className="w-[200px] border-r border-slate-100 py-4 px-2">
              <div className="space-y-1">
                {filterOptions.map((opt) => (
                  <label
                    key={opt.id}
                    onClick={() => setSelectedFilter(opt.id)}
                    className="flex items-center gap-3 px-4 py-2 cursor-pointer rounded-lg hover:bg-slate-50 transition-colors group"
                  >
                    <div className={`w-4 h-4 rounded-full border-[1.5px] flex items-center justify-center flex-shrink-0 transition-colors ${selectedFilter === opt.id ? 'border-[#1a73e8]' : 'border-slate-400 group-hover:border-slate-500'}`}>
                      {selectedFilter === opt.id && (
                        <div className="w-2 h-2 bg-[#1a73e8] rounded-full" />
                      )}
                    </div>
                    <span className="text-[13px] text-slate-700 font-medium tracking-wide">
                      {opt.label}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {/* Right content area */}
            <div className="flex-1 p-6 flex flex-col justify-between">
              
              <div className="flex gap-4 items-center mb-8 relative">
                {/* Start Date */}
                <div className="relative flex-1">
                  <label className="absolute -top-2 left-2 bg-white px-1 text-[11px] text-slate-500 font-medium">
                    Başlangıç tarihi
                  </label>
                  <div 
                    onClick={() => {
                      setSelectedFilter("custom");
                      setActiveCalendar(activeCalendar === "from" ? null : "from");
                    }}
                    className={`flex items-center justify-between border ${activeCalendar === 'from' ? 'border-[#1a73e8] ring-1 ring-[#1a73e8]/20' : 'border-slate-300'} rounded-lg p-3 cursor-pointer hover:border-slate-400 transition-colors`}
                  >
                    <span className="text-[13px] font-medium text-slate-700">
                      {dateFrom ? format(dateFrom, "dd.MM.yyyy") : "GG.AA.YYYY"}
                    </span>
                    <CalendarIcon size={16} className="text-slate-400" />
                  </div>
                  
                  {/* Floating Calendar From */}
                  {activeCalendar === "from" && (
                    <div className="absolute top-full left-0 mt-1 z-50">
                      <CustomCalendar 
                        selectedDate={dateFrom} 
                        onSelectDate={(d) => {
                          setDateFrom(d);
                          setActiveCalendar("to"); // auto jump to next
                        }} 
                      />
                    </div>
                  )}
                </div>

                <div className="text-slate-400 font-light mt-1">-</div>

                {/* End Date */}
                <div className="relative flex-1">
                  <label className="absolute -top-2 left-2 bg-white px-1 text-[11px] text-slate-500 font-medium">
                    Bitiş tarihi
                  </label>
                  <div 
                    onClick={() => {
                      setSelectedFilter("custom");
                      setActiveCalendar(activeCalendar === "to" ? null : "to");
                    }}
                    className={`flex items-center justify-between border ${activeCalendar === 'to' ? 'border-[#1a73e8] ring-1 ring-[#1a73e8]/20' : 'border-slate-300'} rounded-lg p-3 cursor-pointer hover:border-slate-400 transition-colors`}
                  >
                    <span className="text-[13px] font-medium text-slate-700">
                      {dateTo ? format(dateTo, "dd.MM.yyyy") : "GG.AA.YYYY"}
                    </span>
                    <CalendarIcon size={16} className="text-slate-400" />
                  </div>

                  {/* Floating Calendar To */}
                  {activeCalendar === "to" && (
                    <div className="absolute top-full right-0 mt-1 z-50">
                      <CustomCalendar 
                        selectedDate={dateTo} 
                        onSelectDate={(d) => {
                          setDateTo(d);
                          setActiveCalendar(null); // close calendar
                        }} 
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-between items-center mt-auto">
                <div>
                  {/* Temizle link */}
                  <button 
                    onClick={() => {
                      setIsOpen(false);
                      onClear();
                    }}
                    className="text-[#1a73e8] text-[13px] font-medium hover:underline px-2 py-1"
                  >
                    Temizle
                  </button>
                </div>
                <div className="flex items-center gap-3">
                  <button 
                    onClick={() => setIsOpen(false)}
                    className="text-[#1a73e8] text-[13px] font-medium hover:bg-slate-50 px-4 py-2 rounded-md transition-colors"
                  >
                    İptal
                  </button>
                  <button 
                    onClick={handleApply}
                    className="bg-slate-200 text-slate-600 hover:bg-slate-300 text-[13px] font-medium px-5 py-2 rounded-full transition-colors"
                  >
                    Uygula
                  </button>
                </div>
              </div>

            </div>
          </div>
        </div>
      )}
    </div>
  );
}
