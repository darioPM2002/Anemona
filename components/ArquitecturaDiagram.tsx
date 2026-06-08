"use client";

import { useCallback, useEffect, useRef, useState, type PointerEvent } from "react";
import { RefreshCw, Loader2, ZoomIn, ZoomOut, Maximize2, Minimize2 , Info} from "lucide-react";
import { API_URL } from "@/services/api";


interface Nodo { id: string; label: string; tipo?: string; x?: number; y?: number; }
interface Arista { source: string; target: string; label?: string; }
interface ArquitecturaData { nodes: Nodo[]; edges: Arista[]; }

const PALETTE: Record<string, { bg: string; border: string; text: string; lane: string }> = {
  frontend:             { bg: "#EFF6FF", border: "#3B82F6", text: "#1D4ED8", lane: "#EFF6FF" },
  backend:              { bg: "#F5F3FF", border: "#7C3AED", text: "#5B21B6", lane: "#F5F3FF" },
  database:             { bg: "#FFFBEB", border: "#D97706", text: "#92400E", lane: "#FFFBEB" },
  api:                  { bg: "#ECFDF5", border: "#059669", text: "#065F46", lane: "#ECFDF5" },
  service:              { bg: "#FFF1F2", border: "#E11D48", text: "#9F1239", lane: "#FFF1F2" },
  core_system:          { bg: "#F0F9FF", border: "#0284C7", text: "#0C4A6E", lane: "#F0F9FF" },
  workflow_service:     { bg: "#F0FDF4", border: "#16A34A", text: "#14532D", lane: "#F0FDF4" },
  business_module:      { bg: "#FFF7ED", border: "#EA580C", text: "#7C2D12", lane: "#FFF7ED" },
  document_service:     { bg: "#FAF5FF", border: "#9333EA", text: "#3B0764", lane: "#FAF5FF" },
  document_store:       { bg: "#FAF5FF", border: "#9333EA", text: "#3B0764", lane: "#FAF5FF" },
  ai_service:           { bg: "#FDF4FF", border: "#C026D3", text: "#701A75", lane: "#FDF4FF" },
  rules_engine:         { bg: "#F0FDF4", border: "#059669", text: "#064E3B", lane: "#F0FDF4" },
  security_integration: { bg: "#FFF1F2", border: "#DC2626", text: "#7F1D1D", lane: "#FFF1F2" },
  security_service:     { bg: "#FFF1F2", border: "#DC2626", text: "#7F1D1D", lane: "#FFF1F2" },
  integration_hub:      { bg: "#EFF6FF", border: "#2563EB", text: "#1E3A5F", lane: "#EFF6FF" },
  external_system:      { bg: "#F8FAFC", border: "#64748B", text: "#334155", lane: "#F8FAFC" },
  internal_system:      { bg: "#F1F5F9", border: "#94A3B8", text: "#334155", lane: "#F1F5F9" },
  channel:              { bg: "#F8FAFC", border: "#94A3B8", text: "#334155", lane: "#F0F4FF" },
  default:              { bg: "#F8FAFC", border: "#CBD5E1", text: "#334155", lane: "#F8FAFC" },
};

function getPalette(tipo?: string) {
  if (!tipo) return PALETTE.default;
  return PALETTE[tipo.toLowerCase().replace(/[\s\-]+/g, "_")] ?? PALETTE.default;
}

function getEdgeColor(srcTipo?: string) {
  return { stroke: getPalette(srcTipo).border, opacity: 0.55 };
}

function tipoToId(tipo?: string) {
  if (!tipo) return "default";
  return tipo.toLowerCase().replace(/[^a-z0-9]/g, "_");
}

function NodeIcon({ tipo, color }: { tipo?: string; color: string }) {
  const t = (tipo ?? "").toLowerCase().replace(/[\s\-]+/g, "_");
  const p = { stroke: color, strokeWidth: "2", strokeLinecap: "round" as const, strokeLinejoin: "round" as const, fill: "none" };
  const dot = { fill: color, stroke: "none" };
  if (t === "channel" || t === "frontend") return <svg viewBox="0 0 24 24" fill="none"><rect x="2" y="3" width="20" height="14" rx="2" {...p}/><path d="M8 21h8" {...p}/><path d="M12 17v4" {...p}/></svg>;
  if (t === "core_system" || t === "backend") return <svg viewBox="0 0 24 24" fill="none"><rect x="2" y="2" width="20" height="8" rx="2" {...p}/><rect x="2" y="14" width="20" height="8" rx="2" {...p}/><circle cx="6" cy="6" r="1.5" {...dot}/><circle cx="6" cy="18" r="1.5" {...dot}/></svg>;
  if (t === "database") return <svg viewBox="0 0 24 24" fill="none"><ellipse cx="12" cy="5" rx="9" ry="3" {...p}/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" {...p}/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" {...p}/></svg>;
  if (t === "api" || t === "integration_hub") return <svg viewBox="0 0 24 24" fill="none"><path d="M18 20V10" {...p}/><path d="M12 20V4" {...p}/><path d="M6 20v-6" {...p}/></svg>;
  if (t === "workflow_service") return <svg viewBox="0 0 24 24" fill="none"><circle cx="6" cy="6" r="3" {...p}/><circle cx="18" cy="18" r="3" {...p}/><path d="M6 9v4a3 3 0 0 0 3 3h6" {...p}/><path d="M18 15V9" {...p}/></svg>;
  if (t === "ai_service") return <svg viewBox="0 0 24 24" fill="none"><rect x="4" y="4" width="16" height="16" rx="2" {...p}/><rect x="9" y="9" width="6" height="6" {...p}/><path d="M9 1v3M15 1v3M9 20v3M15 20v3M1 9h3M1 15h3M20 9h3M20 15h3" {...p}/></svg>;
  if (t === "document_service" || t === "document_store") return <svg viewBox="0 0 24 24" fill="none"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" {...p}/><polyline points="14 2 14 8 20 8" {...p}/><line x1="16" y1="13" x2="8" y2="13" {...p}/><line x1="16" y1="17" x2="8" y2="17" {...p}/></svg>;
  if (t === "security_integration" || t === "security_service") return <svg viewBox="0 0 24 24" fill="none"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" {...p}/></svg>;
  if (t === "external_system") return <svg viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" {...p}/><line x1="2" y1="12" x2="22" y2="12" {...p}/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" {...p}/></svg>;
  if (t === "internal_system") return <svg viewBox="0 0 24 24" fill="none"><path d="M12 2L2 7l10 5 10-5-10-5z" stroke={color} strokeWidth="2" strokeLinejoin="round" fill="none"/><path d="M2 17l10 5 10-5" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none"/><path d="M2 12l10 5 10-5" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none"/></svg>;
  if (t === "business_module") return <svg viewBox="0 0 24 24" fill="none"><rect x="2" y="7" width="20" height="14" rx="2" {...p}/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none"/><line x1="12" y1="12" x2="12" y2="16" {...p}/><line x1="10" y1="14" x2="14" y2="14" {...p}/></svg>;
  if (t === "rules_engine") return <svg viewBox="0 0 24 24" fill="none"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none"/></svg>;
  if (t === "service") return <svg viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="3" stroke={color} strokeWidth="2" fill="none"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none"/></svg>;
  return <svg viewBox="0 0 24 24" fill="none"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none"/></svg>;
}

const NODE_W = 168;
const NODE_H = 68;
const COL_GAP = 24;
const ROW_GAP = 24;
const LANE_PAD_X = 80;
const LANE_PAD_Y = 56;
const LANE_HEADER = 32;
const LANE_GAP = 48;
const ROW_LANE_GAP = 64;
const PAD = 40;
const ICON_SIZE = 18;
const LANE_COLS = 2;
const EXTRA = 600;

const LANE_GROUPS: { key: string; label: string; types: string[] }[] = [
  { key: "channels",     label: "Canales",            types: ["channel", "frontend"] },
  { key: "core",         label: "Core del Sistema",   types: ["core_system", "api", "backend"] },
  { key: "workflow",     label: "Flujos y Servicios", types: ["workflow_service", "service", "ai_service", "rules_engine"] },
  { key: "modules",      label: "Módulos de Negocio", types: ["business_module"] },
  { key: "documents",    label: "Documentos",         types: ["document_service", "document_store"] },
  { key: "security",     label: "Seguridad",          types: ["security_integration", "security_service"] },
  { key: "integrations", label: "Integraciones",      types: ["integration_hub", "internal_system", "external_system"] },
  { key: "data",         label: "Datos",              types: ["database"] },
];

interface LaneLayout { laneKey: string; label: string; types: string[]; x: number; y: number; w: number; h: number; }

function buildLaneLayout(rawNodes: Nodo[], edges: Arista[]) {
  const connCount: Record<string, number> = {};
  rawNodes.forEach((n) => (connCount[n.id] = 0));
  edges.forEach((e) => {
    if (connCount[e.source] !== undefined) connCount[e.source]++;
    if (connCount[e.target] !== undefined) connCount[e.target]++;
  });

  const typeToLane: Record<string, string> = {};
  LANE_GROUPS.forEach((g) => g.types.forEach((t) => (typeToLane[t] = g.key)));

  const laneMap: Record<string, Nodo[]> = {};
  LANE_GROUPS.forEach((g) => (laneMap[g.key] = []));

  rawNodes.forEach((n) => {
    const t = (n.tipo ?? "").toLowerCase().replace(/[\s\-]+/g, "_");
    laneMap[typeToLane[t] ?? "data"].push(n);
  });

  Object.keys(laneMap).forEach((key) => {
    const sorted = [...laneMap[key]].sort((a, b) => (connCount[b.id] ?? 0) - (connCount[a.id] ?? 0));
    const len = sorted.length;
    const result: (Nodo | undefined)[] = new Array(len).fill(undefined);
    const mid = Math.floor(len / 2);
    let left = mid - 1, right = mid + 1;
    result[mid] = sorted[0];
    for (let i = 1; i < len; i++) {
      if (i % 2 === 1 && right < len) result[right++] = sorted[i];
      else if (left >= 0) result[left--] = sorted[i];
      else result[right++] = sorted[i];
    }
    laneMap[key] = result.filter(Boolean) as Nodo[];
  });

  const activeLanes = LANE_GROUPS.filter((g) => laneMap[g.key].length > 0);
  const laneSizes = activeLanes.map((g) => {
    const lNodes = laneMap[g.key];
    const cols = Math.min(lNodes.length, 4);
    const rows = Math.ceil(lNodes.length / cols);
    return {
      ...g, nodes: lNodes, cols,
      intrinsicW: cols * NODE_W + (cols - 1) * COL_GAP + LANE_PAD_X * 2,
      intrinsicH: rows * NODE_H + (rows - 1) * ROW_GAP + LANE_PAD_Y * 2 + LANE_HEADER,
    };
  });

  const numRows = Math.ceil(laneSizes.length / LANE_COLS);
  const laneRows: typeof laneSizes[number][][] = [];
  for (let r = 0; r < numRows; r++) laneRows.push(laneSizes.slice(r * LANE_COLS, r * LANE_COLS + LANE_COLS));

  const colWidths: number[] = Array(LANE_COLS).fill(0);
  laneRows.forEach((row) => row.forEach((lane, col) => { colWidths[col] = Math.max(colWidths[col], lane.intrinsicW); }));
  const rowHeights = laneRows.map((row) => Math.max(...row.map((l) => l.intrinsicH)));

  const layoutW = PAD * 2 + colWidths.reduce((a, b) => a + b, 0) + (LANE_COLS - 1) * LANE_GAP;
  const layoutH = PAD * 2 + rowHeights.reduce((a, b) => a + b, 0) + (numRows - 1) * ROW_LANE_GAP;

  const totalW = layoutW + EXTRA;
  const totalH = layoutH + EXTRA;

  const lanes: LaneLayout[] = [];
  const positionedNodes: Nodo[] = [];

  let curY = PAD;
  laneRows.forEach((row, rowIdx) => {
    let curX = PAD;
    const rowH = rowHeights[rowIdx];
    row.forEach((g, colIdx) => {
      const laneW = colWidths[colIdx];
      const laneY = curY + Math.floor((rowH - g.intrinsicH) / 2);
      g.nodes.forEach((n, i) => {
        const col = i % g.cols, row2 = Math.floor(i / g.cols);
        positionedNodes.push({
          ...n,
          x: curX + LANE_PAD_X + col * (NODE_W + COL_GAP),
          y: laneY + LANE_HEADER + LANE_PAD_Y + row2 * (NODE_H + ROW_GAP),
        });
      });
      lanes.push({ laneKey: g.key, label: g.label, types: g.types, x: curX, y: laneY, w: laneW, h: g.intrinsicH });
      curX += laneW + LANE_GAP;
    });
    curY += rowH + ROW_LANE_GAP;
  });

  return { nodes: positionedNodes, lanes, totalW, totalH };
}

function edgePath(src: Nodo, tgt: Nodo): string {
  const sx = (src.x ?? 0) + NODE_W / 2, sy = (src.y ?? 0) + NODE_H / 2;
  const tx = (tgt.x ?? 0) + NODE_W / 2, ty = (tgt.y ?? 0) + NODE_H / 2;
  const dx = tx - sx, dy = ty - sy;
  if (Math.abs(dy) < NODE_H) {
    return `M ${dx > 0 ? (src.x ?? 0) + NODE_W : (src.x ?? 0)} ${sy} L ${dx > 0 ? (tgt.x ?? 0) : (tgt.x ?? 0) + NODE_W} ${ty}`;
  }
  const fromBottom = dy > 0;
  const startX = sx, startY = fromBottom ? (src.y ?? 0) + NODE_H : (src.y ?? 0);
  const endX = tx, endY = fromBottom ? (tgt.y ?? 0) : (tgt.y ?? 0) + NODE_H;
  const gap = endY - startY;
  const xOff = Math.abs(dx) > 200 ? dx * 0.12 : 0;
  return `M ${startX} ${startY} C ${startX + xOff} ${startY + gap * 0.4}, ${endX - xOff} ${endY - gap * 0.4}, ${endX} ${endY}`;
}

function wrapLabel(label: string): [string, string] {
  const MAX = 22;
  if (label.length <= MAX) return [label, ""];
  const cut = label.lastIndexOf(" ", MAX);
  if (cut < 4) return [label.slice(0, MAX - 1) + "…", ""];
  const rest = label.slice(cut + 1);
  return [label.slice(0, cut), rest.length > MAX ? rest.slice(0, MAX - 1) + "…" : rest];
}

async function downloadAsPDF(svgEl: SVGSVGElement, filename = "arquitectura.pdf") {
  if (!(window as any).jspdf) {
    await new Promise<void>((resolve, reject) => {
      const s = document.createElement("script");
      s.src = "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js";
      s.onload = () => resolve(); s.onerror = () => reject(new Error("No se pudo cargar jsPDF"));
      document.head.appendChild(s);
    });
  }
  const { jsPDF } = (window as any).jspdf;
  const vb = svgEl.viewBox.baseVal;
  const svgW = vb.width || svgEl.width.baseVal.value;
  const svgH = vb.height || svgEl.height.baseVal.value;
  let svgStr = new XMLSerializer().serializeToString(svgEl);
  if (!svgStr.includes('xmlns="http://www.w3.org/2000/svg"'))
    svgStr = svgStr.replace("<svg", `<svg xmlns="http://www.w3.org/2000/svg"`);
  const b64 = "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(svgStr)));
  const scale = 2;
  const canvas = document.createElement("canvas");
  canvas.width = svgW * scale; canvas.height = svgH * scale;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#ffffff"; ctx.fillRect(0, 0, canvas.width, canvas.height);
  await new Promise<void>((resolve, reject) => {
    const img = new Image();
    img.onload = () => { ctx.drawImage(img, 0, 0, svgW * scale, svgH * scale); resolve(); };
    img.onerror = () => reject(new Error("No se pudo renderizar el SVG"));
    img.src = b64;
  });
  const imgData = canvas.toDataURL("image/png");
  const ptW = (svgW * 72) / 96, ptH = (svgH * 72) / 96;
  const pdf = new jsPDF({ orientation: ptW > ptH ? "landscape" : "portrait", unit: "pt", format: [ptW, ptH] });
  pdf.addImage(imgData, "PNG", 0, 0, ptW, ptH);
  pdf.save(filename);
}

interface DiagramProps extends ArquitecturaData { svgRef: React.RefObject<SVGSVGElement | null>; }

function Diagram({ nodes: rawNodes, edges, svgRef }: DiagramProps) {
  const positionsRef = useRef<Record<string, { x: number; y: number }>>({});
  const [zoom, setZoom] = useState(0.85);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const dragging = useRef<{ id: string; ox: number; oy: number } | null>(null);

  const buildAll = useCallback((raw: Nodo[]) => {
    const { nodes, lanes, totalW, totalH } = buildLaneLayout(raw, edges);
    return {
      nodes: nodes.map((n) => { const s = positionsRef.current[n.id]; return s ? { ...n, ...s } : n; }),
      lanes, totalW, totalH,
    };
  }, [edges]);

  const [layout, setLayout] = useState(() => buildAll(rawNodes));
  const prevIdsRef = useRef("");

  useEffect(() => {
    const newIds = rawNodes.map((n) => n.id).sort().join(",");
    if (newIds === prevIdsRef.current) return;
    prevIdsRef.current = newIds;
    setLayout(buildAll(rawNodes));
  }, [rawNodes, buildAll]);

  const handleExpandToggle = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    if (!document.fullscreenElement) el.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    else document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
  }, []);

  useEffect(() => {
    const onFsc = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onFsc);
    return () => document.removeEventListener("fullscreenchange", onFsc);
  }, []);

  const scrollRef = useRef<HTMLDivElement | null>(null);
  const layoutW = layout.totalW - EXTRA;
  const layoutH = layout.totalH - EXTRA;

  const fitZoom = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const { clientWidth, clientHeight } = el;
    const scaleX = clientWidth / layoutW;
    const scaleY = clientHeight / layoutH;
    const z = Math.min(scaleX, scaleY, 1.5) * 0.9;
    setZoom(z);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const centerX = (PAD + layoutW / 2) * z;
        const centerY = (PAD + layoutH / 2) * z;
        el.scrollTo({
          left: Math.max(0, centerX - clientWidth / 2),
          top:  Math.max(0, centerY - clientHeight / 2),
          behavior: "instant",
        });
      });
    });
  }, [layoutW, layoutH]);

  const didFit = useRef(false);
  useEffect(() => {
    if (!didFit.current) {
      const t = setTimeout(() => { fitZoom(); didFit.current = true; }, 50);
      return () => clearTimeout(t);
    }
  }, [fitZoom]);

  const { nodes, lanes, totalW, totalH } = layout;
  const nodeMap = Object.fromEntries(nodes.map((n) => [n.id, n]));

  const uniqueSrcTypes = Array.from(new Set(
    edges.map((e) => nodeMap[e.source]?.tipo).filter(Boolean).map((t) => t!).concat(["default"])
  ));

  const onPointerDown = (e: PointerEvent<SVGGElement>, id: string) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    const pt = svgRef.current!.createSVGPoint();
    pt.x = e.clientX; pt.y = e.clientY;
    const sp = pt.matrixTransform(svgRef.current!.getScreenCTM()!.inverse());
    const node = nodes.find((n) => n.id === id)!;
    dragging.current = { id, ox: sp.x - (node.x ?? 0), oy: sp.y - (node.y ?? 0) };
  };

  const onPointerMove = (e: PointerEvent<SVGGElement>) => {
    if (!dragging.current) return;
    const pt = svgRef.current!.createSVGPoint();
    pt.x = e.clientX; pt.y = e.clientY;
    const sp = pt.matrixTransform(svgRef.current!.getScreenCTM()!.inverse());
    const { id, ox, oy } = dragging.current;
    const nx = Math.max(0, Math.min(totalW - NODE_W, sp.x - ox));
    const ny = Math.max(0, Math.min(totalH - NODE_H, sp.y - oy));
    positionsRef.current[id] = { x: nx, y: ny };
    setLayout((prev) => ({ ...prev, nodes: prev.nodes.map((n) => n.id === id ? { ...n, x: nx, y: ny } : n) }));
  };

  const onPointerUp = (e: PointerEvent<SVGGElement>) => {
    e.currentTarget.releasePointerCapture(e.pointerId);
    dragging.current = null;
  };

  return (
    <div ref={containerRef} className="flex flex-col h-full gap-2 bg-white">
      {/* Toolbar */}
      <div className="flex items-center gap-1.5 px-1 pt-1 shrink-0">
        <button onClick={() => setZoom(z => Math.min(3, z + 0.15))} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors" title="Zoom in"><ZoomIn size={14} /></button>
        <button onClick={() => setZoom(z => Math.max(0.1, z - 0.15))} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors" title="Zoom out"><ZoomOut size={14} /></button>
        <button onClick={fitZoom} className="px-2 py-1 rounded-lg text-[10px] font-semibold text-gray-500 hover:bg-gray-100 transition-colors">Fit</button>
        <button onClick={handleExpandToggle} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors">
          {isFullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
        </button>
        <span className="text-[10px] text-gray-400">{Math.round(zoom * 100)}%</span>
        <span className="text-[10px] text-gray-400">· Arrastra nodos libremente</span>
      </div>

      {/* Scrollable canvas */}
      <div ref={scrollRef} className="flex-1 overflow-auto bg-white">
        <svg
          ref={svgRef}
          width={totalW * zoom}
          height={totalH * zoom}
          viewBox={`0 0 ${totalW} ${totalH}`}
          xmlns="http://www.w3.org/2000/svg"
          style={{ display: "block" }}
        >
          <defs>
            {uniqueSrcTypes.map((tipo) => {
              const { stroke } = getEdgeColor(tipo);
              const id = `arr-${tipoToId(tipo)}`;
              return (
                <marker key={id} id={id} viewBox="0 0 10 10" refX="8" refY="5"
                  markerWidth="5" markerHeight="5" orient="auto-start-reverse">
                  <path d="M1 2 L8 5 L1 8" fill="none" stroke={stroke}
                    strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </marker>
              );
            })}
            <marker id="arr-default" viewBox="0 0 10 10" refX="8" refY="5"
              markerWidth="5" markerHeight="5" orient="auto-start-reverse">
              <path d="M1 2 L8 5 L1 8" fill="none" stroke="#94A3B8"
                strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </marker>
          </defs>

          <rect width={totalW} height={totalH} fill="white" />

          {/* Lanes */}
          {lanes.map((lane) => {
            const pal = getPalette(lane.types[0]);
            return (
              <g key={lane.laneKey}>
                <rect x={lane.x} y={lane.y} width={lane.w} height={lane.h} rx={12}
                  fill={pal.lane} fillOpacity={0.5} stroke={pal.border} strokeOpacity={0.2} strokeWidth={1.5} />
                <rect x={lane.x} y={lane.y} width={lane.w} height={LANE_HEADER} rx={12}
                  fill={pal.border} fillOpacity={0.1} />
                <text x={lane.x + 14} y={lane.y + LANE_HEADER / 2 + 1} dominantBaseline="middle"
                  fontSize="10" fontWeight={700} fill={pal.text} fontFamily="monospace" style={{ letterSpacing: "0.08em" }}>
                  {lane.label.toUpperCase()}
                </text>
              </g>
            );
          })}

          {/* Edges */}
          {edges.map((e, i) => {
            const src = nodeMap[e.source], tgt = nodeMap[e.target];
            if (!src || !tgt) return null;
            const { stroke, opacity } = getEdgeColor(src.tipo);
            const markerId = `arr-${tipoToId(src.tipo)}`;
            const mx = ((src.x ?? 0) + NODE_W / 2 + (tgt.x ?? 0) + NODE_W / 2) / 2;
            const my = ((src.y ?? 0) + NODE_H / 2 + (tgt.y ?? 0) + NODE_H / 2) / 2;
            return (
              <g key={i}>
                <path d={edgePath(src, tgt)} fill="none" stroke={stroke}
                  strokeOpacity={opacity} strokeWidth="1.5" markerEnd={`url(#${markerId})`} />
                {e.label && (
                  <g>
                    <rect x={mx - (e.label.length * 3.2 + 8) / 2} y={my - 8}
                      width={e.label.length * 3.2 + 8} height={13} rx={4}
                      fill="white" stroke={stroke} strokeOpacity={0.3} strokeWidth={0.5} />
                    <text x={mx} y={my + 0.5} textAnchor="middle" dominantBaseline="middle"
                      fontSize="7.5" fill={stroke} fillOpacity={0.8} fontFamily="system-ui">
                      {e.label.length > 22 ? e.label.slice(0, 21) + "…" : e.label}
                    </text>
                  </g>
                )}
              </g>
            );
          })}

          {/* Nodes */}
          {nodes.map((n) => {
            const pal = getPalette(n.tipo);
            const [l1, l2] = wrapLabel(n.label);
            const nx = n.x ?? 0, ny = n.y ?? 0;
            const cx = nx + NODE_W / 2;
            return (
              <g key={n.id} style={{ cursor: "grab" }}
                onPointerDown={(e) => onPointerDown(e, n.id)}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}>
                <rect x={nx + 1} y={ny + 3} width={NODE_W} height={NODE_H} rx={10}
                  fill="#00000010" style={{ filter: "blur(4px)" }} />
                <rect x={nx} y={ny} width={NODE_W} height={NODE_H} rx={10}
                  fill={pal.bg} stroke={pal.border} strokeWidth={1.5} />
                <rect x={nx} y={ny + 10} width={3} height={NODE_H - 20} rx={1.5}
                  fill={pal.border} fillOpacity={0.7} />
                <foreignObject x={cx - ICON_SIZE / 2} y={ny + 10} width={ICON_SIZE} height={ICON_SIZE}
                  style={{ overflow: "visible", pointerEvents: "none" }}>
                  <div
                    // @ts-ignore
                    xmlns="http://www.w3.org/1999/xhtml"
                    style={{ width: ICON_SIZE, height: ICON_SIZE, display: "flex", alignItems: "center", justifyContent: "center" }}
                  >
                    <NodeIcon tipo={n.tipo} color={pal.border} />
                  </div>
                </foreignObject>
                <text x={cx} y={l2 ? ny + 40 : ny + 42} textAnchor="middle" dominantBaseline="middle"
                  fontSize="11" fontWeight={600} fill={pal.text} fontFamily="system-ui, sans-serif">{l1}</text>
                {l2 && <text x={cx} y={ny + 54} textAnchor="middle" dominantBaseline="middle"
                  fontSize="11" fontWeight={600} fill={pal.text} fontFamily="system-ui, sans-serif">{l2}</text>}
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}

// ─── Prop para registrar la función de descarga en el padre ──────────────────
export default function ArquitecturaDiagram({
  onRegisterDownload,
}: {
  onRegisterDownload?: (fn: () => Promise<void>) => void;
} = {}) {
  const [data, setData] = useState<ArquitecturaData | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);

  // Registrar la función de descarga PDF en el padre cuando esté disponible
  useEffect(() => {
    if (!onRegisterDownload) return;
    onRegisterDownload(async () => {
      if (!svgRef.current) return;
      try { await downloadAsPDF(svgRef.current, "arquitectura.pdf"); }
      catch (e: any) { console.error("Error al generar PDF:", e.message); }
    });
  }, [onRegisterDownload]);

  const getIds = () => ({ projectId: typeof window !== "undefined" ? sessionStorage.getItem("project_id") ?? "" : "" });

  const fetchArquitectura = useCallback(async () => {
    const { projectId } = getIds();
    if (!projectId) { setLoading(false); return; }
    try {
      const res = await fetch(`${API_URL}/diagramaaqr/arquitectura?doc_id=${encodeURIComponent(projectId)}`, { cache: "no-store" });
      if (!res.ok) throw new Error("Error al cargar arquitectura");
      const json = await res.json();
      if (json.ok) {
        setData({
          nodes: (json.nodes ?? []).map((n: any) => ({ id: n.id, label: n.label, tipo: n.type })),
          edges: (json.edges ?? []).map((e: any) => ({ source: e.from, target: e.to, label: e.label })),
        });
        setError(null);
      }
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchArquitectura(); }, [fetchArquitectura]);

  const handleGenerar = async () => {
    const { projectId } = getIds();
    if (!projectId) return;
    setGenerating(true); setError(null);
    let maxWait: ReturnType<typeof setTimeout>;
    try {
      const res = await fetch(`${API_URL}/diagramaaqr/generar-arquitectura?doc_id=${encodeURIComponent(projectId)}`, { method: "POST" });
      if (!res.ok) throw new Error("Error al generar arquitectura");
      let intentos = 0;
      maxWait = setTimeout(() => { clearInterval(pollRef.current!); setGenerating(false); }, 120000);
      pollRef.current = setInterval(async () => {
        intentos++;
        const { projectId: pid } = getIds();
        if (!pid) return;
        try {
          const pollRes = await fetch(`${API_URL}/diagramaaqr/arquitectura?doc_id=${encodeURIComponent(pid)}`, { cache: "no-store" });
          const json = await pollRes.json();
          if (json.ok) {
            const nodes = (json.nodes ?? []).map((n: any) => ({ id: n.id, label: n.label, tipo: n.type }));
            const edges = (json.edges ?? []).map((e: any) => ({ source: e.from, target: e.to, label: e.label }));
            setData({ nodes, edges });
            if (nodes.length > 0) { clearInterval(pollRef.current!); clearTimeout(maxWait); setGenerating(false); return; }
          }
        } catch (err) { console.error("[poll]", err); }
        if (intentos >= 30) { clearInterval(pollRef.current!); clearTimeout(maxWait); setGenerating(false); }
      }, 4000);
    } catch (e: any) { setError(e.message); setGenerating(false); }
  };

  const isEmpty = !data || (data.nodes.length === 0 && data.edges.length === 0);

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">Diagrama de arquitectura</span>
        <div className="flex flex-col items-end gap-1.5">     
  <button
    onClick={handleGenerar}
    disabled={generating}
    className="flex items-center gap-1.5 bg-[#EB0029] text-white font-semibold text-sm px-8 py-3 rounded-lg hover:bg-red-700 transition disabled:opacity-60"
  >
    {generating ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
    {generating ? "Generando…" : "Generar arquitectura"}
  </button>
  <div className="flex items-start gap-1.5 pt-3">
    <Info size={12} className="text-gray-300 mt-0.5 shrink-0" />
    <p className="text-xs text-gray-400 leading-relaxed text-right">
      Si realizas cambios en el ERS, vuelve a generar la arquitectura.
    </p>
  </div>
</div>
      </div>

      

      <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl bg-white shadow-sm border border-gray-100">
        {loading && <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-sm text-gray-400"><Loader2 size={20} className="animate-spin" />Cargando diagrama…</div>}
        {!loading && error && <div className="absolute inset-0 flex items-center justify-center"><p className="text-sm text-red-500">{error}</p></div>}
        {!loading && !error && isEmpty && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-center text-sm text-gray-400">
            <div className="w-16 h-16 rounded-2xl bg-gray-50 border-2 border-dashed border-gray-200 flex items-center justify-center"><RefreshCw size={20} className="text-gray-300" /></div>
            <p>No hay nodos todavía.</p>
            <p className="text-xs">Presiona <strong>Generar arquitectura</strong> para que el agente cree el diagrama.</p>
          </div>
        )}
        {!loading && !error && !isEmpty && (
          <div className="flex-1 overflow-hidden p-3">
            <Diagram nodes={data!.nodes} edges={data!.edges} svgRef={svgRef} />
          </div>
        )}
        {generating && (
          <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-white/80 backdrop-blur-sm">
            <div className="flex flex-col items-center gap-3 text-sm text-gray-500">
              <Loader2 size={28} className="animate-spin text-[#EB0029]" />
              <p className="font-medium">El agente está generando la arquitectura…</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}