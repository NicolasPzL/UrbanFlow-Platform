import { useState } from "react";
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

  const handleLogout = () => {
    setAuthState({
      isAuthenticated: false,
      user: null
    });
    
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