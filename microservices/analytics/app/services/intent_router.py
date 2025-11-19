"""
Router de intents basado en embeddings/carácter semántico.

Permite responder rápidamente preguntas frecuentes sin pasar por el flujo
completo del LLM, reduciendo latencia y carga. El catálogo se carga desde un
archivo JSON controlado para mantener la trazabilidad (ISO 9001) y la
protección de datos (ISO/IEC 27001).
"""

from __future__ import annotations

import json
import math
import os
from collections import Counter, OrderedDict
from dataclasses import dataclass, field
from pathlib import Path
from typing import Iterable, List, Optional, Sequence, Tuple, Union

import numpy as np

from ..core.config import settings
from ..core.role_catalog import RoleInfo


@dataclass(frozen=True)
class IntentEntry:
    """Representa una entrada del catálogo de intents."""

    id: str
    audience: str
    category: str
    primary_question: str
    patterns: List[str]
    response_type: str
    answer: Optional[str] = None
    sql: Optional[str] = None
    answer_template: Optional[str] = None
    query_type: str = "informational"

    def combined_text(self) -> str:
        parts = [self.primary_question] + self.patterns
        return " ".join(p for p in parts if p)


@dataclass
class IntentMatch:
    """Resultado de una coincidencia."""

    entry: IntentEntry
    confidence: float


class LRUCache:
    """Cache simple LRU para almacenar coincidencias previas."""

    def __init__(self, capacity: int):
        self.capacity = max(1, capacity)
        self._store: OrderedDict[str, IntentMatch] = OrderedDict()

    def get(self, key: str) -> Optional[IntentMatch]:
        if key not in self._store:
            return None
        value = self._store.pop(key)
        self._store[key] = value
        return value

    def put(self, key: str, value: IntentMatch) -> None:
        if key in self._store:
            self._store.pop(key)
        elif len(self._store) >= self.capacity:
            self._store.popitem(last=False)
        self._store[key] = value


class IntentRouter:
    """
    Realiza matching semántico entre preguntas entrantes y FAQs conocidas.
    """

    def __init__(
        self,
        role_info: Optional[RoleInfo],
        threshold: Optional[float] = None,
        cache_size: Optional[int] = None,
    ):
        self.role_info = role_info
        self.threshold = threshold if threshold is not None else settings.CHATBOT_INTENT_THRESHOLD
        self.cache = LRUCache(cache_size or settings.CHATBOT_INTENT_CACHE_SIZE)
        self.catalog = self._load_catalog(role_info)

        self._embedder = self._create_embedder()
        self._use_bow = self._embedder is None

        self._catalog_vectors = self._compute_catalog_vectors()

    def match(self, question: str) -> Optional[IntentMatch]:
        if not question:
            return None

        key = question.strip().lower()
        cached = self.cache.get(key)
        if cached:
            return cached

        vector = self._embed_text(question)
        if vector is None:
            return None

        best_score = -1.0
        best_entry: Optional[IntentEntry] = None

        for entry, entry_vector in zip(self.catalog, self._catalog_vectors):
            score = self._similarity(vector, entry_vector)
            if score > best_score:
                best_score = score
                best_entry = entry

        if best_entry and best_score >= self.threshold:
            match = IntentMatch(entry=best_entry, confidence=best_score)
            self.cache.put(key, match)
            return match

        return None

    # --------------------------------------------------------------------- #
    # Carga y preparación del catálogo
    # --------------------------------------------------------------------- #

    def _load_catalog(self, role_info: Optional[RoleInfo]) -> List[IntentEntry]:
        catalog_path = Path(__file__).resolve().parent.parent / "data" / "faq_catalog.json"
        if not catalog_path.exists():
            return []

        with catalog_path.open("r", encoding="utf-8") as fh:
            raw_entries = json.load(fh)

        def allowed(audience: str) -> bool:
            audience = (audience or "any").lower()
            if audience in {"any", "general"}:
                return True
            if audience == "citizen":
                return True
            if audience == "staff":
                return bool(role_info and role_info.sensitive_access)
            return False

        entries: List[IntentEntry] = []
        for raw in raw_entries:
            if not allowed(raw.get("audience", "any")):
                continue
            entry = IntentEntry(
                id=raw["id"],
                audience=raw.get("audience", "any"),
                category=raw.get("category", "informational"),
                primary_question=raw.get("primary_question", ""),
                patterns=raw.get("patterns", []),
                response_type=raw.get("response_type", "static"),
                answer=raw.get("answer"),
                sql=raw.get("sql"),
                answer_template=raw.get("answer_template"),
                query_type=raw.get("query_type", "informational"),
            )
            entries.append(entry)

        return entries

    def _create_embedder(self):
        try:
            from langchain_community.embeddings import OllamaEmbeddings

            return OllamaEmbeddings(
                model=settings.CHATBOT_INTENT_EMBED_MODEL,
                base_url=settings.OLLAMA_BASE_URL,
            )
        except Exception:
            return None

    def _compute_catalog_vectors(self) -> List[Union[np.ndarray, Counter]]:
        vectors: List[Union[np.ndarray, Counter]] = []
        for entry in self.catalog:
            vector = self._embed_text(entry.combined_text())
            if vector is None:
                vector = self._bag_of_words(entry.combined_text())
            vectors.append(vector)
        return vectors

    # --------------------------------------------------------------------- #
    # Embeddings y similitud
    # --------------------------------------------------------------------- #

    def _embed_text(self, text: str) -> Optional[Union[np.ndarray, Counter]]:
        normalized = (text or "").strip()
        if not normalized:
            return None

        if self._embedder:
            try:
                return np.array(self._embedder.embed_query(normalized), dtype=float)
            except Exception:
                pass

        return self._bag_of_words(normalized)

    @staticmethod
    def _bag_of_words(text: str) -> Counter:
        tokens = [token for token in "".join(
            ch.lower() if ch.isalnum() or ch.isspace() else " "
            for ch in text
        ).split() if token]
        return Counter(tokens)

    def _similarity(
        self,
        vector_a: Union[np.ndarray, Counter],
        vector_b: Union[np.ndarray, Counter],
    ) -> float:
        if isinstance(vector_a, np.ndarray) and isinstance(vector_b, np.ndarray):
            if not vector_a.any() or not vector_b.any():
                return 0.0
            denom = (np.linalg.norm(vector_a) * np.linalg.norm(vector_b))
            if denom == 0:
                return 0.0
            return float(np.dot(vector_a, vector_b) / denom)

        # Fallback BoW cosine similarity
        return self._bow_cosine(vector_a, vector_b)

    @staticmethod
    def _bow_cosine(vec_a: Counter, vec_b: Counter) -> float:
        if not vec_a or not vec_b:
            return 0.0
        intersection = set(vec_a.keys()) & set(vec_b.keys())
        dot_product = sum(vec_a[token] * vec_b[token] for token in intersection)
        norm_a = math.sqrt(sum(value * value for value in vec_a.values()))
        norm_b = math.sqrt(sum(value * value for value in vec_b.values()))
        if norm_a == 0 or norm_b == 0:
            return 0.0
        return dot_product / (norm_a * norm_b)

