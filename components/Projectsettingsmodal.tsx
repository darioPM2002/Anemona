"use client";

import { X, Check, UserPlus, UserMinus, FolderEdit } from "lucide-react";
import { useState, useEffect } from "react";
import { API_URL } from "@/services/api";
import DropdownList from "../components/minicomponentes/DropdownList";
import TextInput from "@/components/minicomponentes/TextInput";

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

  // Pop ups de confirmación
  const [confirmAdd, setConfirmAdd] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState(false);

  // Pop ups de resultado
  const [showSuccess, setShowSuccess] = useState(false);
  const [showAddSuccess, setShowAddSuccess] = useState(false);
  const [showRemoveSuccess, setShowRemoveSuccess] = useState(false);
  const [showError, setShowError] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  // loading para los botones
  const [loadingAdd, setLoadingAdd] = useState(false);
  const [loadingRemove, setLoadingRemove] = useState(false);

  const [colaboradores, setColaboradores] = useState<{
    idusuario: string;
    nombre: string | null;
    correo: string | null;
    session_id: string;
  }[]>([]);
  const [loadingColabs, setLoadingColabs] = useState(false);

  const [removeEmails, setRemoveEmails] = useState<string[]>([]); // puedas eliminar varias personas a la vez

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
    setLoadingAdd(true);
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
    } finally {
      setLoadingAdd(false);
    }
  };

  const handleRemoveCollaborator = async () => {
    if (removeEmails.length === 0) return;
    setLoadingRemove(true);
    try {
      for (const correo of removeEmails) {
        const colaborador = colaboradores.find(c => c.correo === correo);
        if (!colaborador) continue;
        await fetch(`${API_URL}/colaboracion/eliminar-colaborador`, {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            session_id: colaborador.session_id,
            id_usuario: colaborador.idusuario,
            nombre_proyecto: sessionStorage.getItem("project_name") || "el proyecto",
          }),
        });
      }
      setColaboradores(prev => prev.filter(c => !removeEmails.includes(c.correo ?? "")));
      setConfirmRemove(false);
      setRemoveEmails([]);
      setShowRemoveSuccess(true);
    } catch (error) {
      setConfirmRemove(false);
      setErrorMsg(error instanceof Error ? error.message : "Error al eliminar colaborador");
      setShowError(true);
    } finally {
      setLoadingRemove(false);
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
            <button
              onClick={handleAddCollaborator}
              disabled={loadingAdd}
              className="flex-1 bg-[#EB0029] text-white py-2.5 rounded-xl font-semibold hover:opacity-90 transition disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {loadingAdd ? (
                <><div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" /> Agregando...</>
              ) : "Sí, agregar"}
            </button>
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
          {/* Puede eliminar a más de una persona a la vez*/}
          <p className="text-[#EB0029] font-semibold text-sm mb-6">{removeEmails.join(", ")}</p>
          <div className="flex gap-3 w-full">
            <button onClick={() => setConfirmRemove(false)} className="flex-1 border border-gray-300 text-gray-700 py-2.5 rounded-xl font-semibold hover:bg-gray-50 transition">Cancelar</button>
            <button
              onClick={handleRemoveCollaborator}
              disabled={loadingRemove}
              className="flex-1 bg-[#EB0029] text-white py-2.5 rounded-xl font-semibold hover:opacity-90 transition disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {loadingRemove ? (
                <><div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" /> Eliminando...</>
              ) : "Sí, eliminar"}
            </button>
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
      <div className="relative mx-4 w-full max-w-md animate-in zoom-in fade-in rounded-2xl bg-white shadow-2xl duration-200 overflow-visible">
        <div className="flex items-center justify-between px-6 pt-6 pb-4">
          <h2 className="text-lg font-bold text-gray-800">Configuración del Proyecto</h2>
          <button onClick={onClose} className="text-gray-400 transition hover:text-gray-600"><X size={18} /></button>
        </div>
        <div className="h-px bg-gray-100 mx-6" />
        <div className="px-6 py-5 flex flex-col gap-6">

          {/* Nombre */}
          <div className="flex items-end gap-2">
            <div className="flex-1">
              <TextInput
                value={newName}
                onChange={(val) => setNewName(val)}
                placeholder="Nombre del proyecto"
                label="Nombre del proyecto"
                icon={<FolderEdit size={15} className="text-[#EB0029]" />}

              />
            </div>
            <img
              src="/images/agregar.png"
              alt="Guardar"
              onClick={handleRename}
              className={`h-10 w-10 object-contain cursor-pointer transition hover:opacity-80 flex-shrink-0 ${!newName.trim() ? "opacity-40 pointer-events-none" : ""}`}
            />
          </div>

          <div className="h-px bg-gray-100" />

          {/* Agregar colaborador */}
          <div className="flex items-end gap-2">
            <div className="flex-1">
              <TextInput
                value={addEmail}
                onChange={(val) => setAddEmail(val)}
                placeholder="correo@ejemplo.com"
                label="Agregar Colaborador"
                icon={<UserPlus size={15} className="text-[#EB0029]" />}
              />
            </div>
            {loadingAdd ? (
              <div className="h-10 w-10 flex items-center justify-center flex-shrink-0">
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-[#EB0029] border-t-transparent" />
              </div>
            ) : (
              <img
                src="/images/agregar.png"
                alt="Agregar"
                onClick={() => { if (addEmail.trim()) setConfirmAdd(true); }}
                className={`h-10 w-10 object-contain cursor-pointer transition hover:opacity-80 flex-shrink-0 ${!addEmail.trim() ? "opacity-40 pointer-events-none" : ""}`}
              />
            )}
          </div>

          {/* ── Lista de colaboradores dropdown de minicomponentes ── */}
          <div className="flex flex-col gap-2">
            <label className="flex items-center gap-2 text-sm font-semibold text-gray-700">
              <UserMinus size={15} className="text-[#EB0029]" />
              Eliminar Colaborador
            </label>
            <div className="flex items-end gap-2">
              <div className="flex-1">
                <DropdownList
                  items={colaboradores.map(c => ({ id: c.correo ?? "", nombre: c.nombre ?? c.correo ?? "" }))}
                  selectedIds={removeEmails}
                  onToggle={(id) => {
                    setRemoveEmails(prev =>
                      prev.includes(id) ? prev.filter(e => e !== id) : [...prev, id]
                    );
                  }}
                  placeholder="Selecciona colaboradores a eliminar"
                  loading={loadingColabs}
                  multiselect={true}
                />
              </div>
              {loadingRemove ? (
                <div className="h-10 w-10 flex items-center justify-center flex-shrink-0">
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-[#EB0029] border-t-transparent" />
                </div>
              ) : (
                <img
                  src="/images/BasureroAnemona.png"
                  alt="Eliminar"
                  onClick={() => { if (removeEmails.length > 0) setConfirmRemove(true); }}
                  className={`h-10 w-10 object-contain cursor-pointer transition hover:opacity-80 flex-shrink-0 ${removeEmails.length === 0 ? "opacity-40 pointer-events-none" : ""}`}
                />
              )}
            </div>
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