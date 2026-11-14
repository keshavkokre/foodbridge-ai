import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth, DEMO_CREDENTIALS } from '../context/AuthContext';
import { ShieldCheck, UserCheck, Sparkles, AlertCircle, ArrowRight, Lock, Mail } from 'lucide-react';

export default function AuthPage() {
  const [searchParams] = useSearchParams();
  const defaultRole = searchParams.get('role') || 'donor';

  const [isLogin, setIsLogin] = useState(true);
  const [role, setRole] = useState(defaultRole);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState(null);

  const { login, loginAsDemo, loading } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    try {
      if (isLogin) {
        const user = await login(email, password);
        routeToDashboard(user.role);
      } else {
        const res = await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email,
            password,
            role,
            fullName,
            phone,
            isDemo: false
          })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Registration failed');
        const user = await login(email, password);
        routeToDashboard(user.role);
      }
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDemoLaunch = async (key) => {
    setError(null);
    try {
      const user = await loginAsDemo(key);
      routeToDashboard(user.role);
    } catch (err) {
      setError(err.message);
    }
  };

  const routeToDashboard = (userRole) => {
    if (userRole === 'donor') navigate('/donor');
    else if (userRole === 'ngo') navigate('/ngo');
    else if (userRole === 'volunteer') navigate('/volunteer');
    else navigate('/donor');
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-12">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Side: Editorial Context & One-Click Demo Roster */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-harvest-forest-dark text-harvest-canvas p-8 rounded-2xl shadow-harvest-md space-y-4">
            <div className="inline-flex items-center space-x-2 text-xs font-semibold text-harvest-lime">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Evaluation Roster</span>
            </div>
            <h2 className="text-2xl font-heading font-bold text-harvest-canvas">
              Experience the Full Vertical Slice
            </h2>
            <p className="text-xs text-harvest-canvas/80 leading-relaxed">
              No need to fill registration forms during judging. Click any persona below to authenticate instantly with verified demonstration credentials.
            </p>

            <div className="space-y-2.5 pt-2">
              {Object.entries(DEMO_CREDENTIALS).map(([key, cred]) => (
                <button
                  key={key}
                  onClick={() => handleDemoLaunch(key)}
                  disabled={loading}
                  className="w-full text-left p-3 rounded-xl bg-harvest-forest hover:bg-harvest-forest-light border border-harvest-border/20 transition-all flex items-center justify-between group"
                >
                  <div>
                    <div className="text-xs font-heading font-bold text-harvest-canvas group-hover:text-harvest-lime transition-colors">
                      {cred.label}
                    </div>
                    <div className="text-[11px] text-harvest-canvas/60">{cred.email}</div>
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-harvest-lime text-harvest-forest-dark">
                    {cred.badge}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right Side: Clean Form */}
        <div className="lg:col-span-7 bg-harvest-surface p-8 sm:p-10 rounded-2xl border border-harvest-border shadow-harvest-md space-y-6">
          <div className="flex border-b border-harvest-border pb-4 justify-between items-center">
            <div>
              <h3 className="text-xl font-heading font-bold text-harvest-forest-dark">
                {isLogin ? 'Sign In to FoodBridge AI' : 'Create New Account'}
              </h3>
              <p className="text-xs text-harvest-text-muted mt-1">
                {isLogin ? 'Access your operational workspace' : 'Select your organization role to register'}
              </p>
            </div>
            <div className="flex space-x-2 bg-harvest-subtle p-1 rounded-xl border border-harvest-border text-xs">
              <button
                onClick={() => setIsLogin(true)}
                className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                  isLogin ? 'bg-harvest-surface text-harvest-forest-dark font-bold shadow-harvest-sm' : 'text-harvest-text-muted'
                }`}
              >
                Sign In
              </button>
              <button
                onClick={() => setIsLogin(false)}
                className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                  !isLogin ? 'bg-harvest-surface text-harvest-forest-dark font-bold shadow-harvest-sm' : 'text-harvest-text-muted'
                }`}
              >
                Register
              </button>
            </div>
          </div>

          {error && (
            <div className="p-3.5 rounded-xl bg-harvest-amber-muted border border-harvest-amber/40 text-xs text-harvest-forest-dark flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 text-harvest-crimson flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <>
                <div>
                  <label className="block text-xs font-semibold text-harvest-forest-dark mb-1">
                    Select Your Role
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {['donor', 'ngo', 'volunteer'].map((r) => (
                      <button
                        key={r}
                        type="button"
                        onClick={() => setRole(r)}
                        className={`py-2 text-xs font-heading font-bold rounded-xl border capitalize transition-all ${
                          role === r
                            ? 'bg-harvest-forest text-harvest-canvas border-harvest-forest shadow-harvest-sm'
                            : 'bg-harvest-subtle text-harvest-text-muted border-harvest-border hover:bg-harvest-surface'
                        }`}
                      >
                        {r}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-harvest-forest-dark mb-1">
                    Full Name / Organization Name
                  </label>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder={role === 'ngo' ? 'e.g. Hope Children Shelter' : 'e.g. Grand Palace Hotel'}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-harvest-border bg-harvest-canvas text-xs focus:outline-none focus:ring-2 focus:ring-harvest-forest"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-harvest-forest-dark mb-1">
                    Contact Phone Number
                  </label>
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+91 98450 12345"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-harvest-border bg-harvest-canvas text-xs focus:outline-none focus:ring-2 focus:ring-harvest-forest"
                  />
                </div>
              </>
            )}

            <div>
              <label className="block text-xs font-semibold text-harvest-forest-dark mb-1">
                Email Address
              </label>
              <div className="relative">
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@organization.org"
                  className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-harvest-border bg-harvest-canvas text-xs focus:outline-none focus:ring-2 focus:ring-harvest-forest"
                />
                <Mail className="w-4 h-4 text-harvest-text-muted absolute left-3 top-2.5" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-harvest-forest-dark mb-1">
                Password
              </label>
              <div className="relative">
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-harvest-border bg-harvest-canvas text-xs focus:outline-none focus:ring-2 focus:ring-harvest-forest"
                />
                <Lock className="w-4 h-4 text-harvest-text-muted absolute left-3 top-2.5" />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl bg-harvest-forest hover:bg-harvest-forest-light text-harvest-canvas font-heading font-bold text-xs transition-all shadow-harvest-sm flex items-center justify-center space-x-2"
            >
              <span>{loading ? 'Processing...' : (isLogin ? 'Sign In to Workspace' : 'Complete Registration')}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

