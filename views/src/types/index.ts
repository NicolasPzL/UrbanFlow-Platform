export interface User {
  id: string;
  name: string;
  email: string;
  rol: 'admin' | 'operador' | 'analista' | 'cliente';
  status: 'active' | 'inactive';
  lastLogin?: string;
}

// Types for database data (from backend API)
export interface CabinData {
  cabina_id: number;
  codigo_interno: string;
  estado_actual: 'operativo' | 'inusual' | 'alerta';
  status?: 'normal' | 'warning' | 'alert'; // mapped version
  latitud: number;
  longitud: number;
  velocidad: number;
  timestamp?: string;
}

export interface StationData {
  estacion_id: number;
  nombre: string;
  tipo: string;
  latitud: number;
  longitud: number;
}

// Legacy types for mock data (keeping for compatibility)
export interface Cabin {
  id: string;
  position: { x: number; y: number };
  velocity: number;
  passengers: number;
  eta: string;
  vibrationLast: number;
  vibrationAvg: number;
  status: 'normal' | 'warning' | 'alert';
  statusProcessed: string;
  isMoving: boolean;
}

export interface Station {
  id: string;
  name: string;
  position: { x: number; y: number };
  type: 'terminal' | 'intermediate';
}

export interface KPI {
  id: string;
  title: string;
  value: string;
  change: number;
  status: 'positive' | 'negative' | 'neutral';
}

export interface VibrationData {
  time: string;
  vibration: number;
  cabinId: string;
}

export type AuthState = {
  isAuthenticated: boolean;
  user: User | null;
};

export type AppView = 'landing' | 'geoportal-public' | 'dashboard' | 'geoportal-detail' | 'user-management' | 'citizen-dashboard';