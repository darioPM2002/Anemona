"use client";

// ─── Relaciones con otros archivos ───────────────────────────────────────────
// - Usa DynamicVisor.tsx (WidgetRenderer) para mostrar el documento
// - Usa WidgetsModal.tsx para el modal de widgets arrastrables
// - Lee sessionStorage["project_id"] para saber qué doc cargar de Firestore
// - Detecta cambios del chat y los pasa como changedFields a WidgetRenderer
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useRef, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Download,
  CheckCircle,
  X,
  Mail,
  Loader2,
} from "lucide-react";
import WidgetRenderer from "./DynamicVisor";
import WidgetsModal from "./WidgetsModal";
import { Widget } from "./widgets/BibliotecaWidgets";
import ArquitecturaDiagram from "./ArquitecturaDiagram";
import { API_URL } from "@/services/api";

const API_BASE = `${API_URL}`;

const DOC_NAMES: Record<"ERS" | "Análisis" | "Arquitectura", string> = {
  ERS: "Documento ERS",
  Análisis: "Documento de Análisis",
  Arquitectura: "Diseño de Arquitectura",
};

function DownloadPopup({ docName, onClose }: { docName: string; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <div className="relative mx-4 flex min-w-[300px] max-w-sm animate-in zoom-in fade-in flex-col items-center gap-4 rounded-2xl bg-white p-8 shadow-2xl duration-200">
        <button onClick={onClose} className="absolute top-3 right-3 text-gray-400 transition hover:text-gray-600">
          <X size={18} />
        </button>

        <img src="/images/OpExitosa.png" alt="Operación exitosa" className="w-24 h-24 object-contain" />

        <div className="text-center">
          <h2 className="mb-1 text-lg font-bold text-gray-800">¡Descarga exitosa!</h2>
          <p className="text-sm text-gray-500">
            <span className="font-semibold text-gray-700">{docName}</span> se ha descargado correctamente.
          </p>
        </div>
        <button onClick={onClose} className="bg-[#EB0029] text-white font-semibold text-sm px-8 py-3 rounded-lg hover:bg-red-700 transition">
          Aceptar
        </button>
      </div>
    </div>
  );
}

function EmailPopup({ success, message, onClose }: { success: boolean; message: string; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <div className="relative mx-4 flex min-w-[300px] max-w-sm animate-in zoom-in fade-in flex-col items-center gap-4 rounded-2xl bg-white p-8 shadow-2xl duration-200">
        <button onClick={onClose} className="absolute top-3 right-3 text-gray-400 transition hover:text-gray-600">
          <X size={18} />
        </button>
        <img
          src={success ? "/images/OpExitosa.png" : "/images/Error.png"}
          alt={success ? "Operación exitosa" : "Error"}
          className="w-24 h-24 object-contain"
        />
        <div className="text-center">
          <h2 className="mb-1 text-lg font-bold text-gray-800">
            {success ? "¡Correo enviado!" : "Error al enviar"}
          </h2>
          <p className="text-sm text-gray-500">{message}</p>
        </div>
         <button onClick={onClose} className="bg-[#EB0029] text-white font-semibold text-sm px-8 py-3 rounded-lg hover:bg-red-700 transition">
          Aceptar
        </button>
      </div>
    </div>
  );
}

export default function Documentacion({ expanded, onToggle }: { expanded: boolean; onToggle: () => void }) {
  const [tab, setTab] = useState<"ERS" | "Análisis" | "Arquitectura">("ERS");
  const [showPopup, setShowPopup] = useState(false);
  const [loadingERS, setLoadingERS] = useState(true);
  const [changedFields, setChangedFields] = useState<Set<string>>(new Set());
  const [widgets, setWidgets] = useState<Widget[]>([]);
  const [isWidgetsOpen, setIsWidgetsOpen] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [activeDocId, setActiveDocId] = useState("");
  const [emailPopup, setEmailPopup] = useState<{ show: boolean; success: boolean; message: string }>({
    show: false, success: false, message: "",
  });

  // Ref para capturar la función de descarga PDF del diagrama de arquitectura
  const arqDownloadRef = useRef<(() => Promise<void>) | null>(null);

  const prevRawDataRef = useRef<any>(null);
  const prevDocIdRef = useRef<string>(""); 

  const getActiveProjectId = () => {
    if (typeof window === "undefined") return "";
    return sessionStorage.getItem("project_id") || "";
  };

  const getToken = () => {
    if (typeof window === "undefined") return "";
    return localStorage.getItem("token") || "";
  };

const mapDataToWidgets = (data: any): Widget[] => {
  console.log("🔴 mapDataToWidgets →", data);
  return Object.entries(data)
    .filter(([key]) => !isNaN(Number(key)))  // solo llaves numéricas (posiciones)
    .sort(([a], [b]) => Number(a) - Number(b))  // ordenar por posición
    .map(([key, w]: [string, any]) => ({
      posicion: Number(key),
      id_widget: w.id_widget ?? key,
      titulo: w.titulo ?? key,
      objetivo_widget: w.objetivo_widget ?? "",
      descripcion_campos: w.descripcion_campos ?? {},
      campos: w.campos ?? {},
    }));
};

  useEffect(() => {
    let isMounted = true;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    const detectChanges = (oldData: any, newData: any) => {
      const changed = new Set<string>();
      const compare = (obj1: any, obj2: any, path = "") => {
        if (Array.isArray(obj2)) {
          obj2.forEach((item, index) => {
            const newPath = path ? `${path}.${index}` : `${index}`;
            if (typeof item === "object" && item !== null) {
              compare(obj1?.[index], item, newPath);
            } else if (obj1?.[index] !== item) {
              changed.add(newPath);
            }
          });
          return;
        }
        for (const key in obj2) {
          const newPath = path ? `${path}.${key}` : key;
          if (typeof obj2[key] === "object" && obj2[key] !== null) {
            compare(obj1?.[key], obj2[key], newPath);
          } else if (obj1?.[key] !== obj2[key]) {
            changed.add(newPath);
          }
        }
      };
      compare(oldData, newData);
      return changed;
    };

    const fetchERS = async (shouldHighlight: boolean = false) => {
      try {
        const docId = getActiveProjectId();
        setActiveDocId(docId);
        console.log("🔵 fetchERS corriendo con docId:", docId);
        if (!docId) return;

        const response = await fetch(
          `${API_URL}/firestore/bajar?doc_id=${encodeURIComponent(docId)}`,
          { method: "GET", headers: { accept: "application/json" }, cache: "no-store" }
        );

        if (!response.ok) throw new Error("No se pudo obtener el ERS");

        const json = await response.json();
        console.log("🟢 json.data →", json.data);

        if (isMounted && json.ok && json.data) {
  const isDifferentProject = prevDocIdRef.current !== docId;

  const suppressHighlight =
  sessionStorage.getItem("suppress_ers_highlight") === "1";

if (suppressHighlight) {
  sessionStorage.removeItem("suppress_ers_highlight");
}

  // Si cambiaste de proyecto, NO compares contra el anterior.
  // Solo carga el documento limpio.
  if (isDifferentProject) {
    prevDocIdRef.current = docId;
    prevRawDataRef.current = json.data;
    setChangedFields(new Set());
    setWidgets(mapDataToWidgets(json.data));
    return;
  }

  // Solo highlightear cuando explícitamente venga de "Guardar" o "Enviar".
  const changes =
    shouldHighlight && prevRawDataRef.current
      ? detectChanges(prevRawDataRef.current, json.data)
      : new Set<string>();

  if (changes.size > 0) {
    console.log("🟡 changedFields:", [...changes]);
    setChangedFields(changes);

    if (timeoutId) clearTimeout(timeoutId);

    timeoutId = setTimeout(() => {
      if (isMounted) setChangedFields(new Set());
    }, 1000);
  } else {
    setChangedFields(new Set());
  }

  prevRawDataRef.current = json.data;
  setWidgets(mapDataToWidgets(json.data));
}
      } catch (error) {
        console.error("Error cargando ERS:", error);
      } finally {
        if (isMounted) setLoadingERS(false);
      }
    };

    const handleRefreshWithHighlight = () => {
      setTimeout(() => fetchERS(true), 100);
    };

    const handleProjectChange = () => {
  setChangedFields(new Set());
  prevRawDataRef.current = null;
  prevDocIdRef.current = "";
  setWidgets([]);

  setTimeout(() => fetchERS(false), 100);
};

    // Carga inicial sin highlight
    fetchERS(false);

    // Este evento sí highlightea porque viene de guardar/enviar cambios
    window.addEventListener("ers-refresh", handleRefreshWithHighlight);


    // Este evento NO highlightea porque es cambio de proyecto/sesión
    window.addEventListener("document-project-change", handleProjectChange);
    return () => {
      isMounted = false;
      window.removeEventListener("ers-refresh", handleRefreshWithHighlight);
window.removeEventListener("document-project-change", handleProjectChange);
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, []);

  useEffect(() => {
    const handleOpenWidgets = () => setIsWidgetsOpen(true);
    window.addEventListener("open-widgets-modal", handleOpenWidgets);
    return () => window.removeEventListener("open-widgets-modal", handleOpenWidgets);
  }, []);

  const handleSendEmail = async () => {
    const docId = getActiveProjectId();
    const token = getToken();
    const userName = [
      localStorage.getItem("nombre"),
      localStorage.getItem("apellidopaterno"),
    ].filter(Boolean).join(" ");

    if (!docId) {
      setEmailPopup({ show: true, success: false, message: "No hay documento activo para enviar." });
      return;
    }
    if (!token) {
      setEmailPopup({ show: true, success: false, message: "No se encontró sesión activa. Por favor inicia sesión." });
      return;
    }

    setSendingEmail(true);
    try {
      const response = await fetch(`${API_BASE}/email/send-email`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ doc_id: docId, user_name: userName }),
      });

      const data = await response.json();

      if (response.ok && data.ok) {
        setEmailPopup({ show: true, success: true, message: data.message ?? "El correo fue enviado correctamente a tu cuenta." });
      } else {
        setEmailPopup({ show: true, success: false, message: data.detail ?? "Ocurrió un error al enviar el correo." });
      }
    } catch {
      setEmailPopup({ show: true, success: false, message: "No se pudo conectar con el servidor. Intenta de nuevo." });
    } finally {
      setSendingEmail(false);
    }
  };

  const wrapperClass = expanded
    ? "flex-1 h-full min-w-[520px] transition-all duration-300"
    : "w-full max-w-xs h-full transition-all duration-300";

  const handleDownload = async () => {
    // ── Arquitectura: descarga PDF via la función registrada por ArquitecturaDiagram ──
    if (tab === "Arquitectura") {
      if (arqDownloadRef.current) {
        await arqDownloadRef.current();
        setShowPopup(true);
      } else {
        setEmailPopup({
          show: true,
          success: false,
          message: "El diagrama aún no está listo para descargar.",
        });
      }
      return;
    }

    // ── ERS / Análisis: descarga Word ──
    const docId = getActiveProjectId();
    if (!docId) {
      setEmailPopup({
        show: true,
        success: false,
        message: "No hay documento activo para descargar.",
      });
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/widgets/exportar-word`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ doc_id: docId, widgets }),
      });

      if (!res.ok) throw new Error(`Error ${res.status}`);

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `SRS_${docId}.docx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      setShowPopup(true);
    } catch (err) {
      console.error("Error descargando Word:", err);
      setEmailPopup({
        show: true,
        success: false,
        message: "No se pudo descargar el documento. Intenta de nuevo.",
      });
    }
  };

  return (
    <>
      {showPopup && (
        <DownloadPopup
          docName={DOC_NAMES[tab]}
          onClose={() => setShowPopup(false)}
        />
      )}

      {emailPopup.show && (
        <EmailPopup
          success={emailPopup.success}
          message={emailPopup.message}
          onClose={() =>
            setEmailPopup({ show: false, success: false, message: "" })
          }
        />
      )}

      <section className={wrapperClass}>
        <div className="relative flex h-full flex-col rounded-3xl bg-gray-100 p-6 shadow-md">
          <button
            onClick={onToggle}
            className="absolute -left-5 top-6 z-50 cursor-pointer rounded-full bg-white p-2 shadow transition hover:scale-105"
          >
            {expanded ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
          </button>

          {/* ── Vista colapsada ── */}
          {!expanded && (
            <div className="flex h-full flex-col gap-3">
              <div className="shrink-0">
                <h1 className="text-xl font-bold text-[#EB0029]">
                  Documentos de Salida
                </h1>
                <div className="mt-1 h-[2px] w-full bg-[#EB0029]" />
              </div>

              <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto pr-1">
                {(
                  [
                    "ERS",
                    //OCULTAR_ANALISIS "Análisis",
                    "Arquitectura",
                    //OCULTAR_ANALISIS (así es como estaba antes pero quitando análisis marca error)] as const).map((t) => (
                  ] as ("ERS" | "Análisis" | "Arquitectura")[]
                ).map(
                  (
                    t, //momentáneo
                  ) => (
                    <div key={t} className="flex shrink-0 flex-col gap-1">
                      <span className="px-1 text-xs font-bold uppercase tracking-wider text-gray-500">
                        {DOC_NAMES[t]}
                      </span>
                      <div className="relative h-72 overflow-hidden rounded-xl border border-gray-100 bg-white shadow-md">
                        {t === "ERS" || t === "Análisis" ? (
                          <div
                            className="pointer-events-none h-full w-full overflow-hidden"
                            style={{
                              transform: "scale(0.33)",
                              transformOrigin: "top left",
                              width: "303%",
                              height: "303%",
                            }}
                          >
                            {loadingERS ? (
                              <div className="flex h-full items-center justify-center text-sm text-gray-500">
                                Cargando ERS...
                              </div>
                            ) : (
                              <WidgetRenderer
                                key={activeDocId}
                                widgets={widgets}
                                changedFields={changedFields}
                              />
                            )}
                          </div>
                        ) : (
                          <div
                            className="pointer-events-none h-full w-full overflow-hidden"
                            style={{
                              transform: "scale(0.33)",
                              transformOrigin: "top left",
                              width: "303%",
                              height: "303%",
                            }}
                          >
                            {/* Preview en vista colapsada: sin registrar descarga */}
                          <ArquitecturaDiagram />
                        </div>
                      )}
                      <button
                        onClick={() => {
                          setTab(t);
                          onToggle();
                        }}
                        className="group absolute inset-0 h-full w-full bg-transparent transition hover:bg-[#EB0029]/5"
                        title="Expandir para ver completo"
                      >
                        <span className="absolute bottom-2 right-2 rounded-lg bg-[#EB0029] px-2 py-0.5 text-[10px] font-semibold text-white opacity-0 transition group-hover:opacity-100">
                          Ver completo
                        </span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Vista expandida ── */}
          {expanded && (
            <>
              <div className="relative mb-5 flex items-center justify-center">
                <div className="flex gap-2 rounded-lg bg-white px-2 py-2 shadow">
                  {(
                    [
                      "ERS",
                      // OCULTAR_ANALISIS "Análisis",
                      "Arquitectura",
                      //OCULTAR_ANALISIS (así es como estaba antes pero quitando análisis marca error)] as const).map((t) => (
                    ] as ("ERS" | "Análisis" | "Arquitectura")[]
                  ).map(
                    (
                      t, //momentáneo
                    ) => (
                      <button
                        key={t}
                        onClick={() => setTab(t)}
                        className={
                          tab === t
                            ? "rounded-lg bg-[#EB0029] px-10 py-2 text-sm font-semibold text-white shadow"
                            : "rounded-lg px-10 py-2 text-sm font-semibold text-gray-600 transition hover:bg-gray-100"
                        }
                      >
                        {t}
                      </button>
                    ),
                  )}
                </div>

                <div className="absolute right-0 flex items-center gap-2">
                  {tab === "ERS" && (
                  <button
                    onClick={handleSendEmail}
                    disabled={sendingEmail}
                    className="group flex cursor-pointer items-center gap-2 bg-transparent p-2 transition disabled:cursor-not-allowed disabled:opacity-60"
                    title="Enviar documento por correo"
                  >
                    {sendingEmail ? (
                      <Loader2
                        size={22}
                        className="animate-spin text-[#EB0029]"
                       />
                ) : (
                  <Mail
                    className="text-[#EB0029] transition group-hover:text-gray-500"
                    size={22}
                  />
                )}

                <span className="font-medium text-[#EB0029] transition group-hover:text-gray-700">
                  {sendingEmail ? "Enviando..." : "Enviar por correo"}
                </span>
              </button>
                  )}
              <button
                onClick={handleDownload}
                className="group flex cursor-pointer items-center gap-2 bg-transparent p-2 transition"
                title="Descargar documento"
              >
                <Download
                  className="text-[#EB0029] transition group-hover:text-gray-500"
                  size={22}
                />

                <span className="font-medium text-[#EB0029] transition group-hover:text-gray-500">
                  Descargar
                    </span>
                  </button>
                </div>
              </div>

              <div className="flex min-h-0 flex-1 overflow-hidden rounded-2xl bg-white shadow">
                {tab === "ERS" || tab === "Análisis" ? (
                  <div className="h-full w-full overflow-y-auto overscroll-contain bg-[#e9e9e9]">
                    {loadingERS ? (
                      <div className="flex h-full items-center justify-center text-sm text-gray-500">
                        Cargando documento...
                      </div>
                    ) : (
                      <WidgetRenderer
                        widgets={widgets}
                        changedFields={changedFields}
                      />
                    )}
                  </div>
                ) : (
                  <div
                    id="arq-svg-container"
                    className="h-full w-full overflow-auto p-4"
                  >
                    {/* Vista expandida: registrar la función de descarga PDF */}
                    <ArquitecturaDiagram
                      onRegisterDownload={(fn) => {
                        arqDownloadRef.current = fn;
                      }}
                    />
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </section>

      <WidgetsModal
        isOpen={isWidgetsOpen}
        onClose={() => setIsWidgetsOpen(false)}
        widgets={widgets}
      />
    </>
  );
}