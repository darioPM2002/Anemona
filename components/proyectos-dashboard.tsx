"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Home, File as FileIcon, Filter, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { API_URL } from "@/services/api";
import CustomDatePicker from "@/components/CustomDatePicker";
import TextInput from "@/components/minicomponentes/TextInput";

interface Proyecto {
  folio: number;
  nombreproyecto: string;
  fechacreacion: string;
  departamento: string;
  session_id: string;
  id_firestore_document?: string;
  permiso?: string; // solo el owner puede borrar proyectos
  isOwner?: boolean; // solo el owner puede borrar proyectos
}

export default function ProyectosDashboard() {
  const [idusuario, setIdUsuario] = useState<string | null>(null);
  const [nombre, setNombre] = useState<string | null>(null);
  const [apellidopaterno, setapellidopaterno] = useState<string | null>(null);

  const [proyectos, setProyectos] = useState<Proyecto[]>([]);
  const [proyectosOriginales, setProyectosOriginales] = useState<Proyecto[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMas, setLoadingMas] = useState(false);
  const [totalProyectos, setTotalProyectos] = useState(0);
  const PAGE_SIZE = 18;

  // Refs para evitar stale closures en el observer
  const proyectosLengthRef = useRef(0);
  const totalProyectosRef = useRef(0);
  const loadingMasRef = useRef(false);
  const idusuarioRef = useRef<string | null>(null);
  const hayFiltrosRef = useRef(false);

  // Ref del contenedor scrolleable — se pasa como root al observer
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  const router = useRouter();
  const [folioAEliminar, setFolioAEliminar] = useState<number | null>(null);
  const [eliminando, setEliminando] = useState(false);
  const [showAIModal, setShowAIModal] = useState(false);
  const [aiPrompt, setAiPrompt] = useState("");
  const [loadingAI, setLoadingAI] = useState(false);
  const [aiMessage, setAiMessage] = useState("");

  const [filtroFolio, setFiltroFolio] = useState("");
  const [filtroNombre, setFiltroNombre] = useState("");
  const [filtroFecha, setFiltroFecha] = useState("");
  const [filtroArea, setFiltroArea] = useState("");

  const hayFiltros = !!(filtroFolio || filtroNombre || filtroFecha || filtroArea);

  // Sincronizar refs con estado
  useEffect(() => { idusuarioRef.current = idusuario; }, [idusuario]);
  useEffect(() => { proyectosLengthRef.current = proyectos.length; }, [proyectos]);
  useEffect(() => { totalProyectosRef.current = totalProyectos; }, [totalProyectos]);
  useEffect(() => { loadingMasRef.current = loadingMas; }, [loadingMas]);
  useEffect(() => { hayFiltrosRef.current = hayFiltros; }, [hayFiltros]);

  const limpiarFiltros = () => {
    setFiltroFolio("");
    setFiltroNombre("");
    setFiltroFecha("");
    setFiltroArea("");
    setAiMessage("");
    setProyectos(proyectosOriginales);
  };

  const buscarConAgente = async () => {
    if (!idusuario || !aiPrompt.trim()) return;
    try {
      setLoadingAI(true);
      setAiMessage("");
      const res = await fetch(
        `${API_URL}/usuarios/${idusuario}/proyectos/buscar-con-agente`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ mensaje: aiPrompt }),
        }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "No se pudo buscar con el agente");
      const lista = data.proyectos ?? data ?? [];
      setProyectos(lista);
      setTotalProyectos(lista.length);
      setAiMessage(data.respuesta_agente || "");
      setShowAIModal(false);
      setAiPrompt("");
      setFiltroFolio("");
      setFiltroNombre("");
      setFiltroFecha("");
      setFiltroArea("");
    } catch (error) {
      console.error(error);
      alert(error instanceof Error ? error.message : "Ocurrió un error al buscar con el agente");
    } finally {
      setLoadingAI(false);
    }
  };

  const handleOpenProjectChat = (project: Proyecto) => {
    const loggedUserId = localStorage.getItem("idusuario")?.trim() || "";
    sessionStorage.setItem("chat_user_id", loggedUserId);
    sessionStorage.setItem("chat_session_id", project.session_id);
    if (project.id_firestore_document) {
      sessionStorage.setItem("project_id", project.id_firestore_document);
    } else {
      sessionStorage.removeItem("project_id");
    }
    router.push(`/dashboard?session=${project.session_id}`);
  };

  const abrirConfirmacionEliminar = (proyecto: Proyecto) => {
    if (!proyecto.isOwner) {
      alert("No tienes permiso para eliminar este proyecto.");
      return;
    }

    setFolioAEliminar(proyecto.folio);
  };

  const cerrarConfirmacionEliminar = () => {
    if (eliminando) return;
    setFolioAEliminar(null);
  };

  const confirmarEliminarProyecto = async () => {
    if (!folioAEliminar) return;
    try {
      setEliminando(true);
      const res = await fetch(`${API_URL}/proyectos/${folioAEliminar}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "No se pudo eliminar el proyecto");
      setProyectos((prev) => prev.filter((p) => p.folio !== folioAEliminar));
      setTotalProyectos((prev) => prev - 1);
      setFolioAEliminar(null);
    } catch (error) {
      console.error(error);
      alert(error instanceof Error ? error.message : "Ocurrió un error al eliminar el proyecto");
    } finally {
      setEliminando(false);
    }
  };

  useEffect(() => {
    setIdUsuario(localStorage.getItem("idusuario")?.trim() || null);
    setNombre(localStorage.getItem("nombre"));
    setapellidopaterno(localStorage.getItem("apellidopaterno"));
  }, []);

  const checkPermisoProyecto = async (uid: string, sid: string) => {
    try {
      const res = await fetch(`${API_URL}/colaboracion/session/${sid}/permiso/${uid}`);

      if (!res.ok) {
        return false;
      }

      const data = await res.json();
      return data.permiso === "OWNER";
    } catch (error) {
      console.error("Error verificando permiso del proyecto:", error);
      return false;
    }
  };

  useEffect(() => {
    if (!idusuario) return;
    setLoading(true);
    const fetchProyectos = async () => {
      try {
        const res = await fetch(
          `${API_URL}/usuarios/${idusuario}/proyectos?skip=0&limit=${PAGE_SIZE}`
        );
        const data = await res.json();
        console.log("DATA:", data);

        const proyectosConPermiso = await Promise.all(
          data.map(async (proyecto: Proyecto) => {
            const isOwner = await checkPermisoProyecto(idusuario, proyecto.session_id);

            return {
              ...proyecto,
              isOwner,
            };
          })
        );

        setProyectos(proyectosConPermiso);
        setProyectosOriginales(proyectosConPermiso);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };
    fetchProyectos();
  }, [idusuario]);

  const cargarMas = useCallback(async () => {
    const uid = idusuarioRef.current;
    if (!uid) return;
    if (loadingMasRef.current) return;
    if (hayFiltrosRef.current) return;
    if (proyectosLengthRef.current >= totalProyectosRef.current) return;

    setLoadingMas(true);
    loadingMasRef.current = true;

    try {
      const skip = proyectosLengthRef.current;
      const res = await fetch(
        `${API_URL}/usuarios/${uid}/proyectos?skip=${skip}&limit=${PAGE_SIZE}`
      );
      const data = await res.json();
      setProyectos((prev) => [...prev, ...(data.proyectos ?? [])]);
      setProyectosOriginales((prev) => [...prev, ...(data.proyectos ?? [])]);
      setTotalProyectos(data.total ?? 0);
    } catch (error) {
      console.error(error);
    } finally {
      setLoadingMas(false);
      loadingMasRef.current = false;
    }
  }, []);

  const cargarMasRef = useRef(cargarMas);
  useEffect(() => { cargarMasRef.current = cargarMas; }, [cargarMas]);

  // Observer: usa scrollContainerRef como root para detectar scroll interno
  useEffect(() => {
    const sentinel = sentinelRef.current;
    const container = scrollContainerRef.current;
    if (!sentinel || !container) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          cargarMasRef.current();
        }
      },
      {
        root: container,   // ← el contenedor scrolleable, no el viewport
        threshold: 0.1,
      }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [loading]); // re-montar cuando termina el loading inicial para que el DOM exista

  const formatDate = (isoDate: string) => {
    if (!isoDate) return "";
    const d = new Date(isoDate);
    return d.toLocaleDateString("es-MX", { day: "2-digit", month: "2-digit", year: "numeric" });
  };

  const proyectosFiltrados = (proyectos ?? []).filter((p) => {
    const folioStr = String(p.folio).toLowerCase();
    return (
      (!filtroFolio || folioStr.includes(filtroFolio.toLowerCase())) &&
      (!filtroNombre || p.nombreproyecto.toLowerCase().includes(filtroNombre.toLowerCase())) &&
      (!filtroArea || p.departamento?.toLowerCase().includes(filtroArea.toLowerCase())) &&
      (!filtroFecha || p.fechacreacion?.startsWith(filtroFecha))
    );
  });

  return (
    <div className="flex h-screen w-full bg-gray-100">

      {/* ── SIDEBAR ── */}
      <aside className="flex h-full w-90 flex-shrink-0 flex-col bg-white px-5 py-6 shadow-sm">
        <div>
          <div className="flex items-center justify-between pt-5">
            <h1 className="text-2xl font-bold text-[#EB0029]">Mis Proyectos</h1>
            <Home
              size={30}
              onClick={() => (window.location.href = "/dashboard")}
              className="cursor-pointer rounded p-1 text-gray-500 transition hover:bg-gray-100 hover:text-[#EB0029]"
            />
          </div>
          <div className="mt-1 h-[2px] w-full bg-[#EB0029]" />
        </div>

        <div className="my-6 flex flex-col items-center pt-10">
          <div className="mb-3 flex h-28 w-28 items-center justify-center overflow-hidden rounded-full bg-gray-100 shadow-md">
            <svg viewBox="0 0 100 100" className="h-full w-full">
              <circle cx="50" cy="50" r="50" fill="#e8e8e8" />
              <ellipse cx="50" cy="85" rx="28" ry="20" fill="#2c3e6b" />
              <rect x="43" y="65" width="14" height="15" rx="2" fill="white" />
              <polygon points="50,67 47,72 50,85 53,72" fill="#EB0029" />
              <ellipse cx="50" cy="40" rx="18" ry="20" fill="#f5c9a0" />
              <ellipse cx="50" cy="24" rx="18" ry="10" fill="#2c3e6b" />
              <rect x="32" y="24" width="36" height="8" fill="#2c3e6b" />
            </svg>
          </div>
          <p className="pb-5 text-xl font-bold text-gray-700">
            {`${nombre?.split("_")[0] || ""} ${apellidopaterno || ""}`}
          </p>
        </div>

        <div className="flex items-center gap-2 py-5 text-sm font-semibold text-gray-500">
          <Filter size={14} />
          Filtrar
        </div>

        <div className="flex flex-col gap-3">
          <TextInput value={filtroFolio} onChange={setFiltroFolio} placeholder="3254673026" label="Folio" labelVariant="light" />
          <TextInput value={filtroNombre} onChange={setFiltroNombre} placeholder="ProyectoIA" label="Nombre de Proyecto" labelVariant="light" />
          <div>
            <label className="mb-1 block text-xs text-gray-500">Fecha</label>
            <CustomDatePicker value={filtroFecha} onChange={setFiltroFecha} />
          </div>
          <TextInput value={filtroArea} onChange={setFiltroArea} placeholder="TI" label="Área" labelVariant="light" />
        </div>

        <button onClick={limpiarFiltros} className="mt-10 rounded-lg bg-[#EB0029] px-3 py-2 text-xs font-semibold text-white transition hover:bg-red-700">
          Limpiar
        </button>

        <button onClick={() => setShowAIModal(true)} className="mt-3 flex items-center justify-center gap-2 rounded-lg bg-gray-700 px-3 py-2 text-xs font-semibold text-white transition hover:bg-gray-600">
          <img src="/images/Buscar.png" alt="Buscar con IA" className="h-4 w-4 object-contain" />
          <span>Buscar con IA</span>
        </button>

        <div className="mt-auto flex justify-center pt-4">
          <img src="/images/banortelogo.png" alt="Banorte" className="h-12" />
        </div>
      </aside>

      {/* ── MAIN ── */}
      <main className="flex min-h-0 flex-1 flex-col p-6">
        {aiMessage && (
          <div className="mb-4 rounded-lg bg-white px-4 py-3 text-sm text-gray-600 shadow-sm">
            {aiMessage}
          </div>
        )}

        {loading ? (
          <div className="flex h-full items-center justify-center text-sm text-gray-400">
            Cargando proyectos...
          </div>
        ) : proyectosFiltrados.length === 0 ? (
          <div className="flex h-full items-center justify-center text-sm text-gray-400">
            No se encontraron proyectos con los filtros aplicados.
          </div>
        ) : (
          <div
    ref={scrollContainerRef}
        className="flex min-h-0 flex-1 flex-col overflow-y-auto pr-1"
  >
        <div className="grid grid-cols-3 gap-4">
          {proyectosFiltrados.map((proyecto) => (
            <div
              key={proyecto.folio}
              onClick={() => handleOpenProjectChat(proyecto)}
              className="group cursor-pointer rounded-xl bg-white p-4 shadow-sm transition hover:shadow-md hover:ring-1 hover:ring-[#EB0029]/40"
            >
              <div className="mb-2 flex items-center gap-3">
                <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-md bg-[#EB0029]">
                  <FileIcon size={14} strokeWidth={2.5} className="text-white" />
                </div>

                <span className="truncate text-sm font-semibold text-gray-700">
                  {proyecto.nombreproyecto}
                </span>

                {proyecto.isOwner && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      abrirConfirmacionEliminar(proyecto);
                    }}
                    className="ml-auto flex h-9 w-9 items-center justify-center rounded-full border-2 border-gray-200 transition hover:border-gray-300 hover:bg-gray-100"
                    title="Eliminar proyecto"
                  >
                    <img
                      src="/images/BasureroA.png"
                      alt="Eliminar proyecto"
                      className="h-9 w-9 object-contain"
                    />
                  </button>
                )}
              </div>

              <p className="truncate text-sm font-normal text-gray-500">
                {proyecto.folio}
              </p>

              <p className="mt-1 text-xs text-gray-500">
                {proyecto.departamento}
              </p>

              <div className="mt-2 flex items-center gap-1 text-[11px] text-gray-400">
                <img
                  src="/images/Calendario.png"
                  alt="Fecha de creación"
                  className="h-3.5 w-3.5 object-contain"
                />
                <span>{formatDate(proyecto.fechacreacion)}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Sentinel al final del contenido scrolleable */}
        <div ref={sentinelRef} className="mt-4 flex justify-center py-6">
          {loadingMas && (
            <Loader2 size={20} className="animate-spin text-[#EB0029]" />
          )}
        </div>
    </div>
  )
}
      </main >

  {/* ── Modal eliminar ── */ }
{
  folioAEliminar !== null && (
    <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/30 backdrop-blur-sm">
      <div className="relative flex w-[400px] flex-col items-center rounded-2xl border border-gray-100 bg-white p-7 text-center shadow-2xl">
        <button onClick={cerrarConfirmacionEliminar} className="absolute right-5 top-4 text-lg text-gray-400 hover:text-black">✕</button>
        <div className="mb-5">
          <img src="/images/Confirmacion.png" alt="Confirmación" className="h-14 w-14 object-contain" />
        </div>
        <h2 className="mb-3 text-2xl font-bold text-gray-900">¿Estás segura?</h2>
        <p className="mb-8 text-sm text-gray-500">Este proyecto será eliminado de forma permanente. Esta acción no se puede deshacer.</p>
        <div className="flex w-full gap-3">
          <button onClick={cerrarConfirmacionEliminar} disabled={eliminando} className="flex-1 rounded-xl border border-gray-300 py-3 text-base font-semibold text-gray-700 transition hover:bg-gray-50 disabled:opacity-50">
            Cancelar
          </button>
          <button onClick={confirmarEliminarProyecto} disabled={eliminando} className="flex-1 rounded-xl bg-[#EB0029] py-3 text-base font-semibold text-white transition hover:opacity-90 disabled:opacity-50">
            {eliminando ? "Eliminando..." : "Eliminar"}
          </button>
        </div>
      </div>
    </div>
  )
}

{/* ── Modal buscar con IA ── */ }
{
  showAIModal && (
    <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/40">
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl">
        <h3 className="mb-2 text-xl font-bold text-[#EB0029]">Buscar proyectos con IA</h3>
        <p className="mb-4 text-sm text-gray-600">
          Escribe lo que recuerdes del proyecto. Por ejemplo: proyectos de Banorte creados en abril.
        </p>
        <textarea
          value={aiPrompt}
          onChange={(e) => setAiPrompt(e.target.value)}
          placeholder="Ej. Busca proyectos de Banorte en abril"
          className="h-32 w-full resize-none rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm outline-none focus:border-[#EB0029]"
        />
        <div className="mt-5 flex justify-end gap-3">
          <button onClick={() => setShowAIModal(false)} disabled={loadingAI} className="rounded-lg bg-gray-500 px-5 py-2 text-white transition hover:bg-gray-600 disabled:opacity-50">
            Cancelar
          </button>
          <button onClick={buscarConAgente} disabled={loadingAI || !aiPrompt.trim()} className="rounded-lg bg-[#EB0029] px-5 py-2 text-white transition hover:bg-red-700 disabled:opacity-50">
            {loadingAI ? "Buscando..." : "Buscar"}
          </button>
        </div>
      </div>
    </div>
  )
}
    </div >
  );
}