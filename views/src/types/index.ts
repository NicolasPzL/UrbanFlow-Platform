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
  estado_actual: string;
  status?: 'normal' | 'warning' | 'alert' | 'unknown';
  latitud: number | null;
  longitud: number | null;
  velocidad: number | null;
  altitud?: number | null;
  rms?: number | null;
  sensor_id?: number | null;
  estado_procesado?: string | null;
  timestamp?: string | null;
  last_update?: string | null;
}

export interface StationData {
  estacion_id: number;
  nombre: string;
  tipo: string;
  latitud: number | null;
  longitud: number | null;
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

export type AppView = 'landing' | 'geoportal-public' | 'dashboard' | 'geoportal-detail' | 'user-management' | 'citizen-dashboard' | 'novacore';

export type MapMode = '2d' | '3d';