from sqlalchemy import Column, Integer, BigInteger, String, DateTime, Numeric, ForeignKey, JSON, Boolean, Text
from sqlalchemy.orm import relationship
from .session import Base

class Cabina(Base):
    __tablename__ = "cabinas"
    cabina_id = Column(Integer, primary_key=True)
    codigo_interno = Column(String)
    estado_actual = Column(String)

class Sensor(Base):
    __tablename__ = "sensores"
    sensor_id = Column(Integer, primary_key=True)
    cabina_id = Column(Integer, unique=True, nullable=False)

class Medicion(Base):
    __tablename__ = "mediciones"
    medicion_id = Column(BigInteger, primary_key=True)
    sensor_id = Column(Integer, ForeignKey("sensores.sensor_id"), nullable=False)
    timestamp = Column("timestamp", DateTime, nullable=False)
    latitud = Column(Numeric)
    longitud = Column(Numeric)
    altitud = Column(Numeric)
    velocidad = Column(Numeric)
    rms = Column(Numeric)
    kurtosis = Column(Numeric)
    skewness = Column(Numeric)
    zcr = Column(Numeric)
    pico = Column(Numeric)
    crest_factor = Column(Numeric)
    frecuencia_media = Column(Numeric)
    frecuencia_dominante = Column(Numeric)
    amplitud_max_espectral = Column(Numeric)
    energia_banda_1 = Column(Numeric)
    energia_banda_2 = Column(Numeric)
    energia_banda_3 = Column(Numeric)
    estado_procesado = Column(String)

class ModeloML(Base):
    __tablename__ = "modelos_ml"
    modelo_id = Column(Integer, primary_key=True)
    nombre = Column(String, nullable=False)
    version = Column(String, nullable=False)
    framework = Column(String)
    fecha_entrenamiento = Column(DateTime)
    descripcion = Column(String)

class Prediccion(Base):
    __tablename__ = "predicciones"
    prediccion_id = Column(BigInteger, primary_key=True)
    medicion_id = Column(BigInteger, ForeignKey("mediciones.medicion_id"), nullable=False)
    modelo_id = Column(Integer, ForeignKey("modelos_ml.modelo_id"), nullable=False)
    clase_predicha = Column(String, nullable=False)
    probabilidades = Column(JSON)
    timestamp_prediccion = Column(DateTime)

# Modelos para telemetría cruda
class TelemetriaCruda(Base):
    __tablename__ = "telemetria_cruda"
    telemetria_id = Column(BigInteger, primary_key=True)
    sensor_id = Column(Integer, ForeignKey("sensores.sensor_id"), nullable=False)
    timestamp = Column(DateTime, nullable=False)
    numero_cabina = Column(Integer)
    codigo_cabina = Column(String)
    lat = Column(Numeric)
    lon = Column(Numeric)
    alt = Column(Numeric)
    velocidad_kmh = Column(Numeric)
    aceleracion_m_s2 = Column(Numeric)
    temperatura_c = Column(Numeric)
    vibracion_x = Column(Numeric)
    vibracion_y = Column(Numeric)
    vibracion_z = Column(Numeric)
    direccion = Column(String)
    pos_m = Column(Numeric)

# Modelos adicionales para el sistema
class Linea(Base):
    __tablename__ = "lineas"
    linea_id = Column(Integer, primary_key=True)
    nombre = Column(String, nullable=False)
    longitud_km = Column(Numeric)

class Estacion(Base):
    __tablename__ = "estaciones"
    estacion_id = Column(Integer, primary_key=True)
    nombre = Column(String, nullable=False)
    lat = Column(Numeric)
    lon = Column(Numeric)
    alt = Column(Numeric)

class Tramo(Base):
    __tablename__ = "tramos"
    tramo_id = Column(Integer, primary_key=True)
    linea_id = Column(Integer, ForeignKey("lineas.linea_id"))
    estacion_inicio_id = Column(Integer, ForeignKey("estaciones.estacion_id"))
    estacion_fin_id = Column(Integer, ForeignKey("estaciones.estacion_id"))
    longitud_m = Column(Numeric)
    pendiente_porcentaje = Column(Numeric)

class CabinaEstadoHist(Base):
    __tablename__ = "cabina_estado_hist"
    hist_id = Column(BigInteger, primary_key=True)
    cabina_id = Column(Integer, ForeignKey("cabinas.cabina_id"))
    estado = Column(String)
    timestamp_inicio = Column(DateTime)
    timestamp_fin = Column(DateTime)
