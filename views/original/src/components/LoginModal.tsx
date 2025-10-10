import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { User } from "../types";

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLogin: (user: User) => void;
}

export function LoginModal({ isOpen, onClose, onLogin }: LoginModalProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      // Real login against backend API
      const resp = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include', // send/receive HTTPOnly cookie
        body: JSON.stringify({ correo: email, password }),
      });

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        throw new Error(err?.error?.message || 'Error de autenticación');
      }

      // Fetch current user info
      const me = await fetch('/api/auth/me', { credentials: 'include' });
      if (!me.ok) throw new Error('No fue posible obtener la sesión');
      const meJson = await me.json();

      // Normalizar usuario del backend a tipo User del frontend
      const rawInput = meJson.data;
      const raw = rawInput?.user ?? rawInput;
      try { console.debug?.('[auth/me after login]', raw); } catch {}

      const rawRoles = Array.isArray(raw?.roles)
        ? raw.roles
        : (raw?.rol || raw?.role ? [raw?.rol ?? raw?.role] : []);
      const roleStrings: string[] = rawRoles.map((r: any) => {
        if (typeof r === 'string') return r.toLowerCase();
        if (typeof r === 'object' && r) {
          const name = (r.nombre || r.name || r.codigo || r.code || r.slug || '').toString();
          return name.toLowerCase();
        }
        return '';
      });
      const normalizeName = (v: string) => v?.normalize?.('NFD').replace(/[\u0300-\u036f]/g, '') || v;
      const pickRole = (): User['role'] => {
        const set = new Set(roleStrings.map(s => normalizeName(s)));
        if (set.has('admin') || set.has('administrador')) return 'admin';
        if (set.has('analyst') || set.has('analista')) return 'analyst';
        if (set.has('operator') || set.has('operador') || set.has('operario')) return 'operator';
        if (set.has('citizen') || set.has('ciudadano')) return 'citizen';
        const r = normalizeName((raw?.rol || raw?.role || roleStrings[0] || '').toString().toLowerCase());
        if (['admin','administrador'].includes(r)) return 'admin';
        if (['analyst','analista'].includes(r)) return 'analyst';
        if (['operator','operador','operario'].includes(r)) return 'operator';
        if (['citizen','ciudadano'].includes(r)) return 'citizen';
        return 'operator';
      };
      const normalized: User = {
        id: String(raw?.usuario_id ?? raw?.id ?? ''),
        name: raw?.nombre ?? raw?.name ?? '',
        email: raw?.correo ?? raw?.email ?? '',
        role: pickRole(),
        status: raw?.is_active === false ? 'inactive' : 'active',
        lastLogin: raw?.last_login ?? raw?.lastLogin ?? undefined,
      };

      onLogin(normalized);
      onClose();
      setEmail("");
      setPassword("");
    } catch (ex: any) {
      setError(ex?.message || 'Error iniciando sesión');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Iniciar Sesión</DialogTitle>
          <DialogDescription>
            Accede a tu cuenta para utilizar las funciones avanzadas de Urban Flow
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Correo Electrónico</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tu.email@urbanflow.com"
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="password">Contraseña</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Ingresa tu contraseña"
              required
            />
          </div>
          
          {error && (
            <div className="text-sm text-red-600 bg-red-50 p-3 rounded-md">
              {error}
            </div>
          )}
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? "Iniciando sesión..." : "Iniciar Sesión"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}