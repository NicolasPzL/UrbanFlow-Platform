// Ejemplo de integración del frontend con el microservicio de predicciones
// Este código muestra cómo el frontend puede consumir las APIs del microservicio

class PredictionsService {
    constructor() {
        this.baseURL = 'http://localhost:3001/api/v1';
    }

    // Obtener lista de sensores
    async getSensors() {
        try {
            const response = await fetch(`${this.baseURL}/sensors`);
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            return await response.json();
        } catch (error) {
            console.error('Error obteniendo sensores:', error);
            throw error;
        }
    }

    // Obtener datos históricos de un sensor
    async getHistoricalData(sensorId, hours = 24) {
        try {
            const response = await fetch(`${this.baseURL}/sensors/${sensorId}/historical?hours=${hours}`);
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            return await response.json();
        } catch (error) {
            console.error('Error obteniendo datos históricos:', error);
            throw error;
        }
    }

    // Generar predicción para un sensor
    async generatePrediction(sensorId, options = {}) {
        try {
            const payload = {
                method: options.method || 'moving_average',
                window: options.window || 10,
                hours: options.hours || 24
            };

            const response = await fetch(`${this.baseURL}/sensors/${sensorId}/predict`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload)
            });

            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            return await response.json();
        } catch (error) {
            console.error('Error generando predicción:', error);
            throw error;
        }
    }

    // Obtener estadísticas de un sensor
    async getSensorStats(sensorId, hours = 24) {
        try {
            const response = await fetch(`${this.baseURL}/sensors/${sensorId}/stats?hours=${hours}`);
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            return await response.json();
        } catch (error) {
            console.error('Error obteniendo estadísticas:', error);
            throw error;
        }
    }

    // Obtener resumen del sistema
    async getSystemOverview() {
        try {
            const response = await fetch(`${this.baseURL}/system/overview`);
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            return await response.json();
        } catch (error) {
            console.error('Error obteniendo resumen del sistema:', error);
            throw error;
        }
    }
}

// Ejemplo de uso en un componente React
const PredictionsDashboard = () => {
    const [sensors, setSensors] = useState([]);
    const [selectedSensor, setSelectedSensor] = useState(null);
    const [prediction, setPrediction] = useState(null);
    const [loading, setLoading] = useState(false);

    const predictionsService = new PredictionsService();

    // Cargar sensores al montar el componente
    useEffect(() => {
        loadSensors();
    }, []);

    const loadSensors = async () => {
        try {
            setLoading(true);
            const data = await predictionsService.getSensors();
            setSensors(data.sensors);
        } catch (error) {
            console.error('Error cargando sensores:', error);
        } finally {
            setLoading(false);
        }
    };

    const generatePrediction = async (sensorId) => {
        try {
            setLoading(true);
            const data = await predictionsService.generatePrediction(sensorId, {
                method: 'moving_average',
                window: 10,
                hours: 24
            });
            setPrediction(data);
        } catch (error) {
            console.error('Error generando predicción:', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="predictions-dashboard">
            <h2>Dashboard de Predicciones</h2>
            
            {/* Lista de sensores */}
            <div className="sensors-list">
                <h3>Sensores Disponibles</h3>
                {loading ? (
                    <p>Cargando sensores...</p>
                ) : (
                    <ul>
                        {sensors.map(sensor => (
                            <li key={sensor.sensor_id}>
                                <span>Sensor {sensor.sensor_id} - {sensor.codigo_interno}</span>
                                <span>Estado: {sensor.estado_actual}</span>
                                <button onClick={() => generatePrediction(sensor.sensor_id)}>
                                    Generar Predicción
                                </button>
                            </li>
                        ))}
                    </ul>
                )}
            </div>

            {/* Resultado de predicción */}
            {prediction && (
                <div className="prediction-result">
                    <h3>Resultado de Predicción</h3>
                    <div className="health-score">
                        <strong>Score de Salud:</strong> {prediction.health.health_score}
                        <span className={`status ${prediction.health.status}`}>
                            {prediction.health.status}
                        </span>
                    </div>
                    
                    {prediction.predictions.rms && (
                        <div className="rms-prediction">
                            <strong>RMS Predicho:</strong> {prediction.predictions.rms.predicted_value}
                            <span>Confianza: {prediction.predictions.rms.confidence}</span>
                        </div>
                    )}
                    
                    {prediction.predictions.rms_trend && (
                        <div className="trend">
                            <strong>Tendencia:</strong> {prediction.predictions.rms_trend.trend}
                            <span>Pendiente: {prediction.predictions.rms_trend.slope}</span>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

// Ejemplo de uso en un hook personalizado
const usePredictions = () => {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const predictionsService = new PredictionsService();

    const fetchData = async (sensorId, type = 'prediction') => {
        setLoading(true);
        setError(null);
        
        try {
            let result;
            switch (type) {
                case 'sensors':
                    result = await predictionsService.getSensors();
                    break;
                case 'historical':
                    result = await predictionsService.getHistoricalData(sensorId);
                    break;
                case 'prediction':
                    result = await predictionsService.generatePrediction(sensorId);
                    break;
                case 'stats':
                    result = await predictionsService.getSensorStats(sensorId);
                    break;
                case 'overview':
                    result = await predictionsService.getSystemOverview();
                    break;
                default:
                    throw new Error('Tipo de datos no válido');
            }
            
            setData(result);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return { data, loading, error, fetchData };
};

// Ejemplo de uso del hook
const SensorCard = ({ sensorId }) => {
    const { data, loading, error, fetchData } = usePredictions();

    useEffect(() => {
        fetchData(sensorId, 'prediction');
    }, [sensorId]);

    if (loading) return <div>Cargando predicción...</div>;
    if (error) return <div>Error: {error}</div>;
    if (!data) return <div>No hay datos</div>;

    return (
        <div className="sensor-card">
            <h4>Sensor {sensorId}</h4>
            <div className="health-indicator">
                <span className={`health-score ${data.health.status}`}>
                    {data.health.health_score}
                </span>
                <span className="status">{data.health.status}</span>
            </div>
        </div>
    );
};

export { PredictionsService, usePredictions, PredictionsDashboard, SensorCard };
