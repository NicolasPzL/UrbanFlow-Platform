# Manual del Usuario – UrbanFlow Platform (Operador/Analista)

## 1. Acceso a la plataforma
1. Abra el navegador y diríjase a la URL proporcionada por el administrador (por defecto `http://localhost:3000`).
2. Presione “Iniciar sesión” e ingrese su correo y contraseña.
3. Si es la primera vez que accede, el sistema le solicitará cambiar la contraseña inmediata (flujo forzado).

## 2. Selección de cabina y navegación
1. Una vez autenticado, el tablero principal mostrará un resumen de métricas y alertas activas.
2. Utilice el selector “Cabina” en la parte superior derecha de la sección “Análisis Técnico” para elegir:
   - `Todas las cabinas` para visualizar tendencias globales.
   - Un código específico (`CAB-0001`, etc.) para filtrar métricas y alertas.

## 3. Lectura de métricas clave
- **Alertas activas:** muestra eventos importantes (vibración elevada, espectro fuera de rango, etc.) con severidad y sensor asociado.
- **Sección “Vibración en tiempo real”:** curva RMS (root mean square) de los últimos registros.
- **Métricas de vibración:** indicadores promedio (RMS, pico máximo, crest factor, kurtosis, skewness y ZCR).
- **Análisis espectral:** gráficos de frecuencia media y dominante.
- **Estados operativos:** visualiza la secuencia FSM (Inicio, Zona lenta, Reaceleración, Crucero, Frenado, Parado).

## 4. Consulta de historial
- En la parte inferior del dashboard encontrará la tabla “Historial de Cabinas” con registros ordenados por fecha (más reciente primero).
- Cada registro incluye velocidad, estado, RMS y hora. Utilice el selector de cabina para filtrar.

## 5. Cierre de sesión
- Presione el botón “Cerrar sesión” en el menú superior para finalizar la sesión. Esto limpiará la cookie y registrará el evento de auditoría.

## 6. Buenas prácticas
- Cambie su contraseña periódicamente desde el menú de perfil.
- Revise las alertas antes de reanudar operaciones; si detecta anomalías persistentes, comuníquese con el administrador.
- No comparta credenciales ni utilice dispositivos no autorizados.

Para soporte adicional contacte al equipo de administración. Las actualizaciones de la plataforma se registran en `CHANGELOG.md`.

