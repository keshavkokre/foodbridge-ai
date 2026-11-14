import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

export const DEMO_CREDENTIALS = {
  donor_hotel: {
    email: 'hotel.donor@foodbridge.demo',
    password: 'DemoPassword2026!',
    label: 'Grand Palace Hotel (Donor)',
    role: 'donor',
    badge: 'Donor'
  },
  donor_market: {
    email: 'market.donor@foodbridge.demo',
    password: 'DemoPassword2026!',
    label: 'FreshHarvest Organics (Donor)',
    role: 'donor',
    badge: 'Donor'
  },
  ngo_ashraya: {
    email: 'ashraya.shelter@foodbridge.demo',
    password: 'DemoPassword2026!',
    label: 'Ashraya Children Home (NGO)',
    role: 'ngo',
    badge: 'NGO'
  },
  ngo_sneha: {
    email: 'sneha.care@foodbridge.demo',
    password: 'DemoPassword2026!',
    label: 'Sneha Care Senior Shelter (NGO)',
    role: 'ngo',
    badge: 'NGO'
  },
  volunteer: {
    email: 'rohan.volunteer@foodbridge.demo',
    password: 'DemoPassword2026!',
    label: 'Rohan Sharma (Volunteer Driver)',
    role: 'volunteer',
    badge: 'Volunteer'
  },
  admin: {
    email: 'admin@foodbridge.demo',
    password: 'DemoPassword2026!',
    label: 'Ananya (Compliance Officer)',
    role: 'admin',
    badge: 'Admin'
  }
};

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('foodbridge_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [token, setToken] = useState(() => localStorage.getItem('foodbridge_token') || null);
  const [profile, setProfile] = useState(() => {
    const saved = localStorage.getItem('foodbridge_profile');
    return saved ? JSON.parse(saved) : null;
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (token) {
      fetch('/api/auth/me', {
        headers: { Authorization: `Bearer ${token}` }
      })
        .then(res => res.ok ? res.json() : null)
        .then(data => {
          if (data?.user) {
            setUser(data.user);
            setProfile(data.profile);
            localStorage.setItem('foodbridge_user', JSON.stringify(data.user));
            if (data.profile) localStorage.setItem('foodbridge_profile', JSON.stringify(data.profile));
          } else {
            logout();
          }
        })
        .catch(() => {});
    }
  }, [token]);

  const login = async (email, password) => {
    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Login failed');

      setToken(data.token);
      setUser(data.user);
      setProfile(data.profile);
      localStorage.setItem('foodbridge_token', data.token);
      localStorage.setItem('foodbridge_user', JSON.stringify(data.user));
      if (data.profile) localStorage.setItem('foodbridge_profile', JSON.stringify(data.profile));

      return data.user;
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    setProfile(null);
    localStorage.removeItem('foodbridge_token');
    localStorage.removeItem('foodbridge_user');
    localStorage.removeItem('foodbridge_profile');
  };

  const loginAsDemo = async (demoKey) => {
    const creds = DEMO_CREDENTIALS[demoKey];
    if (creds) {
      return login(creds.email, creds.password);
    }
  };

  return (
    <AuthContext.Provider value={{ user, token, profile, loading, login, logout, loginAsDemo }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
}
