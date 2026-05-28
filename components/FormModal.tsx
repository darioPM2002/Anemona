"use client";

import { API_URL } from "@/services/api";
import { X, ChevronDown } from "lucide-react";
import { useEffect, useRef, useState } from "react";

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
  plantilla_id: string;   // ← nuevo
};

type Departamento = {
  iddepartamento: number;
  nombre: string;
};

// ── nuevo tipo ──────────────────────────────────────────────────────────────
type PlantillaOpcion = {
  id: string;
  nombre: string;
};

export default function FormModal({
  isOpen,
  tempUserId,
  setTempUserId,
  loadingSession,
  onClose,
  onSubmit,
}: Props) {
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
    plantilla_id: "",   // ← nuevo
  });

  const [departamentos, setDepartamentos] = useState<Departamento[]>([]);
  const [loadingDepartamentos, setLoadingDepartamentos] = useState(false);
  const [openDep, setOpenDep] = useState(false);
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  // ── estado plantillas ───────────────────────────────────────────────────
  const [plantillas, setPlantillas] = useState<PlantillaOpcion[]>([]);
  const [loadingPlantillas, setLoadingPlantillas] = useState(false);
  const [openPlantilla, setOpenPlantilla] = useState(false);
  const plantillaDropdownRef = useRef<HTMLDivElement | null>(null);

  const [submittingProject, setSubmittingProject] = useState(false);

  // ── fetch departamentos ─────────────────────────────────────────────────
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

  // ── fetch plantillas ────────────────────────────────────────────────────
  useEffect(() => {
    async function fetchPlantillas() {
      try {
        setLoadingPlantillas(true);
        const res = await fetch(`${API_URL}/plantillas/`);
        if (!res.ok) throw new Error("No se pudieron cargar las plantillas");
        setPlantillas(await res.json());
      } catch (error) {
        console.error("Error cargando plantillas:", error);
      } finally {
        setLoadingPlantillas(false);
      }
    }
    if (isOpen) fetchPlantillas();
  }, [isOpen]);

  // ── auto-llenado solicitante / contacto ─────────────────────────────────
  useEffect(() => {
    if (!isOpen || typeof window === "undefined") return;
    const nombre = localStorage.getItem("nombre") || "";
    const apellidopaterno = localStorage.getItem("apellidopaterno") || "";
    const apellidomaterno = localStorage.getItem("apellidomaterno") || "";
    const correo = localStorage.getItem("correo") || "";
    const idusuario = localStorage.getItem("idusuario") || tempUserId || "";
    const nombreCompleto = [nombre, apellidopaterno, apellidomaterno]
      .filter(Boolean).join(" ").trim();
    setFormData((prev) => ({ ...prev, solicitante: nombreCompleto, contacto: correo }));
    setTempUserId(idusuario);
  }, [isOpen, tempUserId, setTempUserId]);

  // ── click fuera de dropdowns ────────────────────────────────────────────
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node))
        setOpenDep(false);
      if (plantillaDropdownRef.current && !plantillaDropdownRef.current.contains(event.target as Node))
        setOpenPlantilla(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function toggleDepartamento(id: string) {
    setFormData((prev) => ({
      ...prev,
      departamentos: prev.departamentos.includes(id)
        ? prev.departamentos.filter((d) => d !== id)
        : [...prev.departamentos, id],
    }));
  }

  function handleChange(key: keyof FormDataType, value: string) {
    setFormData((prev) => ({ ...prev, [key]: value }));
  }

  function getDepartamentosSeleccionados() {
    if (formData.departamentos.length === 0) return "";
    return departamentos
      .filter((d) => formData.departamentos.includes(String(d.iddepartamento)))
      .map((d) => d.nombre)
      .join(", ");
  }

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
    formData.plantilla_id.trim() !== "";   // ← nuevo requisito

  // ── submit ──────────────────────────────────────────────────────────────
  async function handleSubmit() {
    try {
      setSubmittingProject(true);

      // 1. Descargar la plantilla seleccionada dinámicamente
      const plantillaRes = await fetch(`${API_URL}/plantillas/${formData.plantilla_id}`);
      if (!plantillaRes.ok) throw new Error("No se pudo cargar la plantilla seleccionada.");
      const plantillaData = await plantillaRes.json();
      const widgetsPlantilla = plantillaData.widgets; // array de widgets desde Firestore

      // 2. Construir el payload usando los widgets de la plantilla
      const departamentosSeleccionados = departamentos.filter((dep) =>
        formData.departamentos.includes(String(dep.iddepartamento))
      );
      const nombresDepartamentos = departamentosSeleccionados.map((d) => d.nombre);

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
          usuario_id: tempUserId || localStorage.getItem("idusuario") || null,
        },
        plantilla: widgetsPlantilla,   // ← dinámico, ya no hardcodeado
      };

      const res = await fetch(`${API_URL}/firestore/new_project`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.detail || "No se pudo crear el proyecto.");

      sessionStorage.setItem("chat_user_id", data.user_id ?? payload.formulario.usuario_id ?? "");
      sessionStorage.setItem("chat_session_id", data.session_id ?? "");
      sessionStorage.setItem("project_id", data.project_id ?? "");
      sessionStorage.setItem("project_folio", String(data.folio ?? ""));
      sessionStorage.setItem("project_name", payload.formulario.nombre_iniciativa ?? "");
      setTempUserId(payload.formulario.usuario_id ?? "");

      onSubmit();
    } catch (error) {
      console.error(error);
      alert(error instanceof Error ? error.message : "Ocurrió un error al crear el proyecto.");
    } finally {
      setSubmittingProject(false);
    }
  }

  const fields: { label: string; key: keyof FormDataType; placeholder: string }[] = [
    { label: "Solicitante",               key: "solicitante", placeholder: "Juan Ramón Carranza" },
    { label: "DGA",                       key: "dga",         placeholder: "Tecnología" },
    { label: "Información de contacto",   key: "contacto",    placeholder: "jorge.carranza@banorte.com" },
    { label: "Patrocinador",              key: "patrocinador", placeholder: "Banorte" },
    { label: "Nombre del socio de negocio", key: "socio",     placeholder: "Interno" },
    { label: "CR",                        key: "cr",          placeholder: "0123" },
    { label: "Nombre de la iniciativa",   key: "iniciativa",  placeholder: "Sistema de ..." },
  ];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[999]">
      <div className="relative w-full max-w-3xl bg-white rounded-3xl shadow-xl px-14 py-10 overflow-hidden">
        {/* imágenes decorativas — sin cambios */}
        <img src="/images/RedBob.png"     className="absolute -top-70 -right-20 w-50 pointer-events-none" alt="" />
        <img src="/images/GreyBob.png"    className="absolute top-1/2 -right-20 -translate-y-1/2 w-35 pointer-events-none" alt="" />
        <img src="/images/banortegf.png"  className="absolute bottom-2 left-0 w-60 pointer-events-none" alt="" />

        <button onClick={onClose} className="absolute top-6 right-6 text-gray-400 hover:text-gray-600">
          <X size={20} />
        </button>

        <div className="relative z-10">
          <h3 className="text-2xl font-bold mb-2" style={{ color: "#EB0029" }}>Formulario</h3>
          <p className="text-sm font-bold text-[#323E48] mb-10">Por favor, ingrese la siguiente información.</p>

          <div className="grid grid-cols-2 gap-y-10">
            {/* campos de texto — sin cambios */}
            {fields.map((field, i) => (
              <div key={i}>
                <label className="block text-sm font-bold text-[#323E48] mb-2">{field.label}</label>
                <div className="w-[75%]">
                  <div className="bg-gray-100 px-4 pt-3 pb-2">
                    <input
                      value={formData[field.key] as string}
                      onChange={(e) => handleChange(field.key, e.target.value)}
                      readOnly={field.key === "solicitante" || field.key === "contacto"}
                      className={`w-full bg-transparent outline-none text-sm text-[#5B6670] placeholder:text-[#b5bcc2] ${
                        field.key === "solicitante" || field.key === "contacto" ? "cursor-not-allowed" : ""
                      }`}
                      placeholder={field.placeholder}
                    />
                  </div>
                  <div className="h-[1px] bg-[#5B6670] mt-[1px] w-full" />
                </div>
              </div>
            ))}

            {/* selector departamentos — sin cambios */}
            <div>
              <label className="block text-sm font-bold text-[#323E48] mb-2">Departamentos impactados</label>
              <div className="w-[75%] relative" ref={dropdownRef}>
                <div className="bg-gray-100 px-4 pt-3 pb-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm text-[#5B6670] min-h-[24px] flex items-center overflow-x-auto whitespace-nowrap scrollbar-thin scrollbar-thumb-gray-700">
                      {getDepartamentosSeleccionados() || (loadingDepartamentos ? "Cargando..." : "")}
                    </span>
                    <button type="button" onClick={() => setOpenDep((p) => !p)} className="ml-3 shrink-0 text-[#5B6670] hover:text-black">
                      <ChevronDown size={22} className={`transition-transform duration-200 ${openDep ? "rotate-180" : ""}`} />
                    </button>
                  </div>
                </div>
                <div className="h-[1px] bg-[#5B6670] mt-[1px] w-full" />
                {openDep && (
                  <div className="absolute left-0 top-[calc(100%+8px)] w-full bg-gray-100 rounded-md py-3 shadow-md max-h-40 overflow-y-auto z-50">
                    {departamentos.length === 0 && !loadingDepartamentos ? (
                      <div className="px-4 py-2 text-sm text-[#5B6670]">No hay departamentos disponibles</div>
                    ) : (
                      departamentos.map((dep) => {
                        const depId = String(dep.iddepartamento);
                        const selected = formData.departamentos.includes(depId);
                        return (
                          <button type="button" key={dep.iddepartamento} onClick={() => toggleDepartamento(depId)}
                            className={`w-full text-left px-4 py-[7px] text-sm transition flex items-center justify-between ${
                              selected ? "bg-gray-200 text-[#323E48] font-semibold" : "text-[#5B6670] hover:bg-gray-200"
                            }`}>
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

          {/* tipo de iniciativa — sin cambios */}
          <div className="mt-10">
            <label className="block text-sm font-bold text-[#323E48] mb-2">Tipo de la iniciativa</label>
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

          {/* ── selector de plantilla ── */}
          <div className="mt-10">
            <label className="block text-sm font-bold text-[#323E48] mb-2">Plantilla</label>
            <div className="w-[70%] relative" ref={plantillaDropdownRef}>
              <div className="bg-gray-100 px-4 pt-3 pb-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm text-[#5B6670] min-h-[24px] flex items-center">
                    {loadingPlantillas
                      ? "Cargando plantillas..."
                      : plantillas.find((p) => p.id === formData.plantilla_id)?.nombre || (
                          <span className="text-[#b5bcc2]">Selecciona una plantilla</span>
                        )}
                  </span>
                  <button
                    type="button"
                    onClick={() => setOpenPlantilla((p) => !p)}
                    className="ml-3 shrink-0 text-[#5B6670] hover:text-black"
                  >
                    <ChevronDown size={22} className={`transition-transform duration-200 ${openPlantilla ? "rotate-180" : ""}`} />
                  </button>
                </div>
              </div>
              <div className="h-[1px] bg-[#5B6670] mt-[1px] w-full" />

              {openPlantilla && (
                <div className="absolute left-0 top-[calc(100%+8px)] w-full bg-gray-100 rounded-md py-3 shadow-md max-h-40 overflow-y-auto z-50">
                  {plantillas.length === 0 && !loadingPlantillas ? (
                    <div className="px-4 py-2 text-sm text-[#5B6670]">No hay plantillas disponibles</div>
                  ) : (
                    plantillas.map((p) => {
                      const selected = formData.plantilla_id === p.id;
                      return (
                        <button
                          type="button"
                          key={p.id}
                          onClick={() => { handleChange("plantilla_id", p.id); setOpenPlantilla(false); }}
                          className={`w-full text-left px-4 py-[7px] text-sm transition flex items-center justify-between ${
                            selected ? "bg-gray-200 text-[#323E48] font-semibold" : "text-[#5B6670] hover:bg-gray-200"
                          }`}
                        >
                          <span>{p.nombre}</span>
                          {selected && <span>✓</span>}
                        </button>
                      );
                    })
                  )}
                </div>
              )}
            </div>
          </div>

          {/* botones — sin cambios */}
          <div className="flex justify-end gap-5 mt-9">
            <button onClick={onClose} className="px-7 py-3 rounded-xl text-white font-medium" style={{ backgroundColor: "#5B6670" }}>
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
    </div>
  );
}