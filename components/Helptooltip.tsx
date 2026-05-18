import {
  useState,
  useRef,
  useEffect,
  CSSProperties,
} from "react";

import { createPortal } from "react-dom";

type TooltipPosition = "top" | "bottom" | "left" | "right";

interface HelpTooltipProps {
  text: string;
  position?: TooltipPosition;
}

export default function HelpTooltip({
  text,
  position = "top",
}: HelpTooltipProps) {
  const [visible, setVisible] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0 });

  const iconRef = useRef<HTMLButtonElement>(null);
  const tooltipRef = useRef<HTMLSpanElement>(null);

  const show = () => {
    if (!iconRef.current) return;

    const rect = iconRef.current.getBoundingClientRect();

    const positions: Record<TooltipPosition, { top: number; left: number }> = {
      top: {
        top: rect.top - 10,
        left: rect.left + rect.width / 2,
      },
      bottom: {
        top: rect.bottom + 10,
        left: rect.left + rect.width / 2,
      },
      left: {
        top: rect.top + rect.height / 2,
        left: rect.left - 10,
      },
      right: {
        top: rect.top + rect.height / 2,
        left: rect.right + 10,
      },
    };

    setCoords(positions[position]);
    setVisible(true);
  };

  const hide = () => setVisible(false);

  const toggle = () => setVisible((v) => !v);

  useEffect(() => {
    if (!visible) return;

    const handler = (e: MouseEvent) => {
      if (
        iconRef.current &&
        !iconRef.current.contains(e.target as Node) &&
        tooltipRef.current &&
        !tooltipRef.current.contains(e.target as Node)
      ) {
        setVisible(false);
      }
    };

    document.addEventListener("mousedown", handler);

    return () => {
      document.removeEventListener("mousedown", handler);
    };
  }, [visible]);

  const tooltipTransform: Record<TooltipPosition, string> = {
    top: "translate(-50%, -100%)",
    bottom: "translate(-50%, 0)",
    left: "translate(-100%, -50%)",
    right: "translate(0, -50%)",
  };

  return (
    <>
      <button
        ref={iconRef}
        onMouseEnter={show}
        onMouseLeave={hide}
        onClick={toggle}
        type="button"
        className="group inline-flex h-[28px] w-[28px] shrink-0 cursor-pointer items-center justify-center border-none bg-transparent p-0 outline-none"
      >
        <img
          src="/images/Info.png"
          alt="Ayuda"
          className="block h-[28px] w-[28px] object-contain group-hover:hidden"
        />

        <img
          src="/images/InfoHover.png"
          alt="Ayuda"
          className="hidden h-[28px] w-[28px] object-contain group-hover:block"
        />
      </button>

      {visible &&
        createPortal(
          <span
            ref={tooltipRef}
            role="tooltip"
            style={{
              position: "fixed",
              top: coords.top,
              left: coords.left,
              transform: tooltipTransform[position],
              zIndex: 999999,
              width: "220px",
              background: "#fff",
              border: "1px solid #e2e8f0",
              borderRadius: "8px",
              boxShadow:
                "0 4px 16px rgba(0,0,0,0.10), 0 1px 4px rgba(0,0,0,0.06)",
              padding: "10px 13px",
              fontSize: "13px",
              lineHeight: "1.5",
              color: "#334155",
              fontFamily: "system-ui, sans-serif",
            }}
          >
            {text}
          </span>,
          document.body
        )}
    </>
  );
}