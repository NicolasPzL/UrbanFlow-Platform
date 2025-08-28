# UrbanFlow-Platform
Plataforma digital integral para la gestión, monitoreo y análisis del sistema de metro cable de UrbanFlow Analytics S.A.S.
# Plataforma de Movilidad Inteligente - UrbanFlow 

Este es el monorepo oficial para el desarrollo de la plataforma digital integral de **Urban Flow Analytics S.A.S.**. El objetivo es gestionar, monitorear y analizar eficientemente nuestro sistema de metro cable urbano por cabinas.

Buscamos optimizar la experiencia de viaje, aumentar la eficiencia del servicio y fortalecer la seguridad de los pasajeros mediante el uso estratégico de datos y plataformas tecnológicas innovadoras.

---

## 🚀 Estructura del Repositorio

* `/analytics`: Contiene el microservicio en **Python/Flask** para el análisis de vibraciones y la detección predictiva de fallos en las cabinas.
* `/backend`: API principal, gestión de usuarios, rutas, estaciones y lógica de negocio, desarrollada en **Node.js** bajo un patrón MVC.
* `/frontend`: Portal web interactivo para administradores, operadores y ciudadanos, desarrollado también con **Node.js** para la gestión de vistas.

---

## 📋 Funcionalidades Clave

El desarrollo de esta plataforma se centra en los siguientes módulos principales:

* **Gestión de Operaciones:** Módulo para administrar rutas, estaciones y cabinas del sistema de teleférico.
* **Dashboard en Tiempo Real:** Visualización de indicadores de desempeño (KPIs) y la ubicación en tiempo real de las cabinas sobre un mapa, usando un código de colores para su estado operativo (🟢 Normal, 🟡 Inusual, 🔴 Fallo).
* **Analítica Predictiva:** Detección temprana de fallos en cabinas mediante el entrenamiento de modelos de IA con datos de vibraciones recolectados por sensores IoT.
* **Gestión de Usuarios:** Sistema de autenticación segura y gestión de roles para diferenciar el acceso de administradores, operadores y ciudadanos.

---

## 🛠️ Cómo Empezar

*[Esta sección la deben completar ustedes con las instrucciones de instalación, variables de entorno y comandos para levantar el proyecto localmente.]*

**Ejemplo:**
1.  Clonar el repositorio: `git clone ...`
2.  Instalar dependencias en la carpeta `/backend`: `npm install`
3.  Levantar el microservicio de analítica en `/analytics`: `python app.py`

---

## 📞 Contactos del Proyecto

* **Líder de Analítica:** @tu-usuario-de-github
* **Líder de Backend:** @usuario-lider-backend
* **Líder de Frontend:** @usuario-lider-frontend
