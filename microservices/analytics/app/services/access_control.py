"""
Módulo de control de acceso para el chatbot de UrbanFlow.

Centraliza verificaciones previas a la generación/ejecución de consultas para
cumplir con las políticas de protección de datos y los principios ISO de
calidad, seguridad y gobernanza.
"""

from __future__ import annotations

import re
from typing import Iterable, Optional, Set, Tuple

from ..core.config import settings
from ..core import role_catalog

# Palabras clave sensibles prohibidas para TODOS los roles
GLOBAL_SENSITIVE_KEYWORDS = {
    "contraseña",
    "password",
    "correo",
    "email",
    "usuario",
    "usuarios",
    "ip",
    "dirección ip",
    "user agent",
    "auditoría",
    "auditoria",
    "audit",
    "token",
    "credencial",
    "credential",
}

# Palabras clave adicionales restringidas para ciudadanos (evitar info técnica)
CITIZEN_RESTRICTED_KEYWORDS = {
    "telemetría",
    "telemetria",
    "rms",
    "kurtosis",
    "skewness",
    "predicciones",
    "sql",
    "consulta",
    "query",
    "sensor",
    "modelo",
    "cabina específica",
    "cabina especifica",
    "detalle técnico",
    "detalles técnicos",
    "incidente",
    "alerta crítica",
}

# Tablas cuyo acceso queda prohibido globalmente
GLOBAL_SENSITIVE_TABLES: Set[str] = {
    "usuarios",
    "user_roles",
    "rol_usuario",
    "audit_log",
    "auditoria",
    "roles",
    "api_keys",
}

# Tablas accesibles para ciudadanos (lista blanca)
CITIZEN_ALLOWED_TABLES: Set[str] = {
    "cabina_estado_hist",
    "cabinas",
    "lineas",
    "estaciones",
    "tramos",
    "eventos_operativos",
}

# Sinónimos de roles recibidos desde el backend principal
ROLE_SYNONYMS = {
    "cliente": "ciudadano",
    "ciudadano": "ciudadano",
    "user": "ciudadano",
    "visitor": "ciudadano",
    "admin": "administrador",
    "administrator": "administrador",
    "operator": "operador",
    "staff": "operador",
    "analyst": "analista",
}


class AccessControl:
    """
    Aplica reglas de acceso por rol para preguntas y consultas SQL generadas.
    """

    def __init__(self, primary_role: Optional[str], extra_roles: Optional[Iterable[str]] = None):
        normalized_primary = self._normalize_role(primary_role)
        normalized_extra = {self._normalize_role(r) for r in (extra_roles or []) if r}

        # Seleccionar el primer rol válido; fallback a ciudadano
        role = normalized_primary or next(iter(normalized_extra), None) or "ciudadano"
        self.role = role
        self.role_info = role_catalog.get_role_info(role) or role_catalog.get_role_info("ciudadano")

    @staticmethod
    def _normalize_role(role: Optional[str]) -> Optional[str]:
        if not role:
            return None
        lowered = role.strip().lower()
        return ROLE_SYNONYMS.get(lowered, lowered)

    def check_question(self, question: str) -> Tuple[bool, Optional[str]]:
        """
        Evalúa si la pregunta viola las políticas por rol.
        Devuelve (permitido, mensaje_de_denegación).
        """

        question_lower = (question or "").lower()

        if any(keyword in question_lower for keyword in GLOBAL_SENSITIVE_KEYWORDS):
            return False, (
                "Por razones de seguridad y protección de datos, no puedo acceder ni "
                "mostrar información de usuarios, credenciales o auditorías."
            )

        if self.role_info and self.role_info.name == "ciudadano":
            if any(keyword in question_lower for keyword in CITIZEN_RESTRICTED_KEYWORDS):
                return False, (
                    "La información solicitada pertenece a datos técnicos reservados. "
                    "Como ciudadano puedes consultar solo el estado general del servicio "
                    "y recomendaciones públicas."
                )

        return True, None

    def check_sql(self, sql_query: str) -> Tuple[bool, Optional[str]]:
        """
        Evalúa si la consulta SQL resultante respeta los límites del rol.
        """

        if not sql_query:
            return False, "No se generó una consulta SQL válida para ejecutar."

        tables = self._extract_tables(sql_query)

        for table in tables:
            if table in GLOBAL_SENSITIVE_TABLES:
                return False, (
                    "El acceso a información sensible de usuarios y auditorías está restringido "
                    "para el chatbot. Por favor solicita datos operativos o de servicio."
                )

        if self.role_info and self.role_info.name == "ciudadano":
            for table in tables:
                if table not in CITIZEN_ALLOWED_TABLES:
                    return False, (
                        "Esa información está reservada para personal autorizado. "
                        "Como ciudadano puedo informarte sobre el estado general del teleférico "
                        "y recomendaciones públicas."
                    )

        return True, None

    def should_use_role_catalog(self, question: str) -> bool:
        """
        Determina si la pregunta debe resolverse usando el catálogo estático de roles.
        """

        lowered = (question or "").lower()
        role_keywords = {
            "rol",
            "roles",
            "perfil",
            "perfiles",
            "qué roles",
            "que roles",
            "quienes pueden",
            "quién puede",
            "permisos",
            "autorizaciones",
        }
        return any(keyword in lowered for keyword in role_keywords)

    @staticmethod
    def _extract_tables(sql_query: str) -> Set[str]:
        """
        Extrae nombres de tablas de una consulta SQL simple (SELECT).
        Se analiza FROM y JOIN. Se consideran alias y nombres con esquema.
        """

        matches = re.findall(r"(?:from|join)\s+([a-zA-Z_][\w.]*)", sql_query, flags=re.IGNORECASE)
        tables: Set[str] = set()
        for match in matches:
            table = match.split(".")[-1]  # Quitar esquema si viene como public.tabla
            tables.add(table.lower())
        return tables

    def redact_response_for_citizen(self, response: str) -> str:
        """
        Simplifica respuestas técnicas si el rol es ciudadano.
        """

        if not response or not self.role_info or self.role_info.name != "ciudadano":
            return response

        return (
            "Resumen para la ciudadanía:\n\n"
            "• El servicio opera con normalidad salvo avisos indicados.\n"
            "• Ante cualquier incidencia, sigue las recomendaciones oficiales.\n"
            "• Para detalles técnicos, el personal autorizado puede consultar paneles internos."
        )

