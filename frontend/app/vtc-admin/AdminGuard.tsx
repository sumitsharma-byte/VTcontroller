'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function AdminGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  // null = still checking, true = ok, false = rejected
  const [status, setStatus] = useState<null | boolean>(null);

  useEffect(() => {
    const token   = localStorage.getItem('vtc_admin_token');
    const userRaw = localStorage.getItem('vtc_admin_user');

    if (!token || !userRaw) {
      setStatus(false);
      router.replace('/vtc-admin/login');
      return;
    }

    try {
      const user = JSON.parse(userRaw);
      if (user.role === 'admin' || user.role === 'manager') {
        setStatus(true);   // ✅ authorized — render children
        return;
      }
    } catch (_) {}

    // Not admin
    setStatus(false);
    router.replace('/vtc-admin/login');
  }, []); // run once on mount — no router dep to avoid loop

  // Still checking → show loading shield
  if (status === null) {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'var(--bg-primary)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexDirection: 'column', gap: 16,
      }}>
        <div style={{
          width: 48, height: 48, borderRadius: 12,
          background: 'linear-gradient(135deg, #7c5af3, #ef4444)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          animation: 'pulse 1.2s ease-in-out infinite',
        }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="white">
            <path d="M12 2L4 7V12C4 16.4 7.4 20.5 12 22C16.6 20.5 20 16.4 20 12V7L12 2Z"/>
          </svg>
        </div>
        <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>Verifying admin session…</span>
        {/* Animations are now in globals.css */}
      </div>
    );
  }

  // Rejected → nothing (router.replace already called)
  if (status === false) return null;

  // Authorized ✅
  return <>{children}</>;
}
