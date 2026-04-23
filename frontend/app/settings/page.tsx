'use client';

import { useState } from 'react';
import AppLayout from '@/components/AppLayout';
import { useAuth } from '@/lib/auth';
import { User, Bell, Shield, Palette, Save, Check } from 'lucide-react';

type Tab = 'profile' | 'notifications' | 'security' | 'appearance';

const TABS: { id: Tab; label: string; icon: any }[] = [
  { id: 'profile',       label: 'Profile',       icon: User    },
  { id: 'notifications', label: 'Notifications', icon: Bell    },
  { id: 'security',      label: 'Security',      icon: Shield  },
  { id: 'appearance',    label: 'Appearance',    icon: Palette },
];

function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <div
      onClick={() => onChange(!value)}
      style={{
        width: 40, height: 22, borderRadius: '11px', position: 'relative',
        background: value ? '#4f8ef7' : 'var(--border)',
        cursor: 'pointer', transition: 'background 0.2s', flexShrink: 0,
      }}
    >
      <div style={{
        position: 'absolute', top: 3, left: value ? 21 : 3,
        width: 16, height: 16, borderRadius: '50%', background: 'white',
        transition: 'left 0.2s', boxShadow: '0 1px 4px rgba(0,0,0,0.3)',
      }} />
    </div>
  );
}

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '12px', margin: '0 0 16px' }}>
      <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)' }}>
        <span style={{ fontWeight: 700, fontSize: '13.5px' }}>{title}</span>
      </div>
      <div style={{ padding: '20px' }}>{children}</div>
    </div>
  );
}

export default function SettingsPage() {
  const { user } = useAuth();
  const [tab, setTab]   = useState<Tab>('profile');
  const [saved, setSaved] = useState(false);

  const [profile, setProfile] = useState({
    name:       user?.name || '',
    email:      user?.email || '',
    department: user?.department || '',
    timezone:   'Asia/Kolkata',
  });

  const [notifPrefs, setNotifPrefs] = useState({
    task_assigned:   true,
    task_completed:  true,
    task_overdue:    true,
    ai_insights:     true,
    project_updates: false,
    weekly_digest:   true,
    email_notify:    false,
  });

  const [appearance, setAppearance] = useState({
    compact_mode:    false,
    show_avatars:    true,
    animate_charts:  true,
    high_contrast:   false,
  });

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <AppLayout>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontFamily: 'Space Grotesk, sans-serif', fontWeight: 800, fontSize: '22px', marginBottom: '2px' }}>Settings</h1>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Manage your account and preferences</p>
        </div>
        <button
          className="btn btn-primary"
          onClick={handleSave}
          style={{ gap: '6px', minWidth: 120 }}
        >
          {saved ? <><Check size={14} /> Saved!</> : <><Save size={14} /> Save Changes</>}
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '200px 1fr', gap: '20px', alignItems: 'start' }}>
        {/* Sidebar nav */}
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '12px', overflow: 'hidden' }}>
          {TABS.map((t) => {
            const Icon = t.icon;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', gap: '10px',
                  padding: '12px 16px', background: tab === t.id ? 'rgba(79,142,247,0.1)' : 'transparent',
                  border: 'none', borderRight: tab === t.id ? '2px solid #4f8ef7' : '2px solid transparent',
                  cursor: 'pointer', color: tab === t.id ? '#4f8ef7' : 'var(--text-secondary)',
                  fontSize: '13px', fontWeight: 600, textAlign: 'left',
                  transition: 'all 0.15s',
                }}
              >
                <Icon size={15} />
                {t.label}
              </button>
            );
          })}
        </div>

        {/* Content */}
        <div>
          {tab === 'profile' && (
            <>
              {/* Avatar section */}
              <SectionCard title="Profile Picture">
                <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                  <div style={{
                    width: 72, height: 72, borderRadius: '50%',
                    background: 'var(--gradient-primary)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '22px', fontWeight: 800, color: 'white',
                    border: '3px solid var(--border)',
                  }}>{user?.avatar || '??'}</div>
                  <div>
                    <div style={{ fontWeight: 600, marginBottom: '4px' }}>{user?.name}</div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '10px', textTransform: 'capitalize' }}>
                      {user?.role} · {user?.department}
                    </div>
                    <button className="btn btn-ghost" style={{ fontSize: '12px' }}>Change Avatar</button>
                  </div>
                </div>
              </SectionCard>

              <SectionCard title="Personal Information">
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                      Full Name
                    </label>
                    <input
                      className="input"
                      value={profile.name}
                      onChange={e => setProfile(p => ({ ...p, name: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                      Email Address
                    </label>
                    <input
                      className="input"
                      type="email"
                      value={profile.email}
                      onChange={e => setProfile(p => ({ ...p, email: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                      Department
                    </label>
                    <input
                      className="input"
                      value={profile.department}
                      onChange={e => setProfile(p => ({ ...p, department: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                      Timezone
                    </label>
                    <select
                      className="input"
                      value={profile.timezone}
                      onChange={e => setProfile(p => ({ ...p, timezone: e.target.value }))}
                    >
                      <option value="Asia/Kolkata">India (IST +5:30)</option>
                      <option value="UTC">UTC</option>
                      <option value="America/New_York">Eastern (ET)</option>
                      <option value="America/Los_Angeles">Pacific (PT)</option>
                      <option value="Europe/London">London (GMT)</option>
                    </select>
                  </div>
                </div>
              </SectionCard>

              <SectionCard title="Role & Access">
                <div style={{ display: 'flex', gap: '20px' }}>
                  {[
                    { label: 'Role',       value: user?.role || '-' },
                    { label: 'Workspace',  value: 'Vibetheory Inc.' },
                    { label: 'Member Since', value: 'Jan 2026' },
                  ].map(item => (
                    <div key={item.label} style={{ flex: 1 }}>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{item.label}</div>
                      <div style={{ fontWeight: 600, fontSize: '13.5px', textTransform: 'capitalize' }}>{item.value}</div>
                    </div>
                  ))}
                </div>
              </SectionCard>
            </>
          )}

          {tab === 'notifications' && (
            <SectionCard title="Notification Preferences">
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
                {[
                  { key: 'task_assigned',   label: 'Task Assigned to Me',   desc: 'When a new task is assigned to you'     },
                  { key: 'task_completed',  label: 'Task Completed',         desc: 'When a task in your project is done'   },
                  { key: 'task_overdue',    label: 'Task Overdue Alerts',    desc: 'Daily digest of overdue tasks'          },
                  { key: 'ai_insights',     label: 'AI Insights',            desc: 'AI-generated risk and optimization tips'},
                  { key: 'project_updates', label: 'Project Status Changes', desc: 'When a project risk level changes'      },
                  { key: 'weekly_digest',   label: 'Weekly Summary',         desc: 'Weekly performance digest every Monday' },
                  { key: 'email_notify',    label: 'Email Notifications',    desc: 'Also send notifications to your email'  },
                ].map((item, i) => (
                  <div key={item.key} style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '14px 0',
                    borderBottom: i < 6 ? '1px solid rgba(255,255,255,0.04)' : 'none',
                  }}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '13px', marginBottom: '2px' }}>{item.label}</div>
                      <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{item.desc}</div>
                    </div>
                    <Toggle
                      value={notifPrefs[item.key as keyof typeof notifPrefs]}
                      onChange={v => setNotifPrefs(p => ({ ...p, [item.key]: v }))}
                    />
                  </div>
                ))}
              </div>
            </SectionCard>
          )}

          {tab === 'security' && (
            <>
              <SectionCard title="Change Password">
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxWidth: 360 }}>
                  {['Current Password', 'New Password', 'Confirm New Password'].map(label => (
                    <div key={label}>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                        {label}
                      </label>
                      <input className="input" type="password" placeholder="••••••••" />
                    </div>
                  ))}
                  <button className="btn btn-primary" style={{ width: 'fit-content', marginTop: '4px' }}>
                    Update Password
                  </button>
                </div>
              </SectionCard>

              <SectionCard title="Active Sessions">
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {[
                    { device: 'Windows · Chrome', location: 'Mumbai, IN', current: true,  time: 'Now' },
                    { device: 'iPhone · Safari',  location: 'Mumbai, IN', current: false, time: '2 days ago' },
                  ].map((s, i) => (
                    <div key={`session-${i}`} style={{
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      padding: '12px 14px', background: 'var(--bg-secondary)',
                      borderRadius: '8px', border: '1px solid var(--border)',
                    }}>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                          {s.device}
                          {s.current && <span style={{ fontSize: '10px', background: 'rgba(34,197,94,0.15)', color: '#22c55e', padding: '1px 7px', borderRadius: '10px', fontWeight: 700 }}>Current</span>}
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>{s.location} · {s.time}</div>
                      </div>
                      {!s.current && <button className="btn btn-ghost" style={{ fontSize: '11px', padding: '4px 10px' }}>Revoke</button>}
                    </div>
                  ))}
                </div>
              </SectionCard>
            </>
          )}

          {tab === 'appearance' && (
            <SectionCard title="Display Preferences">
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
                {[
                  { key: 'compact_mode',   label: 'Compact Mode',      desc: 'Reduce spacing and padding for denser layout' },
                  { key: 'show_avatars',   label: 'Show Member Avatars', desc: 'Display avatar icons on task cards'          },
                  { key: 'animate_charts', label: 'Animated Charts',    desc: 'Enable chart transition animations'           },
                  { key: 'high_contrast',  label: 'High Contrast',      desc: 'Increase border contrast for accessibility'   },
                ].map((item, i) => (
                  <div key={item.key} style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '14px 0',
                    borderBottom: i < 3 ? '1px solid rgba(255,255,255,0.04)' : 'none',
                  }}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '13px', marginBottom: '2px' }}>{item.label}</div>
                      <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{item.desc}</div>
                    </div>
                    <Toggle
                      value={appearance[item.key as keyof typeof appearance]}
                      onChange={v => setAppearance(p => ({ ...p, [item.key]: v }))}
                    />
                  </div>
                ))}
              </div>
            </SectionCard>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
