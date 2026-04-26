'use client';

import { useState, memo } from 'react';
import AuthGuard from './AuthGuard';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import dynamic from 'next/dynamic';

// Lazy-load ChatPopup — it's ~36KB and only needed when user opens chat
const ChatPopup = dynamic(() => import('./ChatPopup'), {
  ssr: false,
  loading: () => null, // Don't show anything while loading
});

function AppLayout({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const sidebarWidth = collapsed ? 64 : 240;

  return (
    <AuthGuard>
      <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg-primary)' }}>
        {/* Fixed sidebar */}
        <Sidebar collapsed={collapsed} onToggle={() => setCollapsed(c => !c)} />

        {/* Main content — offset by exact sidebar width */}
        <div
          style={{
            marginLeft: sidebarWidth,
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            minWidth: 0,
            transition: 'margin-left 0.25s ease',
          }}
        >
          <Topbar />
          <main style={{ flex: 1, overflowY: 'auto', padding: '28px 32px', minHeight: 0 }}>
            {children}
          </main>
        </div>

        {/* Global floating chat popup */}
        <ChatPopup />
      </div>
    </AuthGuard>
  );
}

export default memo(AppLayout);
