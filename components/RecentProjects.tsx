"use client";

import { useEffect, useState } from "react";
import { Home, File as FileIcon } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { API_URL } from "@/services/api";

type RecentProjectItem = {
  folio: number;
  nombreproyecto: string;
  fechacreacion?: string;
  fechaactualizacion?: string;
  session_id: string;
  id_firestore_document?: string;
};

export default function RecentProjectList() {
  const router = useRouter();
  const pathname = usePathname();

  const [selectedId, setSelectedId] = useState<number | null>(null);

  const [idusuario, setIdUsuario] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    return localStorage.getItem("idusuario")?.trim() || null;
  });

  const [nombre, setNombre] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    return localStorage.getItem("nombre");
  });

  const [apellidopaterno, setApellidopaterno] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    return localStorage.getItem("apellidopaterno");
  });

  const [projects, setProjects] = useState<RecentProjectItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (typeof window === "undefined") return;

    setIdUsuario(localStorage.getItem("idusuario")?.trim() || null);
    setNombre(localStorage.getItem("nombre"));
    setApellidopaterno(localStorage.getItem("apellidopaterno"));
  }, []);

  useEffect(() => {
    if (!idusuario) return;

    const fetchRecentProjects = async () => {
      try {
        setLoading(true);

        const res = await fetch(
         `${API_URL}/usuarios/${idusuario}/proyectos_recientes`
        );

        if (!res.ok) {
          throw new Error("No se pudieron obtener los proyectos recientes");
        }

        const data = await res.json();
        setProjects(data);
        console.log("PROJECTS RECIENTES:", data);
      } catch (error) {
        console.error("Error cargando proyectos recientes:", error);
        setProjects([]);
      } finally {
        setLoading(false);
      }
    };

    fetchRecentProjects();
  }, [idusuario]);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("idusuario");
    localStorage.removeItem("nombre");
    localStorage.removeItem("apellidopaterno");
    localStorage.removeItem("apellidomaterno");
    localStorage.removeItem("correo");
    localStorage.removeItem("activo");
    localStorage.removeItem("iddepartamento");
    localStorage.removeItem("idrol");

    sessionStorage.removeItem("chat_user_id");
    sessionStorage.removeItem("chat_session_id");
    sessionStorage.removeItem("project_id");

    router.push("/login");
  };

  const handleOpenProjectChat = (project: RecentProjectItem) => {
    setSelectedId(project.folio);

    const loggedUserId = localStorage.getItem("idusuario")?.trim() || "";

    sessionStorage.setItem("chat_user_id", loggedUserId);
    sessionStorage.setItem("chat_session_id", project.session_id);

    if (project.id_firestore_document) {
      sessionStorage.setItem("project_id", project.id_firestore_document);
    } else {
      sessionStorage.removeItem("project_id");
    }

    if (pathname === "/dashboard") {
      window.dispatchEvent(
        new CustomEvent("chat-session-changed", {
          detail: {
            userId: loggedUserId,
            sessionId: project.session_id,
            projectId: project.id_firestore_document ?? "",
            folio: project.folio,
          },
        })
      );
    } else {
      router.push(`/dashboard?session=${project.session_id}`);
    }
  };

  const formatProjectDate = (project: RecentProjectItem) => {
    const dateValue = project.fechaactualizacion || project.fechacreacion;
    if (!dateValue) return "";

    return new Date(dateValue).toLocaleDateString("es-MX");
  };

  return (
    <div className="w-full max-w-xs h-full flex flex-col bg-white px-5 py-6">
      <div className="mb-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-[#EB0029]">Mis Proyectos</h1>

          <div className="flex items-center gap-2">
            <button
              onClick={handleLogout}
              className="rounded-md border border-gray-200 px-3 py-1 text-sm font-medium text-gray-600 transition hover:bg-gray-100 hover:text-[#EB0029]"
            >
              Log out
            </button>

            <Home
              size={30}
              onClick={() => window.location.href = "/dashboard"}
              className="text-gray-500 hover:text-[#EB0029] hover:bg-gray-100 p-1 rounded cursor-pointer transition"
            />
          </div>
        </div>

        <div className="h-[2px] w-full bg-[#EB0029] mt-1"></div>
      </div>

      <div className="flex flex-col items-center my-6">
        <div className="w-28 h-28 rounded-full bg-gray-100 shadow-md flex items-center justify-center overflow-hidden mb-3">
          <svg viewBox="0 0 100 100" className="w-full h-full">
            <circle cx="50" cy="50" r="50" fill="#e8e8e8" />
            <ellipse cx="50" cy="85" rx="28" ry="20" fill="#2c3e6b" />
            <rect x="43" y="65" width="14" height="15" rx="2" fill="white" />
            <polygon points="50,67 47,72 50,85 53,72" fill="#EB0029" />
            <ellipse cx="50" cy="40" rx="18" ry="20" fill="#f5c9a0" />
            <ellipse cx="50" cy="24" rx="18" ry="10" fill="#2c3e6b" />
            <rect x="32" y="24" width="36" height="8" fill="#2c3e6b" />
          </svg>
        </div>

        <p className="text-xl font-bold text-gray-700">
          {`${nombre ?? ""} ${apellidopaterno ?? ""}`.trim() || "Usuario"}
        </p>
      </div>

      <div className="flex-1 overflow-y-auto flex flex-col gap-3 pr-1 scrollbar-thin scrollbar-thumb-gray-300">
        {loading ? (
          <div className="text-sm text-gray-400 text-center mt-4">
            Cargando proyectos recientes...
          </div>
        ) : projects.length === 0 ? (
          <div className="text-sm text-gray-400 text-center mt-4">
            No hay proyectos recientes para este usuario.
          </div>
        ) : (
          projects.map((project) => {
            const isSelected = selectedId === project.folio;

            return (
              <div
                key={project.folio}
                onClick={() => handleOpenProjectChat(project)}
                className={`flex items-center gap-3 px-3 py-3 rounded-lg cursor-pointer transition
                ${isSelected ? "bg-gray-300 shadow-inner" : "hover:bg-gray-200"}
                `}
              >
                <div className="w-8 h-8 bg-[#EB0029] rounded-md flex items-center justify-center text-white flex-shrink-0">
                  <FileIcon size={14} strokeWidth={2.5} />
                </div>

                <div className="flex-1">
                  <div className="flex items-center">
                    <span className="text-[#EB0029] text-sm font-semibold">
                      {project.folio}
                    </span>
                    <span className="ml-auto text-[10px] text-gray-500">
                      {formatProjectDate(project)}
                    </span>
                  </div>

                  <div className="text-xs text-gray-600 mt-1">
                    {project.nombreproyecto}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="flex justify-center py-7">
        <button
          onClick={() => router.push("/proyectos-dashboard")}
          className="bg-[#EB0029] text-white font-semibold text-sm px-8 py-3 rounded-lg hover:bg-red-700 transition"
        >
          Ver Todos
        </button>
      </div>

      <div className="mt-auto pt-1 left-0 w-full flex justify-center">
        <img
          src="/images/banortelogo.png"
          alt="Logo"
          className="h-15"
        />
      </div>
    </div>
  );
}