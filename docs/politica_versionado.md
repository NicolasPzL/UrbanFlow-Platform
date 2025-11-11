# Política de Versionado y Gestión de Ramas – UrbanFlow Platform

## Estrategia de Versionado (SemVer)
UrbanFlow adopta **Semantic Versioning 2.0.0**. Cada release oficial se identifica como `MAJOR.MINOR.PATCH`:
- **MAJOR:** cambios incompatibles con versiones anteriores (p. ej., modificaciones de contratos API, migraciones obligatorias).
- **MINOR:** nuevas funcionalidades compatibles hacia atrás.
- **PATCH:** correcciones y ajustes sin impacto en contratos ni comportamiento externo.

Versiones preliminares (por ejemplo `1.2.0-rc.1`) se utilizan para pruebas antes de liberar a producción.

## Política de Ramas
- `main`: rama protegida, siempre estable, apunta a la versión liberada. Solo recibe merges aprobados desde `release/*`.
- `dev`: rama de integración continua. Todas las historias completadas se integran aquí tras revisión.
- `feature/<issue>`: ramas efímeras por funcionalidad o corrección. Convención: `feature/RF-08-generador-fsm`.
- `hotfix/<issue>`: se utiliza para parches urgentes sobre `main`. Tras completar, se mergea a `main` y `dev`.
- `release/<versión>`: creada cuando `dev` está listo para salir. Se preparan notas de versión, pruebas regresivas y documentación.

### Flujo resumido
1. Crear rama `feature/` desde `dev`.
2. Al terminar, abrir Pull Request a `dev`, adjuntar checklist (`docs/checklist_cumplimiento.md`) y resultados de validaciones manuales.
3. Cuando `dev` está estable, abrir `release/x.y.z`, actualizar `CHANGELOG.md` y documentación.
4. Tras validación final, fusionar `release` en `main` y etiquetar `vX.Y.Z`.
5. Merge inverso de `main` a `dev` para mantener historial alineado.

## Convención de Commits
- Prefijo orientado a contexto: `[feat]`, `[fix]`, `[docs]`, `[perf]`, `[chore]`, `[security]`.
- Mensajes claros ≤ 72 caracteres, complemento en cuerpo si aplica.
- Cada commit debe referenciar issue o requisito (ej. `Refs RF-06`).

## Etiquetado
- Etiquetas (`git tag v1.3.0`) se crean al fusionar en `main` desde `release`.
- Para hotfix críticos, usar `vX.Y.Z+hf1`.

## Gestión de Cambios
- Todo cambio funcional debe reflejarse en `CHANGELOG.md` bajo la sección correspondiente.
- Documentación impactada (manuales, planes) debe actualizarse en el mismo PR.
- Rotación de secretos o configuración sensible debe quedar registrada en `docs/plan_configuracion.md`.

## Revisión y Auditoría
- Pull Requests deben tener al menos una revisión de un par técnico.
- Checklist obligatorio por PR:
  - [ ] Documentación actualizada.
  - [ ] Entradas en `CHANGELOG.md`.
  - [ ] Pruebas manuales o evidencias registradas.
  - [ ] Actualización de `docs/checklist_cumplimiento.md` si aplica.

Esta política se revisa trimestralmente o ante cambios significativos de ciclo de vida.

