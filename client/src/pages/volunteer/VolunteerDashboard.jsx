import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  Truck,
  MapPin,
  Clock,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  KeyRound,
  ArrowRight,
  Sparkles,
  Navigation
} from 'lucide-react';

export default function VolunteerDashboard() {
  const { user, token } = useAuth();
  const [availableRuns, setAvailableRuns] = useState([]);
  const [activeRun, setActiveRun] = useState(null);
  const [donorOtp, setDonorOtp] = useState('');
  const [ngoOtp, setNgoOtp] = useState('');
  const [verifiedServings, setVerifiedServings] = useState(50);
  const [tempChecked, setTempChecked] = useState('compliant');
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  useEffect(() => {
    fetchRuns();
    const interval = setInterval(fetchRuns, 8000);
    return () => clearInterval(interval);
  }, [token]);

  const fetchRuns = () => {
    fetch('/api/assignments/available', {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(r => r.json())
      .then(d => setAvailableRuns(Array.isArray(d) ? d : []))
      .catch(() => {});

    fetch('/api/assignments/active', {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(r => r.json())
      .then(d => {
        setActiveRun(d && d._id ? d : null);
        if (d?.donationId?.totalServings) {
          setVerifiedServings(d.donationId.totalServings);
        }
      })
      .catch(() => {});
  };

  const handleClaimRun = async (assignmentId) => {
    setError(null);
    try {
      const res = await fetch(`/api/assignments/${assignmentId}/claim`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        fetchRuns();
      } else {
        setError(data.error || 'Failed to claim assignment');
      }
    } catch (err) {
      setError(err.message);
    }
  };

  const handleMilestone = async (status) => {
    if (!activeRun) return;
    try {
      const res = await fetch(`/api/assignments/${activeRun._id}/milestone`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ status })
      });
      if (res.ok) fetchRuns();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleVerifyPickup = async (e) => {
    e.preventDefault();
    setError(null);
    try {
      const res = await fetch('/api/assignments/verify-pickup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          assignmentId: activeRun._id,
          otpCode: donorOtp.trim()
        })
      });
      const data = await res.json();
      if (res.ok) {
        setDonorOtp('');
        setSuccessMessage('Donor pickup verified via OTP! Proceed to recipient shelter.');
        fetchRuns();
      } else {
        setError(data.error || 'Invalid Donor OTP');
      }
    } catch (err) {
      setError(err.message);
    }
  };

  const handleVerifyDelivery = async (e) => {
    e.preventDefault();
    setError(null);
    try {
      const res = await fetch('/api/assignments/verify-delivery', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          assignmentId: activeRun._id,
          otpCode: ngoOtp.trim(),
          receivedServings: Number(verifiedServings),
          storageConditionAtReceipt: tempChecked
        })
      });
      const data = await res.json();
      if (res.ok) {
        setNgoOtp('');
        setSuccessMessage(`Rescue delivered and verified! ${data.verifiedServings} meals successfully rescued.`);
        fetchRuns();
      } else {
        setError(data.error || 'Invalid NGO OTP');
      }
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Editorial Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-6 border-b border-harvest-border">
        <div>
          <span className="text-xs uppercase tracking-wider font-bold text-harvest-forest">Volunteer Dispatch</span>
          <h1 className="text-2xl sm:text-3xl font-heading font-extrabold text-harvest-forest-dark">
            {user?.fullName || 'Volunteer Driver'}
          </h1>
          <p className="text-xs text-harvest-text-muted mt-1">
            Claim emergency food rescue routes and complete two-sided digital OTP handovers.
          </p>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-harvest-amber-muted border border-harvest-amber/40 text-xs text-harvest-forest-dark flex items-center space-x-2">
          <AlertTriangle className="w-4 h-4 text-harvest-crimson flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {successMessage && (
        <div className="p-4 rounded-xl bg-harvest-lime-muted border border-harvest-lime text-xs text-harvest-forest-dark flex items-center space-x-2">
          <CheckCircle2 className="w-4 h-4 text-harvest-forest flex-shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* ACTIVE RESCUE RUN STEPPER */}
      {activeRun && (
        <div className="bg-harvest-surface rounded-2xl border-2 border-harvest-forest shadow-harvest-md p-6 sm:p-8 space-y-6">
          <div className="flex justify-between items-center pb-4 border-b border-harvest-border">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-harvest-forest px-2.5 py-1 rounded-full bg-harvest-lime">
                Active Rescue In Progress
              </span>
              <h2 className="text-xl font-heading font-bold text-harvest-forest-dark mt-2">
                {activeRun.donationId?.title || 'Surplus Food Batch'}
              </h2>
            </div>
            <span className="font-heading font-bold text-xs px-3 py-1.5 rounded-lg bg-harvest-subtle text-harvest-forest-dark border border-harvest-border">
              Status: {activeRun.status.replace(/_/g, ' ')}
            </span>
          </div>

          {/* Route Milestones */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
            {/* Origin Node */}
            <div className="p-4 rounded-xl bg-harvest-subtle border border-harvest-border space-y-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-harvest-text-muted">
                1. Pickup Location (Donor Dock)
              </span>
              <div className="font-heading font-bold text-sm text-harvest-forest-dark">
                {activeRun.pickupAddress?.street || 'Donor Dock'}
              </div>
              <p className="text-[11px] text-harvest-text-muted">{activeRun.pickupAddress?.city || 'Bangalore'}</p>
            </div>

            {/* Destination Node */}
            <div className="p-4 rounded-xl bg-harvest-subtle border border-harvest-border space-y-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-harvest-text-muted">
                2. Delivery Location (Recipient Shelter)
              </span>
              <div className="font-heading font-bold text-sm text-harvest-forest-dark">
                {activeRun.ngoId?.fullName || 'Recipient Center'}
              </div>
              <p className="text-[11px] text-harvest-text-muted">{activeRun.dropoffAddress?.street || 'Shelter Facility'}</p>
            </div>
          </div>

          {/* STEP 1: At Donor Dock Verification */}
          {activeRun.status === 'CLAIMED' && (
            <div className="p-5 rounded-xl bg-harvest-canvas border border-harvest-border flex flex-col sm:flex-row justify-between items-center gap-4">
              <div>
                <h4 className="font-heading font-bold text-sm text-harvest-forest-dark">En Route to Donor Dock</h4>
                <p className="text-xs text-harvest-text-muted">Drive to the donor location to collect the packaged surplus food.</p>
              </div>
              <button
                onClick={() => handleMilestone('ARRIVED_DONOR')}
                className="px-5 py-2.5 rounded-xl bg-harvest-forest text-harvest-canvas font-heading font-bold text-xs hover:bg-harvest-forest-light shadow-harvest-sm flex items-center space-x-1.5"
              >
                <Navigation className="w-3.5 h-3.5" />
                <span>Report Arrived at Donor Dock</span>
              </button>
            </div>
          )}

          {/* STEP 2: Enter Donor OTP */}
          {activeRun.status === 'ARRIVED_DONOR' && (
            <form onSubmit={handleVerifyPickup} className="p-6 rounded-xl bg-harvest-canvas border border-harvest-forest space-y-4">
              <div>
                <h4 className="font-heading font-bold text-sm text-harvest-forest-dark">Donor Dock Handover Verification</h4>
                <p className="text-xs text-harvest-text-muted">
                  Ask the donor manager for their 6-digit Donor Pickup OTP to verify physical collection:
                </p>
              </div>

              <div className="flex gap-3 max-w-sm">
                <input
                  type="text"
                  maxLength={6}
                  required
                  value={donorOtp}
                  onChange={(e) => setDonorOtp(e.target.value)}
                  placeholder="e.g. 482195"
                  className="px-4 py-2.5 rounded-xl border border-harvest-border bg-harvest-surface font-heading font-bold text-lg tracking-widest text-center focus:outline-none focus:ring-2 focus:ring-harvest-forest"
                />
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-harvest-forest text-harvest-canvas font-heading font-bold text-xs hover:bg-harvest-forest-light shadow-harvest-sm flex items-center space-x-1"
                >
                  <KeyRound className="w-3.5 h-3.5 text-harvest-lime" />
                  <span>Verify Pickup OTP</span>
                </button>
              </div>
            </form>
          )}

          {/* STEP 3: En Route to NGO */}
          {activeRun.status === 'EN_ROUTE' && (
            <div className="p-5 rounded-xl bg-harvest-canvas border border-harvest-border flex flex-col sm:flex-row justify-between items-center gap-4">
              <div>
                <h4 className="font-heading font-bold text-sm text-harvest-forest-dark">In Transit to Recipient Shelter</h4>
                <p className="text-xs text-harvest-text-muted">Transport the batch directly to the recipient shelter.</p>
              </div>
              <button
                onClick={() => handleMilestone('ARRIVED_NGO')}
                className="px-5 py-2.5 rounded-xl bg-harvest-forest text-harvest-canvas font-heading font-bold text-xs hover:bg-harvest-forest-light shadow-harvest-sm flex items-center space-x-1.5"
              >
                <Navigation className="w-3.5 h-3.5" />
                <span>Report Arrived at Recipient Shelter</span>
              </button>
            </div>
          )}

          {/* STEP 4: Enter NGO OTP & Handover Verification */}
          {activeRun.status === 'ARRIVED_NGO' && (
            <form onSubmit={handleVerifyDelivery} className="p-6 rounded-xl bg-harvest-canvas border border-harvest-forest space-y-4">
              <div>
                <h4 className="font-heading font-bold text-sm text-harvest-forest-dark">Recipient Shelter Handover Verification</h4>
                <p className="text-xs text-harvest-text-muted">
                  Ask the NGO receiving supervisor for their 6-digit NGO Receipt OTP code:
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="block font-semibold text-harvest-forest-dark mb-1">Enter NGO Receipt OTP</label>
                  <input
                    type="text"
                    maxLength={6}
                    required
                    value={ngoOtp}
                    onChange={(e) => setNgoOtp(e.target.value)}
                    placeholder="e.g. 930514"
                    className="w-full px-4 py-2.5 rounded-xl border border-harvest-border bg-harvest-surface font-heading font-bold text-lg tracking-widest text-center focus:outline-none focus:ring-2 focus:ring-harvest-forest"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-harvest-forest-dark mb-1">Actual Servings Handed Over</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={verifiedServings}
                    onChange={(e) => setVerifiedServings(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-harvest-border bg-harvest-surface font-heading font-bold text-base focus:outline-none focus:ring-2 focus:ring-harvest-forest"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full sm:w-auto px-6 py-3 rounded-xl bg-harvest-forest text-harvest-canvas font-heading font-bold text-xs hover:bg-harvest-forest-light shadow-harvest-sm flex items-center justify-center space-x-2"
              >
                <CheckCircle2 className="w-4 h-4 text-harvest-lime" />
                <span>Confirm Delivery & Finalize Rescue</span>
              </button>
            </form>
          )}
        </div>
      )}

      {/* AVAILABLE RESCUE RUNS FEED */}
      <div className="space-y-4">
        <h2 className="text-lg font-heading font-bold text-harvest-forest-dark">
          Available Emergency Rescue Runs ({availableRuns.length})
        </h2>

        {availableRuns.length === 0 ? (
          <div className="bg-harvest-surface rounded-2xl p-10 border border-harvest-border text-center text-xs text-harvest-text-muted">
            No unclaimed rescue runs available currently. As NGOs accept proposed allocations, dispatch assignments will appear here.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {availableRuns.map((run) => (
              <div
                key={run._id}
                className="bg-harvest-surface rounded-2xl border border-harvest-border shadow-harvest-sm p-6 space-y-4 text-xs hover:border-harvest-forest transition-colors"
              >
                <div className="flex justify-between items-start pb-3 border-b border-harvest-border">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-harvest-forest">
                      Unclaimed Dispatch Run
                    </span>
                    <h3 className="font-heading font-bold text-base text-harvest-forest-dark">
                      {run.donationId?.title || 'Surplus Meals'}
                    </h3>
                    <p className="text-harvest-text-muted text-[11px]">
                      {run.donationId?.totalServings || 50} Servings • Category: {run.donationId?.category?.replace('_', ' ')}
                    </p>
                  </div>
                  <span className="text-xs font-heading font-bold px-2.5 py-1 rounded bg-harvest-subtle text-harvest-forest-dark border border-harvest-border">
                    {run.estimatedDistanceKm || 2.5} km run
                  </span>
                </div>

                <div className="space-y-2 text-[11px] text-harvest-text-dark">
                  <div className="flex items-start space-x-2">
                    <span className="font-bold text-harvest-forest">Pickup:</span>
                    <span>{run.pickupAddress?.street || 'Donor Dock'}, {run.pickupAddress?.city || 'Bangalore'}</span>
                  </div>
                  <div className="flex items-start space-x-2">
                    <span className="font-bold text-harvest-forest">Dropoff:</span>
                    <span>{run.ngoId?.fullName || 'Recipient Center'}, {run.dropoffAddress?.street || 'Shelter'}</span>
                  </div>
                </div>

                <div className="pt-2 flex justify-end">
                  <button
                    onClick={() => handleClaimRun(run._id)}
                    disabled={Boolean(activeRun)}
                    className={`px-5 py-2.5 rounded-xl font-heading font-bold text-xs shadow-harvest-sm flex items-center space-x-1.5 transition-all ${
                      activeRun
                        ? 'bg-harvest-subtle text-harvest-text-muted cursor-not-allowed'
                        : 'bg-harvest-forest hover:bg-harvest-forest-light text-harvest-canvas'
                    }`}
                  >
                    <Truck className="w-3.5 h-3.5 text-harvest-lime" />
                    <span>{activeRun ? 'Active Run in Progress' : 'Claim Rescue Run'}</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
