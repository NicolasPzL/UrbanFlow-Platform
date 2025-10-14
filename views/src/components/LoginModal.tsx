import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { User } from "../types";
import { normalizeRolToEs } from "../lib/roles";

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
  const [failCount, setFailCount] = useState(0);
  const [lockUntil, setLockUntil] = useState<number | null>(null);

  const isLocked = lockUntil !== null && Date.now() < lockUntil;
  const lockRemainingSec = isLocked ? Math.ceil((lockUntil! - Date.now()) / 1000) : 0;

  const validateInputs = () => {
    const trimmedEmail = email.trim();
    const trimmedPass = password.trim();
    const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail);
    const passOk = trimmedPass.length >= 8; // mínimo 8
    if (!emailOk) throw new Error('Correo inválido');
    if (!passOk) throw new Error('La contraseña debe tener al menos 8 caracteres');
    return { correo: trimmedEmail, password: trimmedPass };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      if (isLocked) {
        throw new Error(`Demasiados intentos fallidos. Reintenta en ${lockRemainingSec}s`);
      }

      const payload = validateInputs();
      // Real login against backend API
      const resp = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include', // send/receive HTTPOnly cookie
        body: JSON.stringify(payload),
      });

      if (!resp.ok) throw new Error('Credenciales inválidas');

      // Fetch current user info
      const me = await fetch('/api/auth/me', { credentials: 'include' });
      if (!me.ok) throw new Error('No fue posible obtener la sesión');
      const meJson = await me.json();

      // Normalizar usuario del backend a tipo User del frontend
      const rawInput = meJson.data;
      const raw = rawInput?.user ?? rawInput;
      try { console.debug?.('[auth/me after login]', raw); } catch {}

      const normalized: User = {
        id: String(raw?.usuario_id ?? raw?.id ?? ''),
        name: raw?.nombre ?? raw?.name ?? '',
        email: raw?.correo ?? raw?.email ?? '',
        rol: normalizeRolToEs(raw),
        status: raw?.is_active === false ? 'inactive' : 'active',
        lastLogin: raw?.last_login ?? raw?.lastLogin ?? undefined,
      };

      onLogin(normalized);
      onClose();
      setEmail("");
      setPassword("");
      setFailCount(0);
      setLockUntil(null);
    } catch (ex: any) {
      // Siempre mensaje genérico para no filtrar información sensible
      const msg = ex?.message || 'Credenciales inválidas';
      setError(msg);
      const nextFails = failCount + 1;
      setFailCount(nextFails);
      if (nextFails >= 5) {
        setLockUntil(Date.now() + 30_000); // 30s lockout
      }
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
          <Button type="submit" className="w-full" disabled={isLoading || isLocked}>
            {isLocked ? `Bloqueado ${lockRemainingSec}s` : (isLoading ? "Iniciando sesión..." : "Iniciar Sesión")}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}