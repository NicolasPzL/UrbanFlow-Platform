import { useEffect, useState } from "react";
import { Navbar } from "./components/Navbar";
import { LoginModal } from "./components/LoginModal";
import { LandingPage } from "./components/LandingPage";
import { WelcomeDashboard } from "./components/WelcomeDashboard";
import { PublicGeoportal } from "./components/PublicGeoportal";
import { Dashboard } from "./components/Dashboard";
import { DetailedGeoportal } from "./components/DetailedGeoportal";
import { UserManagement } from "./components/UserManagement";
import { CitizenDashboard } from "./components/CitizenDashboard";
import { AuthState, AppView, User } from "./types";
import { normalizeRolToEs } from "./lib/roles";
import { Toaster } from "./components/ui/sonner";

export default function App() {
  const [currentView, setCurrentView] = useState<AppView>('landing');
  const [authState, setAuthState] = useState<AuthState>({
    isAuthenticated: false,
    user: null
  });
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);

  // Normaliza la forma del usuario que viene del backend a nuestro tipo User
  const normalizeUser = (rawInput: any): User => {
    const raw = rawInput?.user ?? rawInput; // soporta { data: { user: {...} }}
    const finalRol = normalizeRolToEs(raw);

    return {
      id: String(raw?.usuario_id ?? raw?.id ?? ''),
      name: raw?.nombre ?? raw?.name ?? '',
      email: raw?.correo ?? raw?.email ?? '',
      rol: finalRol,
      status: raw?.is_active === false ? 'inactive' : 'active',
      lastLogin: raw?.last_login ?? raw?.lastLogin ?? undefined,
    };
  };

  // Hidrata sesión al cargar la app
  useEffect(() => {
    (async () => {
      try {
        const me = await fetch('/api/auth/me', { credentials: 'include' });
        if (!me.ok) {
          // 401 es normal cuando no hay sesión activa, no es un error
          if (me.status !== 401) {
            console.warn('Error inesperado al verificar sesión:', me.status);
          }
          return; // no autenticado
        }
        const meJson = await me.json();
        if (meJson?.data) {
          console.debug?.('[auth/me]', meJson.data);
          setAuthState({ isAuthenticated: true, user: normalizeUser(meJson.data) });
        }
      } catch (error) {
        // Solo logear errores reales de red, no 401s
        console.warn('Error de red al verificar sesión:', error);
      }
    })();
  }, []);

  const handleLogin = (user: User) => {
    setAuthState({
      isAuthenticated: true,
      user
    });

    // Si estaba en geoportal público, pasa al detallado
    if (currentView === 'geoportal-public') {
      setCurrentView('geoportal-detail');
    }
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
    } catch {}
    setAuthState({ isAuthenticated: false, user: null });

    if (['geoportal-detail', 'dashboard', 'user-management', 'citizen-dashboard'].includes(currentView)) {
      setCurrentView('landing');
    }
  };

  const handleViewChange = (view: AppView) => {
    const protectedViews: AppView[] = ['dashboard', 'geoportal-detail', 'user-management', 'citizen-dashboard'];

    if (protectedViews.includes(view) && !authState.isAuthenticated) {
      setIsLoginModalOpen(true);
      return;
    }

    // Solo admin puede acceder a gestión de usuarios
    if (view === 'user-management' && authState.user?.rol !== 'admin') return;

    // cliente no puede acceder a vistas restringidas
    if (authState.user?.rol === 'cliente') {
      const restricted: AppView[] = ['dashboard', 'geoportal-detail', 'user-management'];
      if (restricted.includes(view)) return;
    }

    // Usuario autenticado no-cliente no puede volver al geoportal público
    if (view === 'geoportal-public' && authState.isAuthenticated && authState.user?.rol !== 'cliente') {
      setCurrentView('geoportal-detail');
      return;
    }

    // Usuario no autenticado no puede ir al geoportal detallado
    if (view === 'geoportal-detail' && !authState.isAuthenticated) {
      setCurrentView('geoportal-public');
      return;
    }

    setCurrentView(view);
  };

  const renderCurrentView = () => {
    switch (currentView) {
      case 'landing':
        return authState.isAuthenticated
          ? <WelcomeDashboard authState={authState} onViewChange={handleViewChange} />
          : <LandingPage onViewChange={handleViewChange} />;
      case 'geoportal-public':
        return <PublicGeoportal />;
      case 'dashboard':
        return <Dashboard />;
      case 'geoportal-detail':
        return <DetailedGeoportal authState={authState} />;
      case 'user-management':
        return <UserManagement />;
      case 'citizen-dashboard':
        return <CitizenDashboard />;
      default:
        return authState.isAuthenticated
          ? <WelcomeDashboard authState={authState} onViewChange={handleViewChange} />
          : <LandingPage onViewChange={handleViewChange} />;
    }
  };

  return (
    <div className="min-h-screen bg-white">
      <Navbar
        currentView={currentView}
        onViewChange={handleViewChange}
        authState={authState}
        onLoginClick={() => setIsLoginModalOpen(true)}
        onLogout={handleLogout}
      />

      <main className="flex-1">
        {renderCurrentView()}
      </main>

      <LoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
        onLogin={handleLogin}
      />

      <Toaster />
    </div>
  );
}
