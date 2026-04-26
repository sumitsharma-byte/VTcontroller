'use client';

import { useState, FormEvent, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { Zap, Mail, Lock, ArrowRight, Eye, EyeOff, AlertCircle } from 'lucide-react';

export default function LoginPage() {
  const { login } = useAuth();
  const router = useRouter();

  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [showPwd, setShowPwd]   = useState(false);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');

  // Prefetch the dashboard route so the development server compiles it 
  // in the background while the user is typing, making the transition instant.
  useEffect(() => {
    router.prefetch('/dashboard');
  }, [router]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Invalid email or password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', display: 'flex', overflow: 'hidden' }}>

      {/* Left panel – branding */}
      <div style={{
        flex: 1,
        background: 'linear-gradient(135deg, #0f1117 0%, #13151d 40%, #1a1030 100%)',
        borderRight: '1px solid var(--border)',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        padding: '60px', position: 'relative', overflow: 'hidden',
      }}>
        {/* Glow orbs */}
        <div style={{ position: 'absolute', top: '20%', left: '30%', width: 300, height: 300, borderRadius: '50%', background: 'rgba(79,142,247,0.08)', filter: 'blur(80px)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: '25%', right: '20%', width: 250, height: 250, borderRadius: '50%', background: 'rgba(124,90,243,0.08)', filter: 'blur(80px)', pointerEvents: 'none' }} />

        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '48px' }}>
          <div style={{ width: 52, height: 52, borderRadius: '14px', background: 'var(--gradient-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 8px 24px rgba(79,142,247,0.3)' }}>
            <Zap size={26} color="white" />
          </div>
          <span style={{ fontFamily: 'Space Grotesk, sans-serif', fontWeight: 800, fontSize: '26px', color: 'var(--text-primary)' }}>VTcontroller</span>
        </div>

        <div style={{ maxWidth: 460, textAlign: 'center' }}>
          <h1 style={{ fontFamily: 'Space Grotesk, sans-serif', fontWeight: 800, fontSize: '38px', lineHeight: 1.2, marginBottom: '20px', background: 'linear-gradient(135deg, #f0f2f8 0%, #8892a4 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            Your AI-powered<br />Work OS
          </h1>
          <p style={{ fontSize: '16px', color: 'var(--text-muted)', lineHeight: 1.7, marginBottom: '48px' }}>
            VTcontroller doesn't just manage tasks.<br />
            It <strong style={{ color: 'var(--text-secondary)' }}>understands</strong>, <strong style={{ color: 'var(--text-secondary)' }}>predicts</strong>, and <strong style={{ color: 'var(--text-secondary)' }}>improves</strong> execution.
          </p>

          {/* Feature pills */}
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', justifyContent: 'center' }}>
            {['AI Delay Prediction', 'Kanban Board', 'Admin Insights', 'Real-time Updates'].map(f => (
              <span key={f} style={{ padding: '6px 14px', borderRadius: '20px', background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border)', fontSize: '12px', color: 'var(--text-muted)' }}>{f}</span>
            ))}
          </div>
        </div>

        {/* Stats */}
        <div style={{ display: 'flex', gap: '40px', marginTop: '60px', paddingTop: '40px', borderTop: '1px solid var(--border)' }}>
          {[
            { val: '4', label: 'Active Projects' },
            { val: '10+', label: 'Tasks Tracked' },
            { val: '7', label: 'Team Members' },
            { val: '77%', label: 'Avg Efficiency' },
          ].map(s => (
            <div key={s.label} style={{ textAlign: 'center' }}>
              <div style={{ fontFamily: 'Space Grotesk, sans-serif', fontWeight: 800, fontSize: '28px', background: 'var(--gradient-primary)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>{s.val}</div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Right panel – form */}
      <div style={{ width: '440px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '48px 40px', background: 'var(--bg-secondary)' }}>
        <div style={{ width: '100%', maxWidth: '360px' }}>

          <div style={{ marginBottom: '36px' }}>
            <h2 style={{ fontFamily: 'Space Grotesk, sans-serif', fontWeight: 800, fontSize: '26px', marginBottom: '6px' }}>Welcome back</h2>
            <p style={{ fontSize: '14px', color: 'var(--text-muted)' }}>Sign in to your VTcontroller workspace</p>
          </div>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

            {/* Email */}
            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
                Email address
              </label>
              <div style={{ position: 'relative' }}>
                <Mail size={15} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input
                  className="input"
                  type="email"
                  value={email}
                  name="email_address"
                  id="email_address"
                  onChange={e => setEmail(e.target.value)}
                  placeholder="you@company.com"
                  required
                  autoComplete="off"
                  style={{ paddingLeft: '38px', fontSize: '13px' }}
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
                Password
              </label>
              <div style={{ position: 'relative' }}>
                <Lock size={15} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input
                  className="input"
                  type={showPwd ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  autoComplete="current-password"
                  style={{ paddingLeft: '38px', paddingRight: '38px', fontSize: '13px' }}
                />
                <button
                  type="button"
                  onClick={() => setShowPwd(!showPwd)}
                  style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 0 }}
                >
                  {showPwd ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 12px', borderRadius: '8px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', fontSize: '13px', color: '#ef4444' }}>
                <AlertCircle size={14} />
                {error}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary"
              style={{ width: '100%', justifyContent: 'center', padding: '12px', fontSize: '14px', marginTop: '4px', opacity: loading ? 0.7 : 1, boxShadow: '0 8px 16px rgba(79,142,247,0.2)' }}
            >
              {loading ? (
                <>
                  <span style={{ display: 'inline-block', width: 16, height: 16, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
                  Signing in...
                </>
              ) : (
                <>Sign in <ArrowRight size={16} /></>
              )}
            </button>
          </form>

          {/* Sign up link */}
          <div style={{ textAlign: 'center', marginTop: '28px', paddingTop: '24px', borderTop: '1px solid var(--border)' }}>
            <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Don't have an account? </span>
            <a href="/signup" style={{ fontSize: '13px', color: '#4f8ef7', textDecoration: 'none', fontWeight: 600 }}>Create one</a>
          </div>

        </div>
      </div>

      {/* Animations are now in globals.css */}
    </div>
  );
}
