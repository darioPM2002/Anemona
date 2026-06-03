import React, { useEffect, useRef } from "react";
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
  style={{
    width: className.includes("border-dashed")
      ? `${Math.max(value.length + 1, 4)}ch`
      : undefined,
  }}
  className={`bg-transparent outline-none resize-none overflow-hidden max-w-full leading-tight ${className}`}
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
  style={{
    width: className.includes("border-dashed")
      ? `${Math.max(value.length + 1, 4)}ch`
      : undefined,
  }}
  className={`max-w-full bg-transparent outline-none resize-none overflow-hidden ${className}`}
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
    <div className="mb-4 mt-5 flex items-start gap-2 w-full">
      <div className="flex-1 min-w-0">
        {titleNode ?? <span className="text-[18px]">{title}</span>}
      </div>

      {note && (
        <span className={`text-[11px] shrink-0 mt-1 ${noteColor}`}>
          {note}
        </span>
      )}
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
    { key: "SOCIO", label: "Nombre del soocio de negocio" },
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
      className={highlight(`${widget.posicion}.campos.${key}`)}
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
            className={`bg-transparent outline-none font-bold w-full text-[18px] ${highlight(`${widget.posicion}.campos.titulo`)}`}
          />
        }
        note="(Opcional)"
        noteColor="text-red-600"
      />

      <input
        value={campos.subtitulo || " "}
        onChange={(e) => onChange(widget.posicion, "subtitulo", e.target.value)}
        className={`w-full font-bold text-[13px] mb-4 bg-transparent outline-none ${highlight(`${widget.posicion}.campos.subtitulo`)}`}
      />

      <BodyText className="mb-6 italic text-[#1d5da8]">
        <EditableText
          value={campos.descripcion || ""}
          onChange={(v) => onChange(widget.posicion, "descripcion", v)}
          className={highlight(`${widget.posicion}.campos.descripcion`)}
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
              className={highlight(`${widget.posicion}.campos.${key}`)}
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
            className={`bg-transparent outline-none font-bold w-full text-[18px] ${highlight(`${widget.posicion}.campos.Titulo`)}`}
          />
        }
        note="(Opcional)"
        noteColor="text-red-600"
      />

      <div className="mb-5">
        <input
          value={campos.Seccion_1Titulo || " "}
          onChange={(e) => onChange(widget.posicion, "Seccion_1Titulo", e.target.value)}
          className={`w-full font-bold text-[13px] mb-1 bg-transparent outline-none ${highlight(`${widget.posicion}.campos.Seccion_1Titulo`)}`}
        />
        <BodyText className="italic text-[#1d5da8]">
          <EditableText
            value={campos.Seccion_1 || ""}
            onChange={(v) => onChange(widget.posicion, "Seccion_1", v)}
            className={highlight(`${widget.posicion}.campos.Seccion_1`)}
          />
        </BodyText>
      </div>

      <div className="mb-8">
        <input
          value={campos.Seccion_2Titulo || " "}
          onChange={(e) => onChange(widget.posicion, "Seccion_2Titulo", e.target.value)}
          className={`w-full font-bold text-[13px] mb-1 bg-transparent outline-none ${highlight(`${widget.posicion}.campos.Seccion_2Titulo`)}`}
        />
        <BodyText className="italic text-[#1d5da8]">
          <EditableText
            value={campos.Seccion_2 || ""}
            onChange={(v) => onChange(widget.posicion, "Seccion_2", v)}
            className={highlight(`${widget.posicion}.campos.Seccion_2`)}
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
  highlight: (path: string) => string = () => "",
  showControls: boolean = true // opcional la vista de la coluna extra y las lineas punteadas
) => {
  const campos = widget.campos || {};

  const defaultHeaders = campos.filas?.[0]
    ? Object.keys(campos.filas[0]).map((k) => ({ key: k, label: k }))
    : [
      { key: "TIPO", label: "Riesgo" },
      { key: "PROBABLE_PERDIDA", label: "Probable Pérdida" },
      { key: "JUSTIFICACION", label: "Justificación" },
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

    onChange(widget.posicion, `filas.${rowIndex}.${key}`, value);
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
          <div className="flex items-start gap-2 w-full text-[18px]">
            <span className="shrink-0">{widget.posicion}</span>

            <EditableTitle
              value={titulo}
              onChange={handleTituloChange}
              className={`font-semibold min-w-0
          ${showControls ? "border-b border-dashed border-gray-400 focus:border-blue-500" : ""}
          ${highlight(`${widget.posicion}.campos.titulo`)}
        `}
            />
          </div>
        }
        note="(Opcional)"
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
                    className={`bg-transparent text-white text-center outline-none w-full font-semibold
    ${showControls ? "border-b border-dashed border-white/40 focus:border-white" : ""}
    ${highlight(`${widget.posicion}.campos.headers`)}
  `}
                  />
                </th>
              ))}

              {showControls && (
                <th className="border px-2 py-1 w-10">
                  <button
                    onClick={handleAddColumn}
                    title="Agregar columna"
                    className="text-white/70 hover:text-white text-lg leading-none"
                  >
                    +
                  </button>
                </th>
              )}
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
                        className={highlight(`${widget.posicion}.campos.filas.${rowIdx}.${h.key}`)}
                      />
                    </td>
                  ))}

                  {showControls && <td className="border" />}
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


/* ================== W005 ================== */

export const renderW005 = (
  widget: Widget,
  onChange: (posicion: number, key: string, value: any) => void,
  highlight: (path: string) => string = () => ""
) => {
  const campos = widget.campos || {};
  const titulo: string = campos.titulo || widget.titulo || "";
  const filas: { celdas: { label?: string; valor: string; colspan?: number; bold?: boolean }[] }[] = campos.filas || [];

  const handleTituloChange = (value: string) => {
    onChange(widget.posicion, "titulo", value);
  };

  const handleCeldaChange = (rowIdx: number, celIdx: number, field: "label" | "valor", value: string) => {
    const newFilas = filas.map((fila, ri) => {
      if (ri !== rowIdx) return fila;
      return {
        ...fila,
        celdas: fila.celdas.map((cel, ci) =>
          ci !== celIdx ? cel : { ...cel, [field]: value }
        ),
      };
    });
    onChange(widget.posicion, `filas.${rowIdx}.celdas.${celIdx}.${field}`, value);
    onChange(widget.posicion, "filas", newFilas);
  };

  const handleColspanChange = (rowIdx: number, celIdx: number, value: number) => {
    const newFilas = filas.map((fila, ri) => {
      if (ri !== rowIdx) return fila;
      return {
        ...fila,
        celdas: fila.celdas.map((cel, ci) =>
          ci !== celIdx ? cel : { ...cel, colspan: value }
        ),
      };
    });
    onChange(widget.posicion, "filas", newFilas);
  };

  const handleToggleBold = (rowIdx: number, celIdx: number) => {
    const newFilas = filas.map((fila, ri) => {
      if (ri !== rowIdx) return fila;
      return {
        ...fila,
        celdas: fila.celdas.map((cel, ci) =>
          ci !== celIdx ? cel : { ...cel, bold: !cel.bold }
        ),
      };
    });
    onChange(widget.posicion, "filas", newFilas);
  };

  const handleAddRow = () => {
    const newFilas = [...filas, { celdas: [{ label: "", valor: "", colspan: 1 }] }];
    onChange(widget.posicion, "filas", newFilas);
  };

  const handleAddCelda = (rowIdx: number) => {
    const newFilas = filas.map((fila, ri) => {
      if (ri !== rowIdx) return fila;
      return { ...fila, celdas: [...fila.celdas, { label: "", valor: "", colspan: 1 }] };
    });
    onChange(widget.posicion, "filas", newFilas);
  };

  const handleRemoveRow = (rowIdx: number) => {
    const newFilas = filas.filter((_, ri) => ri !== rowIdx);
    onChange(widget.posicion, "filas", newFilas);
  };

  const handleRemoveCelda = (rowIdx: number, celIdx: number) => {
    const newFilas = filas.map((fila, ri) => {
      if (ri !== rowIdx) return fila;
      return { ...fila, celdas: fila.celdas.filter((_, ci) => ci !== celIdx) };
    });
    onChange(widget.posicion, "filas", newFilas);
  };
  return (
    <div className="mb-8">
      <SubSection
        titleNode={
          <div className="flex items-start gap-2 w-full text-[18px]">
            <span className="shrink-0">{widget.posicion}</span>

            <EditableTitle
              value={titulo}
              onChange={handleTituloChange}
              className={`font-semibold min-w-0 border-b border-dashed border-gray-400 focus:border-blue-500
          ${highlight(`${widget.posicion}.campos.titulo`)}
        `}
            />
          </div>
        }
      />

      <div className="flex items-start gap-2">
        {/* "Tabla" con divs para que cada fila sea independiente */}
        <div className="flex-1 border border-black text-[13px]">
          {filas.map((fila, rowIdx) => (
            <div key={rowIdx} className="flex w-full" style={{ borderBottom: rowIdx < filas.length - 1 ? "1px solid black" : "none" }}>
              {fila.celdas.map((cel, celIdx) => (
                <div
                  key={celIdx}
                  className="px-2 py-1 align-top"
                  style={{
                    flex: 1,
                    borderRight: celIdx < fila.celdas.length - 1 ? "1px solid black" : "none",
                  }}
                >
                  {cel.label !== undefined && cel.label !== "" && (
                    <div className="text-[11px] text-gray-500">
                      <EditableText
                        value={cel.label}
                        onChange={(v) => handleCeldaChange(rowIdx, celIdx, "label", v)}
                        className={highlight(`${widget.posicion}.campos.filas.${rowIdx}.celdas.${celIdx}.label`)}
                      />
                    </div>
                  )}
                  <EditableText
                    value={cel.valor || ""}
                    onChange={(v) => handleCeldaChange(rowIdx, celIdx, "valor", v)}
                    className={`${cel.bold ? "font-bold" : ""} ${highlight(`${widget.posicion}.campos.filas.${rowIdx}.celdas.${celIdx}.valor`)}`}
                  />
                </div>
              ))}
            </div>
          ))}
        </div>

        {/* Flechitas AFUERA, una por fila */}
        <div className="flex flex-col mb-2">
          {filas.map((fila, rowIdx) => (
            <div
              key={rowIdx}
              className="flex flex-col items-center justify-center flex-1 gap-0.5 py-1"
              style={{ minHeight: "32px" }}
            >
              <button
                onClick={() => handleAddCelda(rowIdx)}
                className="text-gray-400 hover:text-black"
                title="Agregar celda"
              >
                <svg width="14" height="10" viewBox="0 0 14 10" fill="none">
                  <polyline points="1,8 7,2 13,8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
              <button
                onClick={() => handleRemoveCelda(rowIdx, fila.celdas.length - 1)}
                disabled={fila.celdas.length <= 1}
                className="text-gray-400 hover:text-black disabled:opacity-30"
                title="Quitar celda"
              >
                <svg width="14" height="10" viewBox="0 0 14 10" fill="none">
                  <polyline points="1,2 7,8 13,2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            </div>
          ))}
        </div>

        {/* Botones quitar fila */}
        <div className="flex flex-col mb-2">
          {filas.map((_, rowIdx) => (
            <div
              key={rowIdx}
              className="flex items-center justify-center flex-1 py-1"
              style={{ minHeight: "32px" }}
            >
              <button
                onClick={() => handleRemoveRow(rowIdx)}
                className="text-red-300 hover:text-red-500 text-sm"
                title="Quitar fila"
              >✕</button>
            </div>
          ))}
        </div>
      </div>

      {/* Agregar fila */}
      <div className="flex gap-2 mt-1">
        <button
          onClick={handleAddRow}
          className="text-white/70 hover:text-white text-lg leading-none bg-[#133b73] px-3 py-1 rounded"
          title="Agregar fila"
        >+</button>
        <span className="text-[11px] text-gray-400 self-center">Agregar fila</span>
      </div>
    </div>
  );
};

/* ================== W006 ================== */

export type Block = {
  id: string;
  tipo: "subtitulo" | "parrafo";
  texto: string;
};

function genId() {
  return Math.random().toString(36).slice(2, 8);
}

type BlockRowProps = {
  block: Block;
  total: number;
  onChange: (id: string, field: keyof Block, value: string) => void;
  onToggleTipo: (id: string) => void;
  onEnter: (id: string) => void;
  onDelete: (id: string) => void;
  onExitList: (id: string, newTexto: string) => void;
  focusRef?: React.RefObject<HTMLTextAreaElement | null>;
};

const BlockRow = ({
  block,
  total,
  onChange,
  onToggleTipo,
  onEnter,
  onDelete,
  onExitList,
  focusRef,
}: BlockRowProps) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const ref = focusRef ?? textareaRef;

  useEffect(() => {
    if (ref.current) {
      ref.current.style.height = "auto";
      ref.current.style.height = ref.current.scrollHeight + "px";
    }
  }, [block.texto]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Tab") {
      e.preventDefault();
      const textarea = e.currentTarget;
      const value = textarea.value;
      const cursor = textarea.selectionStart;
      const newValue = value.slice(0, cursor) + "  " + value.slice(cursor);
      onChange(block.id, "texto", newValue);
      setTimeout(() => {
        textarea.selectionStart = textarea.selectionEnd = cursor + 2;
      }, 0);
      return;
    }

    if ((e.metaKey || e.ctrlKey) && e.key === "b") {
      e.preventDefault();
      onToggleTipo(block.id);
      return;
    }

    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();

      const textarea = e.currentTarget;
      const value = textarea.value;
      const cursor = textarea.selectionStart;

      const beforeCursor = value.slice(0, cursor);
      const afterCursor = value.slice(cursor);
      const lineStart = beforeCursor.lastIndexOf("\n") + 1;
      const lineEnd = value.indexOf("\n", cursor);
      const fullLine = value.slice(lineStart, lineEnd === -1 ? undefined : lineEnd);

      // ── Lista numerada ──────────────────────────────────────
      const numberedMatch = fullLine.match(/^(\d+)\.\s+(.*)/);
      if (numberedMatch) {
        const lineContent = numberedMatch[2];

        if (lineContent.trim() === "") {
          const removeFrom = lineStart > 0 ? lineStart - 1 : 0;
          const removeTo = lineEnd === -1 ? value.length : lineEnd;
          const newText = value.slice(0, removeFrom) + value.slice(removeTo);
          onExitList(block.id, newText.trimEnd());
          return;
        }

        const currentNum = parseInt(numberedMatch[1]);
        const nextNum = currentNum + 1;

        // Construir: antes de la línea | izq del cursor | \nN+1. | der del cursor + resto renumerado
        const beforeLine = value.slice(0, lineStart);
        const currentLineText = value.slice(lineStart, lineEnd === -1 ? value.length : lineEnd);
        const restLines = lineEnd === -1 ? "" : value.slice(lineEnd); // empieza con \n

        const cursorInLine = cursor - lineStart;
        const leftOfCursor = currentLineText.slice(0, cursorInLine);
        const rightOfCursor = currentLineText.slice(cursorInLine);

        // Renumerar líneas siguientes: cada "N. " incrementa en 1
        let counter = nextNum + 1;
        const renumberedRest = restLines.replace(/(\n)(\d+)\.\s+/g, (_match, nl) => {
          const r = `${nl}${counter}. `;
          counter++;
          return r;
        });

        const built =
          beforeLine +
          leftOfCursor +
          "\n" + nextNum + ". " +
          rightOfCursor +
          renumberedRest;

        onChange(block.id, "texto", built);

        const newCursor = (beforeLine + leftOfCursor).length + 1 + String(nextNum).length + 2;
        setTimeout(() => {
          textarea.selectionStart = textarea.selectionEnd = newCursor;
        }, 0);
        return;
      }

      // ── Lista de bullets ────────────────────────────────────
      const bulletMatch = fullLine.match(/^-\s+(.*)/);
      if (bulletMatch) {
        const lineContent = bulletMatch[1];

        if (lineContent.trim() === "") {
          const removeFrom = lineStart > 0 ? lineStart - 1 : 0;
          const removeTo = lineEnd === -1 ? value.length : lineEnd;
          const newText = value.slice(0, removeFrom) + value.slice(removeTo);
          onExitList(block.id, newText.trimEnd());
          return;
        }

        const newText = beforeCursor + "\n- " + afterCursor;
        onChange(block.id, "texto", newText);

        const newCursor = beforeCursor.length + 3;
        setTimeout(() => {
          textarea.selectionStart = textarea.selectionEnd = newCursor;
        }, 0);
        return;
      }

      // ── Comportamiento normal ───────────────────────────────
      onEnter(block.id);
      return;
    }

    if (e.key === "Backspace" && block.texto === "" && total > 1) {
      e.preventDefault();
      onDelete(block.id);
      return;
    }
  };

  const isSubtitle = block.tipo === "subtitulo";

  return (
    <div className="group/block relative">
      <div className="flex items-start gap-2">

        <textarea
          ref={ref}
          value={block.texto}
          onChange={(e) => {
            onChange(block.id, "texto", e.target.value);
            if (ref.current) {
              ref.current.style.height = "auto";
              ref.current.style.height = ref.current.scrollHeight + "px";
            }
          }}
          onKeyDown={handleKeyDown}
          rows={1}
          placeholder={isSubtitle ? "Subtítulo..." : "Párrafo..."}
          className={`flex-1 bg-transparent outline-none resize-none overflow-hidden leading-snug placeholder:text-gray-300 ${isSubtitle
            ? "font-bold text-[14px] text-black"
            : "text-[13px] italic text-[#1d5da8]"
            }`}
        />
      </div>

      <div className="h-2" />
    </div>
  );
};

/* Este es el componente real con hooks */
type W006Props = {
  widget: Widget;
  onChange: (posicion: number, key: string, value: any) => void;
  highlight?: (path: string) => string;
  showHints?: boolean;
};

export const W006 = ({
  widget,
  onChange,
  highlight = () => "",
  showHints = false,
}: W006Props) => {
  const campos = widget.campos || {};
  const bloques: Block[] = campos.bloques?.length
    ? campos.bloques
    : [{ id: genId(), tipo: "parrafo", texto: "" }];

  const pendingFocusId = useRef<string | null>(null);
  const blockRefs = useRef<Record<string, React.RefObject<HTMLTextAreaElement | null>>>({});

  bloques.forEach((b) => {
    if (!blockRefs.current[b.id]) {
      blockRefs.current[b.id] = React.createRef<HTMLTextAreaElement>();
    }
  });

  useEffect(() => {
    if (pendingFocusId.current) {
      const ref = blockRefs.current[pendingFocusId.current];
      if (ref?.current) {
        ref.current.focus();
        const len = ref.current.value.length;
        ref.current.setSelectionRange(len, len);
      }
      pendingFocusId.current = null;
    }
  });

  const handleBlockChange = (id: string, field: keyof Block, value: string) => {
    const newBloques = bloques.map((b) => (b.id === id ? { ...b, [field]: value } : b));
    onChange(widget.posicion, "bloques", newBloques);
  };

  const handleToggleTipo = (id: string) => {
    const newBloques = bloques.map((b) =>
      b.id === id ? { ...b, tipo: b.tipo === "subtitulo" ? "parrafo" : "subtitulo" } : b
    ) as Block[];
    onChange(widget.posicion, "bloques", newBloques);
  };

  const handleExitList = (id: string, newTexto: string) => {
    const idx = bloques.findIndex((b) => b.id === id);
    const newId = genId();
    const newBloques = [
      ...bloques.slice(0, idx),
      { ...bloques[idx], texto: newTexto },  // texto ya limpio
      { id: newId, tipo: "parrafo" as const, texto: "" },
      ...bloques.slice(idx + 1),
    ];
    blockRefs.current[newId] = React.createRef<HTMLTextAreaElement>();
    pendingFocusId.current = newId;
    onChange(widget.posicion, "bloques", newBloques);
  };

  const handleEnter = (afterId: string) => {
    const idx = bloques.findIndex((b) => b.id === afterId);
    const newId = genId();
    const newBloques = [
      ...bloques.slice(0, idx + 1),
      { id: newId, tipo: "parrafo" as const, texto: "" },
      ...bloques.slice(idx + 1),
    ];
    blockRefs.current[newId] = React.createRef<HTMLTextAreaElement>();
    pendingFocusId.current = newId;
    onChange(widget.posicion, "bloques", newBloques);
  };

  const handleDelete = (id: string) => {
    if (bloques.length <= 1) return;
    const idx = bloques.findIndex((b) => b.id === id);
    const prevId = bloques[Math.max(0, idx - 1)]?.id;
    const newBloques = bloques.filter((b) => b.id !== id);
    delete blockRefs.current[id];
    pendingFocusId.current = prevId ?? null;
    onChange(widget.posicion, "bloques", newBloques);
  };

  return (
    <div className="mb-8">
      <SectionLine
        number={`${widget.posicion}.`}
        title={
          <input
            value={campos.titulo || widget.titulo || "Título de la sección"}
            onChange={(e) => onChange(widget.posicion, "titulo", e.target.value)}
            className={`bg-transparent outline-none font-bold w-full text-[18px] ${highlight(`${widget.posicion}.campos.titulo`)}`}
          />
        }
        note="(Opcional)"
        noteColor="text-red-600"
      />

      {showHints && (
        <div className="text-[10px] text-gray-400 mb-3 select-none">
          <span className="mr-3">⏎ nuevo párrafo</span>
          <span className="mr-3">⌘B subtítulo</span>
          <span>⌫ borrar bloque vacío</span>
        </div>
      )}

      <div className="flex flex-col">
        {bloques.map((block) => (
          <BlockRow
            key={block.id}
            block={block}
            total={bloques.length}
            onChange={handleBlockChange}
            onToggleTipo={handleToggleTipo}
            onEnter={handleEnter}
            onDelete={handleDelete}
            onExitList={handleExitList}  // ← esta línea falta
            focusRef={blockRefs.current[block.id]}
          />
        ))}
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

    // Lista numerada: 1. texto
    if (/^\d+\.\s+/.test(line)) {
      const items: string[] = [];

      while (i < lines.length && /^\d+\.\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\d+\.\s+/, ""));
        i++;
      }

      elements.push(
        <ol key={`ol-${i}`} className="list-decimal pl-6 space-y-1">
          {items.map((item, idx) => (
            <li key={idx}>{item}</li>
          ))}
        </ol>
      );

      continue;
    }

    // Bullets: - texto
    if (/^-\s+/.test(line)) {
      const items: string[] = [];

      while (i < lines.length && /^-\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^-\s+/, ""));
        i++;
      }

      elements.push(
        <ul key={`ul-${i}`} className="list-disc pl-6 space-y-1">
          {items.map((item, idx) => (
            <li key={idx}>{item}</li>
          ))}
        </ul>
      );

      continue;
    }

    elements.push(
      <p key={`p-${i}`} className="mb-1">
        {line}
      </p>
    );

    i++;
  }

  return <>{elements}</>;
};

/* Wrapper para mantener la misma firma que los demás render* */
export const renderW006 = (
  widget: Widget,
  onChange: (posicion: number, key: string, value: any) => void,
  highlight: (path: string) => string = () => "",
  showHints: boolean = false
) => (
  <W006
    widget={widget}
    onChange={onChange}
    highlight={highlight}
    showHints={showHints}
  />
);