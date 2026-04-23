'use client';

import { useState } from 'react';
import AppLayout from '@/components/AppLayout';
import { useAuth } from '@/lib/auth';
import { Bell, AlertTriangle, CheckCircle, MessageSquare, Users, Zap, X } from 'lucide-react';

import { useNotifications } from '@/lib/useNotifications';

const TYPE_CONFIG = {
  delay:      { icon: AlertTriangle, color: '#ef4444', bg: 'rgba(239,68,68,0.1)'  },
  complete:   { icon: CheckCircle,   color: '#22c55e', bg: 'rgba(34,197,94,0.1)'  },
  mention:    { icon: MessageSquare, color: '#4f8ef7', bg: 'rgba(79,142,247,0.1)' },
  assignment: { icon: Users,         color: '#7c5af3', bg: 'rgba(124,90,243,0.1)' },
  ai:         { icon: Zap,           color: '#f59e0b', bg: 'rgba(245,158,11,0.1)' },
};

export default function NotificationsPage() {
  const { user } = useAuth();
  const { notifications, updateNotifications } = useNotifications();
  const [tab, setTab] = useState<'all' | 'unread'>('all');

  const markAllRead = () => updateNotifications(notifications.map(x => ({ ...x, read: true })));
  const dismiss = (id: string) => updateNotifications(notifications.filter(x => x.id !== id));
  const markRead = (id: string) => updateNotifications(notifications.map(x => x.id === id ? { ...x, read: true } : x));

  const displayed = tab === 'unread' ? notifications.filter(n => !n.read) : notifications;
  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <AppLayout>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '2px' }}>
            <h1 style={{ fontFamily: 'Space Grotesk, sans-serif', fontWeight: 800, fontSize: '22px' }}>
              Notifications
            </h1>
            {unreadCount > 0 && (
              <span style={{
                background: '#ef4444', color: 'white',
                borderRadius: '20px', padding: '1px 9px',
                fontSize: '12px', fontWeight: 700,
              }}>{unreadCount}</span>
            )}
          </div>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Stay updated on tasks, projects, and AI alerts</p>
        </div>
        {unreadCount > 0 && (
          <button className="btn btn-ghost" onClick={markAllRead} style={{ fontSize: '12px' }}>
            <CheckCircle size={13} /> Mark all read
          </button>
        )}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '4px', marginBottom: '20px', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '10px', padding: '4px', width: 'fit-content' }}>
        {(['all', 'unread'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              padding: '6px 18px', borderRadius: '7px', fontSize: '13px', fontWeight: 600,
              cursor: 'pointer', border: 'none',
              background: tab === t ? 'var(--bg-secondary)' : 'transparent',
              color: tab === t ? 'var(--text-primary)' : 'var(--text-muted)',
              transition: 'all 0.15s',
            }}
          >
            {t === 'all' ? 'All' : `Unread${unreadCount > 0 ? ` (${unreadCount})` : ''}`}
          </button>
        ))}
      </div>

      {/* Notification list */}
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '14px', overflow: 'hidden' }}>
        {displayed.length === 0 ? (
          <div style={{ padding: '64px', textAlign: 'center', color: 'var(--text-muted)' }}>
            <Bell size={32} style={{ marginBottom: '12px', opacity: 0.3 }} />
            <div style={{ fontWeight: 600, marginBottom: '4px' }}>All caught up!</div>
            <div style={{ fontSize: '13px' }}>No {tab === 'unread' ? 'unread ' : ''}notifications</div>
          </div>
        ) : displayed.map((notif, i) => {
          const cfg = TYPE_CONFIG[notif.type];
          const Icon = cfg.icon;
          return (
            <div
              key={notif.id}
              onClick={() => markRead(notif.id)}
              style={{
                display: 'flex', gap: '14px', padding: '16px 20px',
                borderBottom: i < displayed.length - 1 ? '1px solid var(--border)' : 'none',
                background: notif.read ? 'transparent' : 'rgba(79,142,247,0.03)',
                cursor: 'pointer', transition: 'background 0.15s', position: 'relative',
              }}
              onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.02)'}
              onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = notif.read ? 'transparent' : 'rgba(79,142,247,0.03)'}
            >
              {/* Unread dot */}
              {!notif.read && (
                <div style={{
                  position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)',
                  width: 6, height: 6, borderRadius: '50%', background: '#4f8ef7',
                }} />
              )}

              {/* Icon */}
              <div style={{
                width: 38, height: 38, borderRadius: '10px', flexShrink: 0,
                background: cfg.bg, display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Icon size={17} color={cfg.color} />
              </div>

              {/* Content */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px', marginBottom: '4px' }}>
                  <span style={{ fontWeight: 700, fontSize: '13.5px', color: 'var(--text-primary)' }}>{notif.title}</span>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)', flexShrink: 0 }}>{notif.time}</span>
                </div>
                <p style={{ fontSize: '12.5px', color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: '6px' }}>{notif.body}</p>
                {notif.project && (
                  <span style={{
                    fontSize: '10px', fontWeight: 600, color: 'var(--text-muted)',
                    background: 'rgba(255,255,255,0.05)', padding: '2px 8px', borderRadius: '10px',
                  }}>{notif.project}</span>
                )}
              </div>

              {/* Dismiss */}
              <button
                onClick={e => { e.stopPropagation(); dismiss(notif.id); }}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: 'var(--text-muted)', padding: '2px', borderRadius: '4px',
                  flexShrink: 0, opacity: 0.5, transition: 'opacity 0.15s',
                  alignSelf: 'center',
                }}
                onMouseEnter={e => (e.currentTarget as HTMLElement).style.opacity = '1'}
                onMouseLeave={e => (e.currentTarget as HTMLElement).style.opacity = '0.5'}
              >
                <X size={13} />
              </button>
            </div>
          );
        })}
      </div>
    </AppLayout>
  );
}
