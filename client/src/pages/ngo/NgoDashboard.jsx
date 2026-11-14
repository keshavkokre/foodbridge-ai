import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  HeartHandshake,
  Plus,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Sparkles,
  ShieldCheck,
  Truck,
  KeyRound
} from 'lucide-react';

export default function NgoDashboard() {
  const { user, profile, token } = useAuth();
  const [incomingAllocations, setIncomingAllocations] = useState([]);
  const [activeDemands, setActiveDemands] = useState([]);
  const [showDemandModal, setShowDemandModal] = useState(false);
  const [receiptOtps, setReceiptOtps] = useState({}); // allocationId -> OTP

  // Demand form
  const [category, setCategory] = useState('cooked_meals');
  const [servings, setServings] = useState(50);
  const [urgency, setUrgency] = useState('HIGH');
  const [deadline, setDeadline] = useState(
    new Date(Date.now() + 5 * 3600 * 1000).toISOString().slice(0, 16)
  );
  const [notes, setNotes] = useState('');

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, [token]);

  const fetchData = () => {
    fetch('/api/allocations/incoming', {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(r => r.json())
      .then(d => setIncomingAllocations(Array.isArray(d) ? d : []))
      .catch(() => {});

    fetch('/api/demands/my-active', {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(r => r.json())
      .then(d => setActiveDemands(Array.isArray(d) ? d : []))
      .catch(() => {});
  };

  const handleCreateDemand = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/demands', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          requestedCategories: [category],
          requestedServings: Number(servings),
          urgencyLevel: urgency,
          requiredBefore: new Date(deadline),
          notes,
          isDemo: user?.isDemo ?? true
        })
      });
      if (res.ok) {
        setShowDemandModal(false);
        fetchData();
      }
    } catch (err) {
      alert(err.message);
    }
  };

  const handleAcceptAllocation = async (allocId) => {
    try {
      const res = await fetch(`/api/allocations/${allocId}/accept`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        if (data.ngoReceiptOtp) {
          setReceiptOtps(prev => ({ ...prev, [allocId]: data.ngoReceiptOtp }));
        }
        fetchData();
      } else {
        alert(data.error || 'Failed to accept allocation');
      }
    } catch (err) {
      alert(err.message);
    }
  };

  const handleDeclineAllocation = async (allocId) => {
    const reason = prompt('Please specify reason for declining (e.g. Kitchen staff unavailable today, storage full):');
    if (reason === null) return;

    try {
      const res = await fetch(`/api/allocations/${allocId}/decline`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ reason: reason || 'Declined by NGO supervisor' })
      });
      if (res.ok) {
        fetchData();
      }
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Editorial Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-6 border-b border-harvest-border">
        <div>
          <span className="text-xs uppercase tracking-wider font-bold text-harvest-forest">Relief NGO Workspace</span>
          <h1 className="text-2xl sm:text-3xl font-heading font-extrabold text-harvest-forest-dark">
            {profile?.organizationName || user?.fullName || 'Relief Center'}
          </h1>
          <p className="text-xs text-harvest-text-muted mt-1">
            Receiving Capacity: <strong>{profile?.dailyReceivingCapacity || 80} Servings/day</strong> • Cold Storage: {profile?.coldStorageAvailable ? 'Available' : 'None'} • Hot Holding: {profile?.hotHoldingAvailable ? 'Available' : 'None'}
          </p>
        </div>

        <button
          onClick={() => setShowDemandModal(true)}
          className="px-5 py-3 rounded-xl bg-harvest-forest hover:bg-harvest-forest-light text-harvest-canvas font-heading font-bold text-xs shadow-harvest-sm flex items-center space-x-2 transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>Register Food Demand Need</span>
        </button>
      </div>

      {/* Incoming Proposed Allocations Workspace */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="w-2.5 h-2.5 rounded-full bg-harvest-lime animate-pulse" />
            <h2 className="text-lg font-heading font-bold text-harvest-forest-dark">
              Incoming Allocation Recommendations ({incomingAllocations.length})
            </h2>
          </div>
          <span className="text-xs text-harvest-text-muted">30-min Acceptance TTL Active</span>
        </div>

        {incomingAllocations.length === 0 ? (
          <div className="bg-harvest-surface rounded-2xl p-10 border border-harvest-border text-center text-xs text-harvest-text-muted">
            No incoming allocations pending right now. As food donors publish surplus, our Demand-First engine will match your active food requirements.
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {incomingAllocations.map((alloc) => (
              <div
                key={alloc._id}
                className="bg-harvest-surface rounded-2xl border border-harvest-forest shadow-harvest-md p-6 space-y-4 text-xs"
              >
                <div className="flex justify-between items-start pb-3 border-b border-harvest-border">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-harvest-forest">
                      Recommended Surplus Batch
                    </span>
                    <h3 className="font-heading font-bold text-base text-harvest-forest-dark">
                      {alloc.donationId?.title || 'Surplus Meal Batch'}
                    </h3>
                    <p className="text-harvest-text-muted text-[11px] mt-0.5">
                      Category: <span className="capitalize">{alloc.donationId?.category?.replace('_', ' ')}</span> • Storage: {alloc.donationId?.storageCondition?.replace('_', ' ')}
                    </p>
                  </div>

                  <div className="text-right">
                    <span className="font-heading font-extrabold text-lg text-harvest-forest">
                      {alloc.allocatedServings}
                    </span>
                    <span className="text-[11px] text-harvest-text-muted block">Servings Allocated</span>
                  </div>
                </div>

                {/* Explainable Rationale */}
                <div className="p-3.5 rounded-xl bg-harvest-subtle border border-harvest-border space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-heading font-bold text-[11px] text-harvest-forest-dark flex items-center space-x-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-harvest-forest" />
                      <span>AI Explainable Rationale</span>
                    </span>
                    <span className="px-2 py-0.5 rounded font-bold bg-harvest-lime text-harvest-forest-dark text-[10px]">
                      {alloc.matchScore}% Match Score
                    </span>
                  </div>
                  <p className="text-[11px] text-harvest-text-dark leading-relaxed">
                    {alloc.recommendationRationale}
                  </p>
                  <div className="pt-2 border-t border-harvest-border/60 flex flex-wrap gap-2 text-[10px] text-harvest-text-muted">
                    <span>Distance: {alloc.scoreBreakdown?.distanceKm || 2.1} km</span>
                    <span>•</span>
                    <span>Transit ETA: ~{alloc.scoreBreakdown?.estimatedTransitMins || 12} mins</span>
                    <span>•</span>
                    <span>Capacity Fit: 100%</span>
                  </div>
                </div>

                {/* Receipt OTP Display if accepted */}
                {receiptOtps[alloc._id] && (
                  <div className="p-3.5 rounded-xl bg-harvest-forest text-harvest-canvas flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-semibold text-harvest-lime block">Your Handover Receipt OTP:</span>
                      <span className="text-xs text-harvest-canvas/80">Give this 6-digit code to the arriving driver:</span>
                    </div>
                    <div className="font-heading font-black text-2xl tracking-widest text-harvest-lime px-3 py-1 rounded bg-harvest-forest-dark border border-harvest-lime/30">
                      {receiptOtps[alloc._id]}
                    </div>
                  </div>
                )}

                {/* Actions */}
                {!receiptOtps[alloc._id] && (
                  <div className="pt-2 flex justify-end space-x-3">
                    <button
                      onClick={() => handleDeclineAllocation(alloc._id)}
                      className="px-4 py-2.5 rounded-xl border border-harvest-border text-harvest-crimson hover:bg-harvest-canvas font-semibold text-xs transition-colors flex items-center space-x-1"
                    >
                      <XCircle className="w-3.5 h-3.5" />
                      <span>Decline</span>
                    </button>
                    <button
                      onClick={() => handleAcceptAllocation(alloc._id)}
                      className="px-5 py-2.5 rounded-xl bg-harvest-forest hover:bg-harvest-forest-light text-harvest-canvas font-heading font-bold text-xs shadow-harvest-sm transition-all flex items-center space-x-1.5"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 text-harvest-lime" />
                      <span>Accept Allocation</span>
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Active Demands Table */}
      <div className="bg-harvest-surface rounded-2xl border border-harvest-border shadow-harvest-sm overflow-hidden">
        <div className="p-5 border-b border-harvest-border flex justify-between items-center bg-harvest-subtle">
          <h3 className="font-heading font-bold text-sm text-harvest-forest-dark">Your Active Nutritional Demands</h3>
          <span className="text-xs text-harvest-text-muted">{activeDemands.length} demands recorded</span>
        </div>

        {activeDemands.length === 0 ? (
          <div className="p-10 text-center text-xs text-harvest-text-muted">
            No active demands registered. Click &quot;Register Food Demand Need&quot; above to declare your meal needs.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-harvest-canvas text-harvest-text-muted uppercase text-[10px] tracking-wider border-b border-harvest-border">
                <tr>
                  <th className="py-3.5 px-5">Requested Categories</th>
                  <th className="py-3.5 px-4">Needed / Fulfilled</th>
                  <th className="py-3.5 px-4">Remaining Needed</th>
                  <th className="py-3.5 px-4">Urgency Tier</th>
                  <th className="py-3.5 px-4">Need Before</th>
                  <th className="py-3.5 px-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-harvest-border">
                {activeDemands.map((dm) => (
                  <tr key={dm._id} className="hover:bg-harvest-canvas/50 transition-colors">
                    <td className="py-3.5 px-5 font-semibold text-harvest-forest-dark capitalize">
                      {dm.requestedCategories?.join(', ').replace(/_/g, ' ')}
                    </td>
                    <td className="py-3.5 px-4">
                      {dm.requestedServings} requested
                    </td>
                    <td className="py-3.5 px-4 font-heading font-bold text-harvest-forest">
                      {dm.remainingServings} Servings
                    </td>
                    <td className="py-3.5 px-4">
                      <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                        dm.urgencyLevel === 'CRITICAL' ? 'bg-harvest-crimson text-harvest-canvas' :
                        dm.urgencyLevel === 'HIGH' ? 'bg-harvest-amber text-harvest-forest-dark' :
                        'bg-harvest-subtle text-harvest-text-dark border border-harvest-border'
                      }`}>
                        {dm.urgencyLevel}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-harvest-text-muted">
                      {new Date(dm.requiredBefore).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-[10px] uppercase tracking-wider text-harvest-forest">
                      {dm.status}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Register Demand Modal */}
      {showDemandModal && (
        <div className="fixed inset-0 bg-harvest-forest-dark/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-harvest-surface rounded-2xl border border-harvest-border shadow-harvest-lg max-w-lg w-full p-6 sm:p-8 space-y-6">
            <div className="flex justify-between items-center pb-4 border-b border-harvest-border">
              <h3 className="font-heading font-bold text-lg text-harvest-forest-dark">
                Register Food Demand Requirement
              </h3>
              <button onClick={() => setShowDemandModal(false)} className="text-harvest-text-muted text-sm font-bold">
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateDemand} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-harvest-forest-dark mb-1">Required Food Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-harvest-border bg-harvest-canvas focus:outline-none"
                >
                  <option value="cooked_meals">Cooked Meals (Warm/Ready to Eat)</option>
                  <option value="raw_produce">Raw Produce (Fresh Veggies/Fruit)</option>
                  <option value="packaged_groceries">Packaged Dry Groceries (Rice, Flour, Oil)</option>
                  <option value="bakery_dairy">Bakery & Dairy Items</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-harvest-forest-dark mb-1">Servings / Portions Needed</label>
                <input
                  type="number"
                  min="1"
                  required
                  value={servings}
                  onChange={(e) => setServings(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-harvest-border bg-harvest-canvas focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-harvest-forest-dark mb-1">Demand Urgency Priority</label>
                <select
                  value={urgency}
                  onChange={(e) => setUrgency(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-harvest-border bg-harvest-canvas focus:outline-none"
                >
                  <option value="STANDARD">Standard Priority (Next meal window)</option>
                  <option value="HIGH">High Priority (Immediate meal deficit)</option>
                  <option value="CRITICAL">Critical Emergency (Urgent relief required)</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-harvest-forest-dark mb-1">Must Arrive Before Deadline</label>
                <input
                  type="datetime-local"
                  required
                  value={deadline}
                  onChange={(e) => setDeadline(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-harvest-border bg-harvest-canvas focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-harvest-forest-dark mb-1">Dietary or Operational Notes</label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. Mild spice preferred for elderly residents."
                  className="w-full px-3 py-2 rounded-xl border border-harvest-border bg-harvest-canvas focus:outline-none"
                />
              </div>

              <div className="pt-4 flex justify-end space-x-3 border-t border-harvest-border">
                <button
                  type="button"
                  onClick={() => setShowDemandModal(false)}
                  className="px-4 py-2 rounded-xl border border-harvest-border text-harvest-text-muted hover:bg-harvest-canvas"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-harvest-forest hover:bg-harvest-forest-light text-harvest-canvas font-heading font-bold shadow-harvest-sm"
                >
                  Publish Demand Need
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
