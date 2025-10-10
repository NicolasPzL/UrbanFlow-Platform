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
import { Toaster } from "./components/ui/sonner";

export default function App() {
  const [currentView, setCurrentView] = useState<AppView>('landing');
  const [authState, setAuthState] = useState<AuthState>({
    isAuthenticated: false,
    user: null
  });
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);

  // Normaliza la forma de usuario que viene del backend a nuestro tipo User
  const normalizeUser = (rawInput: any): User => {
    const raw = rawInput?.user ?? rawInput; // soporta { data: { user: {...} }}

    // Normalizar roles a strings en minúsculas
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

    const normalizeName = (v: string) => v?.normalize?.('NFD').replace(/[\u0300-\u036f]/g, '') || v; // quita tildes

    const pickRole = (): User["role"] => {
      const set = new Set(roleStrings.map(s => normalizeName(s)));
      // aceptar español y mayúsculas
      if (set.has('admin') || set.has('administrador')) return 'admin';
      if (set.has('analyst') || set.has('analista')) return 'analyst';
      if (set.has('operator') || set.has('operador') || set.has('operario')) return 'operator';
      if (set.has('citizen') || set.has('ciudadano')) return 'citizen';
      // fallback a rol singular
      const r = normalizeName((raw?.rol || roleStrings[0] || '').toString().toLowerCase());
      if (['admin','administrador'].includes(r)) return 'admin';
      if (['analyst','analista'].includes(r)) return 'analyst';
      if (['operator','operador','operario'].includes(r)) return 'operator';
      if (['citizen','ciudadano'].includes(r)) return 'citizen';
      return 'operator';
    };

    return {
      id: String(raw?.usuario_id ?? raw?.id ?? ''),
      name: raw?.nombre ?? raw?.name ?? '',
      email: raw?.correo ?? raw?.email ?? '',
      role: pickRole(),
      status: raw?.is_active === false ? 'inactive' : 'active',
      lastLogin: raw?.last_login ?? raw?.lastLogin ?? undefined,
    };
  };

  // Hidrata sesión al cargar la app
  useEffect(() => {
    (async () => {
      try {
        const me = await fetch('/api/auth/me', { credentials: 'include' });
        if (!me.ok) return; // no autenticado
        const meJson = await me.json();
        if (meJson?.data) {
          // debug mínimo (una sola vez)
          try { console.debug?.('[auth/me]', meJson.data); } catch {}
          setAuthState({ isAuthenticated: true, user: normalizeUser(meJson.data) });
        }
      } catch {
        // ignorar
      }
    })();
  }, []);

  const handleLogin = (user: User) => {
    setAuthState({
      isAuthenticated: true,
      user
    });
    
    // Redirect from public geoportal to detailed geoportal after login
    if (currentView === 'geoportal-public') {
      setCurrentView('geoportal-detail');
    }
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
    } catch {}
    setAuthState({ isAuthenticated: false, user: null });
    
    // Redirect from protected views after logout
    if (currentView === 'geoportal-detail') {
      setCurrentView('geoportal-public');
    } else if (currentView === 'dashboard' || currentView === 'user-management' || currentView === 'citizen-dashboard') {
      setCurrentView('landing');
    }
  };

  const handleViewChange = (view: AppView) => {
    // Check if view requires authentication
    const protectedViews: AppView[] = ['dashboard', 'geoportal-detail', 'user-management', 'citizen-dashboard'];
    
    if (protectedViews.includes(view) && !authState.isAuthenticated) {
      setIsLoginModalOpen(true);
      return;
    }
    
    // Check if user-management requires admin role
    if (view === 'user-management' && authState.user?.role !== 'admin') {
      return; // Silently ignore if not admin
    }
    
    // Prevent citizen users from accessing restricted views
    if (authState.user?.role === 'citizen') {
      const citizenRestrictedViews: AppView[] = ['dashboard', 'geoportal-detail', 'user-management'];
      if (citizenRestrictedViews.includes(view)) {
        return; // Silently ignore if citizen tries to access restricted views
      }
    }
    
    // Prevent non-citizen authenticated users from accessing public geoportal (redirect to detailed)
    if (view === 'geoportal-public' && authState.isAuthenticated && authState.user?.role !== 'citizen') {
      setCurrentView('geoportal-detail'); // Redirect to detailed geoportal
      return;
    }
    
    // Prevent unauthenticated users from accessing detailed geoportal
    if (view === 'geoportal-detail' && !authState.isAuthenticated) {
      setCurrentView('geoportal-public'); // Redirect to public geoportal
      return;
    }
    
    setCurrentView(view);
  };

  const renderCurrentView = () => {
    switch (currentView) {
      case 'landing':
        // Show different landing experience based on authentication
        return authState.isAuthenticated 
          ? <WelcomeDashboard authState={authState} onViewChange={handleViewChange} />
          : <LandingPage onViewChange={handleViewChange} />;
      case 'geoportal-public':
        return <PublicGeoportal />;
      case 'dashboard':
        return <Dashboard />;
      case 'geoportal-detail':
        return <DetailedGeoportal />;
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