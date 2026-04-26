'use client';

import { Suspense } from 'react';
import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Zap } from 'lucide-react';

function AuthCallbackContent() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<'loading' | 'error'>('loading');

  useEffect(() => {
    const token       = searchParams.get('token');
    const googleError = searchParams.get('google_error');

    if (googleError) {
      setStatus('error');
      setTimeout(() => router.push('/signup?google_error=1'), 2000);
      return;
    }

    if (!token) {
      setStatus('error');
      setTimeout(() => router.push('/signup'), 2000);
      return;
    }

    // Store token the same way the rest of the app does
    localStorage.setItem('vtc_token', token);

    // Fetch user profile with new token to populate auth context
    const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/api';
    fetch(`${apiUrl}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.json())
      .then(data => {
        if (data.user) {
          localStorage.setItem('vtc_user', JSON.stringify(data.user));
        }
        window.location.href = '/dashboard';
      })
      .catch(() => {
        window.location.href = '/dashboard';
      }); // still redirect even if profile fetch fails
  }, [searchParams, router]);

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--bg-primary)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '20px',
    }}>
      {/* Logo */}
      <div style={{
        width: 56, height: 56, borderRadius: '16px',
        background: 'var(--gradient-primary)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: '0 8px 24px rgba(79,142,247,0.35)',
        animation: 'pulse 1.5s ease-in-out infinite',
      }}>
        <Zap size={28} color="white" />
      </div>

      {status === 'loading' ? (
        <>
          <p style={{ fontSize: '16px', color: 'var(--text-secondary)', fontWeight: 600 }}>
            Signing you in with Google…
          </p>
          <div style={{
            width: 40, height: 40,
            border: '3px solid rgba(79,142,247,0.2)',
            borderTopColor: '#4f8ef7',
            borderRadius: '50%',
            animation: 'spin 0.8s linear infinite',
          }} />
        </>
      ) : (
        <p style={{ fontSize: '15px', color: '#ef4444' }}>
          Google sign-in failed. Redirecting…
        </p>
      )}

      {/* Animations are now in globals.css */}
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={
      <div style={{
        minHeight: '100vh',
        background: 'var(--bg-primary)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <div style={{
          width: 40, height: 40,
          border: '3px solid rgba(79,142,247,0.2)',
          borderTopColor: '#4f8ef7',
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite',
        }} />
      </div>
    }>
      <AuthCallbackContent />
    </Suspense>
  );
}
