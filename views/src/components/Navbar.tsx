import { Button } from "./ui/button";
import { Sheet, SheetContent, SheetTrigger } from "./ui/sheet";
import { Menu, User, BarChart3, Map, Users, MessageCircle } from "lucide-react";
import { AuthState, AppView } from "../types";
import logoImage from 'figma:asset/856ee0847a1c73c8150b4a4b5a7067b12c34fca3.png';

interface NavbarProps {
  currentView: AppView;
  onViewChange: (view: AppView) => void;
  authState: AuthState;
  onLoginClick: () => void;
  onLogout: () => void;
  showChatbot?: boolean;
  onToggleChatbot?: () => void;
}

export function Navbar({ currentView, onViewChange, authState, onLoginClick, onLogout, showChatbot = false, onToggleChatbot }: NavbarProps) {
  const publicNavItems = [
    { id: 'landing' as AppView, label: 'Inicio', icon: Map },
    { id: 'geoportal-public' as AppView, label: 'Geoportal', icon: Map }
  ];

  const authenticatedNavItems = (() => {
    if (authState.user?.rol === 'cliente') {
      return [
        { id: 'landing' as AppView, label: 'Inicio', icon: Map },
        { id: 'citizen-dashboard' as AppView, label: 'Mi Dashboard', icon: BarChart3 },
        { id: 'geoportal-public' as AppView, label: 'Geoportal', icon: Map }
      ];
    }
    
    return [
      { id: 'landing' as AppView, label: 'Inicio', icon: Map },
      { id: 'dashboard' as AppView, label: 'Dashboard', icon: BarChart3 },
      { id: 'geoportal-detail' as AppView, label: 'Geoportal', icon: Map },
      ...(authState.user?.rol === 'admin' ? [{ id: 'user-management' as AppView, label: 'Usuarios', icon: Users }] : [])
    ];
  })();

  const navItems = authState.isAuthenticated ? authenticatedNavItems : publicNavItems;

  return (
    <nav className="border-b bg-white/95 backdrop-blur-sm sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div className="flex items-center space-x-2">
            <img 
              src={logoImage} 
              alt="Urban Flow Logo" 
              className="h-8 w-8"
            />
            <span className="text-xl font-semibold text-gray-900">Urban Flow</span>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => onViewChange(item.id)}
                  className={`flex items-center space-x-2 px-3 py-2 rounded-md transition-colors ${
                    currentView === item.id
                      ? 'text-blue-600 bg-blue-50'
                      : 'text-gray-700 hover:text-blue-600 hover:bg-gray-50'
                  }`}
                  aria-current={currentView === item.id ? 'page' : undefined}
                >
                  <Icon className="h-4 w-4" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>

          {/* Auth Section */}
          <div className="hidden md:flex items-center space-x-4">
            {authState.isAuthenticated ? (
              <div className="flex items-center space-x-3">
                <div className="flex items-center space-x-2">
                  <User className="h-4 w-4 text-gray-500" />
                  <span className="text-sm text-gray-700">{authState.user?.name}</span>
                </div>
                {onToggleChatbot && (
                  <Button 
                    variant={showChatbot ? "default" : "outline"} 
                    size="sm" 
                    onClick={onToggleChatbot}
                    className="flex items-center gap-2"
                  >
                    <MessageCircle className="h-4 w-4" />
                    <span>{showChatbot ? "Ocultar IA" : "Asistente IA"}</span>
                  </Button>
                )}
                <Button variant="outline" size="sm" onClick={onLogout}>
                  Cerrar Sesión
                </Button>
              </div>
            ) : (
              <Button onClick={onLoginClick} size="sm">
                Iniciar Sesión
              </Button>
            )}
          </div>

          {/* Mobile menu */}
          <Sheet>
            <SheetTrigger asChild className="md:hidden">
              <Button variant="ghost" size="sm">
                <Menu className="h-5 w-5" />
                <span className="sr-only">Abrir menú</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-64">
              <div className="flex flex-col space-y-4 mt-8">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.id}
                      onClick={() => onViewChange(item.id)}
                      className={`flex items-center space-x-3 px-3 py-2 rounded-md transition-colors w-full ${
                        currentView === item.id
                          ? 'text-blue-600 bg-blue-50'
                          : 'text-gray-700 hover:text-blue-600 hover:bg-gray-50'
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
                
                <div className="border-t pt-4 mt-4">
                  {authState.isAuthenticated ? (
                    <div className="space-y-3">
                      <div className="flex items-center space-x-2 px-3">
                        <User className="h-4 w-4 text-gray-500" />
                        <span className="text-sm text-gray-700">{authState.user?.name}</span>
                      </div>
                      {onToggleChatbot && (
                        <Button 
                          variant={showChatbot ? "default" : "outline"} 
                          size="sm" 
                          onClick={onToggleChatbot}
                          className="w-full flex items-center justify-center gap-2"
                        >
                          <MessageCircle className="h-4 w-4" />
                          <span>{showChatbot ? "Ocultar IA" : "Asistente IA"}</span>
                        </Button>
                      )}
                      <Button variant="outline" size="sm" onClick={onLogout} className="w-full">
                        Cerrar Sesión
                      </Button>
                    </div>
                  ) : (
                    <Button onClick={onLoginClick} size="sm" className="w-full">
                      Iniciar Sesión
                    </Button>
                  )}
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </nav>
  );
}