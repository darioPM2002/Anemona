import React from "react";
import { useEffect, useRef } from "react";
/* ================== TYPES ================== */

export type Widget = {
  posicion: number;
  id_widget: string;
  titulo: string;
  objetivo_widget: string;
  descripcion_campos: Record<string, string>;
  campos: Record<string, any>;
};

/* ================== EDITABLE ================== */

type EditableProps = {
  value: string;
  onChange: (v: string) => void;
  className?: string;
};
type EditableTitleProps = {
  value: string;
  onChange: (v: string) => void;
  className?: string;
};

export const EditableTitle = ({
  value,
  onChange,
  className = "",
}: EditableTitleProps) => {
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (ref.current) {
      ref.current.style.height = "auto";
      ref.current.style.height = ref.current.scrollHeight + "px";
    }
  }, [value]);

  return (
    <textarea
      ref={ref}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      rows={1}
      className={`bg-transparent outline-none resize-none overflow-hidden w-full leading-tight ${className}`}
    />
  );
};

export const EditableText = ({
  value,
  onChange,
  className = "",
}: EditableProps) => {
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (ref.current) {
      ref.current.style.height = "auto";
      ref.current.style.height = ref.current.scrollHeight + "px";
    }
  }, [value]);

  return (
    <textarea
      ref={ref}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={`w-full bg-transparent outline-none resize-none overflow-hidden ${className}`}
      rows={1}
    />
  );
};

/* ================== UI BASE ================== */

function SectionLine({
  number,
  title,
  note,
  noteColor = "text-black",
}: {
  number: string;
  title: React.ReactNode;
  note?: string;
  noteColor?: string;
}) {
  return (
    <div className="mb-4 mt-6">
      <div className="flex items-start gap-3 border-t-2 border-black pt-2 w-full">
        <span className="text-[18px] shrink-0">{number}</span>
        <div className="flex-1 min-w-0">
          {title}
        </div>
        {note && (
          <span className={`text-[11px] shrink-0 ml-2 mt-1 ${noteColor}`}>
            {note}
          </span>
        )}
      </div>
    </div>
  );
}

function SubSection({
  title,
  titleNode,
  note,
  noteColor = "text-black",
}: {
  title?: string;
  titleNode?: React.ReactNode;
  note?: string;
  noteColor?: string;
}) {
  return (
    <div className="mb-4 mt-5 flex items-center gap-2">
      {titleNode ?? <span className="text-[18px]">{title}</span>}
      {note && <span className={`text-[11px] ${noteColor}`}>{note}</span>}
    </div>
  );
}

function BodyText({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={`text-[13px] leading-[1.2] ${className}`}>{children}</div>;
}

/* ================== W000 ================== */
export const renderW000 = (
  widget: Widget,
  onChange: (posicion: number, key: string, value: string) => void,
  highlight: (path: string) => string = () => ""
) => {
  const campos = widget.campos || {};

  const baseFields = [
    { key: "SOLICITANTE", label: "Solicitante" },
    { key: "INFO_CONTACTO", label: "Información de contacto" },
    { key: "DGA", label: "DGA" },
    { key: "PATROCINADOR", label: "Patrocinador" },
    { key: "CR", label: "CR" },
    { key: "SOCIO", label: "Nombre del Socio de Negocio" },
    { key: "NOMBRE_INICIATIVA", label: "Nombre de la iniciativa" },
    { key: "TIPO_INICIATIVA", label: "Tipo de la iniciativa" },
  ];

  const extraFields = Object.keys(campos).filter(
    (k) => !baseFields.some((f) => f.key === k)
  );

  const Cell = (key: string) => (
    <EditableText
      value={String(campos[key] ?? "")}
      onChange={(v) => onChange(widget.posicion, key, v)}
    />
  );

  return (
    <div className="mb-8">
      <table className="w-full border border-black text-[13px]">
        <tbody>
          {baseFields.map(({ key, label }) => (
            <tr key={key}>
              <td className="border px-2 py-1 font-bold w-[35%]">{label}</td>
              <td className="border px-2 py-1">{Cell(key)}</td>
            </tr>
          ))}
          {extraFields.map((key) => (
            <tr key={key}>
              <td className="border px-2 py-1 font-bold">
                {widget.descripcion_campos?.[key] || key}
              </td>
              <td className="border px-2 py-1">{Cell(key)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

/* ================== W001 ================== */

export const renderW001 = (
  widget: Widget,
  onChange: (posicion: number, key: string, value: string) => void,
  highlight: (path: string) => string = () => ""
) => {
  const campos = widget.campos || {};

  return (
    <div className="mb-8">
      <SectionLine
        number={`${widget.posicion}.`}
        title={
          <input
            value={
              campos.titulo ||
              "Descripción general de la iniciativa y justificación"
            }
            onChange={(e) => onChange(widget.posicion, "titulo", e.target.value)}
            className="bg-transparent outline-none font-bold w-full"
          />
        }
        note="(Obligatorio)"
        noteColor="text-red-600"
      />

      <input
        value={campos.subtitulo || "Descripción general de la iniciativa"}
        onChange={(e) => onChange(widget.posicion, "subtitulo", e.target.value)}
        className="w-full font-bold text-[13px] mb-4 bg-transparent outline-none"
      />

      <BodyText className="mb-6 italic text-[#1d5da8]">
        <EditableText
          value={campos.descripcion || ""}
          onChange={(v) => onChange(widget.posicion, "descripcion", v)}
        />
      </BodyText>

      {Object.keys(campos)
        .filter((k) => k !== "titulo" && k !== "subtitulo" && k !== "descripcion")
        .map((key) => (
          <div key={key} className="mb-4">
            <div className="text-[13px] font-semibold">
              {widget.descripcion_campos[key] || key}
            </div>
            <EditableText
              value={String(campos[key] ?? "")}
              onChange={(v) => onChange(widget.posicion, key, v)}
            />
          </div>
        ))}
    </div>
  );
};

/* ================== W002 ================== */

export const renderW002 = (
  widget: Widget,
  onChange: (posicion: number, key: string, value: string) => void,
  highlight: (path: string) => string = () => ""
) => {
  const campos = widget.campos || {};

  return (
    <div className="mb-8">
      <SectionLine
        number={`${widget.posicion}.`}
        title={
          <input
            value={campos.Titulo || "Objetivos de la iniciativa"}
            onChange={(e) => onChange(widget.posicion, "Titulo", e.target.value)}
            className="bg-transparent outline-none font-bold w-full"
          />
        }
        note="(Obligatorio)"
        noteColor="text-red-600"
      />

      <div className="mb-5">
        <input
          value={campos.Seccion_1Titulo || "Objetivo"}
          onChange={(e) => onChange(widget.posicion, "Seccion_1Titulo", e.target.value)}
          className="w-full font-bold text-[13px] mb-1 bg-transparent outline-none"
        />
        <BodyText className="italic text-[#1d5da8]">
          <EditableText
            value={campos.Seccion_1 || ""}
            onChange={(v) => onChange(widget.posicion, "Seccion_1", v)}
          />
        </BodyText>
      </div>

      <div className="mb-8">
        <input
          value={campos.Seccion_2Titulo || "Alcance"}
          onChange={(e) => onChange(widget.posicion, "Seccion_2Titulo", e.target.value)}
          className="w-full font-bold text-[13px] mb-1 bg-transparent outline-none"
        />
        <BodyText className="italic text-[#1d5da8]">
          <EditableText
            value={campos.Seccion_2 || ""}
            onChange={(v) => onChange(widget.posicion, "Seccion_2", v)}
          />
        </BodyText>
      </div>
    </div>
  );
};

/* ================== W003 ================== */

export const renderW003 = (
  widget: Widget,
  onChange: (posicion: number, key: string, value: any) => void,
  highlight: (path: string) => string = () => ""
) => {
  const campos = widget.campos || {};

  const defaultHeaders = campos.filas?.[0]
    ? Object.keys(campos.filas[0]).map((k) => ({ key: k, label: k }))
    : [
        { key: "TIPO",             label: "Riesgo" },
        { key: "PROBABLE_PERDIDA", label: "Probable Pérdida" },
        { key: "JUSTIFICACION",    label: "Justificación" },
      ];

  const headers: { key: string; label: string }[] = campos.headers || defaultHeaders;
  const filas: any[] = campos.filas || [];
  const titulo: string = campos.titulo || widget.titulo || "Riesgos";

  // ── Handlers ────────────────────────────────────────────────────────────────

  const handleTituloChange = (value: string) => {
    onChange(widget.posicion, "titulo", value);
  };

  const handleHeaderLabelChange = (index: number, value: string) => {
    const newHeaders = headers.map((h, i) =>
      i === index ? { ...h, label: value } : h
    );
    onChange(widget.posicion, "headers", newHeaders);
  };

  const handleRowChange = (rowIndex: number, key: string, value: string) => {
    const newFilas = filas.map((fila: any, i: number) =>
      i !== rowIndex ? fila : { ...fila, [key]: value }
    );
    onChange(widget.posicion, "filas", newFilas);
  };

  const handleAddColumn = () => {
    const newKey = `COL_${Date.now()}`;
    const newHeaders = [...headers, { key: newKey, label: "Nueva columna" }];
    const newFilas = filas.map((fila: any) => ({ ...fila, [newKey]: "" }));
    onChange(widget.posicion, "headers", newHeaders);
    onChange(widget.posicion, "filas", newFilas);
  };

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="mb-8">
      <SubSection
        titleNode={
          <span className="flex items-center gap-1 text-[18px]">
            {`${widget.posicion}.1 `}
            <input
              value={titulo}
              onChange={(e) => handleTituloChange(e.target.value)}
              className="bg-transparent outline-none border-b border-dashed border-gray-400
                         focus:border-blue-500 font-semibold"
            />
            {"."}
          </span>
        }
        note="(Obligatorio)"
        noteColor="text-red-600"
      />

      <div className="overflow-x-auto">
        <table className="mb-8 w-full border border-black text-[13px]">
          <thead>
            <tr className="bg-[#133b73] text-white">
              {headers.map((h, i) => (
                <th key={h.key} className="border px-3 py-1 min-w-[120px]">
                  <input
                    value={h.label}
                    onChange={(e) => handleHeaderLabelChange(i, e.target.value)}
                    className="bg-transparent text-white text-center outline-none
                               border-b border-dashed border-white/40
                               focus:border-white w-full font-semibold"
                  />
                </th>
              ))}
              <th className="border px-2 py-1 w-10">
                <button
                  onClick={handleAddColumn}
                  title="Agregar columna"
                  className="text-white/70 hover:text-white text-lg leading-none"
                >
                  +
                </button>
              </th>
            </tr>
          </thead>
          <tbody>
            {filas.length ? (
              filas.map((fila: any, rowIdx: number) => (
                <tr key={rowIdx}>
                  {headers.map((h) => (
                    <td key={h.key} className="border px-2 py-1 align-top">
                      <EditableText
                        value={fila[h.key] ?? ""}
                        onChange={(v) => handleRowChange(rowIdx, h.key, v)}
                      />
                    </td>
                  ))}
                  <td className="border" />
                </tr>
              ))
            ) : (
              <tr>
                <td
                  colSpan={headers.length + 1}
                  className="border text-center py-2 text-gray-400"
                >
                  N/A
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};