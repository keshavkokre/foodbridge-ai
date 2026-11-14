import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  Utensils,
  Plus,
  Sparkles,
  Clock,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  ShieldCheck,
  Truck,
  Eye,
  KeyRound
} from 'lucide-react';

export default function DonorDashboard() {
  const { user, token } = useAuth();
  const [donations, setDonations] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [latestAllocationResult, setLatestAllocationResult] = useState(null);

  // Form states
  const [aiPrompt, setAiPrompt] = useState('');
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('cooked_meals');
  const [totalServings, setTotalServings] = useState(60);
  const [measuredWeightKg, setMeasuredWeightKg] = useState(24);
  const [prepTime, setPrepTime] = useState(new Date().toISOString().slice(0, 16));
  const [safeUseDeadline, setSafeUseDeadline] = useState(
    new Date(Date.now() + 4 * 3600 * 1000).toISOString().slice(0, 16)
  );
  const [storageCondition, setStorageCondition] = useState('hot_holding');
  const [packagingDescription, setPackagingDescription] = useState('Food-grade sealed thermal containers');
  const [allergens, setAllergens] = useState(['Dairy']);
  const [donorCertifiedSafe, setDonorCertifiedSafe] = useState(true);

  useEffect(() => {
    fetchDonations();
  }, [token]);

  const fetchDonations = () => {
    fetch('/api/donations', {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => setDonations(Array.isArray(data) ? data : []))
      .catch(() => {});
  };

  const handleAiExtract = async () => {
    if (!aiPrompt.trim()) return;
    setExtracting(true);
    try {
      const res = await fetch('/api/donations/ai-extract', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ text: aiPrompt })
      });
      const data = await res.json();
      if (res.ok) {
        setTitle(data.title || title);
        setCategory(data.category || category);
        setTotalServings(data.totalServings || totalServings);
        setStorageCondition(data.storageCondition || storageCondition);
        if (data.allergenAlerts) setAllergens(data.allergenAlerts);
        if (data.safeUseHoursRemaining) {
          setSafeUseDeadline(
            new Date(Date.now() + data.safeUseHoursRemaining * 3600 * 1000).toISOString().slice(0, 16)
          );
        }
      }
    } finally {
      setExtracting(false);
    }
  };

  const handleCreateDonation = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch('/api/donations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          title,
          category,
          totalServings: Number(totalServings),
          totalWeightKg: measuredWeightKg ? Number(measuredWeightKg) : undefined,
          preparationTime: new Date(prepTime),
          safeUseDeadline: new Date(safeUseDeadline),
          storageCondition,
          packagingDescription,
          allergenAlerts: allergens,
          isDemo: user?.isDemo ?? true
        })
      });
      const data = await res.json();
      if (res.ok) {
        setLatestAllocationResult(data.matchingResult);
        setShowModal(false);
        fetchDonations();
      } else {
        alert(data.error || 'Failed to create donation');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Editorial Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-6 border-b border-harvest-border">
        <div>
          <span className="text-xs uppercase tracking-wider font-bold text-harvest-forest">Food Donor Operations</span>
          <h1 className="text-2xl sm:text-3xl font-heading font-extrabold text-harvest-forest-dark">
            {user?.fullName || 'Donor Workspace'}
          </h1>
          <p className="text-xs text-harvest-text-muted mt-1">
            Publish surplus food batches for intelligent capacity-constrained multi-NGO allocation.
          </p>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="px-5 py-3 rounded-xl bg-harvest-forest hover:bg-harvest-forest-light text-harvest-canvas font-heading font-bold text-xs shadow-harvest-sm flex items-center space-x-2 transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>Register New Food Rescue</span>
        </button>
      </div>

      {/* Latest Allocation Live Notice (When an allocation just executed) */}
      {latestAllocationResult && (
        <div className="bg-harvest-surface rounded-2xl p-6 border border-harvest-forest shadow-harvest-md space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-harvest-border">
            <div className="flex items-center space-x-2">
              <span className="w-3 h-3 rounded-full bg-harvest-lime animate-ping" />
              <h3 className="font-heading font-bold text-sm text-harvest-forest-dark">
                Intelligent Allocation Engine Executed Successfully!
              </h3>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 rounded bg-harvest-lime text-harvest-forest-dark">
              {latestAllocationResult.totalAllocatedServings} Servings Portioned
            </span>
          </div>

          <p className="text-xs text-harvest-text-muted">
            The batch was automatically portioned across {latestAllocationResult.allocatedCount} verified NGO recipient(s) without exceeding physical capacity limits:
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {latestAllocationResult.allocations?.map((alloc, i) => (
              <div key={i} className="p-4 rounded-xl bg-harvest-canvas border border-harvest-border space-y-2 text-xs">
                <div className="flex justify-between items-start">
                  <strong className="text-harvest-forest-dark font-heading">
                    {alloc.organizationName || `NGO Recipient #${i + 1}`}
                  </strong>
                  <span className="font-bold px-2 py-0.5 rounded bg-harvest-forest text-harvest-canvas">
                    {alloc.allocatedServings} Servings
                  </span>
                </div>
                <div className="text-[11px] text-harvest-text-muted leading-relaxed">
                  {alloc.recommendationRationale}
                </div>
                <div className="pt-2 border-t border-harvest-border flex justify-between items-center text-[10px] text-harvest-forest font-semibold">
                  <span>Match Score: {alloc.matchScore}%</span>
                  <span>Response TTL: 30 mins</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Operational Pipeline Table */}
      <div className="bg-harvest-surface rounded-2xl border border-harvest-border shadow-harvest-sm overflow-hidden">
        <div className="p-5 border-b border-harvest-border flex justify-between items-center bg-harvest-subtle">
          <h3 className="font-heading font-bold text-sm text-harvest-forest-dark">Active Food Rescue Pipeline</h3>
          <span className="text-xs text-harvest-text-muted">{donations.length} total recorded batches</span>
        </div>

        {donations.length === 0 ? (
          <div className="p-12 text-center text-harvest-text-muted text-xs">
            No food donations registered yet. Click &quot;Register New Food Rescue&quot; above to create your first surplus batch.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-harvest-canvas text-harvest-text-muted uppercase text-[10px] tracking-wider border-b border-harvest-border">
                <tr>
                  <th className="py-3.5 px-5">Batch Title</th>
                  <th className="py-3.5 px-4">Category</th>
                  <th className="py-3.5 px-4">Total / Unallocated</th>
                  <th className="py-3.5 px-4">Storage Condition</th>
                  <th className="py-3.5 px-4">Safe-Use Deadline</th>
                  <th className="py-3.5 px-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-harvest-border">
                {donations.map((d) => (
                  <tr key={d._id} className="hover:bg-harvest-canvas/50 transition-colors">
                    <td className="py-3.5 px-5 font-semibold text-harvest-forest-dark">
                      {d.title}
                    </td>
                    <td className="py-3.5 px-4 capitalize text-harvest-text-muted">
                      {d.category.replace('_', ' ')}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="font-heading font-bold text-harvest-forest-dark">{d.totalServings}</span>
                      <span className="text-harvest-text-muted"> / {d.remainingServings} left</span>
                    </td>
                    <td className="py-3.5 px-4 capitalize text-harvest-text-muted">
                      {d.storageCondition.replace('_', ' ')}
                    </td>
                    <td className="py-3.5 px-4 text-harvest-text-muted">
                      {new Date(d.safeUseDeadline).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        d.status === 'COMPLETED' ? 'bg-harvest-forest text-harvest-canvas' :
                        d.status === 'ALLOCATED' || d.status === 'PARTIALLY_ALLOCATED' ? 'bg-harvest-lime text-harvest-forest-dark' :
                        d.status === 'IN_TRANSIT' ? 'bg-harvest-amber text-harvest-forest-dark' :
                        'bg-harvest-subtle text-harvest-text-dark border border-harvest-border'
                      }`}>
                        {d.status.replace('_', ' ')}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Register Donation Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-harvest-forest-dark/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-harvest-surface rounded-2xl border border-harvest-border shadow-harvest-lg max-w-2xl w-full p-6 sm:p-8 space-y-6 my-8">
            <div className="flex justify-between items-center pb-4 border-b border-harvest-border">
              <div>
                <h3 className="font-heading font-bold text-lg text-harvest-forest-dark">
                  Register Surplus Food Donation
                </h3>
                <p className="text-xs text-harvest-text-muted">
                  Intelligently portioned across verified nearby relief shelters.
                </p>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="text-harvest-text-muted hover:text-harvest-forest-dark text-sm font-bold"
              >
                ✕
              </button>
            </div>

            {/* Smart Unstructured Text Intake */}
            <div className="p-4 rounded-xl bg-harvest-subtle border border-harvest-border space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-heading font-bold text-harvest-forest flex items-center space-x-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-harvest-forest" />
                  <span>Smart Natural-Language Intake</span>
                </span>
                <span className="text-[10px] text-harvest-text-muted">Gemini & Heuristic Engine</span>
              </div>
              <textarea
                rows={2}
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                placeholder="e.g. We have approx 90 portions of freshly cooked vegetable biryani packed at 2 PM, safe until 6:30 PM, loading dock Gate 3."
                className="w-full p-2.5 rounded-lg border border-harvest-border bg-harvest-surface text-xs focus:ring-1 focus:ring-harvest-forest focus:outline-none"
              />
              <button
                type="button"
                onClick={handleAiExtract}
                disabled={extracting || !aiPrompt.trim()}
                className="px-3 py-1.5 rounded-lg bg-harvest-forest text-harvest-canvas text-xs font-semibold hover:bg-harvest-forest-light transition-all flex items-center space-x-1.5"
              >
                <Sparkles className="w-3 h-3 text-harvest-lime" />
                <span>{extracting ? 'Analyzing...' : 'Auto-Fill Form with AI'}</span>
              </button>
            </div>

            {/* Structured Form */}
            <form onSubmit={handleCreateDonation} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-harvest-forest-dark mb-1">Surplus Batch Title</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Fresh Vegetable Biryani & Dal Banquet Surplus"
                  className="w-full px-3 py-2 rounded-xl border border-harvest-border bg-harvest-canvas focus:outline-none focus:ring-1 focus:ring-harvest-forest"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-harvest-forest-dark mb-1">Food Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-harvest-border bg-harvest-canvas focus:outline-none focus:ring-1 focus:ring-harvest-forest"
                  >
                    <option value="cooked_meals">Cooked / Prepared Meals</option>
                    <option value="raw_produce">Raw Produce (Veggies)</option>
                    <option value="packaged_groceries">Packaged Groceries</option>
                    <option value="bakery_dairy">Bakery & Dairy</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-harvest-forest-dark mb-1">Total Servings</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={totalServings}
                    onChange={(e) => setTotalServings(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-harvest-border bg-harvest-canvas focus:outline-none focus:ring-1 focus:ring-harvest-forest"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-harvest-forest-dark mb-1">Weight (kg) <span className="font-normal text-harvest-text-muted">(Opt)</span></label>
                  <input
                    type="number"
                    min="1"
                    step="0.5"
                    value={measuredWeightKg}
                    onChange={(e) => setMeasuredWeightKg(e.target.value)}
                    placeholder="e.g. 24"
                    className="w-full px-3 py-2 rounded-xl border border-harvest-border bg-harvest-canvas focus:outline-none focus:ring-1 focus:ring-harvest-forest"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-harvest-forest-dark mb-1">Preparation Timestamp</label>
                  <input
                    type="datetime-local"
                    required
                    value={prepTime}
                    onChange={(e) => setPrepTime(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-harvest-border bg-harvest-canvas focus:outline-none focus:ring-1 focus:ring-harvest-forest"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-harvest-forest-dark mb-1">Safe-Use Consumption Deadline</label>
                  <input
                    type="datetime-local"
                    required
                    value={safeUseDeadline}
                    onChange={(e) => setSafeUseDeadline(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-harvest-border bg-harvest-canvas focus:outline-none focus:ring-1 focus:ring-harvest-forest"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-harvest-forest-dark mb-1">Storage Condition</label>
                  <select
                    value={storageCondition}
                    onChange={(e) => setStorageCondition(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-harvest-border bg-harvest-canvas focus:outline-none focus:ring-1 focus:ring-harvest-forest"
                  >
                    <option value="hot_holding">Hot Holding (Insulated/Heated)</option>
                    <option value="refrigerated">Refrigerated (&lt; 5°C)</option>
                    <option value="room_temperature">Room Temperature (Ambient)</option>
                    <option value="frozen">Frozen (&lt; -18°C)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-harvest-forest-dark mb-1">Packaging Description</label>
                  <input
                    type="text"
                    value={packagingDescription}
                    onChange={(e) => setPackagingDescription(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-harvest-border bg-harvest-canvas focus:outline-none focus:ring-1 focus:ring-harvest-forest"
                  />
                </div>
              </div>

              <div className="pt-2">
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    required
                    checked={donorCertifiedSafe}
                    onChange={(e) => setDonorCertifiedSafe(e.target.checked)}
                    className="rounded text-harvest-forest focus:ring-harvest-forest"
                  />
                  <span className="text-xs text-harvest-text-dark font-medium">
                    I attest this food was prepared, handled, and stored under sanitary conditions compliant with food safety guidelines.
                  </span>
                </label>
              </div>

              <div className="pt-4 flex justify-end space-x-3 border-t border-harvest-border">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-xl border border-harvest-border text-harvest-text-muted hover:bg-harvest-canvas"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2.5 rounded-xl bg-harvest-forest hover:bg-harvest-forest-light text-harvest-canvas font-heading font-bold shadow-harvest-sm flex items-center space-x-2"
                >
                  <span>{loading ? 'Executing Engine...' : 'Run Allocation Engine'}</span>
                  <ArrowRight className="w-4 h-4 text-harvest-lime" />
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

