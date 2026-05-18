// ================== W_CHART (Gráfica de barras) ==================
// Agrega esto en tu archivo de widgets junto a renderW000, renderW001, etc.

/* ── Estructura de campos esperada ──────────────────────────────────────────

campos: {
  titulo:     string          // título de la sección
  pie:        string          // pie de imagen / nota al pie
  unidad:     string          // ej: "%", "pts", "USD", "unidades"
  barras: [
    { etiqueta: string, valor: number, color?: string },
    ...
  ]
}

────────────────────────────────────────────────────────────────────────────*/

import React from "react";
import { EditableText, Widget } from "./BibliotecaWidgets";

// Paleta de colores corporativos por defecto (se cicla si hay más barras)
const PALETTE = [
  "#133b73", // azul oscuro banorte
  "#EB0029", // rojo banorte
  "#4a7fc1", // azul medio
  "#e8a020", // ámbar
  "#2e7d32", // verde
  "#7b1fa2", // morado
  "#00838f", // teal
  "#c62828", // rojo oscuro
];

export const renderWChart = (
  widget: Widget,
  onChange: (posicion: number, key: string, value: any) => void
) => {
  const campos = widget.campos || {};

  const titulo: string = campos.titulo ?? widget.titulo ?? "Gráfica";
  const pie: string    = campos.pie    ?? "";
  const unidad: string = campos.unidad ?? "";
  const barras: { etiqueta: string; valor: number }[] =
    campos.barras ?? [
      { etiqueta: "Categoría 1", valor: 60 },
      { etiqueta: "Categoría 2", valor: 40 },
    ];

  const maxValor = Math.max(...barras.map((b) => b.valor), 1);

  return (
    <div className="mb-8">
      {/* Título */}
      <div className="mb-4 mt-6">
        <div className="flex items-start gap-3 border-t-2 border-black pt-2 w-full">
          <span className="text-[18px] shrink-0">{widget.posicion}.</span>
          <span className="font-bold text-[18px]">{titulo}</span>
          <span className="text-[11px] shrink-0 ml-2 mt-1 text-red-600">(Obligatorio)</span>
        </div>
      </div>

      {/* Gráfica */}
      <div className="w-full overflow-x-auto mb-3">
        <div style={{ minWidth: `${Math.max(barras.length * 80, 300)}px` }}>
          <div className="relative" style={{ height: "180px" }}>
            {/* Líneas guía */}
            {[25, 50, 75, 100].map((pct) => (
              <div
                key={pct}
                className="absolute w-full border-t border-dashed border-gray-200"
                style={{ bottom: `${pct}%` }}
              >
                <span className="text-[9px] text-gray-400 pr-1 select-none">
                  {Math.round((maxValor * pct) / 100)}
                </span>
              </div>
            ))}

            {/* Barras */}
            <div className="absolute inset-0 flex items-end gap-3 px-6">
              {barras.map((b, i) => {
                const color = PALETTE[i % PALETTE.length];
                const heightPct = (b.valor / maxValor) * 100;
                return (
                  <div key={i} className="flex-1 flex flex-col items-center justify-end gap-1" style={{ height: "100%" }}>
                    <span className="text-[10px] font-bold" style={{ color }}>
                      {b.valor}{unidad}
                    </span>
                    <div
                      style={{ height: `${heightPct}%`, backgroundColor: color, minHeight: "4px", transition: "height 0.3s ease" }}
                      className="w-full rounded-t-sm"
                    />
                  </div>
                );
              })}
            </div>
          </div>

          {/* Etiquetas eje X */}
          <div className="flex gap-3 px-6 mt-1 border-t-2 border-black pt-1">
            {barras.map((b, i) => (
              <div key={i} className="flex-1 text-center">
                <span className="text-[10px] font-semibold" style={{ color: PALETTE[i % PALETTE.length] }}>
                  {b.etiqueta}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Pie de imagen */}
      {pie && (
        <p className="text-[11px] text-gray-500 italic mt-1">
          {pie}
        </p>
      )}
    </div>
  );
};