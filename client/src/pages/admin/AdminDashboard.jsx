import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  ShieldCheck,
  Building,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  Database,
  RefreshCw,
  Search,
  Sparkles,
  Truck,
  Users,
  FileText
} from 'lucide-react';

export default function AdminDashboard() {
  const { user, token } = useAuth();
  const [overview, setOverview] = useState(null);
  const [queue, setQueue] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('pending'); // 'pending' | 'all' | 'verified'
  const [searchQuery, setSearchQuery] = useState('');
  const [actionNotes, setActionNotes] = useState({});
  const [activeTab, setActiveTab] = useState('queue'); // 'queue' | 'monitoring' | 'health'
  const [statusMessage, setStatusMessage] = useState(null);

  useEffect(() => {
    fetchAdminData();
    const timer = setInterval(fetchAdminData, 12000);
    return () => clearInterval(timer);
  }, [token]);

  const fetchAdminData = async () => {
    try {
      const [ovRes, qRes] = await Promise.all([
        fetch('/api/admin/overview', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/admin/verification-queue', { headers: { Authorization: `Bearer ${token}` } })
      ]);

      if (ovRes.ok) {
        const ovData = await ovRes.json();
        setOverview(ovData);
      }
      if (qRes.ok) {
        const qData = await qRes.json();
        setQueue(qData.queue || []);
      }
    } catch (err) {
      console.error('[ADMIN FETCH ERROR]', err);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (ngoId) => {
    try {
      const notes = actionNotes[ngoId] || 'Verified by Platform Administrator';
      const res = await fetch(`/api/admin/ngos/${ngoId}/approve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ notes })
      });
      const data = await res.json();
      if (res.ok) {
        setStatusMessage({ type: 'success', text: data.message });
        fetchAdminData();
      } else {
        setStatusMessage({ type: 'error', text: data.error || 'Failed to approve NGO' });
      }
    } catch (err) {
      setStatusMessage({ type: 'error', text: err.message });
    }
  };

  const handleReject = async (ngoId) => {
    try {
      const reason = actionNotes[ngoId] || 'Documentation incomplete or expired';
      const res = await fetch(`/api/admin/ngos/${ngoId}/reject`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ reason })
      });
      const data = await res.json();
      if (res.ok) {
        setStatusMessage({ type: 'success', text: data.message });
        fetchAdminData();
      } else {
        setStatusMessage({ type: 'error', text: data.error || 'Failed to reject NGO' });
      }
    } catch (err) {
      setStatusMessage({ type: 'error', text: err.message });
    }
  };

  const filteredQueue = queue.filter(item => {
    const matchesSearch = item.organizationName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          item.registrationNumber?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          item.user?.email?.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;
    if (filter === 'pending') return !item.isApprovedByAdmin;
    if (filter === 'verified') return item.isApprovedByAdmin;
    return true;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Editorial Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-6 border-b border-harvest-border">
        <div>
          <div className="flex items-center space-x-2">
            <span className="text-xs uppercase tracking-wider font-bold text-harvest-forest">Compliance & Operations</span>
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-harvest-lime text-harvest-forest-dark">
              Auditor Portal
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-heading font-extrabold text-harvest-forest-dark mt-1">
            Platform Administration
          </h1>
          <p className="text-xs text-harvest-text-muted mt-1">
            Review NGO safety registrations, monitor dynamic allocation flows, and inspect system integrity.
          </p>
        </div>

        <button
          onClick={fetchAdminData}
          className="px-4 py-2 rounded-xl bg-harvest-surface border border-harvest-border text-xs font-semibold text-harvest-forest-dark hover:bg-harvest-subtle transition-all flex items-center space-x-2 shadow-harvest-sm"
        >
          <RefreshCw className="w-3.5 h-3.5 text-harvest-forest" />
          <span>Refresh Live State</span>
        </button>
      </div>

      {statusMessage && (
        <div className={`p-4 rounded-xl text-xs flex items-center justify-between ${
          statusMessage.type === 'success'
            ? 'bg-harvest-lime-muted border border-harvest-lime text-harvest-forest-dark'
            : 'bg-harvest-amber-muted border border-harvest-amber text-harvest-forest-dark'
        }`}>
          <div className="flex items-center space-x-2">
            {statusMessage.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-harvest-forest flex-shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-harvest-crimson flex-shrink-0" />
            )}
            <span>{statusMessage.text}</span>
          </div>
          <button onClick={() => setStatusMessage(null)} className="font-bold text-xs opacity-60 hover:opacity-100">✕</button>
        </div>
      )}

      {/* METRIC CARDS */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-harvest-surface border border-harvest-border shadow-harvest-sm">
          <div className="flex items-center justify-between text-harvest-text-muted mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider">Verified NGOs</span>
            <ShieldCheck className="w-4 h-4 text-harvest-forest" />
          </div>
          <div className="text-2xl font-heading font-extrabold text-harvest-forest-dark">
            {overview?.ngos?.verified ?? '—'}
            <span className="text-xs font-normal text-harvest-text-muted ml-1.5">
              / {overview?.ngos?.total ?? '—'} total
            </span>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-harvest-surface border border-harvest-border shadow-harvest-sm">
          <div className="flex items-center justify-between text-harvest-text-muted mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider">Pending Approval</span>
            <AlertTriangle className="w-4 h-4 text-harvest-amber" />
          </div>
          <div className="text-2xl font-heading font-extrabold text-harvest-amber">
            {overview?.ngos?.pending ?? '0'}
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-harvest-surface border border-harvest-border shadow-harvest-sm">
          <div className="flex items-center justify-between text-harvest-text-muted mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider">Active Allocations</span>
            <Truck className="w-4 h-4 text-harvest-forest" />
          </div>
          <div className="text-2xl font-heading font-extrabold text-harvest-forest-dark">
            {overview?.allocations?.active ?? '0'}
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-harvest-surface border border-harvest-border shadow-harvest-sm">
          <div className="flex items-center justify-between text-harvest-text-muted mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider">Rescued Meals</span>
            <Sparkles className="w-4 h-4 text-harvest-forest" />
          </div>
          <div className="text-2xl font-heading font-extrabold text-harvest-forest-dark">
            {overview?.donations?.totalRescuedServings?.toLocaleString() ?? '0'}
          </div>
        </div>
      </div>

      {/* WORKSPACE NAVIGATION TABS */}
      <div className="flex space-x-2 border-b border-harvest-border pb-1">
        <button
          onClick={() => setActiveTab('queue')}
          className={`px-4 py-2.5 rounded-xl font-heading font-bold text-xs transition-all flex items-center space-x-2 ${
            activeTab === 'queue'
              ? 'bg-harvest-forest text-harvest-canvas shadow-harvest-sm'
              : 'text-harvest-text-muted hover:text-harvest-forest hover:bg-harvest-subtle'
          }`}
        >
          <Building className="w-3.5 h-3.5" />
          <span>NGO Verification Queue ({overview?.ngos?.pending ?? 0})</span>
        </button>

        <button
          onClick={() => setActiveTab('monitoring')}
          className={`px-4 py-2.5 rounded-xl font-heading font-bold text-xs transition-all flex items-center space-x-2 ${
            activeTab === 'monitoring'
              ? 'bg-harvest-forest text-harvest-canvas shadow-harvest-sm'
              : 'text-harvest-text-muted hover:text-harvest-forest hover:bg-harvest-subtle'
          }`}
        >
          <Clock className="w-3.5 h-3.5" />
          <span>Operations & Allocation Integrity</span>
        </button>

        <button
          onClick={() => setActiveTab('health')}
          className={`px-4 py-2.5 rounded-xl font-heading font-bold text-xs transition-all flex items-center space-x-2 ${
            activeTab === 'health'
              ? 'bg-harvest-forest text-harvest-canvas shadow-harvest-sm'
              : 'text-harvest-text-muted hover:text-harvest-forest hover:bg-harvest-subtle'
          }`}
        >
          <Database className="w-3.5 h-3.5" />
          <span>Storage & Health Diagnostics</span>
        </button>
      </div>

      {/* TAB 1: VERIFICATION QUEUE */}
      {activeTab === 'queue' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setFilter('pending')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${
                  filter === 'pending'
                    ? 'bg-harvest-amber text-harvest-forest-dark font-bold'
                    : 'bg-harvest-surface border border-harvest-border text-harvest-text-muted'
                }`}
              >
                Awaiting Verification ({overview?.ngos?.pending ?? 0})
              </button>
              <button
                onClick={() => setFilter('verified')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${
                  filter === 'verified'
                    ? 'bg-harvest-forest text-harvest-canvas font-bold'
                    : 'bg-harvest-surface border border-harvest-border text-harvest-text-muted'
                }`}
              >
                Approved ({overview?.ngos?.verified ?? 0})
              </button>
              <button
                onClick={() => setFilter('all')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${
                  filter === 'all'
                    ? 'bg-harvest-forest-dark text-harvest-canvas font-bold'
                    : 'bg-harvest-surface border border-harvest-border text-harvest-text-muted'
                }`}
              >
                All Organizations ({overview?.ngos?.total ?? 0})
              </button>
            </div>

            <div className="relative w-full sm:w-64">
              <Search className="w-3.5 h-3.5 text-harvest-text-muted absolute left-3 top-3" />
              <input
                type="text"
                placeholder="Search NGO name, reg no..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 rounded-xl border border-harvest-border bg-harvest-surface text-xs focus:ring-1 focus:ring-harvest-forest outline-none"
              />
            </div>
          </div>

          {filteredQueue.length === 0 ? (
            <div className="p-12 text-center rounded-2xl bg-harvest-surface border border-harvest-border text-xs text-harvest-text-muted">
              No NGO profiles matching the current filter.
            </div>
          ) : (
            <div className="space-y-4">
              {filteredQueue.map((item) => {
                const ngoId = item._id || item.id;
                return (
                  <div
                    key={ngoId}
                    className="p-6 rounded-2xl bg-harvest-surface border border-harvest-border shadow-harvest-sm space-y-4"
                  >
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 pb-3 border-b border-harvest-border">
                      <div>
                        <div className="flex items-center space-x-2">
                          <h3 className="text-base font-heading font-bold text-harvest-forest-dark">
                            {item.organizationName}
                          </h3>
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            item.isApprovedByAdmin
                              ? 'bg-harvest-lime text-harvest-forest-dark'
                              : 'bg-harvest-amber-muted text-harvest-forest-dark border border-harvest-amber/40'
                          }`}>
                            {item.isApprovedByAdmin ? 'VERIFIED & ACTIVE' : 'PENDING APPROVAL'}
                          </span>
                        </div>
                        <p className="text-xs text-harvest-text-muted mt-0.5">
                          Reg No: <span className="font-mono text-harvest-forest-dark font-medium">{item.registrationNumber}</span> • Email: {item.user?.email || 'N/A'} • Phone: {item.user?.phone || 'N/A'}
                        </p>
                      </div>

                      <div className="text-xs text-harvest-text-muted text-right">
                        Daily Cap: <span className="font-bold text-harvest-forest-dark">{item.dailyReceivingCapacity} servings</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                      <div className="p-3 rounded-xl bg-harvest-subtle">
                        <span className="text-[10px] uppercase text-harvest-text-muted block">Beneficiaries</span>
                        <span className="font-bold text-harvest-forest-dark">{item.beneficiaryCount} people</span>
                      </div>
                      <div className="p-3 rounded-xl bg-harvest-subtle">
                        <span className="text-[10px] uppercase text-harvest-text-muted block">Cold Storage</span>
                        <span className="font-bold text-harvest-forest-dark">{item.coldStorageAvailable ? 'Equipped (Active Chill)' : 'No Cold Storage'}</span>
                      </div>
                      <div className="p-3 rounded-xl bg-harvest-subtle">
                        <span className="text-[10px] uppercase text-harvest-text-muted block">Hot Holding</span>
                        <span className="font-bold text-harvest-forest-dark">{item.hotHoldingAvailable ? 'Equipped (Thermal)' : 'No Hot Holding'}</span>
                      </div>
                      <div className="p-3 rounded-xl bg-harvest-subtle">
                        <span className="text-[10px] uppercase text-harvest-text-muted block">Reliability Score</span>
                        <span className="font-bold text-harvest-forest-dark">{((item.reliabilityScore || 1.0) * 100).toFixed(0)}%</span>
                      </div>
                    </div>

                    {item.verificationNotes && (
                      <div className="p-3 rounded-xl bg-harvest-canvas border border-harvest-border text-xs text-harvest-text-muted">
                        <span className="font-bold text-harvest-forest-dark">Audit History: </span>
                        {item.verificationNotes}
                      </div>
                    )}

                    {/* Action Panel */}
                    <div className="pt-2 flex flex-col sm:flex-row items-center gap-3">
                      <input
                        type="text"
                        placeholder="Add compliance notes or reason..."
                        value={actionNotes[ngoId] || ''}
                        onChange={(e) => setActionNotes({ ...actionNotes, [ngoId]: e.target.value })}
                        className="w-full sm:flex-1 px-3 py-2 rounded-xl border border-harvest-border bg-harvest-canvas text-xs focus:ring-1 focus:ring-harvest-forest outline-none"
                      />

                      <div className="flex items-center space-x-2 w-full sm:w-auto">
                        {!item.isApprovedByAdmin ? (
                          <button
                            onClick={() => handleApprove(ngoId)}
                            className="flex-1 sm:flex-initial px-4 py-2 rounded-xl bg-harvest-forest text-harvest-canvas font-heading font-bold text-xs hover:bg-harvest-forest-light transition-all flex items-center justify-center space-x-1.5 shadow-harvest-sm"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5 text-harvest-lime" />
                            <span>Approve for Engine</span>
                          </button>
                        ) : (
                          <button
                            onClick={() => handleReject(ngoId)}
                            className="flex-1 sm:flex-initial px-4 py-2 rounded-xl bg-harvest-subtle text-harvest-forest-dark border border-harvest-border font-heading font-bold text-xs hover:bg-harvest-amber-muted transition-all flex items-center justify-center space-x-1.5"
                          >
                            <XCircle className="w-3.5 h-3.5 text-harvest-amber" />
                            <span>Revoke Approval</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: OPERATIONS & ALLOCATION MONITORING */}
      {activeTab === 'monitoring' && (
        <div className="p-6 rounded-2xl bg-harvest-surface border border-harvest-border shadow-harvest-sm space-y-6">
          <div>
            <h3 className="font-heading font-bold text-base text-harvest-forest-dark">
              Algorithmic Allocation Monitor
            </h3>
            <p className="text-xs text-harvest-text-muted mt-1">
              Active allocations are strictly constrained by donation batch size and individual NGO capacity limits.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div className="p-4 rounded-xl bg-harvest-subtle border border-harvest-border">
              <span className="text-[10px] font-bold uppercase tracking-wider text-harvest-text-muted">Total Allocations</span>
              <div className="text-xl font-heading font-bold text-harvest-forest-dark mt-1">
                {overview?.allocations?.total ?? 0}
              </div>
            </div>

            <div className="p-4 rounded-xl bg-harvest-subtle border border-harvest-border">
              <span className="text-[10px] font-bold uppercase tracking-wider text-harvest-text-muted">Declined / Reallocated</span>
              <div className="text-xl font-heading font-bold text-harvest-amber mt-1">
                {overview?.allocations?.declined ?? 0}
              </div>
            </div>

            <div className="p-4 rounded-xl bg-harvest-subtle border border-harvest-border">
              <span className="text-[10px] font-bold uppercase tracking-wider text-harvest-text-muted">Expired Reservations</span>
              <div className="text-xl font-heading font-bold text-harvest-text-muted mt-1">
                {overview?.allocations?.expired ?? 0}
              </div>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-harvest-lime-muted border border-harvest-lime text-xs space-y-1">
            <div className="font-heading font-bold text-harvest-forest-dark flex items-center space-x-2">
              <ShieldCheck className="w-4 h-4 text-harvest-forest" />
              <span>Multi-Allocation Invariant Enforced</span>
            </div>
            <p className="text-harvest-forest-dark">
              Sum of fractional allocations cannot exceed available batch quantity. Unallocated surplus is never silently dropped.
            </p>
          </div>
        </div>
      )}

      {/* TAB 3: STORAGE & SYSTEM HEALTH */}
      {activeTab === 'health' && (
        <div className="p-6 rounded-2xl bg-harvest-surface border border-harvest-border shadow-harvest-sm space-y-6">
          <div>
            <h3 className="font-heading font-bold text-base text-harvest-forest-dark">
              System Infrastructure & Dual-Mode Persistence
            </h3>
            <p className="text-xs text-harvest-text-muted mt-1">
              Ensures zero deployment friction: automatically connects to MongoDB Atlas Free Tier when available, and gracefully falls back to local persistent store for offline hackathon demonstrations.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="p-4 rounded-xl bg-harvest-subtle border border-harvest-border space-y-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-harvest-text-muted">Active Database Mode</span>
              <div className="text-sm font-mono font-bold text-harvest-forest">
                {overview?.systemHealth?.storage?.label || 'Local Persistent Demo Store'}
              </div>
              <p className="text-[11px] text-harvest-text-muted">
                Mode: {overview?.systemHealth?.storage?.mode || 'LOCAL_PERSISTENT_DEMO_STORE'}
              </p>
            </div>

            <div className="p-4 rounded-xl bg-harvest-subtle border border-harvest-border space-y-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-harvest-text-muted">Server Status & Uptime</span>
              <div className="text-sm font-mono font-bold text-harvest-forest-dark">
                {overview?.systemHealth?.status || 'HEALTHY'} • {overview?.systemHealth?.uptimeSeconds}s uptime
              </div>
              <p className="text-[11px] text-harvest-text-muted">
                Server Time: {overview?.systemHealth?.serverTime}
              </p>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-harvest-canvas border border-harvest-border text-xs text-harvest-text-muted space-y-2">
            <span className="font-bold text-harvest-forest-dark block">AI Allocation & Natural Language Engine</span>
            <p>
              Runtime Model: <span className="font-mono text-harvest-forest font-bold">gemini-3.8-flash</span> (configurable) with deterministic heuristic parser fallback. System is fully resilient to API quota exhaustion or zero-connectivity states.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
