import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { Leaf, ShieldCheck, HeartHandshake, Sparkles, AlertCircle } from 'lucide-react';

function Header() {
  return (
    <header className="border-b border-harvest-border bg-harvest-canvas/90 backdrop-blur-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-harvest-forest flex items-center justify-center text-harvest-lime shadow-harvest-sm">
            <Leaf className="w-5 h-5" />
          </div>
          <div>
            <span className="font-heading font-bold text-xl tracking-tight text-harvest-forest-dark">FoodBridge <span className="text-harvest-forest">AI</span></span>
            <span className="hidden sm:inline-block ml-2 px-2 py-0.5 text-xs font-medium rounded-full bg-harvest-lime text-harvest-forest-dark border border-harvest-forest/20">
              Demand-First Engine
            </span>
          </div>
        </Link>

        <nav className="flex items-center space-x-6">
          <Link to="/" className="text-sm font-medium text-harvest-text-dark hover:text-harvest-forest transition-colors">
            Overview
          </Link>
          <Link to="/impact" className="text-sm font-medium text-harvest-text-dark hover:text-harvest-forest transition-colors">
            Impact Ledger
          </Link>
          <Link to="/auth" className="px-4 py-2 text-sm font-semibold rounded-lg bg-harvest-forest text-harvest-canvas hover:bg-harvest-forest-light transition-all shadow-harvest-sm">
            Access System
          </Link>
        </nav>
      </div>
    </header>
  );
}

function DemoBanner() {
  return (
    <div className="bg-harvest-subtle border-b border-harvest-border px-4 py-2 text-xs text-harvest-text-muted flex items-center justify-center space-x-2">
      <span className="font-semibold px-2 py-0.5 rounded bg-harvest-amber-muted text-harvest-forest-dark border border-harvest-amber/30">
        DEMO MODE ACTIVE
      </span>
      <span>TECH EMBED 2026 Smart AI Solutions Evaluation Environment. Synthetic test fixtures are isolated.</span>
    </div>
  );
}

function WelcomeHero() {
  const [health, setHealth] = useState(null);

  useEffect(() => {
    fetch('/api/health')
      .then(res => res.json())
      .then(data => setHealth(data))
      .catch(() => setHealth({ status: 'offline' }));
  }, []);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
      <div className="bg-harvest-forest-dark text-harvest-canvas rounded-3xl p-8 sm:p-12 lg:p-16 relative overflow-hidden shadow-harvest-lg">
        {/* Subtle decorative background gradient */}
        <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-harvest-forest/40 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-96 h-96 rounded-full bg-harvest-lime/10 blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-3xl">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-harvest-forest border border-harvest-lime/30 text-xs font-semibold text-harvest-lime mb-6">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Multi-NGO Capacity-Constrained Allocation</span>
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-heading font-extrabold tracking-tight leading-tight mb-6">
            Rescuing Surplus. <br />
            Feeding Communities with <span className="text-harvest-lime">Precision.</span>
          </h1>

          <p className="text-lg text-harvest-canvas/80 leading-relaxed mb-8">
            An intelligent food rescue engine that matches surplus food batches against real-time NGO demand, physical receiving capacity, and safe-use deadlines—ensuring zero over-allocation and rapid dynamic re-dispatch.
          </p>

          <div className="flex flex-wrap gap-4 items-center">
            <Link to="/auth" className="px-6 py-3.5 rounded-xl font-heading font-bold text-sm bg-harvest-lime text-harvest-forest-dark hover:bg-harvest-lime/90 transition-all shadow-harvest-sm">
              Launch Operational Portal
            </Link>
            <div className="inline-flex items-center space-x-2 text-xs text-harvest-canvas/70 px-4 py-3 rounded-xl bg-harvest-forest/50 border border-harvest-border/20">
              <span className={`w-2.5 h-2.5 rounded-full ${health?.status === 'ok' ? 'bg-harvest-lime' : 'bg-harvest-amber'}`} />
              <span>Core Engine: {health?.status === 'ok' ? 'Operational' : 'Initializing...'}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <Router>
      <div className="min-h-screen flex flex-col bg-harvest-canvas">
        <DemoBanner />
        <Header />
        <main className="flex-1">
          <Routes>
            <Route path="/" element={<WelcomeHero />} />
            <Route path="/impact" element={<div className="p-12 text-center text-harvest-text-muted">Impact Ledger Coming Soon</div>} />
            <Route path="/auth" element={<div className="p-12 text-center text-harvest-text-muted">Authentication Coming Soon</div>} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}
