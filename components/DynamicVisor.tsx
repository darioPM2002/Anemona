"use client";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  renderW000,
  renderW001,
  renderW002,
  renderW003,
  renderW005,
  Widget,
} from "./widgets/BibliotecaWidgets";
import { API_URL } from "@/services/api";
import { renderWChart } from "./widgets/biblioteca_chart";

type Props = {
  widgets: Widget[];
  changedFields?: Set<string>;
};

// Constantes de layout
// 816px = ancho de hoja carta
// 110px header + 90px footer = 200px fijos
// 856px = área de contenido entre header y footer
// 808px = área útil (856 - 24 paddingTop - 24 paddingBottom)
const PAGE_CONTENT_HEIGHT = 856;
const PAGE_PADDING_V = 54
export const USABLE_HEIGHT = PAGE_CONTENT_HEIGHT - PAGE_PADDING_V;

export type BlockDef = {
  id: string;
  node: React.ReactNode;
};

const WidgetRenderer: React.FC<Props> = ({
  widgets: initialWidgets,
  changedFields,
}) => {
  const [widgets, setWidgets] = useState<Widget[]>(initialWidgets);
  const [loading, setLoading] = useState(false);
  const [pages, setPages] = useState<BlockDef[][]>([]);
  const [measured, setMeasured] = useState(false);
  const measureRefs = useRef<(HTMLDivElement | null)[]>([]);
  const rowRefs = useRef<{ [widgetPos: number]: (HTMLDivElement | null)[] }>({}); // ayuda al algoritmo greedy a separar por linean no widgets
  const [showError, setShowError] = useState(false); // Pop up error al guardar plantilla
  const [showSuccess, setShowSuccess] = useState(false); // Pop up exito al guardar plantilla

  // Actualiza valores de campos sin tocar la estructura de widgets
  const handleChange = (posicion: number, key: string, value: string) => {
    setWidgets((prev) =>
      prev.map((w) => {
        if (w.posicion !== posicion) return w;
        return { ...w, campos: { ...w.campos, [key]: value } };
      }),
    );
  };

  // Widgets ordenados por posición
  const sortedWidgets = useMemo(
    () => [...widgets].sort((a, b) => a.posicion - b.posicion),
    [widgets],
  );

  // Resalta en amarillo los campos que cambió el chat
  // El path viene de detectChanges en Documentacion.tsx, ej: "w_000.campos.SOLICITANTE"
  const highlight = (path: string) =>
    changedFields?.has(path) ? "bg-yellow-200 transition-all duration-700" : "";

  // Guarda los widgets editados en Firestore
  const handleSave = async () => {
    const docId = sessionStorage.getItem("project_id") || "";
    if (!docId) {
      setShowError(true);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(
        `${API_URL}/widgets/modificar/${encodeURIComponent(docId)}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(widgets),
        },
      );
      if (!res.ok) {
        setShowError(true);
        return;
      }
      setShowSuccess(true);
      window.dispatchEvent(new CustomEvent("ers-refresh"));
    } catch (e) {
      console.error(e);
      setShowError(true);
    } finally {
      setLoading(false);
    }
  };

  // Renderiza el widget correcto según su id
  const renderWidget = (widget: Widget) => {
    switch (widget.id_widget) {
      case "w_000":
        return renderW000(widget, handleChange, highlight); //
      case "w_001":
        return renderW001(widget, handleChange, highlight); //
      case "w_002":
        return renderW002(widget, handleChange, highlight); //
      case "w_003":
          return renderW003(widget, handleChange, highlight, false); //
      case "w_004":
        return renderWChart(widget, handleChange); //
      case "w_005": 
        return renderW005(widget, handleChange, highlight);

      default:
        return null;
    }
  };

  // Clave que identifica la estructura de widgets (no sus valores).
  // Solo cambia cuando se agrega/quita un widget, no cuando se edita un campo.
  // Así el reset de paginación no se dispara al escribir.
  const widgetKeys = sortedWidgets
    .map((w) => `${w.id_widget}-${w.posicion}`)
    .join(",");

  // Resetea paginación cuando cambia la estructura de widgets
  useEffect(() => {
    setMeasured(false);
    setPages([]);
  }, [widgetKeys]);

  // Sincroniza widgets internos cuando Documentacion pasa nuevos props
  // (ej: al cambiar de proyecto o recibir respuesta del chat)
  useEffect(() => {
    setWidgets(initialWidgets);
  }, [initialWidgets]);

  // Algoritmo de paginación greedy:
  // - measureRefs[0] = párrafo introductorio
  // - measureRefs[i+1] = widget i
  // Acumula bloques hasta superar USABLE_HEIGHT, luego abre nueva página
  useEffect(() => {
  if (measured) return;

  if (sortedWidgets.length === 0) {
    setPages([[{ id: "intro", node: null }]]);
    setMeasured(true);
    return;
  }

  const raf = requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      const heights = measureRefs.current.map((el) => el?.offsetHeight ?? 0);

      const result: BlockDef[][] = [];
      let currentPage: BlockDef[] = [];
      let currentHeight = 0;

      const introHeight = heights[0] ?? 0;
      currentPage.push({ id: "intro", node: null });
      currentHeight += introHeight;

      sortedWidgets.forEach((widget, i) => {
        const h = heights[i + 1];

        // W005 — partir por filas
        if (widget.id_widget === "w_005") {
          const filas: any[] = widget.campos?.filas ?? [];
          const rowHeights = (rowRefs.current[widget.posicion] ?? []).map(
            (el) => el?.offsetHeight ?? 0
          );

          // Altura del título del widget (SubSection) — estimamos 40px
          const TITLE_H = 40;

          // Filas que van en la página actual
          let currentChunk: number[] = [];
          let chunkHeight = TITLE_H;

          const flushChunk = (isFirst: boolean) => {
            if (currentChunk.length === 0) return;
            const chunkFilas = currentChunk.map((idx) => filas[idx]);
            const node = renderW005Partial(widget, chunkFilas, isFirst);
            currentPage.push({
              id: `${widget.id_widget}-${widget.posicion}-chunk-${currentChunk[0]}`,
              node,
            });
            currentHeight += chunkHeight;
            currentChunk = [];
            chunkHeight = TITLE_H;
          };

          let isFirst = true;

          filas.forEach((_, rowIdx) => {
            const rh = rowHeights[rowIdx] ?? 30;
            if (currentHeight + chunkHeight + rh > USABLE_HEIGHT && currentChunk.length > 0) {
              flushChunk(isFirst);
              isFirst = false;
              result.push(currentPage);
              currentPage = [];
              currentHeight = 0;
            }
            currentChunk.push(rowIdx);
            chunkHeight += rh;
          });

          flushChunk(isFirst);
          return;
        }

        // Resto de widgets — comportamiento original
        const node = renderWidget(widget);
        if (!node) return;
        const block: BlockDef = {
          id: `${widget.id_widget}-${widget.posicion}`,
          node,
        };
        if (currentHeight + h > USABLE_HEIGHT && currentPage.length > 0) {
          result.push(currentPage);
          currentPage = [block];
          currentHeight = h;
        } else {
          currentPage.push(block);
          currentHeight += h;
        }
      });

      if (currentPage.length > 0) result.push(currentPage);
      setPages(result);
      setMeasured(true);
    });
  });

  return () => cancelAnimationFrame(raf);
}, [sortedWidgets, measured]);

const renderW005Partial = (widget: Widget, filas: any[], showTitle: boolean) => {
  const titulo = widget.campos?.titulo || widget.titulo || "";
  return (
    <div className="mb-4">
      {showTitle && (
        <div className="mb-4 mt-5 flex items-center gap-2">
          <span className="flex items-center gap-1 text-[18px]">
            {widget.posicion}
            <span className="font-semibold">{titulo}</span>.
          </span>
        </div>
      )}
      <div className="border border-black text-[13px]">
        {filas.map((fila: any, rowIdx: number) => (
          <div
            key={rowIdx}
            className="flex w-full"
            style={{ borderBottom: rowIdx < filas.length - 1 ? "1px solid black" : "none" }}
          >
            {fila.celdas.map((cel: any, celIdx: number) => (
              <div
                key={celIdx}
                className="px-2 py-1"
                style={{
                  flex: 1,
                  borderRight: celIdx < fila.celdas.length - 1 ? "1px solid black" : "none",
                }}
              >
                {cel.label && cel.label !== "" && (
                  <div className="text-[11px] text-gray-500">{cel.label}</div>
                )}
                <div className={cel.bold ? "font-bold" : ""}>{cel.valor || ""}</div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
};

  // ── Fase 1: render invisible para medir alturas + spinner ──
  // Los elementos se renderizan fuera de pantalla para que el navegador
  // calcule sus alturas reales antes de paginar
  if (!measured) {
    return (
      <div className="w-full bg-[#ececec] py-8 px-4">
        <div className="flex items-center justify-center py-16 text-sm text-gray-400">
          <svg
            className="mr-2 h-5 w-5 animate-spin text-[#EB0029]"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8v8z"
            />
          </svg>
          Calculando paginación...
        </div>
        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            top: 0,
            left: "-9999px",
            visibility: "hidden",
            pointerEvents: "none",
            width: "716px",
            zIndex: -1,
          }}
        >
          {/* índice 0: párrafo introductorio */}
          <div
            ref={(el) => {
              measureRefs.current[0] = el;
            }}
          >
            <p className="mb-8 text-[13px] leading-[1.2]">
              Este cuestionario tiene como propósito conocer cuáles son los
              beneficios, costos y riesgos relacionados con cada iniciativa que
              ingresa al portafolio de proyectos y mantenimientos tecnológicos
              de Áreas de Soporte. Esta información será de utilidad para
              ponderar el portafolio en su conjunto y priorizar la atención de
              los requerimientos de acuerdo a su beneficio económico, alineación
              estratégica y conveniencia de su realización.
            </p>
          </div>
         {/* índices 1..n: widgets */}
{sortedWidgets.map((widget, i) => (
  <div
    key={`${widget.id_widget}-${widget.posicion}`}
    ref={(el) => { measureRefs.current[i + 1] = el; }}
  >
    {renderWidget(widget)}
  </div>
))}

{/* Medición de filas individuales de W005 */}
{sortedWidgets
  .filter((w) => w.id_widget === "w_005")
  .map((widget) => {
    const filas = widget.campos?.filas ?? [];
    if (!rowRefs.current[widget.posicion]) {
      rowRefs.current[widget.posicion] = [];
    }
    return (
      <div key={`rows-${widget.posicion}`}>
        {filas.map((fila: any, rowIdx: number) => (
          <div
            key={rowIdx}
            ref={(el) => { rowRefs.current[widget.posicion][rowIdx] = el; }}
            className="flex w-full border-b border-black text-[13px]"
          >
            {fila.celdas.map((cel: any, celIdx: number) => (
              <div
                key={celIdx}
                className="px-2 py-1"
                style={{ flex: 1 }}
              >
                {cel.label && <div className="text-[11px] text-gray-500">{cel.label}</div>}
                <div className={cel.bold ? "font-bold" : ""}>{cel.valor}</div>
              </div>
            ))}
          </div>
        ))}
      </div>
    );
  })}
        </div>
      </div>
    );
  }

  // ── Fase 2: render paginado final ──
  return (
    <div className="w-full bg-[#ececec] py-8 px-4">
      {/* Botón guardar */}
      <div className="flex justify-end mb-4 w-[816px] mx-auto print:hidden">
        <button
          onClick={handleSave}
          disabled={loading}
          className="bg-[#EB0029] text-white px-6 py-2 rounded-xl font-semibold hover:opacity-90 transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? "Guardando..." : "Guardar cambios"}
        </button>
      </div>

      {pages.map((pageBlocks, pageIndex) => (
        <div
          key={pageIndex}
          data-pdf-page
          className="mx-auto mb-8 w-[816px] border border-gray-300 bg-white shadow-md"
          style={{ height: "1056px", overflow: "hidden" }}
        >
          {/* Header */}
          <div className="h-[110px] border-b border-[#b9a89f]">
            <div className="flex items-center justify-between px-12 py-7">
              <div className="text-[22px] font-semibold leading-none text-[#7c7c7c]">
                <span>Formato Estándar | </span>
                <span className="font-normal">
                  Levantamiento de Requerimiento
                </span>
              </div>
              <img
                src="/images/rayaNegra.png"
                alt="Encabezado"
                className="h-[45px] object-cover"
              />
            </div>
          </div>

          {/* Contenido */}
          <div
            className="text-black text-[13px] leading-[1.28]"
            style={{
              height: "856px",
              overflow: "hidden",
              paddingTop: "24px",
              paddingBottom: "24px",
              paddingLeft: "47px",
              paddingRight: "51px",
              boxSizing: "border-box",
            }}
          >
            {/* Párrafo introductorio solo en página 1 */}
            {pageIndex === 0 && (
              <p className="mb-8 text-[13px] leading-[1.2]">
                Este cuestionario tiene como propósito conocer cuáles son los
                beneficios, costos y riesgos relacionados con cada iniciativa
                que ingresa al portafolio de proyectos y mantenimientos
                tecnológicos de Áreas de Soporte. Esta información será de
                utilidad para ponderar el portafolio en su conjunto y priorizar
                la atención de los requerimientos de acuerdo a su beneficio
                económico, alineación estratégica y conveniencia de su
                realización.
              </p>
            )}
            {pageBlocks.map((block) => {
  if (block.id === "intro") return null;

  // Si el bloque ya tiene node precalculado (chunks de W005), úsalo directo
  if (block.node) {
    return <div key={block.id}>{block.node}</div>;
  }

  // Para el resto de widgets, busca y renderiza normal
  const widget = sortedWidgets.find(
    (w) => `${w.id_widget}-${w.posicion}` === block.id,
  );
  return (
    <div key={block.id}>{widget ? renderWidget(widget) : null}</div>
  );
})}
          </div>

          {/* Footer */}
          <div className="flex h-[90px] items-center px-6">
            <img
              src="/images/banortegf.png"
              alt="Footer Banorte"
              className="h-[65px] object-contain"
            />
          </div>
        </div>
      ))}

      {/* POPUP ÉXITO */}
      {showSuccess && (
        <div className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm bg-black/30">
          <div className="relative bg-white rounded-2xl shadow-2xl border border-gray-100 w-[520px] p-10 flex flex-col items-center text-center">
            <button
              onClick={() => setShowSuccess(false)}
              className="absolute top-4 right-5 text-gray-400 hover:text-black text-lg"
            >
              ✕
            </button>
            <div className="mb-5">
              <img
                src="/images/OpExitosa.png"
                alt="Operación exitosa"
                className="w-20 h-20 object-contain"
              />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-3">
              Cambios guardados
            </h2>
            <p className="text-gray-500 text-sm mb-2">
              Tu documento ha sido guardado exitosamente el día:
            </p>
            <p className="text-gray-800 font-bold text-base mb-8">
              {new Date()
                .toLocaleDateString("es-MX", {
                  weekday: "long",
                  day: "2-digit",
                  month: "2-digit",
                  year: "numeric",
                })
                .replace(/^\w/, (c) => c.toUpperCase())}
            </p>
            <button
              onClick={() => setShowSuccess(false)}
              className="bg-[#EB0029] text-white px-16 py-3 rounded-xl font-semibold text-base hover:opacity-90 transition"
            >
              Confirmar
            </button>
          </div>
        </div>
      )}

      {/* POPUP ERROR */}
      {showError && (
        <div className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm bg-black/30">
          <div className="relative bg-white rounded-2xl shadow-2xl border border-gray-100 w-[520px] p-10 flex flex-col items-center text-center">
            <button
              onClick={() => setShowError(false)}
              className="absolute top-4 right-5 text-gray-400 hover:text-black text-lg"
            >
              ✕
            </button>
            <div className="mb-5">
              <img
                src="/images/Error.png"
                alt="Error"
                className="w-20 h-20 object-contain"
              />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-3">
              Error al guardar
            </h2>
            <p className="text-gray-500 text-sm mb-8">
              No se pudo guardar. Por favor intenta de nuevo.
            </p>
            <button
              onClick={() => setShowError(false)}
              className="bg-[#EB0029] text-white px-16 py-3 rounded-xl font-semibold text-base hover:opacity-90 transition"
            >
              Aceptar
            </button>
          </div>
        </div>
      )}
    </div>
  );
};;

export default WidgetRenderer;