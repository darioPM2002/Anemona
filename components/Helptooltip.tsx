import { useState, useRef, useEffect } from "react";

type TooltipPosition = "top" | "bottom" | "left" | "right";

interface HelpTooltipProps {
  text: string;
  position?: TooltipPosition;
}

export default function HelpTooltip({ text, position = "top" }: HelpTooltipProps) {
  const [visible, setVisible] = useState(false);
  const iconRef = useRef<HTMLButtonElement>(null);
  const tooltipRef = useRef<HTMLSpanElement>(null);

  const show = () => setVisible(true);
  const hide = () => setVisible(false);
  const toggle = () => setVisible((v) => !v);

  useEffect(() => {
    if (!visible) return;
    const handler = (e: MouseEvent) => {
      if (
        iconRef.current && !iconRef.current.contains(e.target as Node) &&
        tooltipRef.current && !tooltipRef.current.contains(e.target as Node)
      ) {
        setVisible(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [visible]);

  const positionStyles: Record<TooltipPosition, React.CSSProperties> = {
    top:    { bottom: "calc(100% + 10px)", left: "50%", transform: "translateX(-50%)" },
    bottom: { top:    "calc(100% + 10px)", left: "50%", transform: "translateX(-50%)" },
    left:   { right:  "calc(100% + 10px)", top: "50%",  transform: "translateY(-50%)" },
    right:  { left:   "calc(100% + 10px)", top: "50%",  transform: "translateY(-50%)" },
  };

  const arrowStyles: Record<TooltipPosition, React.CSSProperties> = {
    top:    { bottom: "-5px", left: "50%", transform: "translateX(-50%) rotate(45deg)", borderRight: "1px solid #e2e8f0", borderBottom: "1px solid #e2e8f0" },
    bottom: { top:    "-5px", left: "50%", transform: "translateX(-50%) rotate(45deg)", borderLeft:  "1px solid #e2e8f0", borderTop:    "1px solid #e2e8f0" },
    left:   { right:  "-5px", top:  "50%", transform: "translateY(-50%) rotate(45deg)", borderRight: "1px solid #e2e8f0", borderTop:    "1px solid #e2e8f0" },
    right:  { left:   "-5px", top:  "50%", transform: "translateY(-50%) rotate(45deg)", borderLeft:  "1px solid #e2e8f0", borderBottom: "1px solid #e2e8f0" },
  };

  const translateMap: Record<TooltipPosition, string> = {
    top:    "translateX(-50%)",
    bottom: "translateX(-50%)",
    left:   "translateY(-50%)",
    right:  "translateY(-50%)",
  };

  const fadeInFrom: Record<TooltipPosition, string> = {
    top:    "translateX(-50%) translateY(4px)",
    bottom: "translateX(-50%) translateY(-4px)",
    left:   "translateY(-50%) translateX(4px)",
    right:  "translateY(-50%) translateX(-4px)",
  };

  return (
    <span style={{ position: "relative", display: "inline-flex", alignItems: "center" }}>
      <button
        ref={iconRef}
        onMouseEnter={show}
        onMouseLeave={hide}
        onClick={toggle}
        aria-label="Ayuda"
        type="button"
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          width: "18px",
          height: "18px",
          borderRadius: "50%",
          border: "1.5px solid",
          borderColor: visible ? "#3b82f6" : "#94a3b8",
          background: visible ? "#eff6ff" : "transparent",
          color: visible ? "#3b82f6" : "#94a3b8",
          fontSize: "11px",
          fontWeight: "700",
          fontFamily: "Georgia, serif",
          cursor: "pointer",
          padding: 0,
          lineHeight: 1,
          transition: "all 0.15s ease",
          flexShrink: 0,
          outline: "none",
        }}
      >
        ?
      </button>

      {visible && (
        <span
          ref={tooltipRef}
          role="tooltip"
          style={{
            position: "absolute",
            ...positionStyles[position],
            zIndex: 9999,
            width: "220px",
            background: "#ffffff",
            border: "1px solid #e2e8f0",
            borderRadius: "8px",
            boxShadow: "0 4px 16px rgba(0,0,0,0.10), 0 1px 4px rgba(0,0,0,0.06)",
            padding: "10px 13px",
            fontSize: "13px",
            lineHeight: "1.5",
            color: "#334155",
            fontFamily: "system-ui, sans-serif",
            pointerEvents: "none",
            animation: "ht-fade-in 0.12s ease",
          }}
        >
          <span
            style={{
              position: "absolute",
              width: "8px",
              height: "8px",
              background: "#ffffff",
              ...arrowStyles[position],
            }}
          />
          {text}
        </span>
      )}

      <style>{`
        @keyframes ht-fade-in {
          from { opacity: 0; transform: ${fadeInFrom[position]}; }
          to   { opacity: 1; transform: ${translateMap[position]}; }
        }
      `}</style>
    </span>
  );
}