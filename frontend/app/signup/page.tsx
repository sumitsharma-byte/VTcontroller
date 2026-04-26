'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import Link from 'next/link';
import { Zap, Mail, Lock, ArrowRight, Eye, EyeOff, AlertCircle, User, Briefcase } from 'lucide-react';
import { authApi } from '@/lib/api';

export default function SignupPage() {
  const router = useRouter();
  const { login } = useAuth();

  const [name, setName]               = useState('');
  const [email, setEmail]             = useState('');
  const [department, setDepartment]   = useState('');
  const [password, setPassword]       = useState('');
  const [passwordConf, setPasswordConf] = useState('');
  
  const [showPwd, setShowPwd]   = useState(false);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');

  const [googleInfo, setGoogleInfo] = useState('');

  const handleGoogleSignup = () => {
    // NEXT_PUBLIC_API_URL is e.g. http://localhost:8000/api — strip trailing /api to get the origin
    const apiUrl  = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/api';
    const origin  = apiUrl.replace(/\/api$/, '');
    window.location.href = `${origin}/api/auth/google/redirect`;
  };


  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== passwordConf) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      const res = await authApi.register({
        name,
        email,
        password,
        password_confirmation: passwordConf,
        department: department || undefined,
      });
      
      // Since useAuth doesn't expose state setters, we just manually login to propagate the auth context globally
      await login(email, password);
      
      router.push('/dashboard');
    } catch (err: any) {
      if (err.errors) {
        // Handle validation errors from Laravel
        const firstError = Object.values(err.errors)[0] as string[];
        setError(firstError[0] || 'Registration failed.');
      } else {
        setError(err.message || 'Registration failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--bg-primary)',
      display: 'flex',
      overflow: 'hidden',
    }}>
      {/* Left panel – branding */}
      <div style={{
        flex: 1,
        background: 'linear-gradient(135deg, #0f1117 0%, #13151d 40%, #1a1030 100%)',
        borderRight: '1px solid var(--border)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '60px',
        position: 'relative',
        overflow: 'hidden',
      }} className="hide-on-mobile">
        {/* Background glow orbs */}
        <div style={{
          position: 'absolute', top: '20%', left: '30%',
          width: 300, height: 300, borderRadius: '50%',
          background: 'rgba(79,142,247,0.08)',
          filter: 'blur(80px)',
          pointerEvents: 'none',
        }} />
        <div style={{
          position: 'absolute', bottom: '25%', right: '20%',
          width: 250, height: 250, borderRadius: '50%',
          background: 'rgba(124,90,243,0.08)',
          filter: 'blur(80px)',
          pointerEvents: 'none',
        }} />

        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '48px' }}>
          <div style={{
            width: 52, height: 52, borderRadius: '14px',
            background: 'var(--gradient-primary)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 8px 24px rgba(79,142,247,0.3)',
          }}>
            <Zap size={26} color="white" />
          </div>
          <span style={{
            fontFamily: 'Space Grotesk, sans-serif',
            fontWeight: 800, fontSize: '26px',
            color: 'var(--text-primary)',
          }}>VTcontroller</span>
        </div>

        <div style={{ maxWidth: 460, textAlign: 'center' }}>
          <h1 style={{
            fontFamily: 'Space Grotesk, sans-serif',
            fontWeight: 800, fontSize: '38px',
            lineHeight: 1.2, marginBottom: '20px',
            background: 'linear-gradient(135deg, #f0f2f8 0%, #8892a4 100%)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          }}>
            Join the future of<br />Work OS
          </h1>
          <p style={{ fontSize: '16px', color: 'var(--text-muted)', lineHeight: 1.7, marginBottom: '48px' }}>
            VTcontroller doesn't just manage tasks.<br />
            It <strong style={{ color: 'var(--text-secondary)' }}>understands</strong>, <strong style={{ color: 'var(--text-secondary)' }}>predicts</strong>, and <strong style={{ color: 'var(--text-secondary)' }}>improves</strong> execution.
          </p>

          {/* Feature pills */}
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', justifyContent: 'center' }}>
            {['AI Delay Prediction', 'Kanban Board', 'Admin Insights', 'Real-time Updates'].map(f => (
              <span key={f} style={{
                padding: '6px 14px', borderRadius: '20px',
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid var(--border)',
                fontSize: '12px', color: 'var(--text-muted)',
              }}>{f}</span>
            ))}
          </div>
        </div>
      </div>

      {/* Right panel – form */}
      <div style={{
        width: '500px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '60px 40px',
        background: 'var(--bg-secondary)',
        overflowY: 'auto',
      }} className="full-width-on-mobile">
        <div style={{ width: '100%', maxWidth: '380px', margin: 'auto' }}>
          <div style={{ marginBottom: '32px' }}>
            <h2 style={{
              fontFamily: 'Space Grotesk, sans-serif',
              fontWeight: 800, fontSize: '26px',
              marginBottom: '6px',
            }}>Create an account</h2>
            <p style={{ fontSize: '14px', color: 'var(--text-muted)' }}>
              Start your journey with VTcontroller
            </p>
          </div>

          <button
            type="button"
            onClick={handleGoogleSignup}
            style={{
              width: '100%', padding: '11px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
              background: 'white', color: '#333', border: '1px solid #e2e8f0', borderRadius: '8px',
              fontWeight: 600, fontSize: '14px', cursor: 'pointer', marginBottom: '24px', transition: 'all 0.2s'
            }}
            onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
            onMouseLeave={e => e.currentTarget.style.background = 'white'}
          >
            <svg viewBox="0 0 24 24" width="18" height="18" xmlns="http://www.w3.org/2000/svg">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            Sign up with Google
          </button>

          {/* Google info banner */}
          {googleInfo && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              padding: '10px 12px', borderRadius: '8px', marginBottom: '8px',
              background: 'rgba(79,142,247,0.08)', border: '1px solid rgba(79,142,247,0.25)',
              fontSize: '13px', color: '#4f8ef7',
            }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
              {googleInfo}
            </div>
          )}

          {/* Divider */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
            <div style={{ flex: 1, height: '1px', background: 'var(--border)' }} />
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>or register with email</span>
            <div style={{ flex: 1, height: '1px', background: 'var(--border)' }} />
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            
            <div style={{ display: 'flex', gap: '14px' }}>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
                  Full Name
                </label>
                <div style={{ position: 'relative' }}>
                  <User size={15} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                  <input
                    className="input"
                    type="text"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="John Doe"
                    required
                    style={{ paddingLeft: '38px', fontSize: '13px' }}
                  />
                </div>
              </div>
            </div>

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
                  onChange={e => setEmail(e.target.value)}
                  placeholder="you@company.com"
                  required
                  style={{ paddingLeft: '38px', fontSize: '13px' }}
                />
              </div>
            </div>

            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
                Department (Optional)
              </label>
              <div style={{ position: 'relative' }}>
                <Briefcase size={15} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input
                  className="input"
                  type="text"
                  value={department}
                  onChange={e => setDepartment(e.target.value)}
                  placeholder="Engineering"
                  style={{ paddingLeft: '38px', fontSize: '13px' }}
                />
              </div>
            </div>

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

            <div>
              <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
                Confirm Password
              </label>
              <div style={{ position: 'relative' }}>
                <Lock size={15} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input
                  className="input"
                  type={showPwd ? 'text' : 'password'}
                  value={passwordConf}
                  onChange={e => setPasswordConf(e.target.value)}
                  placeholder="••••••••"
                  required
                  style={{ paddingLeft: '38px', paddingRight: '38px', fontSize: '13px' }}
                />
              </div>
            </div>

            {/* Error */}
            {error && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: '8px',
                padding: '10px 12px', borderRadius: '8px',
                background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)',
                fontSize: '13px', color: '#ef4444',
              }}>
                <AlertCircle size={14} />
                {error}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary"
              style={{
                width: '100%', justifyContent: 'center',
                padding: '11px', fontSize: '14px',
                marginTop: '8px',
                opacity: loading ? 0.7 : 1,
                boxShadow: '0 8px 16px rgba(79,142,247,0.2)',
              }}
            >
              {loading ? (
                <>
                  <span style={{ display: 'inline-block', width: 16, height: 16, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
                  Creating account...
                </>
              ) : (
                <>Sign up <ArrowRight size={16} /></>
              )}
            </button>
          </form>

          <p style={{ textAlign: 'center', fontSize: '13px', color: 'var(--text-muted)', marginTop: '28px' }}>
            Already have an account?{' '}
            <Link href="/login" style={{ color: '#4f8ef7', textDecoration: 'none', fontWeight: 600 }}>
              Sign in
            </Link>
          </p>
        </div>
      </div>

      {/* spin animation is now in globals.css */}
      <style>{`
        @media (max-width: 900px) {
          .hide-on-mobile { display: none !important; }
          .full-width-on-mobile { width: 100% !important; padding: 40px 20px !important; }
        }
      `}</style>
    </div>
  );
}
