#!/usr/bin/env python3
"""
Herramientas de verificación para la simulación de telemetría.

Permite:
1. Auditar el intervalo de generación (~5 s) en `telemetria_cruda`.
2. Confirmar que la ventana simulada cubre un día (min/max/total de muestras).
3. Comparar estadísticos básicos entre datos originales y simulados.
4. Validar que el pipeline `telemetria_cruda -> mediciones` no pierda registros.

Uso rápido:
    python tools/verify_simulation.py interval --sensor-id 101 --start 2024-05-01 --hours 2
    python tools/verify_simulation.py coverage --sensor-id 101 --date 2024-05-01
    python tools/verify_simulation.py stats --sensor-id 101 --baseline 2024-04-30,2024-05-01 --sim 2024-05-01,2024-05-02
    python tools/verify_simulation.py pipeline --sensor-id 101 --start 2024-05-01 --hours 1
"""

from __future__ import annotations

import argparse
import os
from dataclasses import dataclass
from datetime import datetime, timedelta
from statistics import mean, pstdev
import sys
from typing import Dict, Iterable, List, Optional, Tuple

from sqlalchemy import create_engine, text
from sqlalchemy.engine import Engine, Result


TIME_FMT = "%Y-%m-%dT%H:%M:%S"


def _build_db_url() -> str:
    for var in ("ANALYTICS_DATABASE_URL", "DATABASE_URL"):
        url = os.getenv(var)
        if url:
            return url

    user = os.getenv("DB_USER", "postgres")
    password = os.getenv("DB_PASSWORD", "postgres")
    host = os.getenv("DB_HOST", "127.0.0.1")
    port = os.getenv("DB_PORT", "5432")
    name = os.getenv("DB_NAME", "urbanflow_db")
    return f"postgresql+psycopg2://{user}:{password}@{host}:{port}/{name}"


def _parse_ts(value: str) -> datetime:
    try:
        return datetime.fromisoformat(value)
    except ValueError as exc:
        raise argparse.ArgumentTypeError(f"Timestamp inválido '{value}'. Use formato ISO 8601.") from exc


def _daterange_to_bounds(spec: str) -> Tuple[datetime, datetime]:
    try:
        start_str, end_str = [part.strip() for part in spec.split(",")]
    except ValueError as exc:
        raise argparse.ArgumentTypeError(
            "Intervalo inválido. Use 'YYYY-MM-DDTHH:MM:SS,YYYY-MM-DDTHH:MM:SS'"
        ) from exc
    start = _parse_ts(start_str)
    end = _parse_ts(end_str)
    if end <= start:
        raise argparse.ArgumentTypeError("El final debe ser mayor al inicio.")
    return start, end


def _fetch_series(
    engine: Engine, sensor_id: int, start: datetime, end: datetime
) -> List[Tuple[datetime, Dict[str, Optional[float]]]]:
    query = text(
        """
        SELECT timestamp,
               velocidad_kmh,
               alt,
               vibracion_x,
               vibracion_y,
               vibracion_z
        FROM telemetria_cruda
        WHERE sensor_id = :sensor_id
          AND timestamp BETWEEN :start_ts AND :end_ts
        ORDER BY timestamp ASC
        """
    )
    with engine.connect() as conn:
        rows = conn.execute(
            query, {"sensor_id": sensor_id, "start_ts": start, "end_ts": end}
        ).fetchall()
    series = []
    for row in rows:
        series.append(
            (
                row.timestamp,
                {
                    "velocidad_kmh": float(row.velocidad_kmh)
                    if row.velocidad_kmh is not None
                    else None,
                    "altitud": float(row.alt) if row.alt is not None else None,
                    "vibracion_x": float(row.vibracion_x)
                    if row.vibracion_x is not None
                    else None,
                    "vibracion_y": float(row.vibracion_y)
                    if row.vibracion_y is not None
                    else None,
                    "vibracion_z": float(row.vibracion_z)
                    if row.vibracion_z is not None
                    else None,
                },
            )
        )
    return series


def _stats_for_columns(
    engine: Engine, sensor_id: int, start: datetime, end: datetime
) -> Dict[str, Dict[str, Optional[float]]]:
    query = text(
        """
        SELECT
            AVG(velocidad_kmh) AS velocidad_avg,
            MIN(velocidad_kmh) AS velocidad_min,
            MAX(velocidad_kmh) AS velocidad_max,
            STDDEV_POP(velocidad_kmh) AS velocidad_std,
            AVG(alt) AS alt_avg,
            MIN(alt) AS alt_min,
            MAX(alt) AS alt_max,
            STDDEV_POP(alt) AS alt_std,
            AVG(vibracion_x) AS vibx_avg,
            STDDEV_POP(vibracion_x) AS vibx_std,
            AVG(vibracion_y) AS viby_avg,
            STDDEV_POP(vibracion_y) AS viby_std,
            AVG(vibracion_z) AS vibz_avg,
            STDDEV_POP(vibracion_z) AS vibz_std
        FROM telemetria_cruda
        WHERE sensor_id = :sensor_id
          AND timestamp BETWEEN :start_ts AND :end_ts
        """
    )
    with engine.connect() as conn:
        result = conn.execute(
            query, {"sensor_id": sensor_id, "start_ts": start, "end_ts": end}
        ).mappings().first()
    if result is None:
        return {}

    def _build(prefix: str) -> Dict[str, Optional[float]]:
        return {
            "avg": float(result[f"{prefix}_avg"]) if result[f"{prefix}_avg"] is not None else None,
            "min": float(result.get(f"{prefix}_min")) if result.get(f"{prefix}_min") is not None else None,
            "max": float(result.get(f"{prefix}_max")) if result.get(f"{prefix}_max") is not None else None,
            "std": float(result.get(f"{prefix}_std")) if result.get(f"{prefix}_std") is not None else None,
        }

    return {
        "velocidad_kmh": _build("velocidad"),
        "altitud": _build("alt"),
        "vibracion_x": _build("vibx"),
        "vibracion_y": _build("viby"),
        "vibracion_z": _build("vibz"),
    }


def _count_table(
    engine: Engine, table: str, sensor_id: int, start: datetime, end: datetime
) -> int:
    query = text(
        f"""
        SELECT COUNT(*) AS total
        FROM {table}
        WHERE sensor_id = :sensor_id
          AND timestamp BETWEEN :start_ts AND :end_ts
        """
    )
    with engine.connect() as conn:
        row = conn.execute(
            query, {"sensor_id": sensor_id, "start_ts": start, "end_ts": end}
        ).first()
    return int(row.total) if row and row.total is not None else 0


def command_interval(args: argparse.Namespace, engine: Engine) -> bool:
    end = args.start + timedelta(hours=args.hours)
    series = _fetch_series(engine, args.sensor_id, args.start, end)
    if len(series) < 2:
        print("⚠️  No hay suficientes datos para calcular diferencias de tiempo.")
        return False

    deltas = [
        (series[i + 1][0] - series[i][0]).total_seconds()
        for i in range(len(series) - 1)
    ]
    target = 5.0
    lower = target - args.interval_tolerance
    upper = target + args.interval_tolerance
    within = [delta for delta in deltas if lower <= delta <= upper]
    avg_delta = mean(deltas)
    std_delta = pstdev(deltas) if len(deltas) > 1 else 0.0
    percent = len(within) / len(deltas) * 100
    success = (
        percent >= args.min_success_rate
        and abs(avg_delta - target) <= args.interval_tolerance
    )
    status = "✅ OK" if success else "❌ FAIL"
    print("📈 Verificación de intervalo (≈5 s)")
    print(
        f"{status} | media={avg_delta:.2f}s std={std_delta:.2f}s "
        f"%rango={percent:.2f}% objetivo≥{args.min_success_rate}% "
        f"tolerancia±{args.interval_tolerance:.2f}s"
    )
    print(f"- Registros analizados: {len(series)}")
    print(f"- Diferencias calculadas: {len(deltas)}")
    print(f"- Rango permitido: {lower:.2f}s – {upper:.2f}s")
    print(f"- Máximo Δt: {max(deltas):.2f}s | Mínimo Δt: {min(deltas):.2f}s")
    if not success:
        print("⚠️  Ajuste los parámetros del simulador o revise la ingestión.")
    return success


def command_coverage(args: argparse.Namespace, engine: Engine) -> bool:
    start = datetime.combine(args.date, datetime.min.time())
    end = start + timedelta(days=1)
    series = _fetch_series(engine, args.sensor_id, start, end)
    if not series:
        print("⚠️  No se encontraron datos para la fecha indicada.")
        return False

    min_ts = series[0][0]
    max_ts = series[-1][0]
    duration = (max_ts - min_ts).total_seconds()
    expected = duration / args.interval if args.interval > 0 else 0
    if expected <= 0:
        print("⚠️  Duración insuficiente para estimar cobertura.")
        return False
    ratio = len(series) / expected
    success = ratio >= args.min_coverage
    status = "✅ OK" if success else "❌ FAIL"
    print("🕒 Cobertura diaria de simulación")
    print(
        f"{status} | muestras={len(series)} esperadas≈{expected:.0f} "
        f"ratio={ratio*100:.2f}% objetivo≥{args.min_coverage*100:.1f}%"
    )
    print(f"- Primer timestamp: {min_ts.isoformat()}")
    print(f"- Último timestamp: {max_ts.isoformat()}")
    print(f"- Duración total: {duration/3600:.2f} h")
    print(f"- Diferencia: {len(series) - expected:.0f}")
    if not success:
        print("⚠️  La simulación no cubre el intervalo completo (día o ventana).")
    return success


def command_stats(args: argparse.Namespace, engine: Engine) -> bool:
    base_start, base_end = _daterange_to_bounds(args.baseline)
    sim_start, sim_end = _daterange_to_bounds(args.sim)

    baseline = _stats_for_columns(engine, args.sensor_id, base_start, base_end)
    simulated = _stats_for_columns(engine, args.sensor_id, sim_start, sim_end)

    if not baseline or not simulated:
        print("⚠️  No hay suficientes datos en alguna ventana para comparar.")
        return False

    tolerance = args.tolerance_percent
    breaches = []

    def _percent_diff(reference: Optional[float], value: Optional[float]) -> Optional[float]:
        if reference is None or value is None or reference == 0:
            return None
        return abs(value - reference) / abs(reference) * 100

    print("📊 Comparación de estadísticos (original vs simulado)")
    for key in ("velocidad_kmh", "altitud", "vibracion_x", "vibracion_y", "vibracion_z"):
        base_stats = baseline.get(key)
        sim_stats = simulated.get(key)
        print(f"- {key}:")
        if not base_stats or not sim_stats:
            print("    Datos insuficientes en una de las ventanas.")
            continue
        print(
            f"    Original  avg={base_stats['avg']:.2f} min={base_stats['min']:.2f} "
            f"max={base_stats['max']:.2f} std={base_stats['std']:.2f}"
        )
        print(
            f"    Simulado avg={sim_stats['avg']:.2f} min={sim_stats['min']:.2f} "
            f"max={sim_stats['max']:.2f} std={sim_stats['std']:.2f}"
        )
        for metric in ("avg", "std"):
            diff = _percent_diff(base_stats.get(metric), sim_stats.get(metric))
            if diff is not None:
                print(f"      Δ{metric}={diff:.2f}% (tolerancia {tolerance:.1f}%)")
                if diff > tolerance:
                    breaches.append((key, metric, diff))

    success = not breaches
    status = "✅ OK" if success else "❌ FAIL"
    print(f"{status} | tolerancia global ±{tolerance:.1f}%")
    if not success:
        for key, metric, diff in breaches:
            print(f"⚠️  {key}.{metric} excede tolerancia con {diff:.2f}%")
        print("Revise el dataset base o ajuste los parámetros del simulador.")
    return success


def command_pipeline(args: argparse.Namespace, engine: Engine) -> bool:
    end = args.start + timedelta(hours=args.hours)
    tele_count = _count_table(engine, "telemetria_cruda", args.sensor_id, args.start, end)
    med_count = _count_table(engine, "mediciones", args.sensor_id, args.start, end)
    diff = med_count - tele_count
    print("🔗 Verificación pipeline telemetria_cruda → mediciones")
    print(f"- Ventana: {args.start.isoformat()} → {end.isoformat()}")
    print(f"- telemetria_cruda: {tele_count} filas")
    print(f"- mediciones: {med_count} filas")
    if tele_count == 0:
        print("⚠️  Sin datos de entrada en la ventana indicada.")
        return False
    ratio = med_count / tele_count * 100
    success = abs(diff) <= args.tolerance
    status = "✅ OK" if success else "❌ FAIL"
    print(f"{status} | cobertura={ratio:.2f}% diff={diff} tolerancia±{args.tolerance}")
    if not success:
        print(
            "⚠️  Diferencia detectada. "
            "Revise el procesamiento o ajuste la ventana para detectar lags."
        )
    return success


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Verificador de simulación de telemetría.")
    parser.add_argument(
        "--db-url",
        dest="db_url",
        default=_build_db_url(),
        help="URL de conexión SQLAlchemy. Por defecto usa las variables del proyecto.",
    )

    subparsers = parser.add_subparsers(dest="command", required=True)

    interval = subparsers.add_parser("interval", help="Verifica el intervalo de 5 segundos.")
    interval.add_argument("--sensor-id", type=int, required=True)
    interval.add_argument("--start", type=_parse_ts, required=True, help="Inicio ISO-8601.")
    interval.add_argument("--hours", type=float, default=1.0, help="Horas a analizar (default 1).")
    interval.add_argument(
        "--interval-tolerance",
        type=float,
        default=0.7,
        help="Desviación aceptable respecto a 5 s (default ±0.7 s).",
    )
    interval.add_argument(
        "--min-success-rate",
        type=float,
        default=90.0,
        help="Porcentaje mínimo de intervalos dentro de la tolerancia (default 90%).",
    )
    interval.set_defaults(func=command_interval)

    coverage = subparsers.add_parser("coverage", help="Verifica cobertura de un día completo.")
    coverage.add_argument("--sensor-id", type=int, required=True)
    coverage.add_argument("--date", type=lambda s: datetime.fromisoformat(s).date(), required=True)
    coverage.add_argument(
        "--interval",
        type=float,
        default=5.0,
        help="Intervalo esperado en segundos (default 5).",
    )
    coverage.add_argument(
        "--min-coverage",
        type=float,
        default=0.95,
        help="Cobertura mínima aceptable expresada como proporción (default 0.95 = 95%).",
    )
    coverage.set_defaults(func=command_coverage)

    stats_cmd = subparsers.add_parser("stats", help="Compara estadísticos básicos.")
    stats_cmd.add_argument("--sensor-id", type=int, required=True)
    stats_cmd.add_argument(
        "--baseline",
        required=True,
        help="Ventana original 'inicioISO,finISO'.",
    )
    stats_cmd.add_argument(
        "--sim",
        required=True,
        help="Ventana simulada 'inicioISO,finISO'.",
    )
    stats_cmd.add_argument(
        "--tolerance-percent",
        type=float,
        default=15.0,
        help="Diferencia porcentual máxima aceptable (default 15%).",
    )
    stats_cmd.set_defaults(func=command_stats)

    pipeline = subparsers.add_parser("pipeline", help="Verifica conteos telemetria→mediciones.")
    pipeline.add_argument("--sensor-id", type=int, required=True)
    pipeline.add_argument("--start", type=_parse_ts, required=True)
    pipeline.add_argument("--hours", type=float, default=1.0)
    pipeline.add_argument(
        "--tolerance",
        type=float,
        default=5.0,
        help="Diferencia permitida en número de registros.",
    )
    pipeline.set_defaults(func=command_pipeline)

    return parser


def main() -> None:
    parser = build_parser()
    args = parser.parse_args()
    engine = create_engine(args.db_url, future=True)
    success = args.func(args, engine)
    sys.exit(0 if success else 1)


if __name__ == "__main__":
    main()

