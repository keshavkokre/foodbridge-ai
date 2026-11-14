import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useNavigate } from 'react-router-dom';
import { Leaf, LogOut, User, Sparkles, Database, ChevronDown } from 'lucide-react';
import { AuthProvider, useAuth, DEMO_CREDENTIALS } from './context/AuthContext';
import LandingPage from './pages/LandingPage';
import AuthPage from './pages/AuthPage';
import DonorDashboard from './pages/donor/DonorDashboard';
import NgoDashboard from './pages/ngo/NgoDashboard';
import VolunteerDashboard from './pages/volunteer/VolunteerDashboard';
import ImpactPage from './pages/impact/ImpactPage';

function Header({ storageInfo }) {
  const { user, logout, loginAsDemo } = useAuth();
  const navigate = useNavigate();
  const [showPersonaMenu, setShowPersonaMenu] = useState(false);

  const handleSwitchPersona = async (key, role) => {
    setShowPersonaMenu(false);
    await loginAsDemo(key);
    if (role === 'donor') navigate('/donor');
    else if (role === 'ngo') navigate('/ngo');
    else if (role === 'volunteer') navigate('/volunteer');
  };

  return (
    <header className="border-b border-harvest-border bg-harvest-canvas/90 backdrop-blur-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-harvest-forest flex items-center justify-center text-harvest-lime shadow-harvest-sm">
            <Leaf className="w-5 h-5" />
          </div>
          <div>
            <span className="font-heading font-bold text-xl tracking-tight text-harvest-forest-dark">
              FoodBridge <span className="text-harvest-forest">AI</span>
            </span>
            <span className="hidden sm:inline-block ml-2 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-full bg-harvest-lime text-harvest-forest-dark border border-harvest-forest/20">
              Demand-First Engine
            </span>
          </div>
        </Link>

        <nav className="flex items-center space-x-3 sm:space-x-5 text-xs">
          <Link to="/" className="font-medium text-harvest-text-dark hover:text-harvest-forest transition-colors hidden md:inline">
            Overview
          </Link>
          <Link to="/impact" className="font-medium text-harvest-text-dark hover:text-harvest-forest transition-colors">
            Impact Ledger
          </Link>

          {/* Persistent Storage Mode Pill */}
          <div className="hidden sm:inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-harvest-subtle text-[11px] font-medium text-harvest-text-muted border border-harvest-border">
            <span className={`w-2 h-2 rounded-full ${storageInfo?.isLiveDb ? 'bg-harvest-forest' : 'bg-harvest-amber'}`} />
            <span>{storageInfo?.label || 'Persistent Local Demo Store'}</span>
          </div>

          {/* Logged in Persona & Switcher */}
          {user ? (
            <div className="flex items-center space-x-2">
              <div className="relative">
                <button
                  onClick={() => setShowPersonaMenu(!showPersonaMenu)}
                  className="px-3 py-1.5 rounded-lg bg-harvest-forest text-harvest-canvas font-semibold hover:bg-harvest-forest-light transition-all flex items-center space-x-1.5 shadow-harvest-sm"
                >
                  <User className="w-3.5 h-3.5 text-harvest-lime" />
                  <span className="capitalize">{user.role} Console</span>
                  <ChevronDown className="w-3 h-3 text-harvest-canvas/70" />
                </button>

                {showPersonaMenu && (
                  <div className="absolute right-0 mt-2 w-64 bg-harvest-surface rounded-xl shadow-harvest-lg border border-harvest-border py-2 z-50 space-y-1">
                    <div className="px-3 py-1 text-[10px] uppercase font-bold text-harvest-text-muted border-b border-harvest-border mb-1">
                      Switch Evaluation Role:
                    </div>
                    {Object.entries(DEMO_CREDENTIALS).map(([k, c]) => (
                      <button
                        key={k}
                        onClick={() => handleSwitchPersona(k, c.role)}
                        className="w-full text-left px-3 py-1.5 text-xs text-harvest-text-dark hover:bg-harvest-subtle hover:text-harvest-forest flex items-center justify-between"
                      >
                        <span className="font-medium">{c.label}</span>
                        <span className="text-[10px] uppercase px-1.5 py-0.5 rounded bg-harvest-subtle text-harvest-text-muted">
                          {c.badge}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <button
                onClick={() => {
                  logout();
                  navigate('/');
                }}
                className="p-1.5 rounded-lg text-harvest-text-muted hover:text-harvest-crimson transition-colors"
                title="Sign Out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <Link
              to="/auth"
              className="px-4 py-2 text-xs font-heading font-bold rounded-xl bg-harvest-forest text-harvest-canvas hover:bg-harvest-forest-light transition-all shadow-harvest-sm"
            >
              Access System
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}

function DemoBanner() {
  return (
    <div className="bg-harvest-subtle border-b border-harvest-border px-4 py-1.5 text-[11px] text-harvest-text-muted flex items-center justify-center space-x-2">
      <span className="font-bold px-2 py-0.5 rounded bg-harvest-amber-muted text-harvest-forest-dark border border-harvest-amber/30 text-[10px]">
        DEMO MODE ACTIVE
      </span>
      <span>TECH EMBED 2026 Smart AI Solutions Evaluation Environment. Synthetic test fixtures are isolated.</span>
    </div>
  );
}

export default function App() {
  const [storageInfo, setStorageInfo] = useState(null);

  useEffect(() => {
    fetch('/api/health')
      .then(r => r.json())
      .then(d => setStorageInfo(d.storage))
      .catch(() => {});
  }, []);

  return (
    <AuthProvider>
      <Router>
        <div className="min-h-screen flex flex-col bg-harvest-canvas">
          <DemoBanner />
          <Header storageInfo={storageInfo} />
          <main className="flex-1">
            <Routes>
              <Route path="/" element={<LandingPage />} />
              <Route path="/auth" element={<AuthPage />} />
              <Route path="/donor" element={<DonorDashboard />} />
              <Route path="/ngo" element={<NgoDashboard />} />
              <Route path="/volunteer" element={<VolunteerDashboard />} />
              <Route path="/impact" element={<ImpactPage />} />
            </Routes>
          </main>
        </div>
      </Router>
    </AuthProvider>
  );
}
