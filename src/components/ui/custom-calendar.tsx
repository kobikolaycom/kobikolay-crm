"use client";

import React, { useState } from "react";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from "lucide-react";
import {
  format,
  addMonths,
  subMonths,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  isSameMonth,
  isSameDay,
  addDays,
  setYear,
  setMonth,
  getYear,
  getMonth
} from "date-fns";
import { tr } from "date-fns/locale";

interface CustomCalendarProps {
  selectedDate: Date | null;
  onSelectDate: (date: Date) => void;
  className?: string;
}

export function CustomCalendar({ selectedDate, onSelectDate, className = "" }: CustomCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(selectedDate || new Date());

  const renderHeader = () => {
    const year = getYear(currentMonth);
    const monthName = format(currentMonth, "MMMM", { locale: tr });
    
    // Yılları hesapla (şu andan 5 yıl önceye ve sonraya)
    const currentY = new Date().getFullYear();
    const years = Array.from({ length: 11 }, (_, i) => currentY - 5 + i);
    const months = Array.from({ length: 12 }, (_, i) => {
      const d = new Date();
      d.setMonth(i);
      return { val: i, name: format(d, "MMMM", { locale: tr }) };
    });

    return (
      <div className="flex justify-between items-center px-2 py-2 mb-2">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
            className="p-1 hover:bg-slate-100 rounded-full transition-colors text-slate-600"
          >
            <ChevronLeft size={18} />
          </button>
          
          <select
            value={year}
            onChange={(e) => setCurrentMonth(setYear(currentMonth, parseInt(e.target.value)))}
            className="appearance-none bg-transparent text-sm font-semibold text-slate-700 cursor-pointer outline-none hover:bg-slate-100 px-2 py-1 rounded-md"
          >
            {years.map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
          
          <button
            type="button"
            onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
            className="p-1 hover:bg-slate-100 rounded-full transition-colors text-slate-600"
          >
            <ChevronRight size={18} />
          </button>
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
            className="p-1 hover:bg-slate-100 rounded-full transition-colors text-slate-600"
          >
            <ChevronLeft size={18} />
          </button>
          
          <select
            value={getMonth(currentMonth)}
            onChange={(e) => setCurrentMonth(setMonth(currentMonth, parseInt(e.target.value)))}
            className="appearance-none bg-transparent text-sm font-semibold text-slate-700 cursor-pointer outline-none hover:bg-slate-100 px-2 py-1 rounded-md capitalize"
          >
            {months.map(m => (
              <option key={m.val} value={m.val}>{m.name}</option>
            ))}
          </select>

          <button
            type="button"
            onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
            className="p-1 hover:bg-slate-100 rounded-full transition-colors text-slate-600"
          >
            <ChevronRight size={18} />
          </button>
        </div>
      </div>
    );
  };

  const renderDays = () => {
    const days = ["P", "S", "Ç", "P", "C", "C", "P"];
    return (
      <div className="grid grid-cols-7 mb-2">
        {days.map((day, i) => (
          <div key={i} className="text-center text-[13px] font-medium text-slate-500 w-8 h-8 flex items-center justify-center">
            {day}
          </div>
        ))}
      </div>
    );
  };

  const renderCells = () => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(monthStart);
    // Pazartesi'den başlayacak şekilde startOfWeek ayarlayalım
    const startDate = startOfWeek(monthStart, { weekStartsOn: 1 });
    const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });

    const rows = [];
    let days = [];
    let day = startDate;
    let formattedDate = "";

    while (day <= endDate) {
      for (let i = 0; i < 7; i++) {
        formattedDate = format(day, "d");
        const cloneDay = day;
        const isSelected = selectedDate ? isSameDay(day, selectedDate) : false;
        const isCurrentMonth = isSameMonth(day, monthStart);

        days.push(
          <button
            type="button"
            key={day.toString()}
            onClick={() => onSelectDate(cloneDay)}
            className={`w-8 h-8 flex items-center justify-center rounded-full text-[13px] transition-colors
              ${!isCurrentMonth ? "text-slate-300 pointer-events-none" : "text-slate-700 hover:bg-slate-100"}
              ${isSelected ? "!bg-[#1a73e8] !text-white font-semibold" : ""}
            `}
          >
            {formattedDate}
          </button>
        );
        day = addDays(day, 1);
      }
      rows.push(
        <div className="grid grid-cols-7 gap-1 mb-1" key={day.toString()}>
          {days}
        </div>
      );
      days = [];
    }
    return <div>{rows}</div>;
  };

  return (
    <div className={`w-[260px] bg-white rounded-xl shadow-lg border border-slate-200 p-3 select-none ${className}`}>
      {renderHeader()}
      {renderDays()}
      {renderCells()}
    </div>
  );
}
