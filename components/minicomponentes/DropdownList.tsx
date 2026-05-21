"use client";

import { ChevronDown } from "lucide-react";
import { useEffect, useRef, useState } from "react";

type Item = {
  id: string;
  nombre: string;
};

type Props = {
  items: Item[];
  selectedIds: string[];
  onToggle: (id: string) => void;
  placeholder?: string;
  loading?: boolean;
  multiselect?: boolean;
};

export default function DropdownList({
  items,
  selectedIds,
  onToggle,
  placeholder = "",
  loading = false,
  multiselect = false,
}: Props) {
  const [open, setOpen] = useState(false);
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

  const selectedLabel = items
    .filter((i) => selectedIds.includes(i.id))
    .map((i) => i.nombre)
    .join(", ");

  return (
    <div className="relative w-full" ref={ref}>
      <div className="bg-gray-100 px-4 pt-3 pb-2">
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm text-[#5B6670] min-h-[24px] flex items-center overflow-x-auto whitespace-nowrap scrollbar-thin scrollbar-thumb-gray-700">
            {loading ? "Cargando..." : selectedLabel || placeholder}
          </span>
          <button
            type="button"
            onClick={() => setOpen((prev) => !prev)}
            className="ml-3 shrink-0 text-[#5B6670] hover:text-black"
          >
            <ChevronDown
              size={22}
              className={`transition-transform duration-200 ${open ? "rotate-180" : ""}`}
            />
          </button>
        </div>
      </div>

      <div className="h-[1px] bg-[#5B6670] mt-[1px] w-full" />

      {open && (
        <div className="absolute left-0 top-[calc(100%+8px)] w-full bg-gray-100 rounded-md py-3 shadow-md max-h-[112px] overflow-y-auto z-50">
          {items.length === 0 && !loading ? (
            <div className="px-4 py-2 text-sm text-[#5B6670]">
              No hay opciones disponibles
            </div>
          ) : (
            items.map((item) => {
              const selected = selectedIds.includes(item.id);
              return (
                <button
                  type="button"
                  key={item.id}
                  onClick={() => {
                    onToggle(item.id);
                    if (!multiselect) setOpen(false);
                  }}
                  className={`w-full text-left px-4 py-[7px] text-sm transition flex items-center justify-between ${
                    selected
                      ? "bg-gray-200 text-[#323E48] font-semibold"
                      : "text-[#5B6670] hover:bg-gray-200"
                  }`}
                >
                  <span>{item.nombre}</span>
                  {selected && <span>✓</span>}
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}