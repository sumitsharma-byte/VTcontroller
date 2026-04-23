'use client';

import { Bell, Search, Plus } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { useRouter } from 'next/navigation';
import { useNotifications } from '@/lib/useNotifications';

export default function Topbar() {
  const { user } = useAuth();
  const router = useRouter();
  const avatar = user?.avatar ?? '??';
  
  const { notifications } = useNotifications();
  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <header style={{
      height: 'var(--topbar-height)',
      background: 'var(--bg-secondary)',
      backdropFilter: 'blur(20px)',
      borderBottom: '1px solid var(--border)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 28px',
      position: 'sticky',
      top: 0,
      zIndex: 40,
      flexShrink: 0,
      boxShadow: '0 1px 0 rgba(123,189,232,0.06)',
    }}>
      {/* Search */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '8px',
        background: 'var(--bg-card)',
        border: '1px solid var(--border)',
        borderRadius: '8px',
        padding: '7px 14px',
        cursor: 'text',
        minWidth: '240px',
        transition: 'border-color 0.2s',
      }}>
        <Search size={14} color="var(--text-muted)" />
        <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Search tasks, projects...</span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        {/* New Task */}
        {user?.role !== 'member' && (
          <button 
            className="btn btn-primary" 
            style={{ padding: '7px 14px' }}
            onClick={() => router.push('/board?create=true')}
          >
            <Plus size={15} />
            <span>New Task</span>
          </button>
        )}

        {/* Notifications */}
        <button 
          style={{
            position: 'relative',
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
            borderRadius: '8px',
            padding: '8px',
            cursor: 'pointer',
            color: 'var(--text-secondary)',
            display: 'flex', alignItems: 'center',
          }}
          onClick={() => router.push('/notifications')}
        >
          <Bell size={16} />
          {unreadCount > 0 && (
            <span style={{
              position: 'absolute', top: '-4px', right: '-4px',
              background: 'var(--color-danger)',
              color: 'white',
              borderRadius: '50%',
              padding: '0 4px',
              fontSize: '9px',
              fontWeight: 700,
              minWidth: '16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '2px solid var(--bg-secondary)',
            }}>
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>

        {/* Avatar */}
        <div style={{
          width: 34, height: 34,
          borderRadius: '50%',
          background: 'var(--gradient-primary)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '12px', fontWeight: 700, color: 'white',
          cursor: 'pointer',
          border: '2px solid var(--border)',
          flexShrink: 0,
        }}>{avatar}</div>
      </div>
    </header>
  );
}
