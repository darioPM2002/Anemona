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
  departamentos: string[]
  tipo: string;
};

type Departamento = {
  iddepartamento: number;
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
  });

  const [departamentos, setDepartamentos] = useState<Departamento[]>([]);
  const [loadingDepartamentos, setLoadingDepartamentos] = useState(false);
  const [openDep, setOpenDep] = useState(false);
  const dropdownRef = useRef<HTMLDivElement | null>(null);
  const [submittingProject, setSubmittingProject] = useState(false); // <- nuevo estado para controlar el envío del proyecto

  function toggleDepartamento(id: string) { // función para agregar o quitar departamentos del array
  setFormData((prev) => {
    const yaExiste = prev.departamentos.includes(id);

    return {
      ...prev,
      departamentos: yaExiste
        ? prev.departamentos.filter((depId) => depId !== id)
        : [...prev.departamentos, id],
    };
  });
}

  useEffect(() => {
    async function fetchDepartamentos() {
      try {
        setLoadingDepartamentos(true);

        const res = await fetch(`${API_URL}/departamentos`);

        if (!res.ok) {
          throw new Error("No se pudieron cargar los departamentos");
        }

        const data = await res.json();
        setDepartamentos(data);
      } catch (error) {
        console.error("Error cargando departamentos:", error);
      } finally {
        setLoadingDepartamentos(false);
      }
    }

    if (isOpen) {
      fetchDepartamentos();
    }
  }, [isOpen]);

  // Auto llenado de campos solicitante y contacto con la info del usuario logueado, si está disponible
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

  setFormData((prev) => ({
    ...prev,
    solicitante: nombreCompleto,
    contacto: correo,
  }));

  setTempUserId(idusuario);
}, [isOpen, tempUserId, setTempUserId]);

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
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

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
        placeholder: "Tecnología",
      },
      {
        label: "Nombre del socio de negocio",
        key: "socio",
        placeholder: "Interno",
      },
      {
        label: "CR",
        key: "cr",
        placeholder: "0",
      },
      {
        label: "Nombre de la iniciativa",
        key: "iniciativa",
        placeholder: "0",
      },
    ];

  const isFormValid =
  formData.solicitante.trim() !== "" &&
  formData.dga.trim() !== "" &&
  formData.contacto.trim() !== "" &&
  formData.patrocinador.trim() !== "" &&
  formData.socio.trim() !== "" &&
  formData.cr.trim() !== "" &&
  formData.iniciativa.trim() !== "" &&
  formData.departamentos.length > 0 &&
  formData.tipo.trim() !== "";

  function handleChange(key: keyof FormDataType, value: string) {
    setFormData((prev) => ({
      ...prev,
      [key]: value,
    }));
  }

  async function handleSubmit() {
    try {
      setSubmittingProject(true);


      // Aquí puedes construir el payload que enviarás al backend, usando formData y departamentos para llenar los campos necesarios
      const departamentosSeleccionados = departamentos.filter((dep) =>
        formData.departamentos.includes(String(dep.iddepartamento))
      );

      const nombresDepartamentos = departamentosSeleccionados.map((dep) => dep.nombre);

      const areasImpactadasConNombre = departamentosSeleccionados.map((dep) => ({
        AREA_NEGOCIO: dep.nombre,
        PROCESO_IMPACTO: null,
      }));


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
        plantilla: [{
    posicion: 0,
    id_widget: "w_000",
    titulo: "Datos generales de la iniciativa",
    objetivo_widget: "Capturar la información general y administrativa de la iniciativa.",
    descripcion_campos: {
      SOLICITANTE: "Solicitante",
      INFO_CONTACTO: "Información de contacto",
      DGA: "Dirección General Adjunta",
      PATROCINADOR: "Patrocinador",
      CR: "Centro de Responsabilidad",
      SOCIO: "Nombre del Socio de Negocio",
      NOMBRE_INICIATIVA: "Nombre de la iniciativa",
      TIPO_INICIATIVA: "Tipo de la iniciativa",
    },
    campos: {
      SOLICITANTE: null,
      INFO_CONTACTO: null,
      DGA: null,
      PATROCINADOR: null,
      CR: null,
      SOCIO: null,
      NOMBRE_INICIATIVA: null,
      TIPO_INICIATIVA: null,
    },
  },
  {
    //// DONE
    posicion: 1,
    id_widget: "w_001",
    titulo: "Descripción de la iniciativa",
    objetivo_widget: "Describir de manera general la iniciativa, su propósito y contexto.",
    descripcion_campos: {
      "descripcion": "OBLIGATORIO si está vacío. Explicación completa de la iniciativa: problema a resolver, contexto actual y justificación del proyecto. Si ya tiene contenido, solo modificar si el usuario lo pide explícitamente.",
      "titulo": "OPCIONAL. Sobrescribe el título principal de la sección. Valor por defecto: 'Descripción general de la iniciativa y justificación'.",
      "subtitulo": "OPCIONAL. Sobrescribe el subtítulo de la sección. Valor por defecto: 'Descripción general de la iniciativa'."
    },
    campos: {
      "descripcion": "NULL",
      "titulo":"1.	Descripción general de la iniciativa y justificación.",
      "subtitulo":"Descripción General de la Iniciativa  "
    },
  },
  {
    //// DONE
    posicion: 2,
    id_widget: "w_002",
    titulo: "Objetivos y alcance",
    objetivo_widget:
      "Definir el objetivo principal y el alcance de la iniciativa.",
    
    descripcion_campos: {
    },
    campos: {
      Titulo: "Objetivos de la iniciativa. ",
      Seccion_1: "NULL",
      Seccion_1Titulo: "Objetivo",
      Seccion_2: "NULL",    
      Seccion_2Titulo: "Alcance",
    },
  },
   {
    //// DONE pero no pq dario puso tirulos automaticos
    id_widget: "w_030",
    posicion: 3,
    titulo: "Areas impactadas",
    objetivo_widget: "Identificar las áreas de la organización que serán impactadas.",
    descripcion_campos: {
      filas: "Listado de areas de negocio, que procesos la impactan y la descripcion del impacto",
      AREA_NEGOCIO: "El area del negocio",
      IMPACTOS: "el tipo de proceso y como impactan al area",
      omg: "esta file no existe y debería ser dinamico para haceptar cualquier numero de filas",
    },
    campos: {
      filas: 
      [
        { AREA_NEGOCIO: "Área de negocio", IMPACTOS: "Proceso o actividad impactada", omg: "omg" },
      ],
    },
  },
   {
    //// POR HACER
    id_widget: "w_021",
    posicion: 4,
    titulo: "Tabla FR",
    objetivo_widget: "Asignar responsables y áreas participantes en la iniciativa.",
    descripcion_campos: {
      AREA_PARTICIPANTE: "Área participante",
      RESPONSABLE: "Responsable",
    },
    campos: {
      AREA_PARTICIPANTE: null,
      RESPONSABLE: null,
    },
  },
  {
    //// POR HACER
    id_widget: "w_020", 
    posicion: 5,
    titulo: "Requerimiento regulatorio",
    objetivo_widget: "Registrar información relacionada con requerimientos regulatorios aplicables.",
    descripcion_campos: {
      AUTORIDAD: "Autoridad",
      FECHA_EMISION: "Fecha de emisión",
      FECHA_RECEPCION: "Fecha de recepción",
      FECHA_ENTRADA_VIGOR: "Fecha de entrada en vigor",
      MONTO_SANCION: "Monto de sanción",
      SISTEMAS_APLICATIVOS: "Sistemas aplicativos",
    },
    campos: {
      AUTORIDAD: null,
      FECHA_EMISION: null,
      FECHA_RECEPCION: null,
      FECHA_ENTRADA_VIGOR: null,
      MONTO_SANCION: null,
      SISTEMAS_APLICATIVOS: [],
    },
  },
   {
    //// POR HACER
    id_widget: "w_034",
    posicion: 6,
    titulo: "Requerimiento no regulatorio",
    objetivo_widget: "Capturar requerimientos internos o no regulados.",
    descripcion_campos: {
      ES_URGENTE: "Es urgente",
      FECHA_LIMITE: "Fecha límite",
    },
    campos: {
      ES_URGENTE: null,
      FECHA_LIMITE: null,
    },
  },
  {
    //// POR HACER
    id_widget: "w_008",
    posicion: 7,
    titulo: "Requerimiento periódico",
    objetivo_widget: "Definir periodicidad y fechas de entrega de requerimientos recurrentes.",
    descripcion_campos: {
      PERIODICIDAD: "Periodicidad",
      FECHAS_ENTREGA: "Fechas de entrega",
    },
    campos: {
      PERIODICIDAD: null,
      FECHAS_ENTREGA: [],
    },
  },
  {
    //// POR HACER
    id_widget: "w_009",
    posicion: 8,
    titulo: "Beneficios",
    objetivo_widget: "Identificar beneficios adicionales derivados de la iniciativa.",
    descripcion_campos: {
      OTROS_BENEFICIOS: "Otros beneficios",
    },
    campos: {
      OTROS_BENEFICIOS: null,
    },
  },
   {
    //// POR HACER
    id_widget: "w_010",
    posicion: 9,
    titulo: "Participación de otras áreas",
    objetivo_widget: "Registrar la participación de otras áreas en la iniciativa.",
    descripcion_campos: {
      PARTICIPACION_OTRAS_AREAS: "Participación de otras áreas",
    },
    campos: {
      PARTICIPACION_OTRAS_AREAS: null,
    },
  },
  {
  id_widget: "w_003",
  posicion: 10,
  titulo: "Riesgos",
  objetivo_widget:
    "Eres responsable de gestionar este widget de identificación de riesgos del proyecto. Se renderiza como una tabla dinámica donde campos.headers define las columnas y campos.filas contiene los datos.",

  descripcion_campos: {
    titulo: "Título editable de la sección.",
    headers:
      "Array ordenado de { key, label }. Define las columnas de la tabla. key es permanente, label es editable.",
    filas:
      "OBLIGATORIO. Array de objetos donde cada uno representa una fila. Las keys de cada objeto deben coincidir exactamente con las keys de headers.",
    TIPO: "Key fija. Nombre o categoría del riesgo identificado.",
    PROBABLE_PERDIDA:
      "Key fija. Consecuencia o impacto esperado.",
    JUSTIFICACION:
      "Key fija. Razón por la que este riesgo existe.",
  },

  campos: {
    titulo: "Riesgos",

    headers: [
      {
        key: "TIPO",
        label: "Riesgo",
      },
      {
        key: "PROBABLE_PERDIDA",
        label: "Probable Pérdida",
      },
      {
        key: "JUSTIFICACION",
        label: "Justificación",
      },
    ],

    filas: [
      {
        TIPO: "",
        PROBABLE_PERDIDA: "",
        JUSTIFICACION: "",
      },
    ],
  },
},
  {
    //// POR HACER
    id_widget: "w_012",
    posicion: 11,
    titulo: "Exclusiones",
    objetivo_widget: "Definir los elementos fuera del alcance de la iniciativa.",
    descripcion_campos: {
      EXCLUSIONES: "Exclusiones",
    },
    campos: {
      EXCLUSIONES: null,
    },
  },
   {
    //// POR HACER
    id_widget: "w_013",
    posicion: 12,
    titulo: "Supuestos",
    objetivo_widget: "Registrar los supuestos considerados para la iniciativa.",
    descripcion_campos: {
      SUPUESTOS: "Supuestos",
    },
    campos: {
      SUPUESTOS: null,
    },
  },
  {
    //// POR HACER
    id_widget: "w_014",
    posicion: 13,
    titulo: "Restricciones",
    objetivo_widget: "Documentar las restricciones que afectan la iniciativa.",
    descripcion_campos: {
      RESTRICCIONES: "Restricciones",
    },
    campos: {
      RESTRICCIONES: null,
    },
  },
  {
    //// POR HACER
    id_widget:"w_015",
    posicion: 14,
    titulo: "Anexos",
    objetivo_widget: "Adjuntar documentación adicional relevante a la iniciativa.",
    descripcion_campos: {
      ANEXOS: "Anexos",
    },
    campos: {
      ANEXOS: [],
    },
  },
]
      }

      console.log("📦 PAYLOAD QUE SE ENVÍA:");
      console.log(JSON.stringify(payload, null, 2));

      const res = await fetch(`${API_URL}/firestore/new_project`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });


      console.log("📡 STATUS:", res.status);

      const data = await res.json();

      console.log("✅ RESPONSE DEL BACKEND:");
      console.log(data);


      if (!res.ok) {
        throw new Error(data?.detail || "No se pudo crear el proyecto.");
      }

      console.log("Proyecto creado:", data);

      sessionStorage.setItem(
        "chat_user_id",
        data.user_id ?? payload.formulario.usuario_id ?? ""
      );
      sessionStorage.setItem(
        "chat_session_id",
        data.session_id ?? ""
      );
      sessionStorage.setItem(
        "project_id",
        data.project_id ?? ""
      );

      setTempUserId(payload.formulario.usuario_id ?? "");

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
  function getDepartamentosSeleccionados() {
    if (formData.departamentos.length === 0) return "";

    return departamentos
      .filter((d) => formData.departamentos.includes(String(d.iddepartamento)))
      .map((d) => d.nombre)
      .join(", ");
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[999]">
      <div className="relative w-full max-w-3xl bg-white rounded-3xl shadow-xl px-14 py-10 overflow-hidden">
        <img
          src="/images/RedBob.png"
          className="absolute -top-70 -right-20 w-50 pointer-events-none"
          alt=""
        />
        <img
          src="/images/GreyBob.png"
          className="absolute top-1/2 -right-20 -translate-y-1/2 w-35 pointer-events-none"
          alt=""
        />
        <img
          src="/images/banortegf.png"
          className="absolute bottom-2 left-0 w-60 pointer-events-none"
          alt=""
        />

        <button
          onClick={onClose}
          className="absolute top-6 right-6 text-gray-400 hover:text-gray-600"
        >
          <X size={20} />
        </button>

        <div className="relative z-10">
          <h3 className="text-2xl font-bold mb-2" style={{ color: "#EB0029" }}>
            Formulario
          </h3>

          <p className="text-sm font-bold text-[#323E48] mb-10">
            Por favor, ingrese la siguiente información.
          </p>

          <div className="grid grid-cols-2 gap-y-10">
            {fields.map((field, i) => (
              <div key={i}>
                <label className="block text-sm font-bold text-[#323E48] mb-2">
                  {field.label}
                </label>

                <div className="w-[75%]">
                  <div className="bg-gray-100 px-4 pt-3 pb-2">
                    <input
  value={formData[field.key]}
  onChange={(e) => handleChange(field.key, e.target.value)}
  readOnly={field.key === "solicitante" || field.key === "contacto"}
  className={`w-full bg-transparent outline-none text-sm text-[#5B6670] placeholder:text-[#b5bcc2] ${
    field.key === "solicitante" || field.key === "contacto"
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

            <div>
              <label className="block text-sm font-bold text-[#323E48] mb-2">
                Departamentos impactados
              </label>

              <div className="w-[75%] relative" ref={dropdownRef}>
                <div className="bg-gray-100 px-4 pt-3 pb-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm text-[#5B6670] min-h-[24px] flex items-center overflow-x-auto whitespace-nowrap scrollbar-thin scrollbar-thumb-gray-700">
                      {getDepartamentosSeleccionados() ||
                        (loadingDepartamentos ? "Cargando departamentos..." : "")}
                    </span>

                    <button
                      type="button"
                      onClick={() => setOpenDep((prev) => !prev)}
                      className="ml-3 shrink-0 text-[#5B6670] hover:text-black"
                    >
                      <ChevronDown
                        size={22}
                        className={`transition-transform duration-200 ${openDep ? "rotate-180" : ""
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
                        const selected = formData.departamentos.includes(depId);

                        return (
                          <button
                            type="button"
                            key={dep.iddepartamento}
                            onClick={() => toggleDepartamento(depId)}
                            className={`w-full text-left px-4 py-[7px] text-sm transition flex items-center justify-between ${selected
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
                  placeholder="<Prueba de Concepto, Idea, Mantenimiento, Proyecto>"
                />
              </div>
              <div className="h-[1px] bg-[#5B6670] mt-[1px] w-full" />
            </div>
          </div>

          <div className="flex justify-end gap-5 mt-9">
            <button
              onClick={onClose}
              className="px-7 py-3 rounded-xl text-white font-medium"
              style={{ backgroundColor: "#5B6670" }}
            >
              Regresar
            </button>

            <button
              onClick={handleSubmit}
              disabled={loadingSession || submittingProject || !isFormValid} // <- deshabilitar el botón si se está cargando la sesión, si se está enviando el proyecto o si el formulario no es válido
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


{/* COMO AGREGAR MODAL

  ya al final, antes de cerrar el section y agregar arriba el import:
  import FormModal from "@/components/FormModal";

 <FormModal
  isOpen={showLoginModal}
  tempUserId={tempUserId}
  setTempUserId={setTempUserId}
  loadingSession={loadingSession}
  onClose={() => setShowLoginModal(false)}
  onSubmit={createSession}
/>
    </section>

    */}