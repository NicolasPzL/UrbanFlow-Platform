export interface User {
  id: string;
  name: string;
  email: string;
  rol: 'admin' | 'operador' | 'analista' | 'cliente';
  status: 'active' | 'inactive';
  lastLogin?: string;
}

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