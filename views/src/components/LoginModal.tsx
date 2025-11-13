import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { User } from "../types";
import { normalizeRolToEs } from "../lib/roles";
import { Alert, AlertDescription } from "./ui/alert";

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
  const [mustChangePassword, setMustChangePassword] = useState(false);
  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordErrors, setPasswordErrors] = useState<string[]>([]);

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

      const respJson = await resp.json();

      // Verificar si debe cambiar contraseña
      const loginData = respJson.data;
      if (loginData?.must_change_password === true) {
        setMustChangePassword(true);
        setShowChangePasswordModal(true);
        // No cerrar el modal ni hacer login aún
        return;
      }

      // Fetch current user info
      const me = await fetch('/api/auth/me', { credentials: 'include' });
      if (!me.ok) throw new Error('No fue posible obtener la sesión');
      const meJson = await me.json();
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
      setMustChangePassword(false);
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

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordErrors([]);
    setError("");

    // Validaciones básicas
    const errors: string[] = [];
    if (!oldPassword || oldPassword.trim() === "") {
      errors.push("La contraseña actual es requerida");
    }
    if (!newPassword || newPassword.trim() === "") {
      errors.push("La nueva contraseña es requerida");
    }
    if (!confirmPassword || confirmPassword.trim() === "") {
      errors.push("La confirmación de contraseña es requerida");
    }
    
    if (errors.length === 0) {
      if (newPassword !== confirmPassword) {
        errors.push("Las contraseñas nuevas no coinciden");
      }
      if (oldPassword === newPassword) {
        errors.push("La nueva contraseña debe ser diferente a la actual");
      }
      
      // Validar fortaleza solo si no hay errores previos
      if (newPassword.length < 8) {
        errors.push("La contraseña debe tener al menos 8 caracteres");
      }
      if (!/[A-Z]/.test(newPassword)) {
        errors.push("Debe tener al menos una mayúscula");
      }
      if (!/[a-z]/.test(newPassword)) {
        errors.push("Debe tener al menos una minúscula");
      }
      if (!/\d/.test(newPassword)) {
        errors.push("Debe tener al menos un número");
      }
    }

    if (errors.length > 0) {
      setPasswordErrors(errors);
      return;
    }

    setIsLoading(true);
    try {
      const resp = await fetch('/api/auth/change-password', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          old_password: oldPassword,
          new_password: newPassword,
          confirm_password: confirmPassword
        }),
      });

      if (!resp.ok) {
        const errJson = await resp.json();
        const errorMessage = errJson.error?.message || errJson.error?.details?.join(', ') || 'Error al cambiar contraseña';
        throw new Error(errorMessage);
      }

      // Limpiar estados de error
      setError("");
      setPasswordErrors([]);

      // Esperar un momento para que las cookies se establezcan
      await new Promise(resolve => setTimeout(resolve, 300));

      // Hacer un refresh forzado llamando a /api/auth/me varias veces si es necesario
      let meOk = false;
      let attempts = 0;
      let meJson = null;
      
      while (!meOk && attempts < 3) {
        const me = await fetch('/api/auth/me', { 
          credentials: 'include',
          cache: 'no-cache',
          headers: {
            'Cache-Control': 'no-cache'
          }
        });
        
        if (me.ok) {
          meJson = await me.json();
          const userData = meJson.data?.user ?? meJson.data;
          // Verificar que el token no tenga must_change_password
          if (userData && !userData.must_change_password) {
            meOk = true;
            break;
          }
        }
        
        attempts++;
        if (attempts < 3) {
          await new Promise(resolve => setTimeout(resolve, 200));
        }
      }

      if (!meOk || !meJson) {
        throw new Error('No fue posible obtener la sesión después del cambio de contraseña. Por favor, recarga la página.');
      }

      const raw = meJson.data?.user ?? meJson.data;

      const normalized: User = {
        id: String(raw?.usuario_id ?? raw?.id ?? ''),
        name: raw?.nombre ?? raw?.name ?? '',
        email: raw?.correo ?? raw?.email ?? '',
        rol: normalizeRolToEs(raw),
        status: raw?.is_active === false ? 'inactive' : 'active',
        lastLogin: raw?.last_login ?? raw?.lastLogin ?? undefined,
      };

      // Limpiar todos los estados antes de hacer login
      setShowChangePasswordModal(false);
      setMustChangePassword(false);
      setOldPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setEmail("");
      setPassword("");
      
      // Hacer login y cerrar modal
      onLogin(normalized);
      onClose();
      
      // Forzar recarga de la página para asegurar que todo se actualice
      window.location.reload();
    } catch (ex: any) {
      const errorMessage = ex?.message || 'Error al cambiar contraseña';
      setError(errorMessage);
      setPasswordErrors([]); // Limpiar errores de validación si hay un error del servidor
      console.error('Error al cambiar contraseña:', ex);
    } finally {
      setIsLoading(false);
    }
  };

  if (showChangePasswordModal) {
    return (
      <Dialog open={isOpen} onOpenChange={() => {}}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Cambiar Contraseña</DialogTitle>
            <DialogDescription>
              Debes cambiar tu contraseña antes de continuar
            </DialogDescription>
          </DialogHeader>
          
          <Alert className="mb-4">
            <AlertDescription>
              Por seguridad, debes establecer una nueva contraseña para acceder al sistema.
              <br />
              <strong className="mt-2 block">Ingresa la contraseña temporal que te proporcionó el administrador.</strong>
            </AlertDescription>
          </Alert>

          <form onSubmit={handleChangePassword} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="old_password">Contraseña Actual (Temporal)</Label>
              <Input
                id="old_password"
                type="password"
                name="currentPassword"
                value={oldPassword}
                onChange={(e) => setOldPassword(e.target.value)}
                placeholder="Ingresa la contraseña temporal proporcionada"
                required
                autoFocus
                autoComplete="current-password"
              />
              <p className="text-xs text-gray-500">Esta es la contraseña que recibiste cuando se creó tu cuenta.</p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="new_password">Nueva Contraseña</Label>
              <Input
                id="new_password"
                type="password"
                name="newPassword"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Mínimo 8 caracteres, mayúscula, minúscula y número"
                required
                autoComplete="new-password"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirm_password">Confirmar Nueva Contraseña</Label>
              <Input
                id="confirm_password"
                type="password"
                name="confirmPassword"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirma tu nueva contraseña"
                required
                autoComplete="new-password"
              />
            </div>
            
            {(error || passwordErrors.length > 0) && (
              <div className="text-sm text-red-600 bg-red-50 p-3 rounded-md space-y-1">
                {error && <div>{error}</div>}
                {passwordErrors.map((err, idx) => (
                  <div key={idx}>• {err}</div>
                ))}
              </div>
            )}
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? "Cambiando contraseña..." : "Cambiar Contraseña"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    );
  }

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
              name="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tu.email@urbanflow.com"
              required
              autoComplete="email"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="password">Contraseña</Label>
            <Input
              id="password"
              type="password"
              name="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Ingresa tu contraseña"
              required
              autoComplete="current-password"
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