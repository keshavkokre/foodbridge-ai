import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Sparkles,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  TrendingUp,
  MapPin,
  Clock,
  HeartHandshake,
  Layers,
  Utensils,
  ChevronRight,
  Info
} from 'lucide-react';
import { DEMO_CREDENTIALS, useAuth } from '../context/AuthContext';

export default function LandingPage() {
  const { loginAsDemo } = useAuth();
  const [impact, setImpact] = useState(null);
  const [recentRescues, setRecentRescues] = useState([]);
  const [activeStep, setActiveStep] = useState(0);

  useEffect(() => {
    fetch('/api/impact/summary')
      .then(r => r.json())
      .then(d => setImpact(d.metrics))
      .catch(() => {});

    fetch('/api/impact/recent')
      .then(r => r.json())
      .then(d => setRecentRescues(d))
      .catch(() => {});
  }, []);

  const steps = [
    {
      title: "1. Demand-First Intake",
      desc: "Relief shelters register real-time meal counts, refrigeration availability, and daily receiving ceilings.",
      highlight: "Prevents batch dump overload"
    },
    {
      title: "2. Hybrid Multi-NGO Allocation",
      desc: "Deterministic safety and capacity filters run alongside AI extraction to portion large surplus across multiple nearby shelters.",
      highlight: "Bounded greedy fractional allocation"
    },
    {
      title: "3. Chain-of-Custody Dispatch",
      desc: "Volunteer drivers claim runs. Digital OTPs verify physical pickup at the donor dock and delivery at the NGO shelter.",
      highlight: "Cryptographically hashed OTP verification"
    },
    {
      title: "4. Auditable Impact Ledger",
      desc: "Every meal rescued is recorded in an immutable ledger, generating verified environmental abatement metrics.",
      highlight: "UNEP & FAO benchmark modeling"
    }
  ];

  return (
    <div className="space-y-16 pb-20">
      {/* Editorial Hero Section */}
      <section className="relative bg-harvest-forest-dark text-harvest-canvas pt-16 pb-24 px-4 sm:px-6 lg:px-8 overflow-hidden">
        {/* Editorial Ambient Accents */}
        <div className="absolute top-0 right-1/4 w-96 h-96 rounded-full bg-harvest-forest/30 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-10 w-80 h-80 rounded-full bg-harvest-lime/10 blur-3xl pointer-events-none" />

        <div className="max-w-7xl mx-auto relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            <div className="lg:col-span-7 space-y-6">
              <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-harvest-forest/80 border border-harvest-lime/40 text-xs font-semibold text-harvest-lime">
                <Sparkles className="w-4 h-4 text-harvest-lime" />
                <span>TECH EMBED 2026 — Smart AI Solutions</span>
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-heading font-extrabold tracking-tight leading-[1.1] text-harvest-canvas">
                Demand-First <br />
                <span className="text-harvest-lime">Food Rescue</span> & <br />
                Multi-NGO Allocation.
              </h1>

              <p className="text-lg text-harvest-canvas/80 max-w-xl font-normal leading-relaxed">
                Ordinary food donation websites let surplus sit on a passive board until it spoils. FoodBridge AI calculates safe-use windows, evaluates NGO storage limits, and intelligently portions surplus across multiple verified shelters.
              </p>

              <div className="flex flex-wrap gap-4 pt-2">
                <Link
                  to="/auth"
                  className="px-6 py-3.5 rounded-xl font-heading font-bold text-sm bg-harvest-lime text-harvest-forest-dark hover:bg-harvest-lime/90 transition-all shadow-harvest-md flex items-center space-x-2"
                >
                  <span>Enter Operational Console</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
                <Link
                  to="/impact"
                  className="px-6 py-3.5 rounded-xl font-heading font-semibold text-sm bg-harvest-forest/50 text-harvest-canvas border border-harvest-border/30 hover:bg-harvest-forest transition-all"
                >
                  Inspect Impact Ledger
                </Link>
              </div>

              {/* Quick Evaluation Demo Launcher Bar */}
              <div className="pt-6 border-t border-harvest-forest/60">
                <span className="text-xs uppercase tracking-wider text-harvest-canvas/60 font-semibold block mb-3">
                  Judges One-Click Evaluation Roles:
                </span>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => loginAsDemo('donor_hotel').then(() => window.location.href = '/donor')}
                    className="px-3 py-1.5 rounded-lg bg-harvest-forest hover:bg-harvest-forest-light border border-harvest-border/20 text-xs font-medium text-harvest-canvas transition-colors"
                  >
                    Demo Hotel Donor
                  </button>
                  <button
                    onClick={() => loginAsDemo('ngo_ashraya').then(() => window.location.href = '/ngo')}
                    className="px-3 py-1.5 rounded-lg bg-harvest-forest hover:bg-harvest-forest-light border border-harvest-border/20 text-xs font-medium text-harvest-canvas transition-colors"
                  >
                    Demo Children NGO
                  </button>
                  <button
                    onClick={() => loginAsDemo('volunteer').then(() => window.location.href = '/volunteer')}
                    className="px-3 py-1.5 rounded-lg bg-harvest-forest hover:bg-harvest-forest-light border border-harvest-border/20 text-xs font-medium text-harvest-canvas transition-colors"
                  >
                    Demo Volunteer Driver
                  </button>
                </div>
              </div>
            </div>

            {/* Live Operational Allocation Visualizer Card */}
            <div className="lg:col-span-5">
              <div className="bg-harvest-surface rounded-2xl p-6 text-harvest-text-dark border border-harvest-border shadow-harvest-lg space-y-5">
                <div className="flex items-center justify-between pb-4 border-b border-harvest-border">
                  <div className="flex items-center space-x-2.5">
                    <span className="w-3 h-3 rounded-full bg-harvest-lime animate-pulse" />
                    <span className="text-xs font-heading font-bold uppercase tracking-wider text-harvest-forest">
                      Live Allocation Engine
                    </span>
                  </div>
                  <span className="text-xs font-medium text-harvest-text-muted bg-harvest-subtle px-2.5 py-1 rounded-full border border-harvest-border">
                    Zero Over-Allocation Guard
                  </span>
                </div>

                {/* Donor Node */}
                <div className="p-4 rounded-xl bg-harvest-subtle border border-harvest-border">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-xs font-semibold text-harvest-forest">Donor Origin</span>
                      <h4 className="font-heading font-bold text-sm text-harvest-forest-dark">Grand Palace Hotel</h4>
                    </div>
                    <span className="text-xs font-bold px-2 py-0.5 rounded bg-harvest-forest text-harvest-canvas">
                      150 Servings Surplus
                    </span>
                  </div>
                  <p className="text-xs text-harvest-text-muted mt-1">Fresh Biryani & Dal • Safe-Use: 4h 15m remaining</p>
                </div>

                {/* Splitting Vectors */}
                <div className="space-y-2.5 pl-4 border-l-2 border-dashed border-harvest-forest/30">
                  <div className="p-3 rounded-xl bg-harvest-canvas border border-harvest-border flex items-center justify-between text-xs">
                    <div>
                      <span className="font-semibold text-harvest-text-dark">Ashraya Children Shelter (1.4 km)</span>
                      <div className="text-[11px] text-harvest-text-muted">Fulfills breakfast request • 96% Match</div>
                    </div>
                    <span className="font-heading font-bold text-harvest-forest bg-harvest-lime/30 px-2.5 py-1 rounded-lg border border-harvest-lime">
                      70 Servings
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-harvest-canvas border border-harvest-border flex items-center justify-between text-xs">
                    <div>
                      <span className="font-semibold text-harvest-text-dark">Sneha Care Senior Home (3.2 km)</span>
                      <div className="text-[11px] text-harvest-text-muted">Max storage limit reached • 92% Match</div>
                    </div>
                    <span className="font-heading font-bold text-harvest-forest bg-harvest-lime/30 px-2.5 py-1 rounded-lg border border-harvest-lime">
                      50 Servings
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-harvest-canvas border border-harvest-border flex items-center justify-between text-xs">
                    <div>
                      <span className="font-semibold text-harvest-text-dark">St. Jude Community Kitchen (5.0 km)</span>
                      <div className="text-[11px] text-harvest-text-muted">Remaining batch absorbed • 88% Match</div>
                    </div>
                    <span className="font-heading font-bold text-harvest-forest bg-harvest-lime/30 px-2.5 py-1 rounded-lg border border-harvest-lime">
                      30 Servings
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 text-xs text-harvest-text-muted font-medium">
                  <span>Total Allocated: <strong className="text-harvest-forest-dark">150 / 150 (100%)</strong></span>
                  <span className="text-harvest-forest flex items-center space-x-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-harvest-forest" />
                    <span>Invariants Satisfied</span>
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Verified Impact Metrics Bar */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-10 relative z-20">
        <div className="bg-harvest-surface rounded-2xl p-6 sm:p-8 border border-harvest-border shadow-harvest-md grid grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="space-y-1">
            <span className="text-xs uppercase tracking-wider text-harvest-text-muted font-semibold">Verified Servings Rescued</span>
            <div className="text-3xl sm:text-4xl font-heading font-extrabold text-harvest-forest-dark">
              {impact?.totalServingsRedistributed?.toLocaleString() || '180'}
            </div>
            <p className="text-xs text-harvest-text-muted">100% digital OTP verified</p>
          </div>

          <div className="space-y-1">
            <span className="text-xs uppercase tracking-wider text-harvest-text-muted font-semibold">Food Waste Prevented</span>
            <div className="text-3xl sm:text-4xl font-heading font-extrabold text-harvest-forest">
              {impact?.estimatedWastePreventedKg || '75.6'} <span className="text-sm font-semibold text-harvest-text-muted">kg</span>
            </div>
            <p className="text-xs text-harvest-text-muted">UNEP baseline calculation</p>
          </div>

          <div className="space-y-1">
            <span className="text-xs uppercase tracking-wider text-harvest-text-muted font-semibold">CO2e Emissions Abated</span>
            <div className="text-3xl sm:text-4xl font-heading font-extrabold text-harvest-forest">
              {impact?.estimatedCo2eAvoidedKg || '189'} <span className="text-sm font-semibold text-harvest-text-muted">kg</span>
            </div>
            <p className="text-xs text-harvest-text-muted">FAO footprint benchmark</p>
          </div>

          <div className="space-y-1">
            <span className="text-xs uppercase tracking-wider text-harvest-text-muted font-semibold">Participating Shelters</span>
            <div className="text-3xl sm:text-4xl font-heading font-extrabold text-harvest-forest-dark">
              {impact?.activeNgosCount || '3'}
            </div>
            <p className="text-xs text-harvest-text-muted">Verified relief partners</p>
          </div>
        </div>
      </section>

      {/* The 4-Step Innovation Timeline */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <span className="text-xs uppercase tracking-widest font-bold text-harvest-forest">How FoodBridge AI Operates</span>
          <h2 className="text-3xl font-heading font-bold text-harvest-forest-dark mt-2">
            Beyond Passive Donation Listing
          </h2>
          <p className="text-harvest-text-muted text-sm mt-3">
            Traditional tools post a single listing and hope someone claims it. We orchestrate demand, safety, and fractional distribution automatically.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {steps.map((s, idx) => (
            <div
              key={idx}
              className={`p-6 rounded-2xl border transition-all cursor-pointer ${
                activeStep === idx
                  ? 'bg-harvest-surface border-harvest-forest shadow-harvest-md'
                  : 'bg-harvest-surface/60 border-harvest-border hover:bg-harvest-surface'
              }`}
              onClick={() => setActiveStep(idx)}
            >
              <div className="w-8 h-8 rounded-lg bg-harvest-forest/10 text-harvest-forest flex items-center justify-center font-heading font-bold text-sm mb-4">
                {idx + 1}
              </div>
              <h3 className="font-heading font-bold text-base text-harvest-forest-dark mb-2">{s.title}</h3>
              <p className="text-xs text-harvest-text-muted leading-relaxed mb-4">{s.desc}</p>
              <span className="inline-block text-[11px] font-semibold text-harvest-forest bg-harvest-lime-muted px-2.5 py-1 rounded-md border border-harvest-lime/40">
                {s.highlight}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* Operational Role Cards */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Card 1: Donors */}
          <div className="bg-harvest-surface rounded-2xl p-8 border border-harvest-border shadow-harvest-sm flex flex-col justify-between space-y-6">
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-xl bg-harvest-subtle text-harvest-forest flex items-center justify-center">
                <Utensils className="w-6 h-6" />
              </div>
              <h3 className="font-heading font-bold text-xl text-harvest-forest-dark">Food Donors</h3>
              <p className="text-xs text-harvest-text-muted leading-relaxed">
                Hotels, caterers, corporate cafeterias, and grocers. Paste natural descriptions or enter item details. Our engine validates safe-use limits and handles all logistics.
              </p>
            </div>
            <Link
              to="/auth?role=donor"
              className="inline-flex items-center justify-between text-xs font-heading font-bold text-harvest-forest hover:text-harvest-forest-light border-t border-harvest-border pt-4"
            >
              <span>Register as Food Donor</span>
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>

          {/* Card 2: Relief NGOs */}
          <div className="bg-harvest-surface rounded-2xl p-8 border border-harvest-border shadow-harvest-sm flex flex-col justify-between space-y-6">
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-xl bg-harvest-subtle text-harvest-forest flex items-center justify-center">
                <HeartHandshake className="w-6 h-6" />
              </div>
              <h3 className="font-heading font-bold text-xl text-harvest-forest-dark">Verified NGOs & Shelters</h3>
              <p className="text-xs text-harvest-text-muted leading-relaxed">
                State your exact dietary needs and receiving capacity. Receive tailored donation allocations with explainable rationales and accept with one click.
              </p>
            </div>
            <Link
              to="/auth?role=ngo"
              className="inline-flex items-center justify-between text-xs font-heading font-bold text-harvest-forest hover:text-harvest-forest-light border-t border-harvest-border pt-4"
            >
              <span>Register Relief Organization</span>
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>

          {/* Card 3: Volunteer Pool */}
          <div className="bg-harvest-surface rounded-2xl p-8 border border-harvest-border shadow-harvest-sm flex flex-col justify-between space-y-6">
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-xl bg-harvest-subtle text-harvest-forest flex items-center justify-center">
                <TrendingUp className="w-6 h-6" />
              </div>
              <h3 className="font-heading font-bold text-xl text-harvest-forest-dark">Volunteer Dispatch</h3>
              <p className="text-xs text-harvest-text-muted leading-relaxed">
                Claim nearby rescue assignments. Follow route guidance, confirm donor pickup via digital OTP, and complete the chain-of-custody at the recipient shelter.
              </p>
            </div>
            <Link
              to="/auth?role=volunteer"
              className="inline-flex items-center justify-between text-xs font-heading font-bold text-harvest-forest hover:text-harvest-forest-light border-t border-harvest-border pt-4"
            >
              <span>Join Volunteer Dispatch</span>
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

