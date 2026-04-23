'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard, FolderKanban, CheckSquare, Users,
  Bell, Settings, ChevronDown, Zap,
  Calendar, MessageSquare, Plus, Menu, X, LogOut
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

interface NavItem {
  label: string;
  icon: LucideIcon;
  href: string;
  badge?: string;
}
import clsx from 'clsx';
import { useAuth } from '@/lib/auth';

const NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard',  icon: LayoutDashboard, href: '/dashboard' },
  { label: 'My Tasks',   icon: CheckSquare,     href: '/my-tasks'  },
  { label: 'Projects',   icon: FolderKanban,    href: '/projects'  },
  { label: 'Board',      icon: CheckSquare,     href: '/board'     },
  { label: 'Calendar',   icon: Calendar,        href: '/calendar'  },
  { label: 'Team',       icon: Users,           href: '/team'      },
  { label: 'Chat',       icon: MessageSquare,   href: '/chat'      },
];

const ADMIN_ITEMS: NavItem[] = [
  { label: 'Admin Council', icon: Zap, href: '/vtc-admin/panel' },
];

const BOTTOM_ITEMS: NavItem[] = [
  { label: 'Notifications', icon: Bell, href: '/notifications', badge: '3' },
  { label: 'Settings',      icon: Settings, href: '/settings' },
];



interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

export default function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  const displayName = user?.name ?? 'Loading...';
  const displayAvatar = user?.avatar ?? '??';
  const displayRole = user ? user.role.charAt(0).toUpperCase() + user.role.slice(1) : '';

  return (
    <>
      <aside
        style={{
          width: collapsed ? '64px' : '240px',
          minHeight: '100vh',
          background: 'var(--bg-secondary)',
          borderRight: '1px solid var(--border)',
          display: 'flex',
          flexDirection: 'column',
          transition: 'width 0.25s ease',
          position: 'fixed',
          left: 0, top: 0, bottom: 0,
          zIndex: 50,
          overflow: 'hidden',
        }}
      >
        {/* Logo */}
        <div style={{
          padding: '20px 16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid var(--border)',
          minHeight: '64px',
        }}>
          {!collapsed && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{
                width: 32, height: 32,
                borderRadius: '8px',
                background: 'var(--gradient-primary)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Zap size={16} color="white" />
              </div>
              <span style={{
                fontFamily: 'Space Grotesk, sans-serif',
                fontWeight: 700,
                fontSize: '16px',
                color: 'var(--text-primary)',
                whiteSpace: 'nowrap',
              }}>VTcontroller</span>
            </div>
          )}
          {collapsed && (
            <div style={{
              width: 32, height: 32,
              borderRadius: '8px',
              background: 'var(--gradient-primary)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Zap size={16} color="white" />
            </div>
          )}
          <button
            onClick={onToggle}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: 'var(--text-muted)', padding: '4px',
              borderRadius: '6px', transition: 'all 0.15s',
            }}
          >
            {collapsed ? <Menu size={16} /> : <X size={16} />}
          </button>
        </div>

        {/* Workspace selector */}
        {!collapsed && (
          <div style={{ padding: '12px 12px 8px' }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              padding: '8px 10px',
              background: 'var(--bg-elevated)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-sm)',
              cursor: 'pointer',
              transition: 'border-color 0.15s',
            }}>
              <div style={{
                width: 22, height: 22, borderRadius: '5px',
                background: 'var(--gradient-primary)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '10px', fontWeight: 700, color: 'white',
              }}>V</div>
              <span style={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--text-primary)', flex: 1 }}>Vibetheory Inc.</span>
              <ChevronDown size={12} color="var(--text-muted)" />
            </div>
          </div>
        )}



        {/* Nav */}
        <nav style={{ flex: 1, padding: '4px 12px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
          {!collapsed && (
            <div style={{ fontSize: '10px', letterSpacing: '0.8px', color: 'var(--text-muted)', fontWeight: 600, marginBottom: '4px', marginTop: '4px', paddingLeft: '4px' }}>
              MAIN MENU
            </div>
          )}
          {NAV_ITEMS.map((item) => {
            if (item.href === '/dashboard' && user?.role === 'member') return null;
            const active = pathname === item.href || (item.href !== '/' && pathname?.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={clsx('nav-item', active && 'active')}
                style={{ justifyContent: collapsed ? 'center' : 'flex-start' }}
                title={collapsed ? item.label : undefined}
              >
                <item.icon size={17} />
                {!collapsed && (
                  <>
                    <span style={{ flex: 1 }}>{item.label}</span>
                    {item.badge && (
                      <span style={{
                        background: item.badge === 'AI' ? 'var(--accent-base)' : '#FEE2E2',
                        color: item.badge === 'AI' ? 'white' : '#EF4444',
                        borderRadius: '10px',
                        padding: '1px 7px',
                        fontSize: '10px',
                        fontWeight: 700,
                      }}>{item.badge}</span>
                    )}
                  </>
                )}
              </Link>
            );
          })}
          
          {(user?.role === 'admin' || user?.role === 'manager') && (
            <>
              {!collapsed && (
                <div style={{ fontSize: '10px', letterSpacing: '0.8px', color: 'var(--text-muted)', fontWeight: 600, marginBottom: '4px', marginTop: '16px', paddingLeft: '4px' }}>
                  ADMINISTRATION
                </div>
              )}
              {ADMIN_ITEMS.map((item) => {
                const active = pathname?.startsWith('/vtc-admin');
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={clsx('nav-item', active && 'active')}
                    style={{ justifyContent: collapsed ? 'center' : 'flex-start', color: active ? 'var(--accent-base)' : undefined }}
                    title={collapsed ? item.label : undefined}
                  >
                    <item.icon size={17} color={active ? 'var(--accent-base)' : 'var(--text-muted)'} />
                    {!collapsed && (
                      <span style={{ flex: 1, fontWeight: active ? 700 : undefined, color: active ? 'var(--text-primary)' : undefined }}>{item.label}</span>
                    )}
                  </Link>
                );
              })}
            </>
          )}
        </nav>

        {/* Quick add */}
        {!collapsed && user?.role !== 'member' && (
          <div style={{ padding: '0 12px 12px' }}>
            <button 
              className="btn btn-primary" 
              style={{ width: '100%', justifyContent: 'center' }}
              onClick={() => router.push('/board?create=true')}
            >
              <Plus size={15} /> New Task
            </button>
          </div>
        )}

        {/* Bottom */}
        <div style={{ padding: '8px 12px 16px', borderTop: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: '2px' }}>
          {BOTTOM_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="nav-item"
              style={{ justifyContent: collapsed ? 'center' : 'flex-start' }}
              title={collapsed ? item.label : undefined}
            >
              <item.icon size={17} />
              {!collapsed && (
                <>
                  <span style={{ flex: 1 }}>{item.label}</span>
                  {item.badge && (
                    <span style={{
                      background: '#FEE2E2',
                      color: '#EF4444',
                      borderRadius: '10px',
                      padding: '1px 7px',
                      fontSize: '10px',
                      fontWeight: 700,
                    }}>{item.badge}</span>
                  )}
                </>
              )}
            </Link>
          ))}

          {/* User + Logout */}
          {!collapsed && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: '10px',
              padding: '10px 12px', marginTop: '4px',
              background: 'var(--bg-elevated)',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--border)',
            }}>
              <div style={{
                width: 30, height: 30, borderRadius: '50%',
                background: 'var(--gradient-primary)', flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '11px', fontWeight: 700, color: 'white',
              }}>{displayAvatar}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{displayName}</div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{displayRole}</div>
              </div>
              <button
                onClick={logout}
                title="Sign out"
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: 'var(--text-muted)', padding: '4px', borderRadius: '6px',
                  display: 'flex', alignItems: 'center',
                  transition: 'color 0.15s',
                }}
                onMouseEnter={e => (e.currentTarget.style.color = '#EF4444')}
                onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-muted)')}
              >
                <LogOut size={13} />
              </button>
            </div>
          )}
          {collapsed && (
            <button
              onClick={logout}
              title="Sign out"
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: 'var(--text-muted)', padding: '6px', margin: '4px 0',
                borderRadius: '6px', display: 'flex',
              }}
            >
              <LogOut size={15} />
            </button>
          )}
        </div>
      </aside>
    </>
  );
}
