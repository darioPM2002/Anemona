"use client";

import { useState } from "react";
import ProjectList from "@/components/ProjectList";
import WidgetsModal from "@/components/WidgetsModal";
import FormModal from "@/components/FormModal";
import RecentProjectList from "@/components/RecentProjects";
import { useRouter } from "next/navigation";


interface Proyecto {
    folio: number;
    nombreproyecto: string;
    fechacreacion: string;
    departamento: string;
    session_id: string;
    id_firestore_document?: string;
}

type NewProjectProps = {
  onEnterDashboard: () => void;
};

type ProyectoCreado = {
  session_id: string;
  user_id?: string;
  project_id?: string;
};

export default function NewProject({ onEnterDashboard }: NewProjectProps) {
  const [showWidgets, setShowWidgets] = useState(false);
  const [showFormModal, setShowFormModal] = useState(false);
  const [tempUserId, setTempUserId] = useState("");
  const [loadingSession, setLoadingSession] = useState(false);

  const handleCreateNew = () => {
    setShowFormModal(true);
  };

  const handleProjectCreated = () => {
    const savedUserId = sessionStorage.getItem("chat_user_id");
    const savedSessionId = sessionStorage.getItem("chat_session_id");
    const savedProjectId = sessionStorage.getItem("project_id");

    console.log("Proyecto creado desde FormModal");
    console.log("chat_user_id:", savedUserId);
    console.log("chat_session_id:", savedSessionId);
    console.log("project_id:", savedProjectId);

    setShowFormModal(false);

    // Navega si quedaron guardados los datos
    if (savedUserId && savedSessionId) {
      onEnterDashboard();
    } else {
      alert("No se pudo recuperar la sesión del proyecto creado.");
    }
  };

  return (
    <>
      <ProjectList />

      <section className="flex-1 h-full rounded-3xl relative overflow-hidden" style={{ backgroundColor: "#F4F7F8" }}>

  {/* Triángulos geométricos */}
  <svg className="absolute inset-0 w-full h-full" viewBox="0 0 680 420" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">
    <polygon points="0,0 340,0 0,320" fill="#CFD2D3" opacity="0.70"/>
    <polygon points="680,420 320,420 680,120" fill="#C1C5C8" opacity="0.55"/>
    <circle cx="570" cy="65" r="130" fill="#CFD2D3" opacity="0.30"/>
    <circle cx="570" cy="65" r="78" fill="#C1C5C8" opacity="0.25"/>
    <circle cx="95" cy="385" r="145" fill="#C1C5C8" opacity="0.22"/>
    <circle cx="95" cy="385" r="88" fill="#CFD2D3" opacity="0.18"/>
    <rect x="460" y="-45" width="250" height="250" rx="38" fill="#C1C5C8" opacity="0.20" transform="rotate(30 585 80)"/>
    <rect x="-55" y="205" width="210" height="210" rx="38" fill="#CFD2D3" opacity="0.16" transform="rotate(-16 50 310)"/>
    <line x1="0" y1="95" x2="680" y2="305" stroke="#A2A9AD" strokeWidth="0.7" opacity="0.30"/>
    <line x1="0" y1="155" x2="680" y2="365" stroke="#A2A9AD" strokeWidth="0.5" opacity="0.20"/>
    <line x1="215" y1="0" x2="435" y2="420" stroke="#A2A9AD" strokeWidth="0.5" opacity="0.18"/>
    <polygon points="622,18 652,52 622,86 592,52" fill="#A2A9AD" opacity="0.18"/>
    <polygon points="28,332 58,366 28,400 -2,366" fill="#A2A9AD" opacity="0.18"/>
    <circle cx="58" cy="58" r="3" fill="#A2A9AD" opacity="0.40"/>
    <circle cx="118" cy="43" r="2" fill="#A2A9AD" opacity="0.30"/>
    <circle cx="548" cy="358" r="3" fill="#A2A9AD" opacity="0.40"/>
    <circle cx="610" cy="338" r="2" fill="#A2A9AD" opacity="0.30"/>
  </svg>

  {/* Contenido */}
  <div className="relative z-10 h-full flex flex-col items-center justify-center text-center gap-6">
    <button
      onClick={handleCreateNew}
      className="flex items-center gap-3 text-white font-bold text-xl px-12 py-4 rounded-lg shadow-md hover:opacity-90 transition"
      style={{ backgroundColor: "#EB0029" }}
    >
      <span className="text-2xl font-light">+</span>
      Crear nuevo
    </button>

    <div>
      <h2 className="text-2xl font-bold" style={{ color: "#323E48" }}>
        Comenzar un nuevo proyecto
      </h2>
      <p className="text-sm mt-1" style={{ color: "#5B6670" }}>
        Diseña, estructura y documenta tu iniciativa
      </p>
      <div className="mx-auto mt-3 w-16 h-1 rounded-full" style={{ backgroundColor: "#EB0029", opacity: 0.5 }} />
    </div>
  </div>

</section>

      <FormModal
        isOpen={showFormModal}
        tempUserId={tempUserId}
        setTempUserId={setTempUserId}
        loadingSession={loadingSession}
        onClose={() => setShowFormModal(false)}
        onSubmit={handleProjectCreated}
      />
    </>
  );
}