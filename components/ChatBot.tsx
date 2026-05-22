"use client";

import { SendHorizonal, Bot, User, LayoutDashboard, Zap, CheckCircle2, Settings, Lock } from "lucide-react";
import { useEffect, useRef, useState, useCallback } from "react";
import FormModal from "./FormModal";
import { API_URL } from "@/services/api";
import HelpTooltip from "./Helptooltip";
import ProjectSettingsModal from "./Projectsettingsmodal";

type MsgRole = "user" | "bot" | "tool_call" | "tool_result";

type Msg = {
  id: number;
  role: MsgRole;
  text: string;
  tool?: string;
  isNew?: boolean;
  timestamp?: number;
};

type HistoryEvent = {
  author: "user" | "model";
  parts: { type: string; text: string | null }[];
  timestamp: number;
};

type LockInfo = {
  idusuario: string;
  nombre: string;
};

type LockState = LockInfo | null | false;


function MiniMarkdown({ text }: { text: string }) {
  const lines = text.split("\n");
  return (
    <div className="text-sm text-gray-600 leading-relaxed space-y-1">
      {lines.map((line, i) => {
        const listMatch = line.match(/^[\*\-]\s+(.+)/);
        if (listMatch) {
          return (
            <div key={i} className="flex items-start gap-2">
              <span className="text-[#EB0029] mt-0.5 flex-shrink-0">•</span>
              <span>{renderInline(listMatch[1])}</span>
            </div>
          );
        }
        if (!line.trim()) return <div key={i} className="h-1" />;
        return <p key={i}>{renderInline(line)}</p>;
      })}
    </div>
  );
}

function renderInline(text: string): React.ReactNode {
  const parts: React.ReactNode[] = [];
  const regex = /(\*\*(.+?)\*\*|\*(.+?)\*|\[(.+?)\]\((.+?)\))/g;
  let last = 0;
  let match;
  while ((match = regex.exec(text)) !== null) {
    if (match.index > last) parts.push(text.slice(last, match.index));
    if (match[0].startsWith("**")) {
      parts.push(<strong key={match.index} className="font-semibold text-gray-800">{match[2]}</strong>);
    } else if (match[0].startsWith("*")) {
      parts.push(<em key={match.index}>{match[3]}</em>);
    } else if (match[0].startsWith("[")) {
      parts.push(
        <a key={match.index} href={match[5]} className="text-[#EB0029] hover:underline" target="_blank" rel="noreferrer">
          {match[4]}
        </a>
      );
    }
    last = match.index + match[0].length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts.length > 0 ? parts : text;
}

// ─── Helpers de sincronización ────────────────────────────────────────────────

/** Convierte los eventos del API a mensajes del chat (solo los que tienen texto) */
function parseHistoryEvents(events: HistoryEvent[]): Msg[] {
  const msgs: Msg[] = [];
  let idCounter = 1;
  for (const event of events) {
    const text = event.parts?.find((p) => p.type === "text")?.text;
    if (!text) continue;
    msgs.push({
      id: idCounter++,
      role: event.author === "user" ? "user" : "bot",
      text,
      timestamp: event.timestamp,
    });
  }
  return msgs;
}

/**
 * Pide el historial remoto y lo mergea con el caché local.
 * Reglas:
 *  - Si un mensaje remoto ya existe en caché (por timestamp), no lo duplica.
 *  - Si hay mensajes remotos nuevos, los agrega y ordena por timestamp.
 *  - Si el fetch falla, devuelve el caché sin cambios.
 */
async function syncSessionHistory(
  nextUserId: string,
  nextSessionId: string,
  cachedMessages: Msg[]
): Promise<{ synced: Msg[]; changed: boolean }> {
  try {
    const res = await fetch(
      `${API_URL}/agent/sessions/${nextSessionId}/history?user_id=${nextUserId}`
    );
    if (!res.ok) return { synced: cachedMessages, changed: false };

    const data = await res.json();
    console.log("[ChatBot] Historial remoto obtenido: %d eventos", data.events?.length ?? 0);
    const remoteEvents: HistoryEvent[] = data.events ?? [];
    const remoteMessages = parseHistoryEvents(remoteEvents);

    if (remoteMessages.length === 0) return { synced: cachedMessages, changed: false };

    // Si el caché solo tiene el mensaje de bienvenida (o está vacío), usar remoto directo
    const isEmptyCache =
      cachedMessages.length === 0 ||
      (cachedMessages.length === 1 && cachedMessages[0].role === "bot" && !cachedMessages[0].timestamp);

    if (isEmptyCache) {
      const synced = remoteMessages.map((m, i) => ({ ...m, id: i + 1 }));
      return { synced, changed: true };
    }

    // Construir set de timestamps ya presentes en caché
    const cachedTimestamps = new Set(
      cachedMessages.map((m) => m.timestamp).filter(Boolean)
    );

    // Filtrar solo los mensajes remotos que NO están en caché
    const newMessages = remoteMessages.filter(
      (m) => m.timestamp && !cachedTimestamps.has(m.timestamp)
    );

    if (newMessages.length === 0) return { synced: cachedMessages, changed: false };

    // Merge y reordenar por timestamp
    const merged = [...cachedMessages, ...newMessages].sort(
      (a, b) => (a.timestamp ?? 0) - (b.timestamp ?? 0)
    );

    // Re-asignar IDs secuenciales
    const synced = merged.map((m, i) => ({ ...m, id: i + 1 }));
    return { synced, changed: true };
  } catch (err) {
    console.warn("[ChatBot] No se pudo sincronizar historial remoto:", err);
    return { synced: cachedMessages, changed: false };
  }
}

// ─── Componente principal ──────────────────────────────────────────────────────

export default function ChatBot() {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Msg[]>([
    { id: 1, role: "bot", text: "Hola 👋 Soy tu asistente. ¿En qué te puedo ayudar?" },
  ]);

  const [userId, setUserId] = useState("");
  const [sessionId, setSessionId] = useState("");
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [tempUserId, setTempUserId] = useState("");
  const [loadingSession, setLoadingSession] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);

  const endRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [localChatReady, setLocalChatReady] = useState(false);
  const [isOwner, setIsOwner] = useState(false);
  const [checking, setChecking] = useState(false);

  const [lockedBy, setLockedBy] = useState<LockState>(null);
  const heartbeatRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const msgIdRef = useRef(Date.now());
  const nextId = () => ++msgIdRef.current;
  const activeBotIdRef = useRef<number | null>(null);
  const lastEventRef = useRef<"text" | "tool" | null>(null);

  const [projectFolio, setProjectFolio] = useState<number | null>(() => {
    if (typeof window === "undefined") return null;
    const saved = sessionStorage.getItem("project_folio");
    return saved ? Number(saved) : null;
  });

  const [projectName, setProjectName] = useState(() => {
    if (typeof window === "undefined") return "Mi Proyecto";
    return sessionStorage.getItem("project_name") || "Mi Proyecto";
  });

  useEffect(() => {
    console.log("CHATBOT MONTADO");
    return () => { 
      console.log("CHATBOT DESMONTADO");
      stopHeartbeat(); 
    };
  }, []);

  const getMessagesKey = (s: string) => `agent-chat-messages:${s}`;
  const getInputKey = (s: string) => `agent-chat-input:${s}`;

  const toolLabels: Record<string, string> = {
    obtener_plantilla: "Leyendo plantilla",
    obtener_info_widgets: "Cargando widgets",
    actualizar_widget: "Guardando widget",
    obtener_progreso: "Calculando progreso",
    fijar_doc_id: "Configurando documento",
    leer_srs_desde_firestore: "Leyendo SRS",
    guardar_en_firestore: "Guardando en Firestore",
  };

  // Lock helpers
  const getToken = () => localStorage.getItem("token") ?? "";

  const stopHeartbeat = useCallback(() => {
    if (heartbeatRef.current) {
      clearInterval(heartbeatRef.current);
      heartbeatRef.current = null;
    }
  }, []);

  const startHeartbeat = useCallback((folio: number) => {
    stopHeartbeat();
    heartbeatRef.current = setInterval(async () => {
      try {
        await fetch(`${API_URL}/proyectos/${folio}/heartbeat`, {
          method: "POST",
          headers: { Authorization: `Bearer ${getToken()}` },
        });
      } catch {}
    }, 2 * 60 * 1000);
  }, [stopHeartbeat]);

  const releaseProject = useCallback(async (folio: number) => {
    stopHeartbeat();
    try {
      await fetch(`${API_URL}/proyectos/${folio}/lock`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${getToken()}` },
        keepalive: true, // funciona aunque la pestaña esté cerrándose
      });
    } catch {}
  }, [stopHeartbeat]);
 
  const lockProject = useCallback(async (folio: number) => {
    try {
      const res = await fetch(`${API_URL}/proyectos/${folio}/lock`, {
        method: "POST",
        headers: { Authorization: `Bearer ${getToken()}` },
      });

      if (res.ok) {
        setLockedBy(false); 
        startHeartbeat(folio);
        return;
      }

      if (res.status === 409) {
        const err = await res.json().catch(() => null);
        const info = err?.detail?.locked_by as LockInfo | undefined;
        setLockedBy(info ?? { idusuario: "?", nombre: "otro usuario" });
        return;
      }
 
      //Libre para no bloquear innecesariamente con cualquier otro error dejar
      console.warn("[Lock] Respuesta inesperada:", res.status);
      setLockedBy(false);
    } catch (e) {
      console.error("[Lock] Error de red:", e);
      setLockedBy(false);
    }
  }, [startHeartbeat]);


  // Liberar al cerrar o recargar pestaña
  useEffect(() => {
    const handleUnload = () => {
      const folio = sessionStorage.getItem("project_folio");
      if (!folio) return;
      fetch(`${API_URL}/proyectos/${folio}/lock`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${getToken()}` },
        keepalive: true,
      }).catch(() => { });
    };
    window.addEventListener("beforeunload", handleUnload);
    return () => window.removeEventListener("beforeunload", handleUnload);
  }, []);

  // chatBlocked = true solo cuando otro usuario tiene el lock
  const chatBlocked = lockedBy !== null && lockedBy !== false;



  // ─── Carga de sesión con sync remoto ────────────────────────────────────────

  const loadSessionData = async (nextUserId: string, nextSessionId: string, nextFolio?: number) => {
    console.log(`[ChatBot] Cargando sesión user_id=${nextUserId} session_id=${nextSessionId} folio=${nextFolio}`);
 
    setUserId(nextUserId);
    setSessionId(nextSessionId);
    setTempUserId(nextUserId);
    setShowLoginModal(false);
    checkPermiso(nextUserId, nextSessionId);

    const savedInput = localStorage.getItem(getInputKey(nextSessionId));
    setInput(savedInput || "");

    // 1️⃣ Mostrar caché local de inmediato
    const WELCOME: Msg = { id: 1, role: "bot", text: "Hola 👋 Soy tu asistente. ¿En qué te puedo ayudar?" };
    let cachedMessages: Msg[] = [WELCOME];

    const savedMessages = localStorage.getItem(getMessagesKey(nextSessionId));
    if (savedMessages) {
      try {
        const parsed: Msg[] = JSON.parse(savedMessages);
        if (parsed.length > 0) cachedMessages = parsed;
      } catch { /* usar default */}
    }

    const maxIdCached = Math.max(...cachedMessages.map((m) => m.id), 0);
    msgIdRef.current = Math.max(msgIdRef.current, maxIdCached + 1);
    setMessages(cachedMessages);

    // 2️⃣ Sincronizar con historial remoto en segundo plano
    const { synced, changed } = await syncSessionHistory(nextUserId, nextSessionId, cachedMessages);

    if (changed) {
      const maxIdSynced = Math.max(...synced.map((m) => m.id), 0);
      msgIdRef.current = Math.max(msgIdRef.current, maxIdSynced + 1);
      setMessages(synced);
      localStorage.setItem(getMessagesKey(nextSessionId), JSON.stringify(synced));
      console.log(`[ChatBot] Sync: ${synced.length - cachedMessages.length} mensaje(s) nuevo(s) agregado(s)`);
    }
 
    const folioParaLock = nextFolio ?? Number(sessionStorage.getItem("project_folio") ?? "0");
    if (folioParaLock) {
      setLockedBy(null); // mostrar estado "verificando" mientras llega la respuesta
 
      // Liberar el lock del proyecto anterior si cambió
      const folioAnterior = Number(sessionStorage.getItem("project_folio_anterior") ?? "0");
      if (folioAnterior && folioAnterior !== folioParaLock) {
        releaseProject(folioAnterior);
      }
      sessionStorage.setItem("project_folio_anterior", String(folioParaLock));
 
      lockProject(folioParaLock);
    }
  };

  // ─── Efectos ─────────────────────────────────────────────────────────────────

  useEffect(() => {
    const handleSessionChanged = (event: Event) => {
      const e = event as CustomEvent<{ userId: string; sessionId: string; projectId?: string; folio?: number; nombreproyecto?: string }>;
      const { userId: u, sessionId: s, projectId, folio, nombreproyecto } = e.detail ?? {};
      if (!u || !s) return;
      if (projectId) sessionStorage.setItem("project_id", projectId);
      if (folio) {
        setProjectFolio(folio);
        sessionStorage.setItem("project_folio", String(folio));
      }
      if (nombreproyecto) {
        setProjectName(nombreproyecto);
        sessionStorage.setItem("project_name", nombreproyecto);
      }
      setLockedBy(null);
      loadSessionData(u, s, folio);
    };
    window.addEventListener("chat-session-changed", handleSessionChanged);
    return () => window.removeEventListener("chat-session-changed", handleSessionChanged);
  }, []);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, isThinking]);

  useEffect(() => {
    const savedSessionId = sessionStorage.getItem("chat_session_id");
    const savedUserId = sessionStorage.getItem("chat_user_id");
    const savedFolio = sessionStorage.getItem("project_folio");
    const savedName = sessionStorage.getItem("project_name");
    if (savedUserId && savedSessionId) {

      loadSessionData(savedUserId, savedSessionId, savedFolio ? Number(savedFolio) : undefined);
    } else {
      setShowLoginModal(true);
    }
    if (savedFolio) setProjectFolio(Number(savedFolio));
    if (savedName) setProjectName(savedName);
    setLocalChatReady(true);
  }, []);

  useEffect(() => {
    if (!localChatReady || !sessionId) return;
    localStorage.setItem(getMessagesKey(sessionId), JSON.stringify(messages));
  }, [messages, localChatReady, sessionId]);

  useEffect(() => {
    if (!localChatReady || !sessionId) return;
    localStorage.setItem(getInputKey(sessionId), input);
  }, [input, localChatReady, sessionId]);

  useEffect(() => {
    if (userId && sessionId && !showLoginModal && !chatBlocked)
      setTimeout(() => inputRef.current?.focus(), 0);
  }, [userId, sessionId, showLoginModal, chatBlocked]);
 
  useEffect(() => {
    if (!loadingMessage && userId && sessionId && !showLoginModal && !chatBlocked)
      setTimeout(() => inputRef.current?.focus(), 0);
  }, [loadingMessage, userId, sessionId, showLoginModal, chatBlocked]);

  // ─── Handlers ────────────────────────────────────────────────────────────────

  function handleProjectCreated() {
    const savedUserId = sessionStorage.getItem("chat_user_id");
    const savedSessionId = sessionStorage.getItem("chat_session_id");
    const savedFolioPC = sessionStorage.getItem("project_folio");
    if (savedUserId && savedSessionId) {

      loadSessionData(savedUserId, savedSessionId, savedFolioPC ? Number(savedFolioPC) : undefined);
      if (!localStorage.getItem(getMessagesKey(savedSessionId)))
        setMessages([{ id: 1, role: "bot", text: "Proyecto y sesión creados. Ya puedes chatear." }]);
    }
    setShowLoginModal(false);
  }

  async function createSession() {
    const cleanUserId = tempUserId.trim();
    if (!cleanUserId) return;
    try {
      setLoadingSession(true);
      const res = await fetch(`${API_URL}/agent/sessions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: cleanUserId }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => null);
        throw new Error(err?.detail || "No se pudo crear la sesión.");
      }
      const data = await res.json();
      setUserId(data.user_id);
      setSessionId(data.session_id);
      sessionStorage.setItem("chat_user_id", data.user_id);
      sessionStorage.setItem("chat_session_id", data.session_id);
      window.dispatchEvent(new CustomEvent("chat-user-updated", { detail: { userId: data.user_id } }));
      setShowLoginModal(false);
      setMessages((prev) => [...prev, { id: nextId(), role: "bot", text: `Sesión iniciada para ${data.user_id}.`, isNew: true }]);
    } catch (error) {
      alert(error instanceof Error ? error.message : "Error al crear la sesión");
    } finally {
      setLoadingSession(false);
    }
  }

  async function send() {
    if (chatBlocked) return;
    const text = input.trim();
    if (!text || !userId || !sessionId || loadingMessage) return;

    const userMsgId = nextId();
    activeBotIdRef.current = null;
    lastEventRef.current = null;

    const userTimestamp = Date.now() / 1000;
    setMessages((prev) => [...prev, { id: userMsgId, role: "user", text, isNew: true, timestamp: userTimestamp }]);
    setInput("");
    setLoadingMessage(true);
    setIsThinking(true);

    try {
      const res = await fetch(`${API_URL}/agent/query/stream`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: userId,
          session_id: sessionId,
          message: `${text}. Si modificas algún widget o sección, guarda los cambios en Firestore. Y si es primer mensaje haz proceso de primer mensaje`,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => null);
        throw new Error(err?.detail || "Error al enviar el mensaje.");
      }

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const lines = decoder.decode(value).split("\n");
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const event = JSON.parse(line.slice(6));

            if (event.type === "text") {
              setIsThinking(false);
              if (activeBotIdRef.current === null || lastEventRef.current === "tool") {
                const newBotId = nextId();
                activeBotIdRef.current = newBotId;
                setMessages((prev) => [...prev, {
                  id: newBotId,
                  role: "bot",
                  text: event.data,
                  isNew: true,
                  timestamp: Date.now() / 1000,
                }]);
              } else {
                const currentId = activeBotIdRef.current;
                setMessages((prev) =>
                  prev.map((m) => m.id === currentId ? { ...m, text: m.text + event.data } : m)
                );
              }
              lastEventRef.current = "text";

            } else if (event.type === "tool_call") {
              setIsThinking(false);
              lastEventRef.current = "tool";
              setMessages((prev) => [...prev, {
                id: nextId(),
                role: "tool_call" as MsgRole,
                text: "",
                tool: event.tool,
                isNew: true,
              }]);

            } else if (event.type === "tool_result") {
              lastEventRef.current = "tool";
              setIsThinking(true);
              setMessages((prev) => {
                const reversed = [...prev].reverse();
                const idx = reversed.findIndex(
                  (m) => m.role === "tool_call" && m.tool === event.tool
                );
                if (idx === -1) return prev;
                const realIdx = prev.length - 1 - idx;
                return prev.map((m, i) =>
                  i === realIdx ? { ...m, role: "tool_result" as MsgRole } : m
                );
              });

            } else if (event.type === "done") {
              setIsThinking(false);
              window.dispatchEvent(new CustomEvent("ers-refresh"));
            }
          } catch { /* línea incompleta, ignorar */ }
        }
      }
    } catch (error) {
      setMessages((prev) => [...prev, {
        id: nextId(),
        role: "bot",
        text: error instanceof Error ? `Error: ${error.message}` : "Error al consultar el bot.",
        isNew: true,
      }]);
      window.dispatchEvent(new CustomEvent("ers-refresh"));
    } finally {
      activeBotIdRef.current = null;
      lastEventRef.current = null;
      setIsThinking(false);
      setLoadingMessage(false);
    }
  }

  // ─── Render helpers ───────────────────────────────────────────────────────────

  function renderToolChip(m: Msg) {
    const isDone = m.role === "tool_result";
    const label = toolLabels[m.tool ?? ""] ?? m.tool ?? "Procesando";
    return (
      <div key={m.id} className={`flex items-center pl-3 ${m.isNew ? "animate-fadeUp" : ""}`}>
        <div className={`
          flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium border transition-all duration-500
          ${isDone ? "bg-green-50 border-green-200 text-green-700" : "bg-blue-50 border-blue-200 text-blue-600"}
        `}>
          {isDone
            ? <CheckCircle2 size={11} className="text-green-500 flex-shrink-0" />
            : <Zap size={11} className="text-blue-400 flex-shrink-0 animate-pulse" />
          }
          <span>{label}</span>
          {isDone
            ? <span className="text-green-400 text-[10px]">✓</span>
            : (
              <span className="flex gap-0.5 ml-0.5">
                <span className="animate-dotBounce w-1 h-1 rounded-full bg-blue-400" style={{ animationDelay: "0ms" }} />
                <span className="animate-dotBounce w-1 h-1 rounded-full bg-blue-400" style={{ animationDelay: "150ms" }} />
                <span className="animate-dotBounce w-1 h-1 rounded-full bg-blue-400" style={{ animationDelay: "300ms" }} />
              </span>
            )
          }
        </div>
      </div>
    );
  }

  function renderMessage(m: Msg) {
    if (m.role === "tool_call" || m.role === "tool_result")
      return renderToolChip(m);

    return (
      <div
        key={m.id}
        className={[
          m.role === "bot"
            ? "flex items-start gap-3"
            : "flex items-start gap-3 justify-end",
          m.isNew
            ? m.role === "bot"
              ? "animate-slideLeft"
              : "animate-slideRight"
            : "",
        ].join(" ")}
      >
        {m.role === "bot" && (
          <div className="h-10 w-10 rounded-full bg-white shadow flex items-center justify-center flex-shrink-0">
            <Bot size={18} className="text-[#EB0029]" />
          </div>
        )}
        <div className="max-w-[70%] rounded-2xl bg-white px-5 py-4 shadow relative">
          <MiniMarkdown text={m.text} />
          {m.role === "bot" && (
            <div className="absolute left-0 bottom-0 h-[6px] w-full bg-[#EB0029] rounded-b-2xl" />
          )}
        </div>
        {m.role === "user" && (
          <div className="h-10 w-10 rounded-full bg-white shadow flex items-center justify-center flex-shrink-0">
            <User size={18} className="text-gray-600" />
          </div>
        )}
      </div>
    );
  }

  const checkPermiso = async (uid: string, sid: string) => {
    setChecking(true);
    try {
      const res = await fetch(`${API_URL}/colaboracion/session/${sid}/permiso/${uid}`);
      if (res.ok) {
        const data = await res.json();
        setIsOwner(data.permiso === "OWNER");
      } else {
        setIsOwner(false);
      }
    } catch {
      setIsOwner(false);
    } finally {
      setChecking(false);
    }
  };

  console.log("projectFolio al renderizar:", projectFolio);

  if (checking) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-gray-100 rounded-3xl">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#EB0029] border-t-transparent" />
          <p className="text-sm text-gray-500">Verificando sesión...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <style>{`
        @keyframes slideInLeft  { from { opacity:0; transform:translateX(-14px); } to { opacity:1; transform:translateX(0); } }
        @keyframes slideInRight { from { opacity:0; transform:translateX(14px);  } to { opacity:1; transform:translateX(0); } }
        @keyframes fadeUp       { from { opacity:0; transform:translateY(6px);   } to { opacity:1; transform:translateY(0); } }
        @keyframes dotBounce    {
          0%,80%,100% { transform:translateY(0);    opacity:.4; }
          40%          { transform:translateY(-5px); opacity:1;  }
        }
        .animate-slideLeft  { animation: slideInLeft  0.22s ease-out both; }
        .animate-slideRight { animation: slideInRight 0.22s ease-out both; }
        .animate-fadeUp     { animation: fadeUp       0.18s ease-out both; }
        .animate-dotBounce  { display:inline-block; animation: dotBounce 1.2s infinite ease-in-out; }
      `}</style>

      <section className="flex-1 min-w-[420px] min-h-0 relative">
        <div className="h-full rounded-3xl bg-gray-100 shadow-md flex flex-col">

          {/* ── Header con botón de configuración ── */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 rounded-t-3xl flex-shrink-0">
            {isOwner && (
              <button
                onClick={() => {
                  const folio = sessionStorage.getItem("project_folio");
                  const name = sessionStorage.getItem("project_name");
                  if (folio) setProjectFolio(Number(folio));
                  if (name) setProjectName(name);
                  setShowSettingsModal(true);
                }}
                className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-800 bg-white rounded-xl px-3 py-2 shadow-sm hover:shadow transition"
              >
                <Settings size={15} />
                <span className="font-medium">Configuración</span>
              </button>
            )}
          </div>

          {/* ── Banner de bloqueo ── */}
          {chatBlocked && typeof lockedBy === "object" && lockedBy && (
            <div className="mx-4 mt-3 flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 flex-shrink-0">
              <Lock size={15} className="mt-0.5 flex-shrink-0 text-amber-600" />
              <div className="min-w-0">
                <p className="text-sm font-semibold text-amber-800">
                  Proyecto en uso por {lockedBy.nombre}
                </p>
                <p className="mt-0.5 text-xs text-amber-700">
                  El chat está bloqueado temporalmente. Coordínate con{" "}
                  {lockedBy.nombre.split(" ")[0]} para acceder.
                </p>
                <p className="mt-0.5 text-xs text-amber-600">
                  Puedes seguir descargando los documentos sin problema.
                </p>
              </div>
            </div>
          )}

          {/* ── Mensajes ── */}
          <div className="flex-1 min-h-0 overflow-y-auto px-6 pt-4 pr-4 flex flex-col gap-3">
            {messages.map((m) => renderMessage(m))}

            {isThinking && (
              <div className="flex items-start gap-3 animate-slideLeft">
                <div className="h-10 w-10 rounded-full bg-white shadow flex items-center justify-center flex-shrink-0">
                  <Bot size={18} className="text-[#EB0029]" />
                </div>
                <div className="rounded-2xl bg-white px-5 py-4 shadow relative">
                  <span className="flex gap-1 items-center h-4">
                    <span className="animate-dotBounce w-1.5 h-1.5 rounded-full bg-gray-400" style={{ animationDelay: "0ms" }} />
                    <span className="animate-dotBounce w-1.5 h-1.5 rounded-full bg-gray-400" style={{ animationDelay: "150ms" }} />
                    <span className="animate-dotBounce w-1.5 h-1.5 rounded-full bg-gray-400" style={{ animationDelay: "300ms" }} />
                  </span>
                  <div className="absolute left-0 bottom-0 h-[6px] w-full bg-[#EB0029] rounded-b-2xl" />
                </div>
              </div>
            )}

            <div ref={endRef} />
          </div>

          {/* ── Input ── */}
          <div className="px-6 pb-6 pt-4 flex items-center gap-3 flex-shrink-0">
            <div className="relative flex-1">
              <input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); send(); } }}
                placeholder={
                  chatBlocked ? "Chat en uso por otro usuario..." :
                  userId && sessionId ? "Escribe tu pregunta..." :
                  "Primero inicia sesión"
                }
                disabled={!userId || !sessionId || chatBlocked}
                className="w-full rounded-2xl bg-white px-5 pr-14 py-4 text-sm shadow outline-none focus:ring-2 focus:ring-[#EB0029]/30 disabled:bg-gray-200 disabled:cursor-not-allowed"
              />
              <button
                onClick={send}
                disabled={!userId || !sessionId || loadingMessage || chatBlocked}
                className="absolute right-2 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition disabled:opacity-50 disabled:cursor-not-allowed"
                aria-label="Enviar"
              >
                <SendHorizonal className="text-black" size={18} />
              </button>
            </div>

            <div className="flex items-center gap-2">
              {/* Widgets deshabilitado cuando otro usuario tiene el lock */}
              <button
                onClick={() => {
                  if (chatBlocked) return;
                  window.dispatchEvent(new CustomEvent("open-widgets-modal"));
                }}
                disabled={chatBlocked}
                className="bg-[#EB0029] text-white font-semibold text-sm px-5 py-3 rounded-lg hover:bg-red-700 transition flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-[#EB0029]"
              >
                <LayoutDashboard size={20} />
                Widgets
              </button>
            </div>
 
            <HelpTooltip
              text="Aquí puedes agregar, editar y personalizar las secciones y widgets de la plantilla según las necesidades de tu proyecto."
              position="right"
            />
          </div>
        </div>

        <FormModal
          isOpen={showLoginModal}
          tempUserId={tempUserId}
          setTempUserId={setTempUserId}
          loadingSession={loadingSession}
          onClose={() => setShowLoginModal(false)}
          onSubmit={handleProjectCreated}
        />

        <ProjectSettingsModal
          isOpen={showSettingsModal}
          onClose={() => setShowSettingsModal(false)}
          projectName={projectName}
          folio={projectFolio ?? 0}
          onRename={(name) => setProjectName(name)}
        />

      </section>
    </>
  );
}