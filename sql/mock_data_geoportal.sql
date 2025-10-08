-- Script para poblar datos sintéticos en las tablas necesarias para el geoportal
-- Ejecutar después de crear las tablas con urbanflow_db_query.sql

-- 1. Crear línea de metro cable
INSERT INTO lineas (nombre, descripcion, longitud_km, estado_operativo) VALUES
('Línea A - Centro Histórico', 'Línea principal que conecta el centro histórico con las zonas altas', 4.2, 'operativa');

-- 2. Crear estaciones
INSERT INTO estaciones (linea_id, nombre, tipo, latitud, longitud, altitud_m, estado_operativo) VALUES
(1, 'Estación Central', 'terminal', 4.609710, -74.081750, 2600.0, 'operativa'),
(1, 'Estación Plaza Mayor', 'intermedia', 4.611200, -74.082100, 2650.0, 'operativa'),
(1, 'Estación Universidad', 'intermedia', 4.612800, -74.082500, 2700.0, 'operativa'),
(1, 'Estación Alto de la Paz', 'intermedia', 4.614500, -74.083000, 2750.0, 'operativa'),
(1, 'Estación Terminal Norte', 'terminal', 4.616200, -74.083500, 2800.0, 'operativa');

-- 3. Crear cabinas
INSERT INTO cabinas (cabina_id, codigo_interno, fecha_fabricacion, estado_actual) VALUES
(1, 'CAB-001', '2023-01-15', 'operativo'),
(2, 'CAB-002', '2023-02-20', 'operativo'),
(3, 'CAB-003', '2023-03-10', 'inusual'),
(4, 'CAB-004', '2023-04-05', 'alerta'),
(5, 'CAB-005', '2023-05-12', 'operativo'),
(6, 'CAB-006', '2023-06-18', 'operativo'),
(7, 'CAB-007', '2023-07-25', 'fuera de servicio'),
(8, 'CAB-008', '2023-08-30', 'operativo');

-- 4. Crear sensores asociados a las cabinas
INSERT INTO sensores (sensor_id, cabina_id, modelo, version_firmware, fecha_instalacion) VALUES
(1, 1, 'IoT-GPS-001', '1.2.3', '2023-01-20'),
(2, 2, 'IoT-GPS-001', '1.2.3', '2023-02-25'),
(3, 3, 'IoT-GPS-001', '1.2.3', '2023-03-15'),
(4, 4, 'IoT-GPS-001', '1.2.3', '2023-04-10'),
(5, 5, 'IoT-GPS-001', '1.2.3', '2023-05-17'),
(6, 6, 'IoT-GPS-001', '1.2.3', '2023-06-23'),
(7, 7, 'IoT-GPS-001', '1.2.3', '2023-07-30'),
(8, 8, 'IoT-GPS-001', '1.2.3', '2023-09-04');

-- 5. Crear mediciones sintéticas (últimas posiciones GPS)
-- Función para generar timestamp actual menos minutos aleatorios
INSERT INTO mediciones (sensor_id, timestamp, latitud, longitud, altitud, velocidad, rms, kurtosis, skewness, zcr, pico, crest_factor, frecuencia_media, frecuencia_dominante, amplitud_max_espectral, energia_banda_1, energia_banda_2, energia_banda_3, estado_procesado) VALUES
-- Cabina 1 - Operativa, moviéndose
(1, NOW() - INTERVAL '2 minutes', 4.610500, -74.081900, 2620.5, 4.2, 0.1234, 2.3456, 0.0567, 0.0891, 0.2345, 1.9012, 45.67, 42.34, 0.0567, 0.0123, 0.0345, 0.0098, 'operativo'),
-- Cabina 2 - Operativa, en estación
(2, NOW() - INTERVAL '1 minutes', 4.611200, -74.082100, 2650.0, 0.0, 0.0987, 2.1234, 0.0345, 0.0678, 0.1987, 2.0123, 38.90, 35.67, 0.0456, 0.0098, 0.0289, 0.0076, 'operativo'),
-- Cabina 3 - Inusual, vibraciones altas
(3, NOW() - INTERVAL '3 minutes', 4.612800, -74.082500, 2700.0, 3.8, 0.2345, 3.4567, 0.1234, 0.1456, 0.3456, 1.4765, 52.34, 48.90, 0.0789, 0.0234, 0.0456, 0.0123, 'inusual'),
-- Cabina 4 - Alerta, vibraciones críticas
(4, NOW() - INTERVAL '5 minutes', 4.614500, -74.083000, 2750.0, 2.1, 0.3456, 4.5678, 0.2345, 0.1890, 0.4567, 1.3214, 65.78, 62.45, 0.0987, 0.0345, 0.0567, 0.0156, 'alerta'),
-- Cabina 5 - Operativa, velocidad normal
(5, NOW() - INTERVAL '4 minutes', 4.613500, -74.082700, 2725.0, 4.5, 0.1456, 2.6789, 0.0789, 0.0987, 0.2678, 1.8432, 48.12, 45.89, 0.0634, 0.0156, 0.0389, 0.0109, 'operativo'),
-- Cabina 6 - Operativa, acelerando
(6, NOW() - INTERVAL '6 minutes', 4.615200, -74.083200, 2775.0, 5.2, 0.1567, 2.7890, 0.0890, 0.1078, 0.2789, 1.7789, 49.56, 47.23, 0.0678, 0.0167, 0.0412, 0.0115, 'operativo'),
-- Cabina 7 - Fuera de servicio (no incluida en consultas públicas)
(7, NOW() - INTERVAL '10 minutes', 4.609710, -74.081750, 2600.0, 0.0, 0.0000, 0.0000, 0.0000, 0.0000, 0.0000, 0.0000, 0.00, 0.00, 0.0000, 0.0000, 0.0000, 0.0000, NULL),
-- Cabina 8 - Operativa, decelerando
(8, NOW() - INTERVAL '7 minutes', 4.616000, -74.083400, 2790.0, 1.8, 0.1678, 2.8901, 0.0945, 0.1123, 0.2890, 1.7213, 50.34, 48.01, 0.0712, 0.0178, 0.0423, 0.0118, 'operativo');

-- 6. Crear tramos para conectar las estaciones
INSERT INTO tramos (linea_id, estacion_origen_id, estacion_destino_id, longitud_m, pendiente_porcentaje) VALUES
(1, 1, 2, 250.0, 2.0),
(1, 2, 3, 200.0, 2.5),
(1, 3, 4, 180.0, 2.8),
(1, 4, 5, 220.0, 2.2);

-- Verificar datos insertados
SELECT 'Cabinas:' as tabla, COUNT(*) as cantidad FROM cabinas
UNION ALL
SELECT 'Sensores:', COUNT(*) FROM sensores
UNION ALL
SELECT 'Estaciones:', COUNT(*) FROM estaciones
UNION ALL
SELECT 'Mediciones:', COUNT(*) FROM mediciones
UNION ALL
SELECT 'Líneas:', COUNT(*) FROM lineas;