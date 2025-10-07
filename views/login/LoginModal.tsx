import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "../components/ui/dialog";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { User, LoginCredentials } from "../types";
import { apiClient } from "../utils/api";

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLogin: (user: User) => void;
}

export function LoginModal({ isOpen, onClose, onLogin }: LoginModalProps) {
  const [credentials, setCredentials] = useState<LoginCredentials>({
    correo: "",
    password: ""
  });
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const result = await apiClient.login(credentials);

      if (result.ok && result.data) {
        onLogin(result.data);
        onClose();
        setCredentials({ correo: "", password: "" });
        localStorage.setItem('user', JSON.stringify(result.data));
      } else {
        const errorMessage = result.error?.message || "Error en el inicio de sesión";
        setError(errorMessage);
        
        if (result.error?.code === 'ACCOUNT_LOCKED') {
          setError("Cuenta bloqueada temporalmente. Intenta más tarde.");
        } else if (result.error?.code === 'BAD_CREDENTIALS') {
          setError("Credenciales inválidas. Verifica tu correo y contraseña.");
        } else if (result.error?.code === 'VALIDATION_ERROR') {
          setError("Por favor ingresa correo y contraseña.");
        }
      }
    } catch (error) {
      console.error('Error:', error);
      setError("Error de conexión. Por favor, intenta más tarde.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (field: keyof LoginCredentials) => (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    setCredentials(prev => ({
      ...prev,
      [field]: e.target.value
    }));
    if (error) setError("");
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-center">
            Bienvenido a Urban Flow
          </DialogTitle>
          <DialogDescription className="text-center">
            Accede a tu cuenta para gestionar el sistema de movilidad urbana
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="correo" className="text-sm font-medium">
              Correo Electrónico
            </Label>
            <Input
              id="correo"
              type="email"
              placeholder="usuario@ejemplo.com"
              value={credentials.correo}
              onChange={handleInputChange("correo")}
              className="w-full"
              required
              disabled={isLoading}
              autoComplete="email"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password" className="text-sm font-medium">
              Contraseña
            </Label>
            <Input
              id="password"
              type="password"
              placeholder="Ingresa tu contraseña"
              value={credentials.password}
              onChange={handleInputChange("password")}
              className="w-full"
              required
              disabled={isLoading}
              autoComplete="current-password"
            />
          </div>

          {error && (
            <div className="p-3 text-sm text-red-600 bg-red-50 rounded-md border border-red-200">
              <div className="font-medium">Error de autenticación</div>
              <div>{error}</div>
            </div>
          )}

          <Button 
            type="submit" 
            className="w-full"
            disabled={isLoading || !credentials.correo || !credentials.password}
          >
            {isLoading ? (
              <div className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Iniciando sesión...
              </div>
            ) : (
              "Iniciar Sesión"
            )}
          </Button>
        </form>

        <div className="mt-4 text-center text-sm text-gray-500">
          <p>
            ¿Necesitas una cuenta?{" "}
            <button 
              type="button"
              className="text-blue-600 hover:underline font-medium"
              onClick={() => console.log('Redirigir a registro')}
            >
              Regístrate
            </button>
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}