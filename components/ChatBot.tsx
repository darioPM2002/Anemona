"use client";

import { SendHorizonal, Bot, User, LayoutDashboard, Zap, CheckCircle2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import FormModal from "./FormModal";
import { API_URL } from "@/services/api";
import HelpTooltip from "./Helptooltip";

type MsgRole = "user" | "bot" | "tool_call" | "tool_result";

type Msg = {
  id: number;
  role: MsgRole;
  text: string;
  tool?: string;
  isNew?: boolean;
};

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

  const endRef   = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [localChatReady, setLocalChatReady] = useState(false);

  const msgIdRef       = useRef(Date.now());
  const nextId         = () => ++msgIdRef.current;
  const activeBotIdRef = useRef<number | null>(null);
  const lastEventRef   = useRef<"text" | "tool" | null>(null);

  const getMessagesKey = (s: string) => `agent-chat-messages:${s}`;
  const getInputKey    = (s: string) => `agent-chat-input:${s}`;

  const toolLabels: Record<string, string> = {
    obtener_plantilla:        "Leyendo plantilla",
    obtener_info_widgets:     "Cargando widgets",
    actualizar_widget:        "Guardando widget",
    obtener_progreso:         "Calculando progreso",
    fijar_doc_id:             "Configurando documento",
    leer_srs_desde_firestore: "Leyendo SRS",
    guardar_en_firestore:     "Guardando en Firestore",
  };

  const loadSessionData = (nextUserId: string, nextSessionId: string) => {
    setUserId(nextUserId);
    setSessionId(nextSessionId);
    setTempUserId(nextUserId);
    const savedMessages = localStorage.getItem(getMessagesKey(nextSessionId));
    const savedInput    = localStorage.getItem(getInputKey(nextSessionId));
    if (savedMessages) {
      try {
        const parsed = JSON.parse(savedMessages);
        const maxId = Math.max(...parsed.map((m: Msg) => m.id), 0);
        msgIdRef.current = Math.max(msgIdRef.current, maxId + 1);
        setMessages(parsed);
      } catch {
        setMessages([{ id: 1, role: "bot", text: "Hola 👋 Soy tu asistente. ¿En qué te puedo ayudar?" }]);
      }
    } else {
      setMessages([{ id: 1, role: "bot", text: "Hola 👋 Soy tu asistente. ¿En qué te puedo ayudar?" }]);
    }
    setInput(savedInput || "");
    setShowLoginModal(false);
  };

  useEffect(() => {
    const handleSessionChanged = (event: Event) => {
      const e = event as CustomEvent<{ userId: string; sessionId: string; projectId?: string }>;
      const { userId: u, sessionId: s, projectId } = e.detail ?? {};
      if (!u || !s) return;
      if (projectId) sessionStorage.setItem("project_id", projectId);
      loadSessionData(u, s);
    };
    window.addEventListener("chat-session-changed", handleSessionChanged);
    return () => window.removeEventListener("chat-session-changed", handleSessionChanged);
  }, []);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, isThinking]);

  useEffect(() => {
    const savedSessionId = sessionStorage.getItem("chat_session_id");
    const savedUserId    = sessionStorage.getItem("chat_user_id");
    if (savedUserId && savedSessionId) {
      loadSessionData(savedUserId, savedSessionId);
    } else {
      setShowLoginModal(true);
    }
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
    if (userId && sessionId && !showLoginModal)
      setTimeout(() => inputRef.current?.focus(), 0);
  }, [userId, sessionId, showLoginModal]);

  useEffect(() => {
    if (!loadingMessage && userId && sessionId && !showLoginModal)
      setTimeout(() => inputRef.current?.focus(), 0);
  }, [loadingMessage, userId, sessionId, showLoginModal]);

  function handleProjectCreated() {
    const savedUserId    = sessionStorage.getItem("chat_user_id");
    const savedSessionId = sessionStorage.getItem("chat_session_id");
    if (savedUserId && savedSessionId) {
      loadSessionData(savedUserId, savedSessionId);
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
    const text = input.trim();
    if (!text || !userId || !sessionId || loadingMessage) return;

    const userMsgId = nextId();
    activeBotIdRef.current = null;
    lastEventRef.current   = null;

    setMessages((prev) => [...prev, { id: userMsgId, role: "user", text, isNew: true }]);
    setInput("");
    setLoadingMessage(true);
    setIsThinking(true); // ← muestra burbuja de "pensando"

    try {
      const res = await fetch(`${API_URL}/agent/query/stream`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: userId, session_id: sessionId, message: text }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => null);
        throw new Error(err?.detail || "Error al enviar el mensaje.");
      }

      const reader  = res.body!.getReader();
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
              setIsThinking(false); // ← oculta al llegar primer texto
              if (activeBotIdRef.current === null || lastEventRef.current === "tool") {
                const newBotId = nextId();
                activeBotIdRef.current = newBotId;
                setMessages((prev) => [...prev, {
                  id: newBotId,
                  role: "bot",
                  text: event.data,
                  isNew: true,
                }]);
              } else {
                const currentId = activeBotIdRef.current;
                setMessages((prev) =>
                  prev.map((m) => m.id === currentId ? { ...m, text: m.text + event.data } : m)
                );
              }
              lastEventRef.current = "text";

            } else if (event.type === "tool_call") {
              setIsThinking(false); // ← oculta al llegar tool
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
              setIsThinking(true); // ← vuelve a mostrar mientras procesa resultado
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
          } catch {
            // línea incompleta, ignorar
          }
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
      lastEventRef.current   = null;
      setIsThinking(false);
      setLoadingMessage(false);
    }
  }

  function renderToolChip(m: Msg) {
    const isDone = m.role === "tool_result";
    const label  = toolLabels[m.tool ?? ""] ?? m.tool ?? "Procesando";
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
    if (m.role === "tool_call" || m.role === "tool_result") return renderToolChip(m);

    return (
      <div
        key={m.id}
        className={[
          m.role === "bot" ? "flex items-start gap-3" : "flex items-start gap-3 justify-end",
          m.isNew ? (m.role === "bot" ? "animate-slideLeft" : "animate-slideRight") : "",
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
        <div className="h-full rounded-3xl bg-gray-100 shadow-md p-6 flex flex-col">

          <div className="flex-1 min-h-0 overflow-y-auto pr-2 flex flex-col gap-3">
            {messages.map((m) => renderMessage(m))}

            {/* ── Burbuja "pensando" ── */}
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

          <div className="mt-5 flex items-center gap-3">
            <div className="relative flex-1">
              <input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); send(); } }}
                placeholder={userId && sessionId ? "Escribe tu pregunta..." : "Primero inicia sesión"}
                disabled={!userId || !sessionId}
                className="w-full rounded-2xl bg-white px-5 pr-14 py-4 text-sm shadow outline-none focus:ring-2 focus:ring-[#EB0029]/30 disabled:bg-gray-200 disabled:cursor-not-allowed"
              />
              <button
                onClick={send}
                disabled={!userId || !sessionId || loadingMessage}
                className="absolute right-2 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition disabled:opacity-50 disabled:cursor-not-allowed"
                aria-label="Enviar"
              >
                <SendHorizonal className="text-black" size={18} />
              </button>
            </div>


<div className="flex items-center gap-2">
  <button
    onClick={() => window.dispatchEvent(new CustomEvent("open-widgets-modal"))}
    className="bg-[#EB0029] text-white font-semibold text-sm px-5 py-3 rounded-lg hover:bg-red-700 transition flex items-center gap-2"
  >
    <LayoutDashboard size={20} />
    Widgets
  </button>

  <HelpTooltip
    text="Aquí puedes agregar, editar y personalizar las secciones y widgets de la plantilla según las necesidades de tu proyecto."
    position="right"
  />
</div>
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
      </section>
    </>
  );
}