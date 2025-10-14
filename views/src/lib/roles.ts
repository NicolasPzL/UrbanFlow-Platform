export type RolES = 'admin' | 'operador' | 'analista' | 'cliente';
export type RolEN = 'admin' | 'operator' | 'analyst' | 'citizen';

const strip = (s: string) => s?.normalize?.('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase() || '';

const aliasToEs: Record<string, RolES> = {
  admin: 'admin',
  administrador: 'admin',
  operator: 'operador',
  operador: 'operador',
  operario: 'operador',
  analyst: 'analista',
  analista: 'analista',
  citizen: 'cliente',
  cliente: 'cliente',
  user: 'cliente',
};

export function normalizeRolToEs(value: any): RolES {
  const raw = typeof value === 'string' ? value : (value?.rol ?? value?.role ?? '');
  const k = strip(String(raw));
  return aliasToEs[k] || 'operador';
}

export function mapEsToBackend(value: RolES): string {
  // Backend espera nombres exactos en BD; ajusta aquí si tu BD usa otros nombres
  // Actual: roles.nombre_rol: 'admin' | 'operador' | 'analista' | 'cliente'
  return value;
}

export function mapUiArrayToBackend(roles: RolES[]): string[] {
  const uniq = Array.from(new Set(roles));
  return uniq.map(mapEsToBackend);
}
