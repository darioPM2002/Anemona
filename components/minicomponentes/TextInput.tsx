"use client";

import { ReactNode } from "react";

type Props = {
  value: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  readOnly?: boolean;
  icon?: ReactNode;
  label?: string;
  labelVariant?: "bold" | "light";
  type?: string;
};

export default function TextInput({
  value,
  onChange,
  placeholder = "",
  readOnly = false,
  icon,
  label,
  labelVariant = "bold",
  type = "text",
}: Props) {
  return (
    <div className="w-full flex flex-col gap-2">
      {(icon || label) && (
        <div className="flex items-center gap-2">
          {icon}
          {label && (
            <span
              className={
                labelVariant === "light"
                  ? "text-xs text-gray-500"
                  : "text-sm font-bold text-[#323E48]"
              }
            >
              {label}
            </span>
          )}
        </div>
      )}

      <div className="bg-gray-100 px-4 pt-3 pb-2 rounded-t-sm rounded-b-none">
        <input
          type={type}
          value={value}
          onChange={(e) => onChange?.(e.target.value)}
          readOnly={readOnly}
          placeholder={placeholder}
          className={`w-full bg-transparent outline-none text-sm text-[#5B6670] placeholder:text-[#b5bcc2] ${
            readOnly ? "cursor-not-allowed" : ""
          }`}
        />
      </div>

      <div className="h-[1px] bg-[#5B6670] mt-[-9px] w-full" />
    </div>
  );
}