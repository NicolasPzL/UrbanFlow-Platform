import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { mockUsers } from "../data/mockData";
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

    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    const user = mockUsers.find(u => u.email === email && u.status === 'active');
    
    if (user && password === "demo123") {
      onLogin(user);
      onClose();
      setEmail("");
      setPassword("");
    } else {
      setError("Credenciales incorrectas o usuario inactivo");
    }
    
    setIsLoading(false);
  };

  const demoCredentials = [
    { role: "Admin", email: "ana.garcia@urbanflow.com", password: "demo123" },
    { role: "Operador", email: "carlos.mendoza@urbanflow.com", password: "demo123" },
    { role: "Analista", email: "maria.rodriguez@urbanflow.com", password: "demo123" },
    { role: "Ciudadano", email: "juan.perez@gmail.com", password: "demo123" }
  ];

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
        
        <div className="border-t pt-4">
          <h4 className="text-sm font-medium text-gray-900 mb-3">Credenciales de Demo:</h4>
          <div className="space-y-2">
            {demoCredentials.map((cred, index) => (
              <div key={index} className="text-xs text-gray-600 bg-gray-50 p-2 rounded">
                <div><strong>{cred.role}:</strong> {cred.email}</div>
                <div><strong>Contraseña:</strong> {cred.password}</div>
              </div>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}