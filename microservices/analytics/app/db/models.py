from sqlalchemy import Column, Integer, BigInteger, String, DateTime, Numeric, ForeignKey, JSON, Boolean
from sqlalchemy.orm import relationship
from .session import Base

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
