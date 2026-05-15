"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation"; 
import NewProject from "@/components/NewProject";
import ProjectList from "@/components/ProjectList";
import ChatBot from "@/components/ChatBot";
import Documentacion from "@/components/Documentacion";

export default function Dashboard() {
  const [expandDocs, setExpandDocs] = useState(false);
  const [currentScreen, setCurrentScreen] = useState<"home" | "dashboard">("home");
  const searchParams = useSearchParams(); 
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      window.location.href = "/";
    } else {
      setChecking(false); 
    }
  }, []);

  useEffect(() => {
    const sessionParam = searchParams.get("session");
    if (sessionParam) {
      setCurrentScreen("dashboard"); 
    }
  }, [searchParams]);

  if (checking) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-gray-100">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#EB0029] border-t-transparent" />
          <p className="text-sm text-gray-500">Verificando sesión...</p>
        </div>
      </div>
    );
  }

  return (
    <main className="flex items-stretch gap-6 p-10 w-full h-screen overflow-hidden">
      {currentScreen === "home" && (
        <NewProject onEnterDashboard={() => setCurrentScreen("dashboard")} />
      )}

      {currentScreen === "dashboard" && (
        <>
          <Suspense fallback={<div>Loading projects...</div>}>
            <ProjectList />
          </Suspense>

          <div 
            className={
              expandDocs
              ? "flex w-0 min-w-0 min-h-0 overflow-hidden opacity-0 pointer-events-none transition-all duration-300"
              : "flex flex-1 min-w-[420px] min-h-0 transition-all duration-300"
            }
          >
            <ChatBot />
          </div>

          <Documentacion
            expanded={expandDocs}
            onToggle={() => setExpandDocs((prev) => !prev)}
          />

        </>
      )}
    </main>
  );
}