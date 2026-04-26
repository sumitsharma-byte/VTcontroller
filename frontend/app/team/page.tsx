'use client';

import { useEffect, useState } from 'react';
import AppLayout from '@/components/AppLayout';
import { useAuth } from '@/lib/auth';
import { adminApi, workspacesApi, type TeamMember } from '@/lib/api';
import { Mail, TrendingUp } from 'lucide-react';

const Skeleton = ({ h = 20, w = '100%', radius = 6 }: any) => (
  <div style={{ width: w, height: h, borderRadius: radius, background: 'rgba(255,255,255,0.05)', animation: 'shimmer 1.5s infinite', backgroundSize: '200% 100%', backgroundImage: 'linear-gradient(90deg,rgba(255,255,255,0.04)25%,rgba(255,255,255,0.07)50%,rgba(255,255,255,0.04)75%)' }} />
);

const STATUS_CONFIG = {
  good: { label: 'Performing Well', color: '#22c55e', bg: 'rgba(34,197,94,0.1)' },
  warning: { label: 'Needs Attention', color: '#f59e0b', bg: 'rgba(245,158,11,0.1)' },
  risk: { label: 'At Risk', color: '#ef4444', bg: 'rgba(239,68,68,0.1)' },
};

export default function TeamPage() {
  const { user } = useAuth();
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);

  const fetchMembers = () => {
    if (!user) return;
    
    if (user.role === 'member') {
      workspacesApi.members(user.current_workspace_id)
        .then(res => {
          const mapped: TeamMember[] = res.members.map(m => ({
            ...m,
            assigned: 0, completed: 0, pending: 0, overdue: 0, efficiency: 0, status: 'good'
          }));
          setMembers(mapped);
        })
        .catch(err => console.warn('Failed to fetch members:', err))
        .finally(() => setLoading(false));
    } else {
      adminApi.teamTable(user.current_workspace_id)
        .then(res => setMembers(res.team))
        .catch(err => console.warn('Failed to fetch team table:', err))
        .finally(() => setLoading(false));
    }
  };

  useEffect(() => {
    fetchMembers();
  }, [user]);

  return (
    <AppLayout>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontFamily: 'Space Grotesk, sans-serif', fontWeight: 800, fontSize: '22px', marginBottom: '2px' }}>Team</h1>
          <p style={{ fontSize: '14px', color: 'var(--text-muted)' }}>{members.length} members in your workspace</p>
        </div>
        {(user?.role === 'admin' || user?.role === 'manager') && (
          <button 
            className="btn btn-primary" 
            onClick={() => setShowAddModal(true)}
            style={{ fontSize: '13px', padding: '8px 16px' }}
          >
            + Add Member
          </button>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' }}>
        {loading ? Array(7).fill(0).map((_, i) => (
          <div key={`skel-${i}`} className="card" style={{ height: '220px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              <Skeleton h={48} w={48} radius={24} />
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}><Skeleton h={14} w="60%" /><Skeleton h={11} w="40%" /></div>
            </div>
            <Skeleton h={14} /><Skeleton h={8} radius={4} /><Skeleton h={40} radius={8} />
          </div>
        )) : members.map(member => {
          const status = STATUS_CONFIG[member.status as keyof typeof STATUS_CONFIG] ?? STATUS_CONFIG.good;
          return (
            <div key={member.id} className="card card-hover">
              {/* Header */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px' }}>
                <div style={{
                  width: 48, height: 48, borderRadius: '50%', flexShrink: 0,
                  background: `hsl(${(member.id * 67) % 360}, 65%, 50%)`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '15px', fontWeight: 700, color: 'white',
                }}>{member.avatar || member.name[0]}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: '15px', color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{member.name}</div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px', textTransform: 'capitalize' }}>{member.role} · {member.department}</div>
                </div>
                <span style={{ padding: '3px 9px', borderRadius: '20px', fontSize: '10px', fontWeight: 700, background: status.bg, color: status.color, flexShrink: 0 }}>
                  {status.label}
                </span>
              </div>

              {/* Email */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '14px' }}>
                <Mail size={11} />
                {member.email}
              </div>

              {/* Stats grid and Efficiency bar only for Admin/Manager */}
              {user?.role !== 'member' && (
                <>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', marginBottom: '14px' }}>
                    {[
                      { label: 'Assigned', value: member.assigned, color: 'var(--text-primary)' },
                      { label: 'Done', value: member.completed, color: '#22c55e' },
                      { label: 'Pending', value: member.pending, color: '#f59e0b' },
                      { label: 'Overdue', value: member.overdue, color: '#ef4444' },
                    ].map(stat => (
                      <div key={stat.label} style={{
                        background: 'rgba(255,255,255,0.03)',
                        border: '1px solid var(--border)',
                        borderRadius: '8px',
                        padding: '8px',
                        textAlign: 'center',
                      }}>
                        <div style={{ fontWeight: 800, fontSize: '18px', color: stat.color, fontFamily: 'Space Grotesk, sans-serif' }}>{stat.value}</div>
                        <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '2px' }}>{stat.label}</div>
                      </div>
                    ))}
                  </div>

                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginBottom: '5px' }}>
                      <span style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}><TrendingUp size={10} /> Efficiency</span>
                      <span style={{ fontWeight: 700, color: status.color }}>{member.efficiency}%</span>
                    </div>
                    <div style={{ height: '6px', borderRadius: '4px', background: 'rgba(255,255,255,0.06)' }}>
                      <div style={{
                        height: '100%', borderRadius: '4px',
                        width: `${member.efficiency}%`,
                        background: `linear-gradient(90deg, ${status.color}99, ${status.color})`,
                        transition: 'width 0.6s ease',
                      }} />
                    </div>
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>

      {showAddModal && <AddMemberModal onClose={() => setShowAddModal(false)} onAdded={fetchMembers} />}

      {/* Animations are now in globals.css */}
    </AppLayout>
  );
}

function AddMemberModal({ onClose, onAdded }: { onClose: () => void, onAdded: () => void }) {
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'member', department: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await adminApi.createUser(form);
      onAdded();
      onClose();
    } catch (err: any) {
      if (err.errors) {
        const firstError = Object.values(err.errors)[0] as string[];
        setError(firstError[0] || 'Failed to create member');
      } else {
        setError(err.message || 'Failed to create member');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: '14px', width: 440, padding: 24 }}>
        <h2 style={{ fontSize: 18, marginBottom: 16 }}>Create Employee Login</h2>
        <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <input className="input" placeholder="Full Name" value={form.name} onChange={e => setForm({...form, name: e.target.value})} required />
          <input className="input" type="email" placeholder="Email Address" value={form.email} onChange={e => setForm({...form, email: e.target.value})} required />
          <input className="input" type="password" placeholder="Initial Password" value={form.password} onChange={e => setForm({...form, password: e.target.value})} required minLength={6} />
          <select className="input" value={form.role} onChange={e => setForm({...form, role: e.target.value})}>
            <option value="member">Member</option>
            <option value="manager">Manager</option>
            <option value="admin">Admin</option>
          </select>
          <input className="input" placeholder="Department (Optional)" value={form.department} onChange={e => setForm({...form, department: e.target.value})} />
          
          {error && <div style={{ color: '#ef4444', fontSize: 13, background: 'rgba(239,68,68,0.1)', padding: 8, borderRadius: 6 }}>{error}</div>}
          
          <div style={{ display: 'flex', gap: 10, marginTop: 10 }}>
            <button type="button" className="btn" onClick={onClose} style={{ flex: 1, background: 'transparent' }}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading} style={{ flex: 1 }}>{loading ? 'Creating...' : 'Create Login'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
