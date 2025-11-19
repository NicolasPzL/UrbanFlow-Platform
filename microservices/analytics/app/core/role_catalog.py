"""
Catálogo estático de roles permitido para el chatbot UrbanFlow.

Se mantiene fuera de la base de datos para:
- Evitar lecturas de tablas sensibles como `usuarios`
- Garantizar control y trazabilidad alineados con ISO 9001/ISO/IEC 27001
- Facilitar auditorías y revisiones de calidad (ISO/IEC 25010)
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Dict, List, Optional


@dataclass(frozen=True)
class RoleInfo:
    """Información aprobada para un rol específico."""

    name: str
    description: str
    audience: str
    permissions: List[str]
    sensitive_access: bool
    allowed_domains: List[str]


_ROLE_CATALOG: Dict[str, RoleInfo] = {
    "ciudadano": RoleInfo(
        name="ciudadano",
        description=(
            "Usuario final externo interesado en información general del "
            "teleférico. No debe acceder a datos sensibles ni técnicos."
        ),
        audience="externo",
        permissions=[
            "consultar_estado_general",
            "visualizar_estadisticas_publicas",
            "recibir_recomendaciones_de_uso",
        ],
        sensitive_access=False,
        allowed_domains=[
            "estado_servicio",
            "frecuencia_cabinas",
            "recomendaciones_seguridad",
        ],
    ),
    "operador": RoleInfo(
        name="operador",
        description=(
            "Personal operativo encargado de monitorear la operación diaria del "
            "sistema y responder a incidencias."
        ),
        audience="interno",
        permissions=[
            "consultar_metricas_operativas",
            "visualizar_alertas",
            "generar_reportes_operativos",
        ],
        sensitive_access=True,
        allowed_domains=[
            "telemetria",
            "estado_cabinas",
            "incidentes",
            "ordenes_trabajo",
        ],
    ),
    "analista": RoleInfo(
        name="analista",
        description=(
            "Equipo técnico que realiza análisis avanzados y trabaja con modelos "
            "predictivos y tendencias históricas."
        ),
        audience="interno",
        permissions=[
            "ejecutar_consultas_avanzadas",
            "analizar_tendencias",
            "utilizar_modelos_predictivos",
        ],
        sensitive_access=True,
        allowed_domains=[
            "telemetria",
            "predicciones",
            "analisis_historico",
            "rendimiento_modelos",
        ],
    ),
    "administrador": RoleInfo(
        name="administrador",
        description=(
            "Responsable de la gobernanza del sistema, configuración y auditoría "
            "de accesos."
        ),
        audience="interno",
        permissions=[
            "administrar_configuracion",
            "auditar_accesos",
            "gestionar_roles",
        ],
        sensitive_access=True,
        allowed_domains=[
            "configuracion",
            "auditoria",
            "seguridad",
        ],
    ),
}


def list_roles() -> List[RoleInfo]:
    """Devuelve la lista inmutable de roles configurados."""

    return list(_ROLE_CATALOG.values())


def get_role_info(role: str) -> Optional[RoleInfo]:
    """
    Devuelve la información aprobada para un rol.

    Se normaliza el nombre para reducir errores de entrada. Si no existe el rol,
    retorna `None` y permite que la capa de servicio gestione el fallback.
    """

    if not role:
        return None
    normalized = role.strip().lower()
    return _ROLE_CATALOG.get(normalized)


def role_allows_sensitive_access(role: str) -> bool:
    """
    Indica si el rol tiene acceso a dominios sensibles.

    Útil para decisiones rápidas sin exponer el catálogo completo.
    """

    info = get_role_info(role)
    return bool(info and info.sensitive_access)


def is_domain_allowed(role: str, domain: str) -> bool:
    """
    Valida si un dominio funcional está autorizado para el rol.

    Permite centralizar el control de acceso de alto nivel antes de construir
    la consulta SQL o invocar el LLM.
    """

    info = get_role_info(role)
    if not info or not domain:
        return False
    normalized_domain = domain.strip().lower()
    return normalized_domain in (dom.lower() for dom in info.allowed_domains)

