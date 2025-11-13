"""
Simulador de telemetría para UrbanFlow.

Se encapsula en un archivo nuevo para mantener aislada la lógica de ejecución
asíncrona del simulador y evitar mezclarla con los servicios síncronos ya
existentes.
"""

from __future__ import annotations

import asyncio
import logging
from dataclasses import dataclass
from datetime import datetime
from threading import Lock
from typing import Dict, List, Optional, Sequence
import math

from sqlalchemy import select
from sqlalchemy.exc import SQLAlchemyError

from ..db import models as m
from ..db.session import SessionLocal
from .telemetry_processor import TelemetryProcessor

logger = logging.getLogger("telemetry_simulator")


@dataclass(slots=True)
class TelemetryRecord:
    """Representa una fila de telemetría cruda ya ordenada y normalizada."""

    telemetria_id: int
    sensor_id: int
    timestamp: datetime
    numero_cabina: Optional[int]
    codigo_cabina: Optional[str]
    lat: Optional[float]
    lon: Optional[float]
    alt: Optional[float]
    velocidad_kmh: Optional[float]
    aceleracion_m_s2: Optional[float]
    temperatura_c: Optional[float]
    vibracion_x: Optional[float]
    vibracion_y: Optional[float]
    vibracion_z: Optional[float]
    direccion: Optional[str]
    pos_m: Optional[float]


class TelemetrySimulator:
    """Ejecutor en segundo plano que reproduce telemetría desde telemetria_cruda."""

    def __init__(
        self,
        interval_seconds: float = 5.0,
        slice_size: int = 1,
        session_factory=SessionLocal,
        processor_cls=TelemetryProcessor,
    ) -> None:
        self._interval = interval_seconds
        self._slice_size = max(1, slice_size)
        self._session_factory = session_factory
        self._processor_cls = processor_cls

        self._records: List[TelemetryRecord] = []
        self._current_index: int = 0
        self._cycle: int = 0
        self._processed_count: int = 0

        self._distances: Dict[int, float] = {}
        self._previous_rows: Dict[int, TelemetryRecord] = {}

        self._running: bool = False
        self._started: bool = False
        self._task: Optional[asyncio.Task] = None
        self._lock: Lock = Lock()

    def start(self) -> None:
        """Inicia el simulador sin bloquear el loop de eventos."""
        if self._task and not self._task.done():
            return

        loop = asyncio.get_running_loop()
        self._task = loop.create_task(self._bootstrap(), name="telemetry-simulator")

    async def _bootstrap(self) -> None:
        """Carga registros y lanza el loop principal en background."""
        await asyncio.to_thread(self._load_records)

        if not self._records:
            logger.warning("Simulador no iniciado: telemetria_cruda está vacía.")
            return

        self._running = True
        self._started = True
        logger.info(
            "Simulador de telemetría iniciado (registros=%s, intervalo=%ss, slice=%s)",
            len(self._records),
            self._interval,
            self._slice_size,
        )

        try:
            await self._run_loop()
        except asyncio.CancelledError:
            logger.info("Tarea del simulador cancelada.")
            raise
        finally:
            self._running = False
            logger.info("Simulador de telemetría finalizado.")

    async def stop(self) -> None:
        """Detiene el simulador y espera a que finalice."""
        if not self._task:
            return

        self._running = False
        self._task.cancel()
        try:
            await self._task
        except asyncio.CancelledError:
            pass
        finally:
            self._task = None

    def status(self) -> Dict[str, object]:
        """Datos de diagnóstico para endpoints o logs."""
        with self._lock:
            return {
                "enabled": bool(self._records),
                "running": self._running,
                "interval_seconds": self._interval,
                "slice_size": self._slice_size,
                "total_records": len(self._records),
                "current_index": self._current_index,
                "current_cycle": self._cycle,
                "cycles": self._cycle,
                "processed_measurements": self._processed_count,
                "generated_measurements": self._processed_count,
                "started": self._started,
            }

    async def _run_loop(self) -> None:
        """Bucle principal del simulador."""
        try:
            while self._running:
                await self._process_next_slice()
                await asyncio.sleep(self._interval)
        except Exception:
            logger.exception("Fallo inesperado en el simulador de telemetría.")

    async def _process_next_slice(self) -> None:
        """Procesa el siguiente bloque de telemetría simulada."""
        slice_records = await asyncio.to_thread(self._get_next_records)
        if not slice_records:
            return

        inserted = 0
        session = None
        try:
            session = self._session_factory()
            processor = self._processor_cls(session)

            for record in slice_records:
                sensor_id = record.sensor_id
                prev_row = self._previous_rows.get(sensor_id)
                distancia_actual = self._distances.get(sensor_id, 0.0)

                metrics = processor.build_metrics_for_row(
                    record,
                    previous_row=prev_row,
                    distancia_acumulada=distancia_actual,
                )
                if not metrics:
                    continue

                nueva_distancia = metrics.get(
                    "distancia_acumulada_m", distancia_actual
                )
                metrics["timestamp"] = datetime.utcnow()

                self._validate_metrics(record, metrics)
                measurement = processor.build_measurement_model(metrics)
                if not measurement:
                    continue

                session.add(measurement)
                self._distances[sensor_id] = nueva_distancia
                self._previous_rows[sensor_id] = record
                inserted += 1

            session.commit()

        except SQLAlchemyError:
            logger.exception("Error al escribir mediciones simuladas; se revierte.")
            if session is not None:
                session.rollback()
        except Exception:
            logger.exception("Error inesperado durante la simulación.")
            if session is not None:
                session.rollback()
        finally:
            if session is not None:
                session.close()

        if inserted:
            with self._lock:
                self._processed_count += inserted
            logger.info(
                "Simulador: procesado lote (%s registros, ciclo=%s, índice=%s)",
                inserted,
                self._cycle,
                self._current_index,
            )

    # ------------------------------------------------------------------
    # Helpers internos
    # ------------------------------------------------------------------
    def _load_records(self) -> None:
        """
        Carga todas las filas de telemetria_cruda respetando un orden determinista:
        primero por sensor/cabina y luego ascendente por timestamp y telemetria_id.
        """
        with self._lock:
            self._records.clear()
            self._current_index = 0
            self._cycle = 0
            self._processed_count = 0
            self._distances.clear()
            self._previous_rows.clear()

        with self._session_factory() as session:
            stmt = (
                select(m.TelemetriaCruda)
                .order_by(
                    m.TelemetriaCruda.sensor_id,
                    m.TelemetriaCruda.numero_cabina,
                    m.TelemetriaCruda.codigo_cabina,
                    m.TelemetriaCruda.timestamp,
                    m.TelemetriaCruda.telemetria_id,
                )
            )
            rows: Sequence[m.TelemetriaCruda] = session.execute(stmt).scalars().all()

        records = [self._to_record(row) for row in rows]

        with self._lock:
            self._records.extend(records)

    def _get_next_records(self) -> List[TelemetryRecord]:
        """
        Obtiene el siguiente lote de filas.
        Selecciona como máximo `slice_size` registros que pertenezcan al mismo timestamp
        para simular lecturas concurrentes de distintas cabinas en un instante.
        """
        with self._lock:
            if not self._records:
                return []

            records: List[TelemetryRecord] = []
            target_ts = self._records[self._current_index].timestamp
            initial_index = self._current_index
            total = len(self._records)

            while True:
                current = self._records[self._current_index]
                if current.timestamp != target_ts and records:
                    break

                records.append(current)
                self._advance_index(total)

                if (
                    len(records) >= self._slice_size
                    or self._current_index == initial_index
                ):
                    break

            return records

    def _advance_index(self, total: int) -> None:
        """Avanza el índice y detecta reinicio de ciclo."""
        self._current_index += 1
        if self._current_index >= total:
            self._current_index = 0
            self._cycle += 1
            self._distances.clear()
            self._previous_rows.clear()
            logger.info("Simulador: fin de datos alcanzado, se reinicia el ciclo.")

    @staticmethod
    def _to_record(row: m.TelemetriaCruda) -> TelemetryRecord:
        """Convierte un modelo ORM en estructura ligera con floats."""
        def cast(value: Optional[object]) -> Optional[float]:
            return float(value) if value is not None else None

        return TelemetryRecord(
            telemetria_id=row.telemetria_id,
            sensor_id=row.sensor_id,
            timestamp=row.timestamp,
            numero_cabina=row.numero_cabina,
            codigo_cabina=row.codigo_cabina,
            lat=cast(row.lat),
            lon=cast(row.lon),
            alt=cast(row.alt),
            velocidad_kmh=cast(row.velocidad_kmh),
            aceleracion_m_s2=cast(row.aceleracion_m_s2),
            temperatura_c=cast(row.temperatura_c),
            vibracion_x=cast(row.vibracion_x),
            vibracion_y=cast(row.vibracion_y),
            vibracion_z=cast(row.vibracion_z),
            direccion=row.direccion,
            pos_m=cast(row.pos_m),
        )

    def _validate_metrics(self, record: TelemetryRecord, metrics: Dict[str, float]) -> None:
        """
        Verifica y ajusta métricas simuladas para evitar valores atípicos
        respecto a los datos crudos originales.
        """
        expected_velocity = (record.velocidad_kmh or 0.0) / 3.6
        if metrics.get("velocidad") is not None and expected_velocity:
            if abs(metrics["velocidad"] - expected_velocity) > 1.5:
                logger.debug(
                    "Ajuste velocidad: %.2f -> %.2f (sensor=%s)",
                    metrics["velocidad"],
                    expected_velocity,
                    record.sensor_id,
                )
                metrics["velocidad"] = expected_velocity

        vib_components = [
            record.vibracion_x or 0.0,
            record.vibracion_y or 0.0,
            record.vibracion_z or 0.0,
        ]
        expected_rms = math.sqrt(sum(float(v) ** 2 for v in vib_components))
        tolerance_rms = max(0.3, expected_rms * 0.4)
        if metrics.get("rms") is not None:
            if abs(metrics["rms"] - expected_rms) > tolerance_rms:
                logger.debug(
                    "Ajuste RMS: %.3f -> %.3f (sensor=%s)",
                    metrics["rms"],
                    expected_rms,
                    record.sensor_id,
                )
                metrics["rms"] = expected_rms
                metrics["pico"] = max(metrics.get("pico") or 0.0, expected_rms)

        crest_factor = metrics.get("crest_factor")
        if crest_factor is not None:
            clamped = max(1.0, min(6.5, crest_factor))
            if crest_factor != clamped:
                logger.debug(
                    "Ajuste crest_factor: %.2f -> %.2f (sensor=%s)",
                    crest_factor,
                    clamped,
                    record.sensor_id,
                )
                metrics["crest_factor"] = clamped

        for key in ("kurtosis", "skewness"):
            value = metrics.get(key)
            if value is not None and not math.isfinite(value):
                metrics[key] = 0.0

        for band in ("energia_banda_1", "energia_banda_2", "energia_banda_3"):
            if metrics.get(band) is not None:
                metrics[band] = max(0.0, float(metrics[band]))

