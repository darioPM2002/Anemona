"use client";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  renderW000,
  renderW001,
  renderW002,
  renderW003,
  renderW005,
  renderW006,
  Widget,
} from "./widgets/BibliotecaWidgets";
import { API_URL } from "@/services/api";
import { renderWChart } from "./widgets/biblioteca_chart";

type Props = {
  widgets: Widget[];
  changedFields?: Set<string>;
  nombrePlantilla?: string;
  onPaginationDone?: () => void;
};

const PAGE_CONTENT_HEIGHT = 856;
const CONTENT_PADDING_TOP = 24;
const CONTENT_PADDING_BOTTOM = 80;
const PAGE_BREAK_SAFETY = 40;

export const USABLE_HEIGHT =
  PAGE_CONTENT_HEIGHT -
  CONTENT_PADDING_TOP -
  CONTENT_PADDING_BOTTOM -
  PAGE_BREAK_SAFETY;

export type BlockDef = {
  id: string;
  node?: React.ReactNode;
  chunkType?: "w003" | "w005" | "w006";
  chunkRowIndices?: number[];
  chunkShowTitle?: boolean;
  chunkWidgetPos?: number;
};

// ── Helper global: convierte cualquier valor a string seguro para React ──
const toStr = (v: any): string => {
  if (v === null || v === undefined) return "";
  if (typeof v === "object") return (v as any).valor ?? JSON.stringify(v);
  return String(v);
};

const WidgetRenderer: React.FC<Props> = ({
  widgets: initialWidgets,
  changedFields,
  nombrePlantilla = "Levantamiento de Requerimiento",
  onPaginationDone,
}) => {
  const [widgets, setWidgets] = useState<Widget[]>(
    Array.isArray(initialWidgets) ? initialWidgets : []
  );
  const [loading, setLoading] = useState(false);
  const [pages, setPages] = useState<BlockDef[][]>([]);
  const [measured, setMeasured] = useState(false);
  const measureRefs = useRef<(HTMLDivElement | null)[]>([]);
  const rowRefs = useRef<{ [widgetPos: number]: (HTMLDivElement | null)[] }>({});
  const w003RowRefs = useRef<{ [widgetPos: number]: (HTMLTableRowElement | null)[] }>({});
  const w006BlockRefs = useRef<{ [widgetPos: number]: (HTMLDivElement | null)[] }>({});
  const suppressSpinnerRef = useRef(false);

  const [showError, setShowError] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [localChangedFields, setLocalChangedFields] = useState<Set<string>>(new Set());

  const setNestedValue = (obj: any, path: string, value: any) => {
    const keys = path.split(".");
    const clone = Array.isArray(obj) ? [...obj] : { ...obj };
    let current = clone;

    keys.forEach((key, index) => {
      const isLast = index === keys.length - 1;
      const nextKey = keys[index + 1];
      const shouldBeArray = !isNaN(Number(nextKey));

      if (isLast) {
        current[key] = value;
      } else {
        const existing = current[key];
        if (Array.isArray(existing)) {
          current[key] = [...existing];
        } else if (existing && typeof existing === "object") {
          current[key] = { ...existing };
        } else {
          current[key] = shouldBeArray ? [] : {};
        }
        current = current[key];
      }
    });

    return clone;
  };

  const handleChange = (posicion: number, key: string, value: any) => {
    const path = `${posicion}.campos.${key}`;

    setLocalChangedFields((prev) => {
      const next = new Set(prev);
      next.add(path);
      return next;
    });

    setTimeout(() => {
      setLocalChangedFields((prev) => {
        const next = new Set(prev);
        next.delete(path);
        return next;
      });
    }, 1000);

    setWidgets((prev) =>
      prev.map((w) => {
        if (w.posicion !== posicion) return w;
        return {
          ...w,
          campos: key.includes(".")
            ? setNestedValue(w.campos || {}, key, value)
            : { ...w.campos, [key]: value },
        };
      })
    );
  };

  const sortedWidgets = useMemo(
    () => [...widgets].sort((a, b) => a.posicion - b.posicion),
    [widgets]
  );

  const isHighlighted = (path: string) => {
    const allChanged = [
      ...(changedFields ? Array.from(changedFields) : []),
      ...Array.from(localChangedFields),
    ];
    return allChanged.some(
      (changedPath) =>
        changedPath === path ||
        changedPath.startsWith(`${path}.`) ||
        path.startsWith(`${changedPath}.`)
    );
  };

  const highlight = (path: string) =>
    isHighlighted(path)
      ? "!bg-yellow-200 transition-all duration-700 rounded px-1"
      : "";

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
        }
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

  const renderWidget = (widget: Widget) => {
    switch (widget.id_widget) {
      case "w_000": return renderW000(widget, handleChange, highlight);
      case "w_001": return renderW001(widget, handleChange, highlight);
      case "w_002": return renderW002(widget, handleChange, highlight);
      case "w_003": return renderW003(widget, handleChange, highlight, false);
      case "w_004": return renderWChart(widget, handleChange);
      case "w_005": return renderW005(widget, handleChange, highlight);
      case "w_006": return renderW006(widget, handleChange, highlight);
      default: return null;
    }
  };

  const getW006LineItems = (widget: Widget) => {
    const bloques: any[] = widget.campos?.bloques ?? [];

    return bloques.flatMap((block: any, blockIdx: number) => {
      const texto = String(block.texto ?? "");
      const manualLines = texto
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean);

      const lineasDivididas = manualLines.flatMap((line) => {
        if (block.tipo === "subtitulo") return [line];

        const maxChars = 115;
        const partes: string[] = [];
        let restante = line;

        while (restante.length > maxChars) {
          let corte = restante.lastIndexOf(" ", maxChars);
          if (corte <= 0) corte = maxChars;
          partes.push(restante.slice(0, corte).trim());
          restante = restante.slice(corte).trim();
        }

        if (restante.length > 0) partes.push(restante);
        return partes;
      });

      return lineasDivididas.map((linea, lineIdx) => ({
        ...block,
        id: `${block.id ?? blockIdx}-line-${lineIdx}`,
        texto: linea,
        tipo: block.tipo,
        isContinuation: lineIdx > 0,
      }));
    });
  };

  const paginationKey = useMemo(() => {
    return JSON.stringify(
      sortedWidgets.map((w) => ({ id_widget: w.id_widget, posicion: w.posicion }))
    );
  }, [sortedWidgets]);

  const fitsInCurrentPage = (currentHeight: number, nextHeight: number) =>
    currentHeight + nextHeight <= USABLE_HEIGHT;

  useEffect(() => {
    setMeasured(false);
    setPages([]);
  }, [paginationKey]);

  useEffect(() => {
    const newWidgets = Array.isArray(initialWidgets) ? initialWidgets : [];
    setWidgets(newWidgets);
    setLocalChangedFields(new Set());
  }, [initialWidgets]);

  useEffect(() => {
    if (measured) return;

    if (sortedWidgets.length === 0) {
      setPages([[{ id: "intro", node: null }]]);
      setMeasured(true);
      onPaginationDone?.();
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

          // W003
          if (widget.id_widget === "w_003") {
            const filas: any[] = widget.campos?.filas ?? [];

            if (filas.length === 0) {
              const block: BlockDef = { id: `${widget.id_widget}-${widget.posicion}`, node: renderWidget(widget) };
              if (!fitsInCurrentPage(currentHeight, h) && currentPage.length > 0) {
                result.push(currentPage); currentPage = [block]; currentHeight = h;
              } else {
                currentPage.push(block); currentHeight += h;
              }
              return;
            }

            const rowHeights = (w003RowRefs.current[widget.posicion] ?? []).map((el) => el?.offsetHeight ?? 0);
            const TITLE_H = 70;
            const HEADER_H = 34;
            let currentChunk: number[] = [];
            let chunkHeight = TITLE_H + HEADER_H;
            let isFirst = true;

            const flushChunk = () => {
              if (currentChunk.length === 0) return;
              currentPage.push({
                id: `${widget.id_widget}-${widget.posicion}-chunk-${currentChunk[0]}`,
                chunkType: "w003",
                chunkRowIndices: [...currentChunk],
                chunkShowTitle: isFirst,
                chunkWidgetPos: widget.posicion,
              });
              currentHeight += chunkHeight;
              currentChunk = [];
              chunkHeight = HEADER_H;
              isFirst = false;
            };

            filas.forEach((_, rowIdx) => {
              const rh = rowHeights[rowIdx] ?? 34;
              if (currentChunk.length === 0 && !fitsInCurrentPage(currentHeight, chunkHeight + rh) && currentPage.length > 0) {
                result.push(currentPage); currentPage = []; currentHeight = 0;
              }
              if (currentChunk.length > 0 && !fitsInCurrentPage(currentHeight, chunkHeight + rh)) {
                flushChunk(); result.push(currentPage); currentPage = []; currentHeight = 0;
              }
              currentChunk.push(rowIdx);
              chunkHeight += rh;
            });

            flushChunk();
            return;
          }

          // W006
          if (widget.id_widget === "w_006") {
            const lineas = getW006LineItems(widget);

            if (lineas.length === 0) {
              const block: BlockDef = { id: `${widget.id_widget}-${widget.posicion}`, node: renderWidget(widget) };
              if (!fitsInCurrentPage(currentHeight, h) && currentPage.length > 0) {
                result.push(currentPage); currentPage = [block]; currentHeight = h;
              } else {
                currentPage.push(block); currentHeight += h;
              }
              return;
            }

            const lineHeights = (w006BlockRefs.current[widget.posicion] ?? []).map((el) => el?.offsetHeight ?? 0);
            const TITLE_H = 70;
            let currentChunk: number[] = [];
            let chunkHeight = TITLE_H;
            let isFirst = true;

            const flushChunk = () => {
              if (currentChunk.length === 0) return;
              currentPage.push({
                id: `${widget.id_widget}-${widget.posicion}-chunk-${currentChunk[0]}`,
                chunkType: "w006",
                chunkRowIndices: [...currentChunk],
                chunkShowTitle: isFirst,
                chunkWidgetPos: widget.posicion,
              });
              currentHeight += chunkHeight;
              currentChunk = [];
              chunkHeight = 0;
              isFirst = false;
            };

            lineas.forEach((_, lineIdx) => {
              const lh = lineHeights[lineIdx] ?? 22;
              if (currentChunk.length === 0 && !fitsInCurrentPage(currentHeight, chunkHeight + lh) && currentPage.length > 0) {
                result.push(currentPage); currentPage = []; currentHeight = 0;
              }
              if (currentChunk.length > 0 && !fitsInCurrentPage(currentHeight, chunkHeight + lh)) {
                flushChunk(); result.push(currentPage); currentPage = []; currentHeight = 0;
              }
              currentChunk.push(lineIdx);
              chunkHeight += lh;
            });

            flushChunk();
            return;
          }

          // W005
          if (widget.id_widget === "w_005") {
            const filas: any[] = widget.campos?.filas ?? [];

            if (filas.length === 0) {
              const block: BlockDef = { id: `${widget.id_widget}-${widget.posicion}`, node: renderWidget(widget) };
              if (!fitsInCurrentPage(currentHeight, h) && currentPage.length > 0) {
                result.push(currentPage); currentPage = [block]; currentHeight = h;
              } else {
                currentPage.push(block); currentHeight += h;
              }
              return;
            }

            const rowHeights = (rowRefs.current[widget.posicion] ?? []).map((el) => el?.offsetHeight ?? 0);
            const TITLE_H = 40;
            let currentChunk: number[] = [];
            let chunkHeight = TITLE_H;
            let isFirst = true;

            const flushChunk = () => {
              if (currentChunk.length === 0) return;
              currentPage.push({
                id: `${widget.id_widget}-${widget.posicion}-linechunk-${currentChunk[0]}`,
                chunkType: "w005",
                chunkRowIndices: [...currentChunk],
                chunkShowTitle: isFirst,
                chunkWidgetPos: widget.posicion,
              });
              currentHeight += chunkHeight;
              currentChunk = [];
              chunkHeight = 0;
              isFirst = false;
            };

            filas.forEach((_, rowIdx) => {
              const rh = rowHeights[rowIdx] ?? 30;
              if (currentChunk.length === 0 && !fitsInCurrentPage(currentHeight, chunkHeight + rh) && currentPage.length > 0) {
                result.push(currentPage); currentPage = []; currentHeight = 0;
              }
              if (currentChunk.length > 0 && !fitsInCurrentPage(currentHeight, chunkHeight + rh)) {
                flushChunk(); result.push(currentPage); currentPage = []; currentHeight = 0;
              }
              currentChunk.push(rowIdx);
              chunkHeight += rh;
            });

            flushChunk();
            return;
          }

          // Resto
          const node = renderWidget(widget);
          if (!node) return;

          const block: BlockDef = { id: `${widget.id_widget}-${widget.posicion}`, node: null };
          if (!fitsInCurrentPage(currentHeight, h) && currentPage.length > 0) {
            result.push(currentPage); currentPage = [block]; currentHeight = h;
          } else {
            currentPage.push(block); currentHeight += h;
          }
        });

        if (currentPage.length > 0) result.push(currentPage);
        setPages(result);
        setMeasured(true);
        suppressSpinnerRef.current = false;
        onPaginationDone?.();
      });
    });

    return () => cancelAnimationFrame(raf);
  }, [sortedWidgets, measured]);

  // ── Renders parciales ──

  const renderW003Partial = (widget: Widget, filasParciales: any[], showTitle: boolean) => {
    const campos = widget.campos || {};
    const defaultHeaders = campos.filas?.[0]
      ? Object.keys(campos.filas[0]).map((k: string) => ({ key: k, label: k }))
      : [
          { key: "TIPO", label: "Riesgo" },
          { key: "PROBABLE_PERDIDA", label: "Probable Pérdida" },
          { key: "JUSTIFICACION", label: "Justificación" },
        ];
    const headers = campos.headers || defaultHeaders;
    const titulo = campos.titulo || widget.titulo || "Riesgos";

    return (
      <div className="mb-8">
        {showTitle && (
          <div className="mb-4 mt-5 flex items-center gap-2">
            <span className="flex items-center gap-1 text-[18px]">
              <span>{widget.posicion}.</span>
              <span className="font-semibold">{titulo}</span>
            </span>
            <span className="text-[11px] text-red-600">(Opcional)</span>
          </div>
        )}
        <div className="overflow-x-auto">
          <table className="mb-8 w-full border border-black text-[13px]">
            <thead>
              <tr className="bg-[#133b73] text-white">
                {headers.map((h: any) => (
                  <th key={h.key} className="border px-3 py-1 min-w-[120px] whitespace-normal break-words">
                    {h.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filasParciales.length ? (
                filasParciales.map((fila: any, rowIdx: number) => (
                  <tr key={rowIdx}>
                    {headers.map((h: any) => (
                      <td key={h.key} className={`border px-2 py-1 align-top ${highlight(`${widget.posicion}.campos.filas.${rowIdx}.${h.key}`)}`}>
                        {toStr(fila[h.key])}
                      </td>
                    ))}
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={headers.length} className="border text-center py-2 text-gray-400">N/A</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const renderFormattedW006Text = (texto: string) => {
    const lines = String(texto ?? "")
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);

    const elements: React.ReactNode[] = [];
    let i = 0;

    while (i < lines.length) {
      const line = lines[i];
      const numberedMatch = line.match(/^(\d+)\.\s+(.+)$/);

      if (numberedMatch) {
        elements.push(
          <ol key={`ol-${i}`} start={Number(numberedMatch[1])} className="list-decimal ml-8 pl-3 mb-1 space-y-1">
            <li className="pl-1">{numberedMatch[2]}</li>
          </ol>
        );
        i++;
        continue;
      }

      if (/^-\s+/.test(line)) {
        const items: string[] = [];
        while (i < lines.length && /^-\s+/.test(lines[i])) {
          items.push(lines[i].replace(/^-\s+/, ""));
          i++;
        }
        elements.push(
          <ul key={`ul-${i}`} className="list-disc pl-6 space-y-1">
            {items.map((item, idx) => <li key={idx}>{item}</li>)}
          </ul>
        );
        continue;
      }

      elements.push(<p key={`p-${i}`} className="mb-1">{line}</p>);
      i++;
    }

    return <>{elements}</>;
  };

  const renderW006Partial = (widget: Widget, bloquesParciales: any[], showTitle: boolean) => {
    const campos = widget.campos || {};
    const titulo = campos.titulo || widget.titulo || "Título de la sección";

    return (
      <div className="mb-8">
        {showTitle && (
          <div className="mb-4 mt-6">
            <div className="flex items-start gap-3 border-t-2 border-black pt-2 w-full">
              <span className="text-[18px] shrink-0">{widget.posicion}.</span>
              <div className="flex-1 min-w-0">
                <span className="font-bold text-[18px]">{titulo}</span>
              </div>
              <span className="text-[11px] shrink-0 ml-2 mt-1 text-red-600">(Opcional)</span>
            </div>
          </div>
        )}
        <div className="flex flex-col">
          {bloquesParciales.map((block: any, index: number) => (
            <div key={block.id || index} className="mb-2">
              <div
                className={`${
                  block.tipo === "subtitulo"
                    ? "font-bold text-[14px] text-black"
                    : "text-[13px] italic text-[#1d5da8] leading-snug"
                } ${highlight(`${widget.posicion}.campos.bloques`)}`}
              >
                {renderFormattedW006Text(block.texto)}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderW005Partial = (widget: Widget, filas: any[], showTitle: boolean) => {
    const titulo = widget.campos?.titulo || widget.titulo || "";
    return (
      <div className="mb-4">
        {showTitle && (
          <div className="mb-4 mt-5 flex items-center gap-2">
            <span className="flex items-center gap-1 text-[18px]">
              <span>{widget.posicion}.</span>
              <span className="font-semibold">{titulo}</span>
            </span>
          </div>
        )}
        <div className="border border-black text-[13px]">
          {filas.map((fila: any, rowIdx: number) => {
            const celdas = fila?.celdas ?? [];
            return (
              <div
                key={rowIdx}
                className="flex w-full"
                style={{ borderBottom: rowIdx < filas.length - 1 ? "1px solid black" : "none" }}
              >
                {celdas.map((cel: any, celIdx: number) => {
                  const labelTexto = toStr(cel.label);
                  const valorTexto = toStr(cel.valor);
                  return (
                    <div
                      key={celIdx}
                      className="px-2 py-1 break-words min-w-0"
                      style={{
                        flex: cel.colspan ?? 1,
                        borderRight: celIdx < celdas.length - 1 ? "1px solid black" : "none",
                      }}
                    >
                      {labelTexto !== "" && (
                        <div className={`text-[11px] text-gray-500 ${highlight(`${widget.posicion}.campos.filas.${rowIdx}.celdas.${celIdx}.label`)}`}>
                          {labelTexto}
                        </div>
                      )}
                      <div className={`${cel.bold ? "font-bold" : ""} ${highlight(`${widget.posicion}.campos.filas.${rowIdx}.celdas.${celIdx}.valor`)}`}>
                        {valorTexto}
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // ── Fase 1: render invisible para medir alturas ──
  if (!measured) {
    return (
      <div className="w-full bg-[#ececec] py-8 px-4">
        {suppressSpinnerRef.current ? (
          <>
            {pages.map((pageBlocks, pageIndex) => (
              <div key={pageIndex} data-pdf-page className="mx-auto mb-8 w-[816px] border border-gray-300 bg-white shadow-md" style={{ height: "1056px", overflow: "hidden" }}>
                <div className="h-[110px] border-b border-[#b9a89f]">
                  <div className="flex items-center justify-between px-12 py-7">
                    <div className="text-[22px] font-semibold leading-none text-[#7c7c7c]">
                      <span>Formato Estándar | </span>
                      <span className="font-normal">{nombrePlantilla}</span>
                    </div>
                    <img src="/images/rayaNegra.png" alt="Encabezado" className="h-[45px] object-cover" />
                  </div>
                </div>
                <div className="text-black text-[13px] leading-[1.28]" style={{ height: "856px", overflow: "hidden", paddingTop: `${CONTENT_PADDING_TOP}px`, paddingBottom: `${CONTENT_PADDING_BOTTOM}px`, paddingLeft: "47px", paddingRight: "51px", boxSizing: "border-box" }}>
                  {pageIndex === 0 && (
                    <p className="mb-8 text-[13px] leading-[1.2]">
                      Este cuestionario tiene como propósito conocer cuáles son los beneficios, costos y riesgos relacionados con cada iniciativa que ingresa al portafolio de proyectos y mantenimientos tecnológicos de Áreas de Soporte. Esta información será de utilidad para ponderar el portafolio en su conjunto y priorizar la atención de los requerimientos de acuerdo a su beneficio económico, alineación estratégica y conveniencia de su realización.
                    </p>
                  )}
                  {pageBlocks.map((block) => {
                    if (block.id === "intro") return null;
                    if (block.chunkType) {
                      const widget = sortedWidgets.find(w => w.posicion === block.chunkWidgetPos);
                      if (!widget) return null;
                      if (block.chunkType === "w003") {
                        const filas = widget.campos?.filas ?? [];
                        const chunkFilas = block.chunkRowIndices!.map(idx => filas[idx]).filter(Boolean);
                        return <div key={block.id}>{renderW003Partial(widget, chunkFilas, block.chunkShowTitle!)}</div>;
                      }
                      if (block.chunkType === "w005") {
                        const filas = widget.campos?.filas ?? [];
                        const chunkFilas = block.chunkRowIndices!.map(idx => filas[idx]).filter(Boolean);
                        return <div key={block.id}>{renderW005Partial(widget, chunkFilas, block.chunkShowTitle!)}</div>;
                      }
                      if (block.chunkType === "w006") {
                        const lineas = getW006LineItems(widget);
                        const chunkLineas = block.chunkRowIndices!.map(idx => lineas[idx]).filter(Boolean);
                        return <div key={block.id}>{renderW006Partial(widget, chunkLineas, block.chunkShowTitle!)}</div>;
                      }
                    }
                    const widget = sortedWidgets.find(w => `${w.id_widget}-${w.posicion}` === block.id);
                    return <div key={block.id}>{widget ? renderWidget(widget) : null}</div>;
                  })}
                </div>
                <div className="flex h-[90px] items-center px-6">
                  <img src="/images/banortegf.png" alt="Footer Banorte" className="h-[65px] object-contain" />
                </div>
              </div>
            ))}
          </>
        ) : (
          <div className="flex items-center justify-center py-16 text-sm text-gray-400">
            <svg className="mr-2 h-5 w-5 animate-spin text-[#EB0029]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
            </svg>
            Calculando paginación...
          </div>
        )}

        {/* Medición invisible — siempre presente */}
        <div aria-hidden="true" style={{ position: "absolute", top: 0, left: "-9999px", visibility: "hidden", pointerEvents: "none", width: "716px", zIndex: -1 }}>
          <div ref={(el) => { measureRefs.current[0] = el; }}>
            <p className="mb-8 text-[13px] leading-[1.2]">
              Este cuestionario tiene como propósito conocer cuáles son los beneficios, costos y riesgos relacionados con cada iniciativa que ingresa al portafolio de proyectos y mantenimientos tecnológicos de Áreas de Soporte. Esta información será de utilidad para ponderar el portafolio en su conjunto y priorizar la atención de los requerimientos de acuerdo a su beneficio económico, alineación estratégica y conveniencia de su realización.
            </p>
          </div>
          {sortedWidgets.map((widget, i) => (
            <div key={`${widget.id_widget}-${widget.posicion}`} ref={(el) => { measureRefs.current[i + 1] = el; }}>
              {renderWidget(widget)}
            </div>
          ))}

          {/* Medición W003 */}
          {sortedWidgets.filter((w) => w.id_widget === "w_003").map((widget) => {
            const campos = widget.campos || {};
            const filas = campos.filas ?? [];
            const defaultHeaders = campos.filas?.[0]
              ? Object.keys(campos.filas[0]).map((k: string) => ({ key: k, label: k }))
              : [{ key: "TIPO", label: "Riesgo" }, { key: "PROBABLE_PERDIDA", label: "Probable Pérdida" }, { key: "JUSTIFICACION", label: "Justificación" }];
            const headers = campos.headers || defaultHeaders;
            if (!w003RowRefs.current[widget.posicion]) w003RowRefs.current[widget.posicion] = [];
            return (
              <table key={`w003-rows-${widget.posicion}`} className="w-full text-[13px]">
                <tbody>
                  {filas.map((fila: any, rowIdx: number) => (
                    <tr key={rowIdx} ref={(el) => { w003RowRefs.current[widget.posicion][rowIdx] = el; }}>
                      {headers.map((h: any) => (
                        <td key={h.key} className="px-2 py-1 align-top">{toStr(fila[h.key])}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            );
          })}

          {/* Medición W005 — usa toStr en label y valor */}
          {sortedWidgets.filter((w) => w.id_widget === "w_005").map((widget) => {
            const filas = widget.campos?.filas ?? [];
            if (!rowRefs.current[widget.posicion]) rowRefs.current[widget.posicion] = [];
            return (
              <div key={`rows-${widget.posicion}`}>
                {filas.map((fila: any, rowIdx: number) => {
                  const celdas = fila?.celdas ?? [];
                  return (
                    <div
                      key={rowIdx}
                      ref={(el) => { rowRefs.current[widget.posicion][rowIdx] = el; }}
                      className="flex w-full border-b border-black text-[13px]"
                    >
                      {celdas.map((cel: any, celIdx: number) => {
                        const labelTexto = toStr(cel.label);
                        const valorTexto = toStr(cel.valor);
                        return (
                          <div key={celIdx} className="px-2 py-1" style={{ flex: cel.colspan ?? 1 }}>
                            {labelTexto !== "" && (
                              <div className="text-[11px] text-gray-500">{labelTexto}</div>
                            )}
                            <div className={cel.bold ? "font-bold" : ""}>{valorTexto}</div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
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
                <span className="font-normal">{nombrePlantilla}</span>
              </div>
              <img src="/images/rayaNegra.png" alt="Encabezado" className="h-[45px] object-cover" />
            </div>
          </div>

          {/* Contenido */}
          <div
            className="text-black text-[13px] leading-[1.28]"
            style={{
              height: "856px",
              overflow: "hidden",
              paddingTop: `${CONTENT_PADDING_TOP}px`,
              paddingBottom: `${CONTENT_PADDING_BOTTOM}px`,
              paddingLeft: "47px",
              paddingRight: "51px",
              boxSizing: "border-box",
            }}
          >
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

              if (block.chunkType) {
                const widget = sortedWidgets.find(w => w.posicion === block.chunkWidgetPos);
                if (!widget) return null;

                if (block.chunkType === "w003") {
                  const filas = widget.campos?.filas ?? [];
                  const chunkFilas = block.chunkRowIndices!.map(idx => filas[idx]).filter(Boolean);
                  return <div key={block.id}>{renderW003Partial(widget, chunkFilas, block.chunkShowTitle!)}</div>;
                }
                if (block.chunkType === "w005") {
                  const filas = widget.campos?.filas ?? [];
                  const chunkFilas = block.chunkRowIndices!.map(idx => filas[idx]).filter(Boolean);
                  return <div key={block.id}>{renderW005Partial(widget, chunkFilas, block.chunkShowTitle!)}</div>;
                }
                if (block.chunkType === "w006") {
                  const lineas = getW006LineItems(widget);
                  const chunkLineas = block.chunkRowIndices!.map(idx => lineas[idx]).filter(Boolean);
                  return <div key={block.id}>{renderW006Partial(widget, chunkLineas, block.chunkShowTitle!)}</div>;
                }
              }

              const widget = sortedWidgets.find(w => `${w.id_widget}-${w.posicion}` === block.id);
              return <div key={block.id}>{widget ? renderWidget(widget) : null}</div>;
            })}
          </div>

          {/* Footer */}
          <div className="flex h-[90px] items-center px-6">
            <img src="/images/banortegf.png" alt="Footer Banorte" className="h-[65px] object-contain" />
          </div>
        </div>
      ))}

      {/* POPUP ÉXITO */}
      {showSuccess && (
        <div className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm bg-black/30">
          <div className="relative bg-white rounded-2xl shadow-2xl border border-gray-100 w-[520px] p-10 flex flex-col items-center text-center">
            <button onClick={() => setShowSuccess(false)} className="absolute top-4 right-5 text-gray-400 hover:text-black text-lg">✕</button>
            <div className="mb-5">
              <img src="/images/OpExitosa.png" alt="Operación exitosa" className="w-20 h-20 object-contain" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-3">Cambios guardados</h2>
            <p className="text-gray-500 text-sm mb-2">Tu documento ha sido guardado exitosamente el día:</p>
            <p className="text-gray-800 font-bold text-base mb-8">
              {new Date()
                .toLocaleDateString("es-MX", { weekday: "long", day: "2-digit", month: "2-digit", year: "numeric" })
                .replace(/^\w/, (c) => c.toUpperCase())}
            </p>
            <button onClick={() => setShowSuccess(false)} className="bg-[#EB0029] text-white px-16 py-3 rounded-xl font-semibold text-base hover:opacity-90 transition">
              Confirmar
            </button>
          </div>
        </div>
      )}

      {/* POPUP ERROR */}
      {showError && (
        <div className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm bg-black/30">
          <div className="relative bg-white rounded-2xl shadow-2xl border border-gray-100 w-[520px] p-10 flex flex-col items-center text-center">
            <button onClick={() => setShowError(false)} className="absolute top-4 right-5 text-gray-400 hover:text-black text-lg">✕</button>
            <div className="mb-5">
              <img src="/images/Error.png" alt="Error" className="w-20 h-20 object-contain" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-3">Error al guardar</h2>
            <p className="text-gray-500 text-sm mb-8">No se pudo guardar. Por favor intenta de nuevo.</p>
            <button onClick={() => setShowError(false)} className="bg-[#EB0029] text-white px-16 py-3 rounded-xl font-semibold text-base hover:opacity-90 transition">
              Aceptar
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default WidgetRenderer;