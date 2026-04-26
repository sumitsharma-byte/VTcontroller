'use client';

import { useState, FormEvent, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { authApi, setToken, setUser } from '@/lib/api';
import { Shield, Mail, Lock, Eye, EyeOff, AlertCircle } from 'lucide-react';

const ADMIN_EMAIL = 'admin@vibethoery.ai';

export default function VtcAdminLoginPage() {
  const router = useRouter();
  const [email, setEmail]       = useState(ADMIN_EMAIL);
  const [password, setPassword] = useState('');
  const [showPwd, setShowPwd]   = useState(false);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');

  // If already logged in as admin, go straight to panel
  useEffect(() => {
    const stored = localStorage.getItem('vtc_admin_token');
    if (stored) router.replace('/vtc-admin/panel');
  }, [router]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await authApi.login(email, password);
      if (res.user.role !== 'admin') {
        setError('Access denied. Admin credentials required.');
        return;
      }
      // Store separately from main app session
      localStorage.setItem('vtc_admin_token', res.token);
      localStorage.setItem('vtc_admin_user', JSON.stringify(res.user));
      router.push('/vtc-admin/panel');
    } catch (err: any) {
      setError(err.message || 'Invalid admin credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0a0e1a 0%, #0d1220 50%, #0a1528 100%)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '24px',
    }}>
      {/* Glow effects */}
      <div style={{ position: 'fixed', top: '10%', left: '20%', width: 400, height: 400, borderRadius: '50%', background: 'rgba(124,90,243,0.06)', filter: 'blur(100px)', pointerEvents: 'none' }} />
      <div style={{ position: 'fixed', bottom: '15%', right: '15%', width: 350, height: 350, borderRadius: '50%', background: 'rgba(239,68,68,0.05)', filter: 'blur(100px)', pointerEvents: 'none' }} />

      <div style={{
        width: '100%', maxWidth: '420px',
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: '20px',
        padding: '40px',
        backdropFilter: 'blur(20px)',
        boxShadow: '0 32px 64px rgba(0,0,0,0.5)',
      }}>
        {/* Icon + title */}
        <div style={{ textAlign: 'center', marginBottom: '36px' }}>
          <div style={{
            width: 60, height: 60, borderRadius: '16px',
            background: 'linear-gradient(135deg, #7c5af3, #ef4444)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 20px',
            boxShadow: '0 8px 24px rgba(124,90,243,0.3)',
          }}>
            <Shield size={28} color="white" />
          </div>
          <h1 style={{ fontFamily: 'Space Grotesk, sans-serif', fontWeight: 800, fontSize: '22px', color: '#f0f2f8', marginBottom: '6px' }}>
            Admin Portal
          </h1>
          <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.4)' }}>
            Restricted access · VTcontroller
          </p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Email */}
          <div>
            <label style={{ fontSize: '11px', fontWeight: 700, color: 'rgba(255,255,255,0.5)', display: 'block', marginBottom: '8px', letterSpacing: '0.5px', textTransform: 'uppercase' }}>
              Admin Email
            </label>
            <div style={{ position: 'relative' }}>
              <Mail size={14} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.3)' }} />
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                autoComplete="username"
                style={{
                  width: '100%', padding: '11px 12px 11px 38px',
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '10px', color: '#f0f2f8',
                  fontSize: '13px', outline: 'none',
                  boxSizing: 'border-box',
                }}
                onFocus={e => (e.currentTarget.style.borderColor = 'rgba(124,90,243,0.6)')}
                onBlur={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)')}
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <label style={{ fontSize: '11px', fontWeight: 700, color: 'rgba(255,255,255,0.5)', display: 'block', marginBottom: '8px', letterSpacing: '0.5px', textTransform: 'uppercase' }}>
              Password
            </label>
            <div style={{ position: 'relative' }}>
              <Lock size={14} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.3)' }} />
              <input
                type={showPwd ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                placeholder="••••••••••"
                style={{
                  width: '100%', padding: '11px 38px 11px 38px',
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '10px', color: '#f0f2f8',
                  fontSize: '13px', outline: 'none',
                  boxSizing: 'border-box',
                }}
                onFocus={e => (e.currentTarget.style.borderColor = 'rgba(124,90,243,0.6)')}
                onBlur={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)')}
              />
              <button
                type="button"
                onClick={() => setShowPwd(p => !p)}
                style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.35)', padding: 0 }}
              >
                {showPwd ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 12px', borderRadius: '8px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', fontSize: '13px', color: '#ef4444' }}>
              <AlertCircle size={14} />
              {error}
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%', padding: '12px',
              background: loading ? 'rgba(124,90,243,0.5)' : 'linear-gradient(135deg, #7c5af3, #5b3fd4)',
              border: 'none', borderRadius: '10px',
              color: 'white', fontWeight: 700, fontSize: '14px',
              cursor: loading ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
              marginTop: '4px',
              boxShadow: '0 8px 20px rgba(124,90,243,0.3)',
              transition: 'all 0.2s',
            }}
          >
            {loading ? (
              <>
                <span style={{ display: 'inline-block', width: 16, height: 16, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
                Authenticating...
              </>
            ) : (
              <><Shield size={15} /> Access Admin Panel</>
            )}
          </button>
        </form>

        {/* Footer */}
        <p style={{ textAlign: 'center', fontSize: '11px', color: 'rgba(255,255,255,0.25)', marginTop: '28px', lineHeight: 1.6 }}>
          This portal is restricted to authorized administrators only.<br />
          Unauthorized access attempts are logged.
        </p>
      </div>

      {/* Animations are now in globals.css */}
    </div>
  );
}
