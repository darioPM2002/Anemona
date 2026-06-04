"use client";

import { API_URL } from "@/services/api";
import { X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";

/* Props y tipos: forman el contrato del modal y los datos del formulario */
type Props = {
  isOpen: boolean;
  tempUserId: string;
  setTempUserId: (value: string) => void;
  loadingSession: boolean;
  onClose: () => void;
  onSubmit: () => void;
};

type FormDataType = {
  solicitante: string;
  dga: string;
  contacto: string;
  patrocinador: string;
  socio: string;
  cr: string;
  iniciativa: string;
  departamentos: string[];
  tipo: string;
  plantilla_id: string;
};

type Departamento = {
  iddepartamento: number;
  nombre: string;
};

type PlantillaOpcion = {
  id: string;
  nombre: string;
  widgets?: { titulo: string }[];
};

/* Componente principal: formulario para crear proyecto/plantilla */
export default function FormModal({
  isOpen,
  tempUserId,
  setTempUserId,
  loadingSession,
  onClose,
  onSubmit,
}: Props) {
  // estado del formulario con campos principales
  const [formData, setFormData] = useState<FormDataType>({
    solicitante: tempUserId || "",
    dga: "",
    contacto: "",
    patrocinador: "",
    socio: "",
    cr: "",
    iniciativa: "",
    departamentos: [],
    tipo: "",
    plantilla_id: "",
  });

  // listas auxiliares (departamentos, plantillas) y flags de carga
  const [departamentos, setDepartamentos] = useState<Departamento[]>([]);
  const [loadingDepartamentos, setLoadingDepartamentos] = useState(false);
  const [openDep, setOpenDep] = useState(false);
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  const [plantillas, setPlantillas] = useState<PlantillaOpcion[]>([]);
  const [loadingPlantillas, setLoadingPlantillas] = useState(false);

  const [submittingProject, setSubmittingProject] = useState(false);

  // estados para gestión de plantillas (renombrar / eliminar)
  const [editingPlantillaId, setEditingPlantillaId] = useState<string | null>(null);
  const [editingNombre, setEditingNombre] = useState("");
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);

  // ── fetch departamentos cuando se abre el modal ──
  useEffect(() => {
    async function fetchDepartamentos() {
      try {
        setLoadingDepartamentos(true);
        const res = await fetch(`${API_URL}/departamentos`);
        if (!res.ok) throw new Error("No se pudieron cargar los departamentos");
        setDepartamentos(await res.json());
      } catch (error) {
        console.error("Error cargando departamentos:", error);
      } finally {
        setLoadingDepartamentos(false);
      }
    }
    if (isOpen) fetchDepartamentos();
  }, [isOpen]);

  // ── fetch plantillas y carga preview de widgets ──
  useEffect(() => {
    async function fetchPlantillas() {
      try {
        setLoadingPlantillas(true);
        const res = await fetch(`${API_URL}/plantillas/`);
        if (!res.ok) throw new Error("No se pudieron cargar las plantillas");
        const lista: PlantillaOpcion[] = await res.json();

        // enriquecer con detalle de widgets para mostrar preview
        const enriquecidas = await Promise.all(
          lista.map(async (p) => {
            try {
              const r = await fetch(`${API_URL}/plantillas/${p.id}`);
              if (!r.ok) return p;
              const full = await r.json();
              return { ...p, widgets: full.widgets ?? [] };
            } catch {
              return p;
            }
          })
        );

        setPlantillas(enriquecidas);
      } catch (error) {
        console.error("Error cargando plantillas:", error);
      } finally {
        setLoadingPlantillas(false);
      }
    }
    if (isOpen) fetchPlantillas();
  }, [isOpen]);

  // ── auto-llenado de solicitante / contacto desde localStorage ──
  useEffect(() => {
    if (!isOpen || typeof window === "undefined") return;
    const nombre = localStorage.getItem("nombre") || "";
    const apellidopaterno = localStorage.getItem("apellidopaterno") || "";
    const apellidomaterno = localStorage.getItem("apellidomaterno") || "";
    const correo = localStorage.getItem("correo") || "";
    const idusuario = localStorage.getItem("idusuario") || tempUserId || "";
    const nombreCompleto = [nombre, apellidopaterno, apellidomaterno]
      .filter(Boolean)
      .join(" ")
      .trim();
    // pre-llenar campos de forma no destructiva
    setFormData((prev) => ({
      ...prev,
      solicitante: nombreCompleto,
      contacto: correo,
    }));
    setTempUserId(idusuario);
  }, [isOpen, tempUserId, setTempUserId]);

  // ── cerrar dropdown al hacer click fuera ──
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setOpenDep(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // togglear selección de departamentos en el array
  function toggleDepartamento(id: string) {
    setFormData((prev) => ({
      ...prev,
      departamentos: prev.departamentos.includes(id)
        ? prev.departamentos.filter((d) => d !== id)
        : [...prev.departamentos, id],
    }));
  }

  // helper para actualizar campos del formulario
  function handleChange(key: keyof FormDataType, value: string) {
    setFormData((prev) => ({ ...prev, [key]: value }));
  }

  // texto mostrado en el selector de departamentos
  function getDepartamentosSeleccionados() {
    if (formData.departamentos.length === 0) return "";
    return departamentos
      .filter((d) =>
        formData.departamentos.includes(String(d.iddepartamento))
      )
      .map((d) => d.nombre)
      .join(", ");
  }

  // ── renombrar plantilla (llamada al backend y actualizar UI) ──
  async function handleRenameSubmit(plantillaId: string) {
    if (!editingNombre.trim()) return;
    try {
      setRenamingId(plantillaId);
      const res = await fetch(`${API_URL}/plantillas/${plantillaId}`);
      if (!res.ok) throw new Error("No se pudo cargar la plantilla");
      const full = await res.json();
      const patchRes = await fetch(`${API_URL}/plantillas/${plantillaId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nombre: editingNombre.trim(), widgets: full.widgets }),
      });
      if (!patchRes.ok) throw new Error("No se pudo renombrar");
      setPlantillas((prev) =>
        prev.map((p) =>
          p.id === plantillaId ? { ...p, nombre: editingNombre.trim() } : p
        )
      );
      setEditingPlantillaId(null);
      setEditingNombre("");
    } catch (e) {
      alert(e instanceof Error ? e.message : "Error al renombrar");
    } finally {
      setRenamingId(null);
    }
  }

  // ── eliminar plantilla ──
  async function handleDeletePlantilla(plantillaId: string) {
    try {
      setDeletingId(plantillaId);
      const res = await fetch(`${API_URL}/plantillas/${plantillaId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("No se pudo eliminar la plantilla");
      setPlantillas((prev) => prev.filter((p) => p.id !== plantillaId));
      if (formData.plantilla_id === plantillaId) handleChange("plantilla_id", "");
      setEditingPlantillaId(null);
      setConfirmDeleteId(null);
    } catch (e) {
      alert(e instanceof Error ? e.message : "Error al eliminar");
    } finally {
      setDeletingId(null);
    }
  }

  // validación básica del formulario (solo habilita botón si hay datos)
  const isFormValid =
    formData.solicitante.trim() !== "" &&
    formData.dga.trim() !== "" &&
    formData.contacto.trim() !== "" &&
    formData.patrocinador.trim() !== "" &&
    formData.socio.trim() !== "" &&
    formData.cr.trim() !== "" &&
    formData.iniciativa.trim() !== "" &&
    formData.departamentos.length > 0 &&
    formData.tipo.trim() !== "" &&
    formData.plantilla_id.trim() !== "";

  // ── submit: crea proyecto en backend usando plantilla seleccionada ──
  async function handleSubmit() {
    try {
      setSubmittingProject(true);

      const plantillaRes = await fetch(
        `${API_URL}/plantillas/${formData.plantilla_id}`
      );
      if (!plantillaRes.ok)
        throw new Error("No se pudo cargar la plantilla seleccionada.");
      const plantillaData = await plantillaRes.json();
      const widgetsPlantilla = plantillaData.widgets;

      const departamentosSeleccionados = departamentos.filter((dep) =>
        formData.departamentos.includes(String(dep.iddepartamento))
      );
      const nombresDepartamentos = departamentosSeleccionados.map(
        (d) => d.nombre
      );

      const payload = {
        formulario: {
          solicitante: formData.solicitante || null,
          dga: formData.dga || null,
          info_contacto: formData.contacto || null,
          patrocinador: formData.patrocinador || null,
          nombre_socio_negocio: formData.socio || null,
          cr: formData.cr || null,
          nombre_iniciativa: formData.iniciativa || null,
          departamentos_impactados: nombresDepartamentos,
          tipo_iniciativa: formData.tipo || null,
          usuario_nombre: null,
          usuario_id:
            tempUserId || localStorage.getItem("idusuario") || null,
        },
        plantilla: widgetsPlantilla,
        nombre_plantilla: plantillaData.nombre || "",
      };

      const res = await fetch(`${API_URL}/firestore/new_project`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok)
        throw new Error(data?.detail || "No se pudo crear el proyecto.");

      // persistir ids/identificadores en sessionStorage para que la app cargue la sesión
      sessionStorage.setItem(
        "chat_user_id",
        data.user_id ?? payload.formulario.usuario_id ?? ""
      );
      sessionStorage.setItem("chat_session_id", data.session_id ?? "");
      sessionStorage.setItem("project_id", data.project_id ?? "");
      sessionStorage.setItem("project_folio", String(data.folio ?? ""));
      sessionStorage.setItem(
        "project_name",
        payload.formulario.nombre_iniciativa ?? ""
      );
      setTempUserId(payload.formulario.usuario_id ?? "");
      sessionStorage.setItem("pending_selected_folio", String(data.folio));

      // notificar al resto de la app que un proyecto fue creado
      window.dispatchEvent(
        new CustomEvent("project-created", {
          detail: { folio: data.folio },
        })
      );

      onSubmit();
    } catch (error) {
      console.error(error);
      alert(
        error instanceof Error
          ? error.message
          : "Ocurrió un error al crear el proyecto."
      );
    } finally {
      setSubmittingProject(false);
    }
  }

  // definición de campos principales para render en grid
  const fields: {
    label: string;
    key: keyof FormDataType;
    placeholder: string;
  }[] = [
    {
      label: "Solicitante",
      key: "solicitante",
      placeholder: "Juan Ramón Carranza",
    },
    {
      label: "DGA",
      key: "dga",
      placeholder: "Tecnología",
    },
    {
      label: "Información de contacto",
      key: "contacto",
      placeholder: "jorge.carranza@banorte.com",
    },
    {
      label: "Patrocinador",
      key: "patrocinador",
      placeholder: "Banorte",
    },
    {
      label: "Nombre del socio de negocio",
      key: "socio",
      placeholder: "Interno",
    },
    {
      label: "CR",
      key: "cr",
      placeholder: "0123",
    },
    {
      label: "Nombre de la iniciativa",
      key: "iniciativa",
      placeholder: "Sistema de ...",
    },
  ];

  // no renderizar si el modal está cerrado
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[999] p-4">
      <div className="relative w-full max-w-3xl max-h-[90vh] bg-white rounded-3xl shadow-xl flex flex-col overflow-hidden">

        {/* Imágenes decorativas (sin impacto funcional) */}
        <img
          src="/images/RedBob.png"
          className="absolute -top-70 -right-20 w-50 pointer-events-none z-0"
          alt=""
        />
        <img
          src="/images/GreyBob.png"
          className="absolute top-1/2 -right-20 -translate-y-1/2 w-35 pointer-events-none z-0"
          alt=""
        />
        <img
          src="/images/banortegf.png"
          className="absolute bottom-2 left-0 w-60 pointer-events-none z-0"
          alt=""
        />

        {/* Botón cerrar */}
        <button
          onClick={onClose}
          className="absolute top-6 right-6 text-gray-400 hover:text-gray-600 z-20"
        >
          <X size={20} />
        </button>

        {/* ── Zona scrolleable con formulario ── */}
        <div className="relative z-10 flex-1 overflow-y-auto px-14 py-10">
          <h3
            className="text-2xl font-bold mb-2"
            style={{ color: "#EB0029" }}
          >
            Formulario
          </h3>
          <p className="text-sm font-bold text-[#323E48] mb-10">
            Por favor, ingrese la siguiente información.
          </p>

          {/* ── Grid de campos de texto ── */}
          <div className="grid grid-cols-2 gap-y-10">
            {fields.map((field, i) => (
              <div key={i}>
                <label className="block text-sm font-bold text-[#323E48] mb-2">
                  {field.label}
                </label>
                <div className="w-[75%]">
                  <div className="bg-gray-100 px-4 pt-3 pb-2">
                    <input
                      value={formData[field.key] as string}
                      onChange={(e) =>
                        handleChange(field.key, e.target.value)
                      }
                      readOnly={
                        field.key === "solicitante" ||
                        field.key === "contacto"
                      }
                      className={`w-full bg-transparent outline-none text-sm text-[#5B6670] placeholder:text-[#b5bcc2] ${
                        field.key === "solicitante" ||
                        field.key === "contacto"
                          ? "cursor-not-allowed"
                          : ""
                      }`}
                      placeholder={field.placeholder}
                    />
                  </div>
                  <div className="h-[1px] bg-[#5B6670] mt-[1px] w-full" />
                </div>
              </div>
            ))}

            {/* ── Selector departamentos ── */}
            <div>
              <label className="block text-sm font-bold text-[#323E48] mb-2">
                Departamentos impactados
              </label>
              <div className="w-[75%] relative" ref={dropdownRef}>
                <div className="bg-gray-100 px-4 pt-3 pb-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm text-[#5B6670] min-h-[24px] flex items-center overflow-x-auto whitespace-nowrap scrollbar-thin scrollbar-thumb-gray-700">
                      {getDepartamentosSeleccionados() ||
                        (loadingDepartamentos
                          ? "Cargando departamentos..."
                          : "")}
                    </span>
                    <button
                      type="button"
                      onClick={() => setOpenDep((prev) => !prev)}
                      className="ml-3 shrink-0 text-[#5B6670] hover:text-black"
                    >
                      <ChevronDown
                        size={22}
                        className={`transition-transform duration-200 ${
                          openDep ? "rotate-180" : ""
                        }`}
                      />
                    </button>
                  </div>
                </div>
                <div className="h-[1px] bg-[#5B6670] mt-[1px] w-full" />

                {openDep && (
                  <div className="absolute left-0 top-[calc(100%+8px)] w-full bg-gray-100 rounded-md py-3 shadow-md max-h-40 overflow-y-auto z-50">
                    {departamentos.length === 0 && !loadingDepartamentos ? (
                      <div className="px-4 py-2 text-sm text-[#5B6670]">
                        No hay departamentos disponibles
                      </div>
                    ) : (
                      departamentos.map((dep) => {
                        const depId = String(dep.iddepartamento);
                        const selected =
                          formData.departamentos.includes(depId);
                        return (
                          <button
                            type="button"
                            key={dep.iddepartamento}
                            onClick={() => toggleDepartamento(depId)}
                            className={`w-full text-left px-4 py-[7px] text-sm transition flex items-center justify-between ${
                              selected
                                ? "bg-gray-200 text-[#323E48] font-semibold"
                                : "text-[#5B6670] hover:bg-gray-200"
                            }`}
                          >
                            <span>{dep.nombre}</span>
                            {selected && <span>✓</span>}
                          </button>
                        );
                      })
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ── Tipo de iniciativa ── */}
          <div className="mt-10">
            <label className="block text-sm font-bold text-[#323E48] mb-2">
              Tipo de la iniciativa
            </label>
            <div className="w-[70%]">
              <div className="bg-gray-100 px-4 pt-3 pb-2">
                <input
                  value={formData.tipo}
                  onChange={(e) => handleChange("tipo", e.target.value)}
                  className="w-full bg-transparent outline-none text-sm text-[#5B6670] placeholder:text-[#b5bcc2]"
                  placeholder="Prueba de Concepto, Idea, Mantenimiento, Proyecto"
                />
              </div>
              <div className="h-[1px] bg-[#5B6670] mt-[1px] w-full" />
            </div>
          </div>

          {/* ── Selector de plantilla con cards ── */}
          <div className="mt-10 mb-4">
            <label className="block text-sm font-bold text-[#323E48] mb-1">
              Plantilla del proyecto
            </label>
            <p className="text-xs text-[#5B6670] mb-4">
              Selecciona la plantilla de secciones que se usará para este
              proyecto.
            </p>

            {loadingPlantillas ? (
              <p className="text-sm text-[#5B6670]">Cargando plantillas...</p>
            ) : plantillas.length === 0 ? (
              <p className="text-sm text-[#5B6670]">
                No hay plantillas disponibles.
              </p>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {plantillas.map((p) => {
                  const selected = formData.plantilla_id === p.id;
                  const isEditing = editingPlantillaId === p.id;
                  const widgetCount = p.widgets?.length ?? 0;
                  const pills = p.widgets?.slice(0, 6) ?? [];
                  const extra = widgetCount > 6 ? widgetCount - 6 : 0;

                  return (
                    <div key={p.id}>
                      {/* Card principal — clickable */}
                      <div
                        role="button"
                        tabIndex={0}
                        onClick={() => handleChange("plantilla_id", p.id)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ")
                            handleChange("plantilla_id", p.id);
                        }}
                        className={`w-full text-left rounded-xl border-[1.5px] p-3 transition-all cursor-pointer ${
                          selected
                            ? "border-[#EB0029] bg-red-50"
                            : "border-gray-200 bg-gray-50 hover:border-[#EB0029] hover:bg-red-50"
                        }`}
                      >
                        {/* Cabecera de la card */}
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-semibold text-[#323E48] flex items-center gap-1 truncate pr-1">
                            <svg
                              className="w-4 h-4 text-[#EB0029] shrink-0"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth={2}
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                              />
                            </svg>
                            {p.nombre}
                          </span>

                          <div className="flex items-center gap-1 shrink-0">
                            {selected && (
                              <svg
                                className="w-4 h-4 text-[#EB0029]"
                                fill="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5l-4-4 1.41-1.41L10 13.67l6.59-6.59L18 8.5l-8 8z" />
                              </svg>
                            )}

                            {/* Botón ajustes (abre panel de edición) */}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (isEditing) {
                                  setEditingPlantillaId(null);
                                  setEditingNombre("");
                                  setConfirmDeleteId(null);
                                } else {
                                  setEditingPlantillaId(p.id);
                                  setEditingNombre(p.nombre);
                                  setConfirmDeleteId(null);
                                }
                              }}
                              className="p-1 rounded hover:bg-gray-200 text-[#5B6670] hover:text-[#323E48] transition"
                              title="Ajustes de plantilla"
                            >
                              <svg
                                className={`w-3.5 h-3.5 transition-transform duration-300 ${
                                  isEditing ? "rotate-45 text-[#EB0029]" : ""
                                }`}
                                fill="none"
                                stroke="currentColor"
                                strokeWidth={2}
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                                />
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                                />
                              </svg>
                            </button>
                          </div>
                        </div>

                        {/* Pills de secciones */}
                        <div className="flex flex-wrap gap-1 mb-2">
                          {pills.map((w, i) => (
                            <span
                              key={i}
                              className="text-[10px] bg-white border border-gray-200 text-[#5B6670] rounded px-1.5 py-0.5 leading-tight"
                            >
                              {w.titulo}
                            </span>
                          ))}
                          {extra > 0 && (
                            <span className="text-[10px] bg-white border border-gray-200 text-[#5B6670] rounded px-1.5 py-0.5 leading-tight">
                              +{extra} más
                            </span>
                          )}
                        </div>

                        {/* Badge conteo */}
                        {widgetCount > 0 && (
                          <span className="inline-block bg-[#EB0029] text-white text-[10px] font-medium rounded-full px-2 py-0.5">
                            {widgetCount}{" "}
                            {widgetCount === 1 ? "sección" : "secciones"}
                          </span>
                        )}
                      </div>

                      {/* ── Panel de ajustes (debajo de la card) ── */}
                      {isEditing && (
                        <div className="mt-1 rounded-xl border border-gray-200 bg-white shadow-sm p-3 space-y-3">
                          {/* Renombrar */}
                          <div>
                            <p className="text-[10px] font-semibold text-[#323E48] uppercase tracking-wide mb-1.5">
                              Renombrar plantilla
                            </p>
                            <div className="flex gap-2">
                              <input
                                value={editingNombre}
                                onChange={(e) =>
                                  setEditingNombre(e.target.value)
                                }
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") handleRenameSubmit(p.id);
                                }}
                                className="flex-1 bg-gray-100 text-sm text-[#323E48] px-3 py-1.5 rounded outline-none border border-transparent focus:border-[#EB0029] transition"
                                placeholder="Nombre de la plantilla"
                              />
                              <button
                                type="button"
                                onClick={() => handleRenameSubmit(p.id)}
                                disabled={
                                  !editingNombre.trim() ||
                                  renamingId === p.id
                                }
                                className="px-3 py-1.5 bg-[#EB0029] text-white text-xs font-semibold rounded hover:opacity-90 transition disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                {renamingId === p.id ? "..." : "Guardar"}
                              </button>
                            </div>
                          </div>

                          {/* Separador */}
                          <div className="border-t border-gray-100" />

                          {/* Eliminar */}
                          <div>
                            {confirmDeleteId === p.id ? (
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-xs text-[#5B6670]">
                                  ¿Confirmar eliminación?
                                </span>
                                <button
                                  type="button"
                                  onClick={() => handleDeletePlantilla(p.id)}
                                  disabled={deletingId === p.id}
                                  className="px-3 py-1 bg-[#EB0029] text-white text-xs font-semibold rounded hover:opacity-90 transition disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                  {deletingId === p.id
                                    ? "Eliminando..."
                                    : "Sí, eliminar"}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setConfirmDeleteId(null)}
                                  className="px-3 py-1 bg-gray-100 text-[#5B6670] text-xs font-semibold rounded hover:bg-gray-200 transition"
                                >
                                  Cancelar
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => setConfirmDeleteId(p.id)}
                                className="text-xs text-[#EB0029] hover:underline font-medium flex items-center gap-1"
                              >
                                <svg
                                  className="w-3.5 h-3.5"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth={2}
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                  />
                                </svg>
                                Eliminar plantilla
                              </button>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
        {/* ── Fin zona scrolleable ── */}

        {/* ── Botones fijos al fondo ── */}
        <div className="relative z-10 flex justify-end gap-5 px-14 py-6 border-t border-gray-100 bg-white shrink-0">
          <button
            onClick={onClose}
            className="px-7 py-3 rounded-xl text-white font-medium"
            style={{ backgroundColor: "#5B6670" }}
          >
            Regresar
          </button>
          <button
            onClick={handleSubmit}
            disabled={loadingSession || submittingProject || !isFormValid}
            className="px-7 py-3 rounded-xl text-white font-semibold hover:opacity-90 transition disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ backgroundColor: "#EB0029" }}
          >
            {submittingProject ? "Creando proyecto..." : "Continuar"}
          </button>
        </div>
      </div>
    </div>
  );
}