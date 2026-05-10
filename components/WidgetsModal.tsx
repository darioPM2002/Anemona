"use client";

import { useEffect, useRef, useState } from "react";
import { LayoutGrid } from "lucide-react";
import widgetList from "./widgetlist.json";
import {
  renderW000,
  renderW001,
  renderW002,
  renderW003,
  Widget,
} from "./widgets/BibliotecaWidgets";
import { API_URL } from "@/services/api";

type WidgetsModalProps = {
  isOpen: boolean;
  onClose: () => void;
  widgets: Widget[];
  onWidgetsChange?: (widgets: Widget[]) => void;
};

function renderWidgetNode(
  w: Widget,
  onChange: (posicion: number, key: string, value: string) => void
) {
  switch (w.id_widget) {
    case "w_000": return renderW000(w, onChange);
    case "w_001": return renderW001(w, onChange);
    case "w_002": return renderW002(w, onChange);
    case "w_003": return renderW003(w, onChange);
    default: return <div className="text-[13px] italic text-gray-400">Widget no reconocido: {w.id_widget}</div>;
  }
}

export default function WidgetsModal({ isOpen, onClose, widgets, onWidgetsChange }: WidgetsModalProps) {
  type DocWidget = Widget & { _isNew?: boolean };
  const [docWidgets, setDocWidgets] = useState<DocWidget[]>(widgets);
  const [dropIndex, setDropIndex] = useState<number | null>(null);
  const [draggingWidget, setDraggingWidget] = useState<(typeof widgetList)[number] | null>(null);
  const [saving, setSaving] = useState(false);

  // ID del último widget añadido por drag — se resalta en amarillo hasta guardar
  //const [newWidgetIndices, setNewWidgetIndices] = useState<Set<number>>(new Set());

  // Para drag and drop de reordenamiento en el panel izquierdo
  const [draggingDocIndex, setDraggingDocIndex] = useState<number | null>(null);
  const [reorderDropIndex, setReorderDropIndex] = useState<number | null>(null);

  useEffect(() => {
  if (isOpen) {
    setDocWidgets(widgets);
  }
}, [isOpen]);

  function handleChange(index: number, key: string, value: any) {
  setDocWidgets((prev) => {
    const updated = prev.map((w, i) => {
      if (i !== index) return w;
      return { ...w, campos: { ...w.campos, [key]: value } };
    });
    setTimeout(() => {
      onWidgetsChange?.(updated.map(({ _isNew, ...w }) => w));
    }, 0);
    return updated;
  });
}

  // Inserta widget del panel derecho en posición exacta
  function handleDrop(insertAtIndex: number) {
    if (!draggingWidget) return;

    const newWidget: DocWidget = {
      posicion: insertAtIndex,
      id_widget: draggingWidget.id_widget,
      titulo: draggingWidget.titulo,
      objetivo_widget: draggingWidget.objetivo_widget,
      descripcion_campos: Object.fromEntries(
  Object.entries(draggingWidget.descripcion_campos || {}).filter(
    ([_, v]) => typeof v === "string"
  )
),
        campos: { ...draggingWidget.campos } as Record<string, any>,
      _isNew: true, // <- agrega esto
    };
    // borra el setNewWidgetIndices que viene después

    setDocWidgets((prev) => {
      const next = [...prev];
      next.splice(insertAtIndex, 0, newWidget);
      return next.map((w, i) => ({ ...w, posicion: i }));
    });

    setDraggingWidget(null);
    setDropIndex(null);
  }

  // Reordena widgets del panel izquierdo
  function handleReorderDrop(targetIndex: number) {
    if (draggingDocIndex === null || draggingDocIndex === targetIndex) {
      setDraggingDocIndex(null);
      setReorderDropIndex(null);
      return;
    }

    setDocWidgets((prev) => {
      const next = [...prev];
      const [moved] = next.splice(draggingDocIndex, 1);
      const adjustedTarget = draggingDocIndex < targetIndex ? targetIndex - 1 : targetIndex;
      next.splice(adjustedTarget, 0, moved);
      return next.map((w, i) => ({ ...w, posicion: i }));
    });


    setDraggingDocIndex(null);
    setReorderDropIndex(null);
  }

  async function handleSave() {
    const docId = sessionStorage.getItem("project_id") || "";
    if (!docId) { alert("No hay proyecto activo"); return; }
    

    setSaving(true);
    try {
      
      const payload = docWidgets.map(({ _isNew, ...w }) => w);
      console.log("💾 GUARDANDO PLANTILLA:");
      console.log(JSON.stringify(payload, null, 2)); // <- usa payload

      const res = await fetch(
        `${API_URL}/widgets/modificar/${encodeURIComponent(docId)}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );

      if (!res.ok) throw new Error("Error al guardar");

      setDocWidgets((prev) => prev.map(w => ({ ...w, _isNew: false })));


      // Al guardar exitosamente, quita el resaltado amarillo
      alert("✅ Plantilla guardada correctamente");
      window.dispatchEvent(new CustomEvent("ers-refresh")); // <- agrega esto
    } catch (e) {
      console.error(e);
      alert("❌ Error al guardar la plantilla");
    } finally {
      setSaving(false);
    }
  }

  if (!isOpen) return null;

  // Determina si un widget es el recién añadido (amarillo)
  // Usamos el índice del último elemento añadido como proxy

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm bg-black/30">
      <div className="relative w-[1300px] h-[800px] rounded-2xl bg-white shadow-2xl border border-gray-100 overflow-hidden flex flex-col p-8">

        <img src="/images/RedBob.png" className="absolute -top-16 -right-10 w-52 pointer-events-none select-none z-0" alt="" />
        <img src="/images/GreyBob.png" className="absolute top-1/2 -right-10 -translate-y-1/2 w-36 pointer-events-none select-none z-0" alt="" />
        <img src="/images/banortegf.png" className="absolute bottom-3 left-4 w-60 pointer-events-none select-none z-0" alt="" />

        <button onClick={onClose} className="absolute top-4 right-5 z-10 rounded-md px-2 py-1 text-gray-400 hover:bg-gray-100 hover:text-black transition text-lg">✕</button>

        <div className="relative z-10 flex space-x-6 h-full">

          {/* ── Panel izquierdo ── */}
          <div className="flex flex-col flex-1 min-w-0">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-[#EB0029]">Modifica tu plantilla</h2>
                <p className="text-sm text-gray-400 mt-0.5">Arrastra widgets para añadir o reordenar</p>
              </div>
              <button
                onClick={handleSave}
                disabled={saving}
                className="bg-[#EB0029] text-white px-6 py-2 rounded-xl font-semibold hover:opacity-90 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? "Guardando..." : "Guardar plantilla"}
              </button>
            </div>

            <div className="flex-1 rounded-3xl bg-[#ececec] overflow-auto border-2 border-dashed border-blue-200">
              <div className="w-full py-8 px-4">
                <div className="mx-auto w-[816px] border border-gray-300 bg-white shadow-md">

                  {/* Header */}
                  <div className="h-[110px] border-b border-[#b9a89f]">
                    <div className="flex items-center justify-between px-12 py-7">
                      <div className="text-[22px] font-semibold leading-none text-[#7c7c7c]">
                        <span>Formato Estándar | </span>
                        <span className="font-normal">Levantamiento de Requerimiento</span>
                      </div>
                      <img src="/images/rayaNegra.png" alt="" className="h-[45px] object-cover" />
                    </div>
                  </div>

                  {/* Contenido */}
                  <div
                    className="text-black text-[13px] leading-[1.28]"
                    style={{ paddingTop: "24px", paddingBottom: "24px", paddingLeft: "47px", paddingRight: "51px" }}
                  >
                    <p className="mb-8 text-[13px] leading-[1.2]">
                      Este cuestionario tiene como propósito conocer cuáles son los beneficios,
                      costos y riesgos relacionados con cada iniciativa que ingresa al
                      portafolio de proyectos y mantenimientos tecnológicos de Áreas de
                      Soporte. Esta información será de utilidad para ponderar el portafolio
                      en su conjunto y priorizar la atención de los requerimientos de acuerdo
                      a su beneficio económico, alineación estratégica y conveniencia de su
                      realización.
                    </p>

                    {/* Drop zone para nuevo widget antes del primero */}
                    <DropZone
                      index={0}
                      isActive={dropIndex === 0}
                      isDragging={!!draggingWidget}
                      onDragOver={() => setDropIndex(0)}
                      onDragLeave={() => setDropIndex(null)}
                      onDrop={() => handleDrop(0)}
                    />

                    {docWidgets.map((widget, i) => {
                      const isNew = !!(widget as DocWidget)._isNew;
                      const isReorderTarget = reorderDropIndex === i && draggingDocIndex !== null;

                      return (
                        <div key={`${widget.id_widget}-${i}`}>
                          {/* Indicador de reordenamiento */}
                          {isReorderTarget && (
                            <div className="h-1 bg-blue-500 rounded my-1 transition-all" />
                          )}

                          {/* Cápsula — amarilla si es nuevo, azul si ya existía */}
                          <div
                            draggable
                            onDragStart={() => setDraggingDocIndex(i)}
                            onDragEnd={() => { setDraggingDocIndex(null); setReorderDropIndex(null); }}
                            onDragOver={(e) => {
                              e.preventDefault();
                              if (draggingDocIndex !== null) setReorderDropIndex(i);
                            }}
                            onDrop={(e) => { e.preventDefault(); handleReorderDrop(i); }}
                            className={`relative rounded-xl border-2 mb-2 cursor-grab active:cursor-grabbing transition-all
                              ${isNew
                                ? "border-yellow-400 bg-yellow-50/40"
                                : "border-blue-300 bg-blue-50/20"
                              }
                              ${draggingDocIndex === i ? "opacity-40 scale-[0.98]" : ""}
                            `}
                          >
                            {/* Badge título */}
                            <div className={`absolute -top-3 left-4 text-white text-[10px] font-semibold px-3 py-[2px] rounded-full shadow-sm z-10
  ${isNew ? "bg-yellow-500" : "bg-blue-500"}
`}>
                              {widget.titulo}
                              {isNew && <span className="ml-1 opacity-75">· unsaved</span>}
                            </div>

                            {/* Icono drag */}
                            <div className="absolute top-2 right-3 text-gray-300 text-sm select-none">⠿</div>

                            <div className="pt-5 px-2 pb-2">
                              {renderWidgetNode(widget, (posicion, key, value) => handleChange(i, key, value))}
                            </div>

                            </div> 

                          {/* Drop zone para nuevo widget (desde panel derecho) */}
                          <DropZone
                            index={i + 1}
                            isActive={dropIndex === i + 1}
                            isDragging={!!draggingWidget}
                            onDragOver={() => setDropIndex(i + 1)}
                            onDragLeave={() => setDropIndex(null)}
                            onDrop={() => handleDrop(i + 1)}
                          />
                        </div>
                      );
                    })}
                  </div>

                  {/* Footer */}
                  <div className="flex h-[90px] items-center px-6">
                    <img src="/images/banortegf.png" alt="" className="h-[65px] object-contain" />
                  </div>
                </div>

                {draggingWidget && (
                  <div className="mt-4 text-center text-sm text-blue-500 animate-pulse font-medium">
                    ⠿ Arrastrando: "{draggingWidget.titulo}" — suéltalo entre los widgets
                  </div>
                )}
                {draggingDocIndex !== null && (
                  <div className="mt-4 text-center text-sm text-purple-500 animate-pulse font-medium">
                    ⠿ Reordenando: "{docWidgets[draggingDocIndex]?.titulo}" — suéltalo donde quieras
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ── Panel derecho ── */}
          <div className="flex flex-col w-[320px] shrink-0">
            <div className="mb-3 flex items-center gap-2">
              <LayoutGrid size={20} className="text-[#EB0029]" />
              <h2 className="text-2xl font-bold text-gray-800">Mis Widgets</h2>
            </div>

            <div className="flex-1 rounded-3xl bg-[#f9f9f9] p-4 flex flex-col gap-4 overflow-auto">
              {widgetList.map((widget) => (
                <div
                  key={widget.id_widget}
                  draggable
                  onDragStart={() => { setDraggingWidget(widget); setDraggingDocIndex(null); }}
                  onDragEnd={() => { setDraggingWidget(null); setDropIndex(null); }}
                  className={`w-full rounded-xl bg-white border shadow-sm cursor-grab active:cursor-grabbing select-none transition overflow-hidden
                    ${draggingWidget?.id_widget === widget.id_widget
                      ? "opacity-50 scale-95 border-blue-300"
                      : "border-gray-200 hover:shadow-md hover:border-blue-200"
                    }`}
                >
                  <div className="flex items-center gap-2 px-4 py-2 border-b border-gray-100 bg-gray-50">
                    <span className="text-gray-300 text-base select-none">⠿</span>
                    <span className="text-sm font-semibold text-gray-700">{widget.titulo}</span>
                  </div>
                  <ScaledWidgetPreview widget={widget as unknown as Widget} />
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

function DropZone({ index, isActive, isDragging, onDragOver, onDragLeave, onDrop }: {
  index: number; isActive: boolean; isDragging: boolean;
  onDragOver: () => void; onDragLeave: () => void; onDrop: () => void;
}) {
  return (
    <div
      onDragOver={(e) => { e.preventDefault(); onDragOver(); }}
      onDragLeave={onDragLeave}
      onDrop={(e) => { e.preventDefault(); onDrop(); }}
      className={`w-full transition-all duration-150 flex items-center justify-center rounded-lg
        ${isDragging
          ? isActive
            ? "h-14 my-2 border-2 border-blue-500 bg-blue-100 shadow-inner"
            : "h-4 my-1 border border-dashed border-blue-300 bg-blue-50/30"
          : "h-0 overflow-hidden border-0"
        }`}
    >
      {isActive && <span className="text-xs font-semibold text-blue-500">＋ Suelta aquí</span>}
    </div>
  );
}

const SCALE = 0.34;
const DOC_WIDTH = 816;
const noop = () => {};

function ScaledWidgetPreview({ widget }: { widget: Widget }) {
  const innerRef = useRef<HTMLDivElement>(null);
  const [innerHeight, setInnerHeight] = useState(180);

  useEffect(() => {
    if (innerRef.current) setInnerHeight(innerRef.current.scrollHeight);
  }, []);

  return (
    <div style={{ width: "100%", height: `${innerHeight * SCALE}px`, overflow: "hidden", position: "relative" }}>
      <div style={{ width: `${DOC_WIDTH}px`, transform: `scale(${SCALE})`, transformOrigin: "top left", position: "absolute", top: 0, left: 0 }}>
        <div ref={innerRef} className="text-black text-[13px] leading-[1.28] bg-white"
          style={{ paddingTop: "16px", paddingBottom: "16px", paddingLeft: "47px", paddingRight: "51px" }}>
          {renderWidgetNode(widget, noop)}
        </div>
      </div>
    </div>
  );
}