# Anemona - Frontend

Interfaz web del sistema Anemona, desarrollada con Next.js.
Permite a los usuarios iniciar sesión, gestionar proyectos, interactuar con el chatbot, visualizar documentación generada y editar widgets dinámicos.

## Tecnologías utilizadas

* Next.js
* React
* TypeScript
* Tailwind CSS
* GitHub Actions
* Google Cloud Platform

## Instalación

```bash
npm install
```

## Ejecución local

Para correr el proyecto en local:

```bash
npm run dev
```

Después abrir en el navegador:

```bash
http://localhost:3000
```

## Scripts principales

```bash
npm run dev      # Ejecuta el servidor de desarrollo
npm run build    # Construye la aplicación para producción
npm run start    # Ejecuta la versión de producción
npm run lint     # Ejecuta validaciones de lint
```

## Estructura del proyecto

```bash
app/              # Rutas principales de Next.js, layout y página inicial
components/       # Vistas y elementos de interfaz del sistema
services/         # Configuración de conexión con el back-end
types/            # Tipos e interfaces de TypeScript
public/           # Imágenes y recursos estáticos
data/             # Archivos de datos usados por la aplicación
```

## Conexión con back-end

El front-end se conecta con el back-end mediante endpoints REST.
El back-end se encarga de manejar proyectos, sesiones, documentación, widgets y comunicación con el agente de inteligencia artificial.

La URL del back-end se configura en:

```bash
services/api.ts
```

## Deployment

El front-end se encuentra desplegado en Google Cloud Platform.
El flujo de CI/CD se gestiona con GitHub Actions para validar cambios antes del despliegue.

Liga del sistema desplegado:

```bash
https://anemona-backend-fireabse--anemona-2130e.us-east4.hosted.app/ 
```
la liga de la aplicación desplegada ya no se encuentra disponible, ya que el hospedaje se mantuvo únicamente durante el periodo del proyecto y actualmente no se cuenta con créditos activos de GCP para mantener el servicio en ejecución.


## Repositorios relacionados

Front-end: https://github.com/darioPM2002/Anemona
Back-end: https://github.com/A01029211/AnemonaBackend1
Agente: https://github.com/darioPM2002/agente_anemona

## Autores

Darío Cuauhtémoc Peña Mariano A01785420
Mariel González Grunspan A01198887
Santiago Córdova Molina A01029211
Angela Lizeth Aguirre Zúñiga A01286354
Ariana Isabela Espinoza López A01645270

Proyecto desarrollado por el equipo TechNova para la materia Planeación de Sistemas de Software.
