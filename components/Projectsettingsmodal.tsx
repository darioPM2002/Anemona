"use client";

import { X, Check, UserPlus, UserMinus, FolderEdit } from "lucide-react";
import { useState, useEffect } from "react";
import { API_URL } from "@/services/api";

interface ProjectSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectName?: string;
  folio: number;
  onRename?: (newName: string) => void;
}

export default function ProjectSettingsModal({
  isOpen,
  onClose,
  projectName = "",
  folio,
  onRename,
}: ProjectSettingsModalProps) {
  const [newName, setNewName] = useState(projectName);
  useEffect(() => {
    setNewName(projectName);
  }, [projectName]);
  const [addEmail, setAddEmail] = useState("");
  const [removeEmail, setRemoveEmail] = useState("");

  // Pop ups de confirmación
  const [confirmAdd, setConfirmAdd] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState(false);

  // Pop ups de resultado
  const [showSuccess, setShowSuccess] = useState(false);
  const [showAddSuccess, setShowAddSuccess] = useState(false);
  const [showRemoveSuccess, setShowRemoveSuccess] = useState(false);
  const [showError, setShowError] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const [colaboradores, setColaboradores] = useState<{ idusuario: string; nombre: string | null; correo: string | null }[]>([]);
  const [loadingColabs, setLoadingColabs] = useState(false);

  const [showColabs, setShowColabs] = useState(false);


  useEffect(() => {
  if (!isOpen || !folio) return;

  const fetchColaboradores = async () => {
    setLoadingColabs(true);
    try {
      const res = await fetch(`${API_URL}/colaboracion/${folio}/obtener-colaboradores`);
      if (!res.ok) throw new Error("Error al obtener colaboradores");
      const data = await res.json();
      setColaboradores(data.colaboradores);
    } catch (error) {
      console.error(error);
      setColaboradores([]);
    } finally {
      setLoadingColabs(false);
    }
  };

  fetchColaboradores();
}, [isOpen, folio]);

  console.log("folio prop recibido:", folio);

  // TODO: conectar estos handlers a sus endpoints cuando estén listos

  const handleRename = async () => {
    if (!newName.trim()) return;
    if (folio === null || folio === undefined) {
      console.error("folio es undefined, no se puede renombrar el proyecto");
      return;
    }

    try {
      const response = await fetch(
        `${API_URL}/colaboracion/${folio}/renombrar-proyecto`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ nombreproyecto: newName.trim() }),
        },
      );

      const contentType = response.headers.get("content-type");
      if (!contentType?.includes("application/json")) {
        throw new Error(
          `Respuesta inesperada del servidor (status ${response.status})`,
        );
      }

      const data = await response.json();
      if (!response.ok)
        throw new Error(data.detail || "Error al renombrar proyecto");

      console.log("Proyecto renombrado:", data);
      sessionStorage.setItem("project_name", newName.trim());
      onRename?.(newName.trim());
      setShowSuccess(true);
    } catch (error) {
      console.error(error);
    }
  };

  const handleAddCollaborator = async () => {
    if (!addEmail.trim() || !folio) return;
    try {
      const res = await fetch(
        `${API_URL}/colaboracion/agregar_colaborador?correo=${encodeURIComponent(addEmail.trim())}&folio=${folio}`,
        { method: "POST" },
      );
      const data = await res.json();
      if (!res.ok)
        throw new Error(data.detail || "Error al agregar colaborador");
      setConfirmAdd(false);
      setAddEmail("");
      
    if (data.ya_existia) {
      // Ya era colaborador — muestra error en lugar de éxito
      setErrorMsg(`El usuario ${addEmail} ya es colaborador de este proyecto.`);
      setShowError(true);
    } else {
      setShowAddSuccess(true);
    }

    } catch (error) {
      setConfirmAdd(false);
      setErrorMsg(
        error instanceof Error ? error.message : "Error al agregar colaborador",
      );
      setShowError(true);
    }
  };

  const handleRemoveCollaborator = async () => {
    if (!removeEmail.trim()) return;
    try {
      // TODO: conectar endpoint cuando esté listo
      console.log("Eliminar colaborador:", removeEmail.trim());
      setColaboradores(prev => prev.filter(c => c.correo !== removeEmail));
      setConfirmRemove(false);
      setRemoveEmail("");
      setShowRemoveSuccess(true);
    } catch (error) {
      setConfirmRemove(false);
      setErrorMsg(error instanceof Error ? error.message : "Error al eliminar colaborador");
      setShowError(true);
    }
  };

  if (confirmAdd)
    return (
      <div className="fixed inset-0 z-[60] flex items-center justify-center backdrop-blur-sm bg-black/30">
        <div className="relative bg-white rounded-2xl shadow-2xl border border-gray-100 w-[380px] p-8 flex flex-col items-center text-center">
          <button onClick={() => setConfirmAdd(false)} className="absolute top-4 right-5 text-gray-400 hover:text-black text-lg">✕</button>
          <img src="/images/Confirmacion.png" alt="Confirmación" className="w-20 h-20 object-contain mb-4" />
          <h2 className="text-lg font-bold text-gray-900 mb-2">¿Agregar colaborador?</h2>
          <p className="text-gray-500 text-sm mb-1">Se enviará una invitación a:</p>
          <p className="text-[#EB0029] font-semibold text-sm mb-6">{addEmail}</p>
          <div className="flex gap-3 w-full">
            <button onClick={() => setConfirmAdd(false)} className="flex-1 border border-gray-300 text-gray-700 py-2.5 rounded-xl font-semibold hover:bg-gray-50 transition">Cancelar</button>
            <button onClick={handleAddCollaborator} className="flex-1 bg-[#EB0029] text-white py-2.5 rounded-xl font-semibold hover:opacity-90 transition">Sí, agregar</button>
          </div>
        </div>
      </div>
    );

  if (confirmRemove)
    return (
      <div className="fixed inset-0 z-[60] flex items-center justify-center backdrop-blur-sm bg-black/30">
        <div className="relative bg-white rounded-2xl shadow-2xl border border-gray-100 w-[380px] p-8 flex flex-col items-center text-center">
          <button onClick={() => setConfirmRemove(false)} className="absolute top-4 right-5 text-gray-400 hover:text-black text-lg">✕</button>
          <img src="/images/Confirmacion.png" alt="Confirmación" className="w-20 h-20 object-contain mb-4" />
          <h2 className="text-lg font-bold text-gray-900 mb-2">¿Eliminar colaborador?</h2>
          <p className="text-gray-500 text-sm mb-1">Se eliminará el acceso de:</p>
          <p className="text-[#EB0029] font-semibold text-sm mb-6">{removeEmail}</p>
          <div className="flex gap-3 w-full">
            <button onClick={() => setConfirmRemove(false)} className="flex-1 border border-gray-300 text-gray-700 py-2.5 rounded-xl font-semibold hover:bg-gray-50 transition">Cancelar</button>
            <button onClick={handleRemoveCollaborator} className="flex-1 bg-[#EB0029] text-white py-2.5 rounded-xl font-semibold hover:opacity-90 transition">Sí, eliminar</button>
          </div>
        </div>
      </div>
    );

  if (showAddSuccess)
    return (
      <div className="fixed inset-0 z-[60] flex items-center justify-center backdrop-blur-sm bg-black/30">
        <div className="relative bg-white rounded-2xl shadow-2xl border border-gray-100 w-[380px] p-8 flex flex-col items-center text-center">
          <button onClick={() => setShowAddSuccess(false)} className="absolute top-4 right-5 text-gray-400 hover:text-black text-lg">✕</button>
          <img src="/images/OpExitosa.png" alt="Éxito" className="w-20 h-20 object-contain mb-4" />
          <h2 className="text-lg font-bold text-gray-900 mb-2">¡Colaborador agregado!</h2>
          <p className="text-sm text-gray-500 mb-6">El colaborador ya tiene acceso al proyecto.</p>
          <button onClick={() => setShowAddSuccess(false)} className="bg-[#EB0029] text-white font-semibold text-sm px-8 py-3 rounded-lg hover:bg-red-700 transition">Aceptar</button>
        </div>
      </div>
    );

  if (showRemoveSuccess)
    return (
      <div className="fixed inset-0 z-[60] flex items-center justify-center backdrop-blur-sm bg-black/30">
        <div className="relative bg-white rounded-2xl shadow-2xl border border-gray-100 w-[380px] p-8 flex flex-col items-center text-center">
          <button onClick={() => setShowRemoveSuccess(false)} className="absolute top-4 right-5 text-gray-400 hover:text-black text-lg">✕</button>
          <img src="/images/OpExitosa.png" alt="Éxito" className="w-20 h-20 object-contain mb-4" />
          <h2 className="text-lg font-bold text-gray-900 mb-2">¡Colaborador eliminado!</h2>
          <p className="text-sm text-gray-500 mb-6">El colaborador ya no tiene acceso al proyecto.</p>
          <button onClick={() => setShowRemoveSuccess(false)} className="bg-[#EB0029] text-white font-semibold text-sm px-8 py-3 rounded-lg hover:bg-red-700 transition">Aceptar</button>
        </div>
      </div>
    );

  if (showError)
    return (
      <div className="fixed inset-0 z-[60] flex items-center justify-center backdrop-blur-sm bg-black/30">
        <div className="relative bg-white rounded-2xl shadow-2xl border border-gray-100 w-[380px] p-8 flex flex-col items-center text-center">
          <button onClick={() => setShowError(false)} className="absolute top-4 right-5 text-gray-400 hover:text-black text-lg">✕</button>
          <img src="/images/Error.png" alt="Error" className="w-20 h-20 object-contain mb-4" />
          <h2 className="text-lg font-bold text-gray-900 mb-2">Ocurrió un error</h2>
          <p className="text-sm text-gray-500 mb-6">{errorMsg}</p>
          <button onClick={() => setShowError(false)} className="bg-[#EB0029] text-white font-semibold text-sm px-8 py-3 rounded-lg hover:bg-red-700 transition">Aceptar</button>
        </div>
      </div>
    );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <div className="relative mx-4 w-full max-w-md animate-in zoom-in fade-in rounded-2xl bg-white shadow-2xl duration-200 overflow-hidden">
        <div className="flex items-center justify-between px-6 pt-6 pb-4">
          <h2 className="text-lg font-bold text-gray-800">Configuración del Proyecto</h2>
          <button onClick={onClose} className="text-gray-400 transition hover:text-gray-600"><X size={18} /></button>
        </div>
        <div className="h-px bg-gray-100 mx-6" />
        <div className="px-6 py-5 flex flex-col gap-6">

          {/* Nombre */}
          <div className="flex flex-col gap-2">
            <label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
              <FolderEdit size={15} className="text-[#EB0029]" />Nombre del proyecto
            </label>
            <div className="flex items-center gap-2">
              <input type="text" value={newName} onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") handleRename(); }}
                placeholder="Nombre del proyecto"
                className="flex-1 rounded-lg border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-800 outline-none transition focus:border-[#EB0029] focus:ring-2 focus:ring-[#EB0029]/20" />
              <button onClick={handleRename} disabled={!newName.trim()}
                className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-[#EB0029] text-white transition hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed">
                <Check size={16} />
              </button>
            </div>
          </div>

          <div className="h-px bg-gray-100" />

          {/* Agregar colaborador */}
          <div className="flex flex-col gap-2">
            <label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
              <UserPlus size={15} className="text-[#EB0029]" />Agregar Colaborador
            </label>
            <div className="flex items-center gap-2">
              <input type="email" value={addEmail} onChange={(e) => setAddEmail(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && addEmail.trim()) setConfirmAdd(true); }}
                placeholder="correo@ejemplo.com"
                className="flex-1 rounded-lg border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-800 outline-none transition focus:border-[#EB0029] focus:ring-2 focus:ring-[#EB0029]/20" />
              <button onClick={() => { if (addEmail.trim()) setConfirmAdd(true); }} disabled={!addEmail.trim()}
                className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-[#EB0029] text-white transition hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed">
                <Check size={16} />
              </button>
            </div>
          </div>

          <div className="h-px bg-gray-100" />

          {/* ── Lista de colaboradores ── */}
          <div className="flex flex-col gap-1">
            <button
              onClick={() => setShowColabs(prev => !prev)}
              className="flex items-center justify-between w-full rounded-lg border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-100 transition"
            >
              <span className="flex items-center gap-2">
                <UserMinus size={15} className="text-[#EB0029]" />
                Modificar Colaboradores
                {colaboradores.length > 0 && (
                  <span className="text-xs font-normal text-gray-400">({colaboradores.length})</span>
                )}
              </span>
              <span className={`text-gray-400 text-xs transition-transform duration-200 ${showColabs ? "rotate-180" : ""}`}>
                ▾
              </span>
            </button>

            {showColabs && (
              <div className="flex flex-col gap-2 mt-1 max-h-48 overflow-y-auto">
                {loadingColabs ? (
                  <p className="text-xs text-gray-400 px-2">Cargando colaboradores...</p>
                ) : colaboradores.length === 0 ? (
                  <p className="text-xs text-gray-400 px-2">No hay colaboradores en este proyecto.</p>
                ) : (
                  colaboradores.map((colab) => (
                    <div key={colab.idusuario} className="flex items-center justify-between gap-2 rounded-lg border border-gray-200 bg-gray-50 px-4 py-2.5">
                      <div className="flex flex-col">
                        <span className="text-sm font-medium text-gray-800">{colab.nombre ?? "Sin nombre"}</span>
                        <span className="text-xs text-gray-500">{colab.correo}</span>
                      </div>
                      <button
                        onClick={() => { setRemoveEmail(colab.correo ?? ""); setConfirmRemove(true); }}
                        className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-red-50 text-[#EB0029] hover:bg-red-100 transition"
                      >
                        <UserMinus size={14} />
                      </button>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

        </div>
        <div className="flex justify-end px-6 pb-6">
          <button onClick={onClose} className="rounded-lg bg-gray-100 px-6 py-2.5 text-sm font-semibold text-gray-600 transition hover:bg-gray-200">Cerrar</button>
        </div>
      </div>

      {showSuccess && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center">
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={() => setShowSuccess(false)} />
          <div className="relative mx-4 flex min-w-[300px] max-w-sm animate-in zoom-in fade-in flex-col items-center gap-4 rounded-2xl bg-white p-8 shadow-2xl duration-200">
            <button onClick={() => setShowSuccess(false)} className="absolute top-3 right-3 text-gray-400 transition hover:text-gray-600"><X size={18} /></button>
            <img src="/images/OpExitosa.png" alt="Operación exitosa" className="w-24 h-24 object-contain" />
            <div className="text-center">
              <h2 className="mb-1 text-lg font-bold text-gray-800">¡Nombre actualizado!</h2>
              <p className="text-sm text-gray-500">El proyecto ahora se llama <span className="font-semibold text-gray-700">{newName}</span>.</p>
            </div>
            <button onClick={() => setShowSuccess(false)} className="bg-[#EB0029] text-white font-semibold text-sm px-8 py-3 rounded-lg hover:bg-red-700 transition">Aceptar</button>
          </div>
        </div>
      )}
    </div>
  );
}