"""
Pruebas de integración mínima para el pipeline telemetria_cruda → mediciones.

Se usa SQLite en memoria para evitar depender de PostgreSQL durante CI.
"""

from datetime import datetime, timedelta
from pathlib import Path
import sys

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

PROJECT_ROOT = Path(__file__).resolve().parents[1]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from app.db import models as m  # noqa: E402
from app.db.session import Base  # noqa: E402
from app.services.telemetry_processor import TelemetryProcessor  # noqa: E402


@pytest.fixture()
def sqlite_session() -> Session:
    engine = create_engine("sqlite:///:memory:", future=True)
    Base.metadata.create_all(engine)
    TestingSession = sessionmaker(bind=engine)
    session = TestingSession()
    try:
        # Datos mínimos de cabina / sensor necesarios por las FK.
        session.add(m.Cabina(cabina_id=1, codigo_interno="CB001", estado_actual="operativa"))
        session.add(m.Sensor(sensor_id=1, cabina_id=1))
        session.commit()
        yield session
    finally:
        session.close()


def _seed_telemetria(session: Session, count: int = 5) -> None:
    base_time = datetime(2024, 5, 1, 12, 0, 0)
    for i in range(count):
        session.add(
            m.TelemetriaCruda(
                telemetria_id=i + 1,
                sensor_id=1,
                timestamp=base_time + timedelta(seconds=5 * i),
                lat=4.5,
                lon=-74.1,
                alt=2600 + i,
                velocidad_kmh=20 + i,
                vibracion_x=0.1 + i * 0.01,
                vibracion_y=0.11,
                vibracion_z=0.12,
            )
        )
    session.commit()


def _patch_no_duplicate_filter(processor: TelemetryProcessor, session: Session) -> None:
    def _filter(batch_data):
        existing = {
            (row.sensor_id, row.timestamp)
            for row in session.query(m.Medicion.sensor_id, m.Medicion.timestamp)
        }
        filtered = []
        for data in batch_data:
            key = (data["sensor_id"], data["timestamp"])
            if key not in existing:
                filtered.append(data)
        return filtered

    processor._filter_duplicate_measurements = _filter  # type: ignore[attr-defined]


def test_process_new_telemetry_creates_measurements(sqlite_session: Session):
    _seed_telemetria(sqlite_session, count=6)
    processor = TelemetryProcessor(sqlite_session)
    _patch_no_duplicate_filter(processor, sqlite_session)

    result = processor.process_new_telemetry()

    assert result["status"] == "success"
    assert result["processed_count"] == 6
    total = sqlite_session.query(m.Medicion).count()
    assert total == 6


def test_reprocessing_skips_existing_measurements(sqlite_session: Session):
    _seed_telemetria(sqlite_session, count=4)
    processor = TelemetryProcessor(sqlite_session)
    _patch_no_duplicate_filter(processor, sqlite_session)

    # Primera corrida procesa todo.
    first = processor.process_new_telemetry()
    assert first["processed_count"] == 4

    # Segunda corrida no debe duplicar registros.
    second = processor.process_new_telemetry()
    assert second["processed_count"] == 0
    assert sqlite_session.query(m.Medicion).count() == 4

