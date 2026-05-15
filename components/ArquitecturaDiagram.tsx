"use client";

import { useCallback, useEffect, useRef, useState, type PointerEvent } from "react";
import { RefreshCw, Loader2, Download, ZoomIn, ZoomOut, Maximize2 } from "lucide-react";
import { API_URL } from "@/services/api";

interface Nodo {
  id: string;
  label: string;
  tipo?: string;
  x?: number;
  y?: number;
}

interface Arista {
  source: string;
  target: string;
  label?: string;
}

interface ArquitecturaData {
  nodes: Nodo[];
  edges: Arista[];
}

// ── Color palette ──────────────────────────────────────────────
const PALETTE: Record<string, { bg: string; border: string; text: string; badge: string; lane: string }> = {
  frontend:             { bg: "#EFF6FF", border: "#3B82F6", text: "#1D4ED8", badge: "#DBEAFE", lane: "#EFF6FF" },
  backend:              { bg: "#F5F3FF", border: "#7C3AED", text: "#5B21B6", badge: "#EDE9FE", lane: "#F5F3FF" },
  database:             { bg: "#FFFBEB", border: "#D97706", text: "#92400E", badge: "#FEF3C7", lane: "#FFFBEB" },
  api:                  { bg: "#ECFDF5", border: "#059669", text: "#065F46", badge: "#D1FAE5", lane: "#ECFDF5" },
  service:              { bg: "#FFF1F2", border: "#E11D48", text: "#9F1239", badge: "#FFE4E6", lane: "#FFF1F2" },
  core_system:          { bg: "#F0F9FF", border: "#0284C7", text: "#0C4A6E", badge: "#E0F2FE", lane: "#F0F9FF" },
  workflow_service:     { bg: "#F0FDF4", border: "#16A34A", text: "#14532D", badge: "#DCFCE7", lane: "#F0FDF4" },
  business_module:      { bg: "#FFF7ED", border: "#EA580C", text: "#7C2D12", badge: "#FFEDD5", lane: "#FFF7ED" },
  document_service:     { bg: "#FAF5FF", border: "#9333EA", text: "#3B0764", badge: "#F3E8FF", lane: "#FAF5FF" },
  document_store:       { bg: "#FAF5FF", border: "#9333EA", text: "#3B0764", badge: "#F3E8FF", lane: "#FAF5FF" },
  ai_service:           { bg: "#FDF4FF", border: "#C026D3", text: "#701A75", badge: "#FAE8FF", lane: "#FDF4FF" },
  rules_engine:         { bg: "#F0FDF4", border: "#059669", text: "#064E3B", badge: "#DCFCE7", lane: "#F0FDF4" },
  security_integration: { bg: "#FFF1F2", border: "#DC2626", text: "#7F1D1D", badge: "#FEE2E2", lane: "#FFF1F2" },
  integration_hub:      { bg: "#EFF6FF", border: "#2563EB", text: "#1E3A5F", badge: "#DBEAFE", lane: "#EFF6FF" },
  external_system:      { bg: "#F8FAFC", border: "#64748B", text: "#334155", badge: "#F1F5F9", lane: "#F8FAFC" },
  internal_system:      { bg: "#F1F5F9", border: "#94A3B8", text: "#334155", badge: "#E2E8F0", lane: "#F1F5F9" },
  channel:              { bg: "#F8FAFC", border: "#94A3B8", text: "#334155", badge: "#E2E8F0", lane: "#F0F4FF" },
  default:              { bg: "#F8FAFC", border: "#CBD5E1", text: "#334155", badge: "#E2E8F0", lane: "#F8FAFC" },
};

function getPalette(tipo?: string) {
  if (!tipo) return PALETTE.default;
  const key = tipo.toLowerCase().replace(/[\s-]+/g, "_");
  return PALETTE[key] ?? PALETTE.default;
}

// ── Icons ──────────────────────────────────────────────────────
function NodeIcon({ tipo, color, size = 16 }: { tipo?: string; color: string; size?: number }) {
  const t = tipo?.toLowerCase().replace(/[\s-]+/g, "_") ?? "";
  const s = size;
  const p = { width: s, height: s, viewBox: "0 0 24 24", fill: "none", stroke: color, strokeWidth: "2", strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  if (t === "channel" || t === "frontend")
    return <svg {...p}><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/></svg>;
  if (t === "core_system" || t === "backend")
    return <svg {...p}><rect x="2" y="2" width="20" height="8" rx="2"/><rect x="2" y="14" width="20" height="8" rx="2"/><line x1="6" y1="6" x2="6.01" y2="6"/><line x1="6" y1="18" x2="6.01" y2="18"/></svg>;
  if (t === "database")
    return <svg {...p}><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/></svg>;
  if (t === "api" || t === "integration_hub")
    return <svg {...p}><path d="M18 20V10"/><path d="M12 20V4"/><path d="M6 20v-6"/></svg>;
  if (t === "workflow_service")
    return <svg {...p}><rect x="3" y="3" width="6" height="6" rx="1"/><rect x="15" y="3" width="6" height="6" rx="1"/><path d="M9 6h6"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="18" r="3"/><path d="M9 18h6"/></svg>;
  if (t === "ai_service")
    return <svg {...p}><path d="M12 2a4 4 0 0 1 4 4v2h2a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2V6a4 4 0 0 1 4-4z"/><circle cx="12" cy="13" r="2"/></svg>;
  if (t === "document_service" || t === "document_store")
    return <svg {...p}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>;
  if (t === "security_integration" || t === "security_service")
    return <svg {...p}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>;
  if (t === "external_system")
    return <svg {...p}><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>;
  if (t === "business_module")
    return <svg {...p}><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/><line x1="12" y1="12" x2="12" y2="16"/><line x1="10" y1="14" x2="14" y2="14"/></svg>;
  if (t === "rules_engine")
    return <svg {...p}><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>;
  return <svg {...p}><rect x="3" y="3" width="18" height="18" rx="3"/></svg>;
}

// ── Constants ──────────────────────────────────────────────────
const NODE_W = 168;
const NODE_H = 68;
const COL_GAP = 24;
const ROW_GAP = 24;
const LANE_PAD_X = 24;
const LANE_PAD_Y = 16;
const LANE_HEADER = 28;
const LANE_GAP = 48;
const PAD = 32;

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

interface LaneLayout {
  laneKey: string; label: string; types: string[];
  x: number; y: number; w: number; h: number;
}

// ── Layout: most-connected node goes to center of each lane ───
function buildLaneLayout(rawNodes: Nodo[], edges: Arista[]) {
  // Count connections per node
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
    const t = n.tipo?.toLowerCase().replace(/[\s-]+/g, "_") ?? "";
    laneMap[typeToLane[t] ?? "data"].push(n);
  });

  // Sort each lane: most connected → center, then alternate left/right
  Object.keys(laneMap).forEach((key) => {
    const sorted = [...laneMap[key]].sort((a, b) => (connCount[b.id] ?? 0) - (connCount[a.id] ?? 0));
    const len = sorted.length;
    const result: (Nodo | undefined)[] = new Array(len).fill(undefined);
    const mid = Math.floor(len / 2);
    let left = mid - 1;
    let right = mid + 1;
    result[mid] = sorted[0];
    for (let i = 1; i < len; i++) {
      if (i % 2 === 1 && right < len) {
        result[right++] = sorted[i];
      } else if (left >= 0) {
        result[left--] = sorted[i];
      } else {
        result[right++] = sorted[i];
      }
    }
    laneMap[key] = (result.filter(Boolean) as Nodo[]);
  });

  const lanes: LaneLayout[] = [];
  const positionedNodes: Nodo[] = [];
  let curY = PAD;
  let maxLaneW = 0;

  LANE_GROUPS.forEach((g) => {
    const lNodes = laneMap[g.key];
    if (!lNodes.length) return;

    const cols = Math.min(lNodes.length, 5);
    const rows = Math.ceil(lNodes.length / cols);
    const innerW = cols * NODE_W + (cols - 1) * COL_GAP;
    const innerH = rows * NODE_H + (rows - 1) * ROW_GAP;
    const laneW = innerW + LANE_PAD_X * 2;
    const laneH = innerH + LANE_PAD_Y * 2 + LANE_HEADER;

    maxLaneW = Math.max(maxLaneW, laneW);

    lNodes.forEach((n, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      positionedNodes.push({
        ...n,
        x: PAD + LANE_PAD_X + col * (NODE_W + COL_GAP),
        y: curY + LANE_HEADER + LANE_PAD_Y + row * (NODE_H + ROW_GAP),
      });
    });

    lanes.push({ laneKey: g.key, label: g.label, types: g.types, x: PAD, y: curY, w: laneW, h: laneH });
    curY += laneH + LANE_GAP;
  });

  lanes.forEach((l) => (l.w = maxLaneW));
  return { nodes: positionedNodes, lanes, totalW: maxLaneW + PAD * 2, totalH: curY + PAD };
}

// ── Edge routing ───────────────────────────────────────────────
function edgePath(src: Nodo, tgt: Nodo): string {
  const srcCX = (src.x ?? 0) + NODE_W / 2;
  const srcCY = (src.y ?? 0) + NODE_H / 2;
  const tgtCX = (tgt.x ?? 0) + NODE_W / 2;
  const tgtCY = (tgt.y ?? 0) + NODE_H / 2;
  const dy = tgtCY - srcCY;
  const dx = tgtCX - srcCX;

  // Same lane — horizontal connection via sides
  if (Math.abs(dy) < NODE_H * 1.5) {
    const sx = dx > 0 ? (src.x ?? 0) + NODE_W : (src.x ?? 0);
    const tx = dx > 0 ? (tgt.x ?? 0) : (tgt.x ?? 0) + NODE_W;
    return `M ${sx} ${srcCY} L ${tx} ${tgtCY}`;
  }

  // Cross-lane: exit bottom, enter top with smooth bezier
  const sx = srcCX;
  const sy = (src.y ?? 0) + NODE_H;
  const tx = tgtCX;
  const ty = tgt.y ?? 0;
  const xOffset = Math.abs(dx) > 200 ? dx * 0.15 : 0;
  const gap = ty - sy;
  const c1y = sy + gap * 0.35;
  const c2y = ty - gap * 0.35;

  return `M ${sx} ${sy} C ${sx + xOffset} ${c1y}, ${tx - xOffset} ${c2y}, ${tx} ${ty}`;
}

function wrapLabel(label: string): [string, string] {
  const MAX = 20;
  if (label.length <= MAX) return [label, ""];
  const cut = label.lastIndexOf(" ", MAX);
  if (cut < 4) return [label.slice(0, MAX - 1) + "…", ""];
  const rest = label.slice(cut + 1);
  return [label.slice(0, cut), rest.length > MAX ? rest.slice(0, MAX - 1) + "…" : rest];
}

// ── Diagram ────────────────────────────────────────────────────
interface DiagramProps extends ArquitecturaData {
  svgRef: React.RefObject<SVGSVGElement | null>;
}

function Diagram({ nodes: rawNodes, edges, svgRef }: DiagramProps) {
  const positionsRef = useRef<Record<string, { x: number; y: number }>>({});
  const [zoom, setZoom] = useState(0.85);
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

  const { nodes, lanes, totalW, totalH } = layout;
  const nodeMap = Object.fromEntries(nodes.map((n) => [n.id, n]));

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
    const nx = Math.max(0, sp.x - ox), ny = Math.max(0, sp.y - oy);
    positionsRef.current[id] = { x: nx, y: ny };
    setLayout((prev) => ({ ...prev, nodes: prev.nodes.map((n) => n.id === id ? { ...n, x: nx, y: ny } : n) }));
  };

  const onPointerUp = (e: PointerEvent<SVGGElement>) => {
    e.currentTarget.releasePointerCapture(e.pointerId);
    dragging.current = null;
  };

  return (
    <div className="flex flex-col h-full gap-2">
      <div className="flex items-center gap-1.5 px-1">
        <button onClick={() => setZoom((z) => Math.min(2, z + 0.15))} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors" title="Zoom in"><ZoomIn size={14} /></button>
        <button onClick={() => setZoom((z) => Math.max(0.2, z - 0.15))} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors" title="Zoom out"><ZoomOut size={14} /></button>
        <button onClick={() => { positionsRef.current = {}; setLayout(buildAll(rawNodes)); }} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors" title="Reset layout"><Maximize2 size={14} /></button>
        <span className="text-[10px] text-gray-400 ml-1">{Math.round(zoom * 100)}% · Arrastra los nodos para reorganizar</span>
      </div>

      <div className="flex-1 overflow-auto rounded-xl border border-gray-100 bg-[#F7F8FA]"
        style={{ backgroundImage: "radial-gradient(circle, #dde3ec 1px, transparent 1px)", backgroundSize: "20px 20px" }}>
        <svg ref={svgRef} width={totalW * zoom} height={totalH * zoom} viewBox={`0 0 ${totalW} ${totalH}`}
          xmlns="http://www.w3.org/2000/svg" style={{ display: "block" }}>
          <defs>
            <marker id="arr" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
              <path d="M1 2 L8 5 L1 8" fill="none" stroke="#94A3B8" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </marker>
          </defs>

          <rect width={totalW} height={totalH} fill="white" />

          {/* Swimlanes */}
          {lanes.map((lane) => {
            const pal = getPalette(lane.types[0]);
            return (
              <g key={lane.laneKey}>
                <rect x={lane.x} y={lane.y} width={lane.w} height={lane.h} rx={14}
                  fill={pal.lane} fillOpacity={0.5} stroke={pal.border} strokeOpacity={0.2} strokeWidth={1.5} />
                <rect x={lane.x} y={lane.y} width={lane.w} height={LANE_HEADER} rx={14}
                  fill={pal.border} fillOpacity={0.1} />
                <rect x={lane.x} y={lane.y + LANE_HEADER - 2} width={lane.w} height={4}
                  fill={pal.border} fillOpacity={0.06} />
                <text x={lane.x + 14} y={lane.y + LANE_HEADER / 2 + 1} dominantBaseline="middle"
                  fontSize="9.5" fontWeight={700} fill={pal.text}
                  fontFamily="'DM Mono', monospace, system-ui" style={{ letterSpacing: "0.1em" }}>
                  {lane.label.toUpperCase()}
                </text>
              </g>
            );
          })}

          {/* Edges */}
          <g>
            {edges.map((e, i) => {
              const src = nodeMap[e.source], tgt = nodeMap[e.target];
              if (!src || !tgt) return null;
              const mx = ((src.x ?? 0) + NODE_W / 2 + (tgt.x ?? 0) + NODE_W / 2) / 2;
              const my = ((src.y ?? 0) + NODE_H / 2 + (tgt.y ?? 0) + NODE_H / 2) / 2;
              return (
                <g key={i}>
                  <path d={edgePath(src, tgt)} fill="none" stroke="#CBD5E1" strokeWidth="1.5" markerEnd="url(#arr)" />
                  {e.label && (
                    <g>
                      <rect x={mx - (e.label.length * 3.2 + 8) / 2} y={my - 8}
                        width={e.label.length * 3.2 + 8} height={13} rx={4}
                        fill="white" stroke="#E2E8F0" strokeWidth={0.5} />
                      <text x={mx} y={my + 0.5} textAnchor="middle" dominantBaseline="middle"
                        fontSize="7.5" fill="#94A3B8" fontFamily="'DM Sans', system-ui, sans-serif">
                        {e.label.length > 22 ? e.label.slice(0, 21) + "…" : e.label}
                      </text>
                    </g>
                  )}
                </g>
              );
            })}
          </g>

          {/* Nodes */}
          {nodes.map((n) => {
            const pal = getPalette(n.tipo);
            const [l1, l2] = wrapLabel(n.label);
            const nx = n.x ?? 0, ny = n.y ?? 0;
            const cx = nx + NODE_W / 2;
            const textY = ny + 40;
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
                <g transform={`translate(${cx - 8}, ${ny + 12})`}>
                  <NodeIcon tipo={n.tipo} color={pal.border} size={16} />
                </g>
                <text x={cx} y={textY} textAnchor="middle" dominantBaseline="middle"
                  fontSize="11" fontWeight={600} fill={pal.text}
                  fontFamily="'DM Sans', system-ui, sans-serif">{l1}</text>
                {l2 && (
                  <text x={cx} y={textY + 14} textAnchor="middle" dominantBaseline="middle"
                    fontSize="11" fontWeight={600} fill={pal.text}
                    fontFamily="'DM Sans', system-ui, sans-serif">{l2}</text>
                )}
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}

// ── Main export ────────────────────────────────────────────────
export default function ArquitecturaDiagram() {
  const [data, setData] = useState<ArquitecturaData | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);

  const getIds = () => ({
    projectId: typeof window !== "undefined" ? sessionStorage.getItem("project_id") ?? "" : "",
  });

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
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchArquitectura(); }, [fetchArquitectura]);

  const handleGenerar = async () => {
    const { projectId } = getIds();
    if (!projectId) return;
    setGenerating(true);
    setError(null);
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
    } catch (e: any) {
      setError(e.message);
      setGenerating(false);
    }
  };

  const handleDownload = () => {
    if (!svgRef.current) return;
    const str = new XMLSerializer().serializeToString(svgRef.current);
    const url = URL.createObjectURL(new Blob([str], { type: "image/svg+xml;charset=utf-8" }));
    const a = Object.assign(document.createElement("a"), { href: url, download: "arquitectura.svg" });
    document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
  };

  const isEmpty = !data || (data.nodes.length === 0 && data.edges.length === 0);

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">Diagrama de arquitectura</span>
        <div className="flex items-center gap-2">
          {!isEmpty && (
            <button onClick={handleDownload} className="flex items-center gap-1.5 rounded-full border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-600 shadow-sm transition hover:bg-gray-50 hover:border-gray-300">
              <Download size={11} /> SVG
            </button>
          )}
          <button onClick={handleGenerar} disabled={generating}
            className="flex items-center gap-1.5 rounded-full bg-[#EB0029] px-4 py-1.5 text-xs font-semibold text-white shadow transition hover:bg-[#c8001f] disabled:opacity-60">
            {generating ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
            {generating ? "Generando…" : "Generar arquitectura"}
          </button>
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
        {!loading && !error && !isEmpty && <div className="flex-1 overflow-hidden p-3"><Diagram nodes={data!.nodes} edges={data!.edges} svgRef={svgRef} /></div>}
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