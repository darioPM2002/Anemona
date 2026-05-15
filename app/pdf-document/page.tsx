"use client";

import { useEffect, useState } from "react";
import WidgetRenderer from "../../components/DynamicVisor";
import { Widget } from "../../components/widgets/BibliotecaWidgets";

const API_BASE =
  "https://api-anemona-637376850775.northamerica-northeast1.run.app";

export default function PdfDocumentPage() {
  const [widgets, setWidgets] = useState<Widget[]>([]);
  const [loading, setLoading] = useState(true);

  const mapDataToWidgets = (data: any): Widget[] => {
    const widgets: Widget[] = [];
    const posiciones = data.posiciones ?? [];

    if (Array.isArray(posiciones) && posiciones.length > 0) {
      posiciones.forEach((item: any, index: number) => {
        if (typeof item === "string") {
          const w = data[item] ?? {};

          widgets.push({
            posicion: index,
            id_widget: w.id_widget ?? item,
            titulo: w.titulo ?? item,
            objetivo_widget: w.objetivo_widget ?? "",
            descripcion_campos: w.descripcion_campos ?? {},
            campos: w.campos ?? {},
          });
        } else {
          widgets.push({
            posicion: item.posicion ?? index,
            id_widget: item.id_widget ?? item.id ?? "",
            titulo: item.titulo ?? item.id_widget ?? "",
            objetivo_widget: item.objetivo_widget ?? "",
            descripcion_campos: item.descripcion_campos ?? {},
            campos: item.campos ?? {},
          });
        }
      });
    }

    Object.keys(data).forEach((key) => {
      const item = data[key];

      if (
        item &&
        typeof item === "object" &&
        item.id_widget &&
        !widgets.some((w) => w.id_widget === item.id_widget)
      ) {
        widgets.push({
          posicion: Number.isNaN(Number(key)) ? widgets.length : Number(key),
          id_widget: item.id_widget,
          titulo: item.titulo ?? item.id_widget,
          objetivo_widget: item.objetivo_widget ?? "",
          descripcion_campos: item.descripcion_campos ?? {},
          campos: item.campos ?? {},
        });
      }
    });

    return widgets.sort((a, b) => a.posicion - b.posicion);
  };

  useEffect(() => {
    const fetchDocumento = async () => {
      try {
        const params = new URLSearchParams(window.location.search);
        const docId = params.get("doc_id");

        if (!docId) throw new Error("No se recibió doc_id");

        const response = await fetch(
          `${API_BASE}/firestore/bajar?doc_id=${encodeURIComponent(docId)}`,
          {
            method: "GET",
            headers: { accept: "application/json" },
            cache: "no-store",
          }
        );

        if (!response.ok) throw new Error("No se pudo obtener el documento");

        const json = await response.json();

        if (json.ok && json.data) {
          const mappedWidgets = mapDataToWidgets(json.data);
          console.log("Widgets PDF:", mappedWidgets);
          setWidgets(mappedWidgets);
        }
      } catch (error) {
        console.error("Error cargando documento para PDF:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchDocumento();
  }, []);

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-white text-sm text-gray-500">
        Cargando documento...
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-white">
      <style>{`
        @page {
          size: 816px 1076px;
          margin: 0;
        }

        html, body {
          margin: 0 !important;
          padding: 0 !important;
          background: white !important;
        }

        @media print {
          .pdf-root {
            padding: 0 !important;
            margin: 0 !important;
            background: white !important;
          }

          [data-pdf-page] {
            width: 816px !important;
            height: 1056px !important;
            margin: 0 !important;
            box-shadow: none !important;
            border: none !important;
            page-break-after: always;
            break-after: page;
          }

          [data-pdf-page]:last-child {
            page-break-after: auto;
            break-after: auto;
          }

          .print\\:hidden {
            display: none !important;
          }
        }
      `}</style>

      <div className="pdf-root bg-white p-0 m-0">
        <WidgetRenderer widgets={widgets} changedFields={new Set()} />
      </div>
    </main>
  );
}