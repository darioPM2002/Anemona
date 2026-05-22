"use client";

import { useState, useRef, useEffect } from "react";

type Props = {
  value: string;
  onChange: (date: string) => void;
};

const MONTHS = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
];

const WEEK_DAYS = ["L", "M", "M", "J", "V", "S", "D"];

function formatDateForInput(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function formatDateForDisplay(value: string) {
  if (!value) return "dd/mm/aaaa";

  const [year, month, day] = value.split("-");
  return `${day}/${month}/${year}`;
}

export default function CustomDatePicker({ value, onChange }: Props) {
  const initialDate = value ? new Date(value + "T00:00:00") : new Date();

  const [open, setOpen] = useState(false);
  const [month, setMonth] = useState(initialDate.getMonth());
  const [year, setYear] = useState(initialDate.getFullYear());
  const [selectedDate, setSelectedDate] = useState<Date | null>(
    value ? initialDate : null
  );

  const firstDayOfMonth = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  let startDay = firstDayOfMonth.getDay();
  startDay = startDay === 0 ? 6 : startDay - 1;

  const previousMonthDays = new Date(year, month, 0).getDate();

  const calendarDays: {
    day: number;
    currentMonth: boolean;
    date: Date;
  }[] = [];

  for (let i = startDay - 1; i >= 0; i--) {
    const day = previousMonthDays - i;
    calendarDays.push({
      day,
      currentMonth: false,
      date: new Date(year, month - 1, day),
    });
  }

  for (let day = 1; day <= daysInMonth; day++) {
    calendarDays.push({
      day,
      currentMonth: true,
      date: new Date(year, month, day),
    });
  }

  while (calendarDays.length % 7 !== 0) {
    const nextDay = calendarDays.length - startDay - daysInMonth + 1;

    calendarDays.push({
      day: nextDay,
      currentMonth: false,
      date: new Date(year, month + 1, nextDay),
    });
  }

  const handleAccept = () => {
    if (selectedDate) {
      onChange(formatDateForInput(selectedDate));
    }

    setOpen(false);
  };

  const ref = useRef<HTMLDivElement>(null);

useEffect(() => {
  function handleClickOutside(e: MouseEvent) {
    if (ref.current && !ref.current.contains(e.target as Node)) {
      setOpen(false);
    }
  }
  document.addEventListener("mousedown", handleClickOutside);
  return () => document.removeEventListener("mousedown", handleClickOutside);
}, []);

  return (
  <div className="relative" ref={ref}>
    <button
      type="button"
      onClick={() => setOpen((prev) => !prev)}
      className="w-full text-left"
    >
  <div className="bg-gray-100 px-4 pt-3 pb-2">
    <div className="flex items-center justify-between">
      <span className={`text-sm ${value ? "text-[#5B6670]" : "text-[#b5bcc2]"}`}>
        {formatDateForDisplay(value)}
      </span>
      <img
        src="/images/Calendario.png"
        alt="Calendario"
        className="h-4 w-4 object-contain"
      />
    </div>
  </div>
  <div className="h-[1px] bg-[#5B6670] w-full" />
</button>

      {open && (
        <div className="absolute left-0 top-[10px] z-50 w-[230px] rounded-xl bg-white p-5 shadow-lg">
          <div className="mb-4 flex items-center justify-center gap-3">
            <select
              value={month}
              onChange={(e) => setMonth(Number(e.target.value))}
              className="rounded-md bg-gray-100 px-2 py-1.5 text-xs font-semibold text-gray-500 outline-none"
            >
              {MONTHS.map((name, index) => (
                <option key={name} value={index}>
                  {name}
                </option>
              ))}
            </select>

            <select
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
              className="rounded-md bg-gray-100 px-2 py-1.5 text-xs font-semibold text-gray-500 outline-none"
            >
              {Array.from({ length: 15 }, (_, i) => year - 7 + i).map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-7 gap-1 text-center text-xs font-semibold text-gray-700">
            {WEEK_DAYS.map((day, index) => (
              <div key={`${day}-${index}`}>{day}</div>
            ))}
          </div>

          <div className="mt-2 grid grid-cols-7 gap-1 text-center text-xs">
            {calendarDays.map((item, index) => {
              const isSelected =
                selectedDate &&
                item.date.toDateString() === selectedDate.toDateString();

              return (
                <button
                  key={index}
                  type="button"
                  onClick={() => {
                    setSelectedDate(item.date);
                    onChange(formatDateForInput(item.date));
                    }}
                  className={[
                    "flex h-6 w-6 items-center justify-center rounded-md transition",
                    item.currentMonth ? "text-gray-600" : "text-gray-300",
                    isSelected
                      ? "bg-gray-200 font-bold text-gray-800"
                      : "hover:bg-gray-100",
                  ].join(" ")}
                >
                  {item.day}
                </button>
              );
            })}
          </div>

          <div className="mt-5 flex justify-center">
            <button
              type="button"
              onClick={handleAccept}
              className="rounded-md bg-gray-500 px-4 py-1.5 text-xs font-semibold text-white transition hover:bg-gray-600"
            >
              Aceptar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}