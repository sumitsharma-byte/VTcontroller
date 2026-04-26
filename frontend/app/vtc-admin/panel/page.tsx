'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import AdminGuard from '../AdminGuard';
// Recharts loaded via direct import – the dynamic() wrapper was causing TS errors
// because ResponsiveContainer expects children. Instead we use a lazy loaded
// chart wrapper at the component-boundary level below.
import {
  ResponsiveContainer, PieChart, Pie, Cell, Tooltip,
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  BarChart, Bar,
} from 'recharts';

import {
  Brain, RefreshCw, AlertTriangle, Zap, FolderKanban,
  Shield, LogOut, UserPlus, Users, CheckCircle2, XCircle, Key, Trash2, Edit3
} from 'lucide-react';
import dynamic from 'next/dynamic';

const ChatPopup = dynamic(() => import('@/components/ChatPopup'), { ssr: false });

// ── API helper using the admin's own token ─────────────────
const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/api';

async function adminReq<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token =
    typeof window !== 'undefined' ? localStorage.getItem('vtc_admin_token') : null;
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers as Record<string, string> || {}),
    },
  });
  const data = await res.json().catch(() => ({}));
  if (res.status === 401) {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('vtc_admin_token');
      window.location.href = '/vtc-admin/login';
    }
    throw new Error('Unauthorized');
  }
  if (!res.ok) {
    if (data.errors) {
      const errorStr = Object.values(data.errors).flat().join(' ');
      throw new Error(errorStr || `HTTP ${res.status}`);
    }
    throw new Error(data.message ?? `HTTP ${res.status}`);
  }
  return data as T;
}

// ── Skeleton ───────────────────────────────────────────────
const Skeleton = ({ h = 20, w = '100%', radius = 6 }: { h?: number; w?: string; radius?: number }) => (
  <div style={{
    width: w, height: h, borderRadius: radius,
    background: 'rgba(255,255,255,0.05)',
    animation: 'shimmer 1.5s infinite',
    backgroundSize: '200% 100%',
    backgroundImage: 'linear-gradient(90deg,rgba(255,255,255,0.04)25%,rgba(255,255,255,0.07)50%,rgba(255,255,255,0.04)75%)',
  }} />
);

type ActiveTab = 'overview' | 'projects' | 'team' | 'users';

// ── Inner panel (runs inside AdminGuard) ───────────────────
function AdminPanelContent() {
  const router = useRouter();
  const adminUser = (() => {
    try { return JSON.parse(localStorage.getItem('vtc_admin_user') || '{}'); } catch { return {}; }
  })();
  const wsId: number | undefined = adminUser?.current_workspace_id;
  const q = wsId ? `?workspace_id=${wsId}` : '';

  const [overview,   setOverview]   = useState<any>(null);
  const [distrib,    setDistrib]    = useState<any[]>([]);
  const [trend,      setTrend]      = useState<any[]>([]);
  const [teamPerf,   setTeamPerf]   = useState<any[]>([]);
  const [alerts,     setAlerts]     = useState<any[]>([]);
  const [insights,   setInsights]   = useState<any[]>([]);
  const [teamTable,  setTeamTable]  = useState<any[]>([]);
  const [projects,   setProjects]   = useState<any[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab,  setActiveTab]  = useState<ActiveTab>('overview');
  const [sortConfig, setSortConfig] = useState<{ key: string | null; direction: 'asc' | 'desc' }>({ key: null, direction: 'asc' });

  // ── User Management State ──────────────────────────────
  const [userForm, setUserForm] = useState({
    name: '', email: '', password: '', role: 'member', department: '',
  });
  const [userFormLoading, setUserFormLoading] = useState(false);
  const [userFormMsg, setUserFormMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [userList, setUserList] = useState<any[]>([]);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // ── Audit State ──
  const [auditUser, setAuditUser] = useState<any>(null);
  const [auditData, setAuditData] = useState<any[] | null>(null);
  const [auditLoading, setAuditLoading] = useState(false);

  const openAudit = async (user: any) => {
    setAuditUser(user);
    setAuditData(null);
    setAuditLoading(true);
    try {
      const res = await adminReq<any>(`/admin/users/${user.id}/audit-chats${q}`);
      setAuditData(res.audit_chats);
    } catch {
      setAuditData([]);
    } finally {
      setAuditLoading(false);
    }
  };

  const deleteUser = async (userId: number) => {
    if (!confirm('Are you sure you want to delete this user?')) return;
    setActionLoading(`delete-${userId}`);
    try {
      await adminReq(`/admin/users/${userId}${q}`, { method: 'DELETE' });
      setUserList(prev => prev.filter(u => u.id !== userId));
      setTeamTable(prev => prev.filter(u => u.id !== userId));
    } catch (err: any) {
      alert(err.message || 'Failed to delete user');
    } finally {
      setActionLoading(null);
    }
  };

  const resetPassword = async (userId: number) => {
    const newPassword = prompt('Enter new password (min 6 characters):');
    if (!newPassword) return;
    if (newPassword.length < 6) return alert('Password must be at least 6 characters');
    
    setActionLoading(`reset-${userId}`);
    try {
      await adminReq(`/admin/users/${userId}/reset-password${q}`, {
        method: 'POST',
        body: JSON.stringify({ password: newPassword })
      });
      alert('Password reset successfully');
    } catch (err: any) {
      alert(err.message || 'Failed to reset password');
    } finally {
      setActionLoading(null);
    }
  };

  const updateRole = async (userId: number, role: string) => {
    setActionLoading(`role-${userId}`);
    try {
      await adminReq(`/admin/users/${userId}/role${q}`, {
        method: 'PUT',
        body: JSON.stringify({ role })
      });
      setUserList(prev => prev.map(u => u.id === userId ? { ...u, role } : u));
      setTeamTable(prev => prev.map(u => u.id === userId ? { ...u, role } : u));
    } catch (err: any) {
      alert(err.message || 'Failed to update role');
    } finally {
      setActionLoading(null);
    }
  };

  const handleSort = (key: string) => {
    if (key === 'Actions') return;
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc',
    }));
  };

  const getSortKey = (h: string): string | null => {
    const map: Record<string, string> = {
      'Team Member': 'name', Role: 'role', Assigned: 'assigned',
      Completed: 'completed', Pending: 'pending', Overdue: 'overdue',
      Efficiency: 'efficiency', Status: 'status',
    };
    return map[h] || null;
  };

  const sortedTeamTable = [...teamTable].sort((a, b) => {
    if (!sortConfig.key) return 0;
    const key = getSortKey(sortConfig.key);
    if (!key) return 0;
    const aVal = a[key], bVal = b[key];
    if (typeof aVal === 'string' && typeof bVal === 'string')
      return sortConfig.direction === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
    if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
    if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
    return 0;
  });

  const fetchAll = async () => {
    try {
      const [ovRes, distribRes, trendRes, teamPerfRes, alertRes, insightRes, teamTableRes, projRes] =
        await Promise.all([
          adminReq<any>(`/admin/overview${q}`),
          adminReq<any>(`/admin/task-distribution${q}`),
          adminReq<any>(`/admin/delay-trend${q}`),
          adminReq<any>(`/admin/team-performance${q}`),
          adminReq<any>(`/admin/critical-alerts${q}`),
          adminReq<any>(`/admin/ai-insights${q}`),
          adminReq<any>(`/admin/team-table${q}`),
          adminReq<any>(`/admin/project-monitoring${q}`),
        ]);
      setOverview(ovRes);
      setDistrib(distribRes.distribution ?? []);
      setTrend((trendRes.trend ?? []).slice(-10).map((t: any) => ({
        date: new Date(t.date).toLocaleDateString('en', { month: 'short', day: 'numeric' }),
        delays: t.delays,
      })));
      setTeamPerf((teamPerfRes.team ?? []).slice(0, 7).map((t: any) => ({
        name: t.name, completed: t.completed, delayed: t.delayed,
      })));
      setAlerts(alertRes.alerts ?? []);
      setInsights(insightRes.insights ?? []);
      setTeamTable(teamTableRes.team ?? []);
      setProjects(projRes.projects ?? []);
      // also populate userList from teamTable for the Users tab
      setUserList(teamTableRes.team ?? []);
    } catch (err) {
      console.error('Admin fetch error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { fetchAll(); }, []);

  const handleRefresh = () => { setRefreshing(true); fetchAll(); };

  const RISK_COLOR: Record<string, string> = {
    green: 'var(--color-success)',
    yellow: 'var(--color-warning)',
    red: 'var(--color-danger)',
  };
  const statusColor = (s: string) =>
    ({ good: '#10B981', warning: '#F59E0B', risk: '#F43F5E' }[s] ?? '#4A5178');

  const logout = () => {
    localStorage.removeItem('vtc_admin_token');
    localStorage.removeItem('vtc_admin_user');
    router.push('/vtc-admin/login');
  };

  // ── User Creation ──────────────────────────────────────
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setUserFormLoading(true);
    setUserFormMsg(null);
    try {
      await adminReq(`/admin/users`, {
        method: 'POST',
        body: JSON.stringify({ ...userForm, workspace_id: wsId }),
      });
      setUserFormMsg({ type: 'success', text: `User "${userForm.name}" created successfully!` });
      setUserForm({ name: '', email: '', password: '', role: 'member', department: '' });
      // refresh team list
      const teamRes = await adminReq<any>(`/admin/team-table${q}`);
      setUserList(teamRes.team ?? []);
    } catch (err: any) {
      setUserFormMsg({ type: 'error', text: err.message ?? 'Failed to create user.' });
    } finally {
      setUserFormLoading(false);
    }
  };

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '9px 12px', borderRadius: 8, fontSize: 13,
    background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)',
    color: 'var(--text-primary)', outline: 'none', boxSizing: 'border-box',
  };
  const labelStyle: React.CSSProperties = {
    fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 5, display: 'block',
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)' }}>

      {/* ── Admin Topbar ──────────────────────────────────── */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 100,
        background: 'var(--bg-secondary)',
        borderBottom: '1px solid var(--border)',
        height: 60, padding: '0 28px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 32, height: 32, borderRadius: 8,
            background: 'linear-gradient(135deg,#7c5af3,#ef4444)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Shield size={16} color="white" />
          </div>
          <div>
            <div style={{ fontFamily: 'Space Grotesk, sans-serif', fontWeight: 800, fontSize: 15, color: 'var(--text-primary)', lineHeight: 1 }}>
              VTcontroller Admin
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Restricted access panel</div>
          </div>
          <span style={{
            background: 'rgba(239,68,68,0.12)', color: '#ef4444',
            border: '1px solid rgba(239,68,68,0.25)',
            borderRadius: 20, padding: '2px 10px',
            fontSize: 10, fontWeight: 700, letterSpacing: '0.5px', marginLeft: 4,
          }}>ADMIN ONLY</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{adminUser.email}</span>
          <button
            onClick={logout}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '6px 12px', borderRadius: 8,
              background: 'rgba(239,68,68,0.08)',
              border: '1px solid rgba(239,68,68,0.2)',
              color: '#ef4444', cursor: 'pointer', fontSize: 12, fontWeight: 600,
            }}
          >
            <LogOut size={12} /> Sign Out
          </button>
        </div>
      </div>

      {/* ── Main content ─────────────────────────────────── */}
      <main style={{ padding: '28px 32px' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
          <div>
            <h1 style={{ fontFamily: 'Space Grotesk, sans-serif', fontWeight: 800, fontSize: '22px', marginBottom: '2px' }}>
              AI Command Dashboard
            </h1>
            <p style={{ fontSize: '14px', color: 'var(--text-muted)' }}>Real-time intelligence for admin oversight</p>
          </div>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <span style={{
              padding: '5px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: 600,
              background: 'var(--color-success-dim)', color: 'var(--color-success)',
              border: '1px solid rgba(16,185,129,0.3)',
            }}>● AI Active</span>
            <button onClick={handleRefresh} disabled={refreshing} className="btn btn-ghost" style={{ fontSize: '13px', gap: '6px' }}>
              <RefreshCw size={13} style={{ animation: refreshing ? 'spin 1s linear infinite' : 'none' }} /> Refresh
            </button>
          </div>
        </div>

        {/* AI Banner */}
        <div style={{
          padding: '16px 20px', borderRadius: '14px', marginBottom: '20px',
          background: 'linear-gradient(135deg, rgba(10,65,116,0.6), rgba(78,142,162,0.3))',
          border: '1px solid rgba(123, 189, 232, 0.2)',
          display: 'flex', alignItems: 'center', gap: '14px',
          boxShadow: 'inset 0 1px 0 rgba(189,216,233,0.06)',
        }}>
          <div style={{ width: 44, height: 44, borderRadius: '12px', background: 'linear-gradient(135deg, #0A4174, #4E8EA2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: '0 4px 12px rgba(0,0,0,0.3)' }}>
            <Brain size={22} color="#BDD8E9" />
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: '16px', fontFamily: 'Space Grotesk, sans-serif', marginBottom: '2px', color: 'var(--blue-100)' }}>AI Command Center</div>
            <div style={{ fontSize: '13px', color: 'var(--blue-400)' }}>
              VTcontroller is monitoring <strong style={{ color: 'var(--blue-300)' }}>{overview?.active_tasks ?? '...'} tasks</strong> across <strong style={{ color: 'var(--blue-300)' }}>{overview?.total_projects ?? '...'} projects</strong> in real-time
            </div>
          </div>
        </div>

        {/* Overview cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '14px', marginBottom: '20px' }}>
          {loading
            ? Array(4).fill(0).map((_, i) => (
              <div key={i} className="card" style={{ height: '100px' }}>
                <Skeleton h={14} w="60%" /><Skeleton h={36} w="40%" />
              </div>
            ))
            : [
              { label: 'Total Projects',    value: overview?.total_projects,        sub: `${overview?.active_projects} active`,  color: 'var(--blue-300)' },
              { label: 'Active Tasks',      value: overview?.active_tasks,          sub: 'In progress',                          color: 'var(--color-success)' },
              { label: 'Overdue / Blocked', value: overview?.critical_count,        sub: 'Needs attention',                      color: 'var(--color-danger)' },
              { label: 'Team Efficiency',   value: `${overview?.team_efficiency ?? 0}%`, sub: 'Avg across team',                      color: 'var(--blue-400)' },
            ].map(card => (
              <div key={card.label} className="card">
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '8px', fontWeight: 500 }}>{card.label}</div>
                <div style={{ fontFamily: 'Space Grotesk, sans-serif', fontWeight: 800, fontSize: '30px', color: card.color }}>{card.value}</div>
                <div style={{ fontSize: '12px', color: 'var(--text-dim)', marginTop: '4px' }}>{card.sub}</div>
              </div>
            ))
          }
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: '4px', marginBottom: '20px', background: 'var(--bg-secondary)', borderRadius: '10px', padding: '4px', width: 'fit-content' }}>
          {(['overview', 'projects', 'team', 'users'] as ActiveTab[]).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                padding: '7px 18px', borderRadius: '8px', fontSize: '13px', fontWeight: 600,
                cursor: 'pointer', border: 'none',
                background: activeTab === tab ? 'var(--bg-card)' : 'transparent',
                color: activeTab === tab ? 'var(--text-primary)' : 'var(--text-muted)',
                transition: 'all 0.15s',
                display: 'flex', alignItems: 'center', gap: '6px',
              }}
            >
              {tab === 'users' && <UserPlus size={12} />}
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
              {tab === 'users' && (
                <span style={{ background: 'rgba(124,90,243,0.2)', color: '#7c5af3', borderRadius: 10, padding: '1px 6px', fontSize: 10, fontWeight: 700 }}>
                  NEW
                </span>
              )}
            </button>
          ))}
        </div>

        {/* ══ Overview Tab ══════════════════════════════════════ */}
        {activeTab === 'overview' && (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr 2fr', gap: '14px', marginBottom: '20px' }}>
              {/* Donut */}
              <div className="card">
                <div style={{ fontWeight: 700, marginBottom: '4px' }}>Task Distribution</div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '12px' }}>By status</div>
                {loading ? <Skeleton h={150} radius={8} /> : (
                  <>
                    <ResponsiveContainer width="100%" height={120}>
                      <PieChart>
                        <Pie data={distrib} cx="50%" cy="50%" innerRadius={30} outerRadius={55} paddingAngle={3} dataKey="value">
                          {distrib.map((entry: any, i: number) => <Cell key={i} fill={entry.color} />)}
                        </Pie>
                        <Tooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '8px', fontSize: '12px' }} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '8px' }}>
                      {distrib.map((d: any) => (
                        <div key={d.name} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px' }}>
                          <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-muted)' }}>
                            <span style={{ width: 7, height: 7, borderRadius: '50%', background: d.color, display: 'inline-block' }} />{d.name}
                          </span>
                          <span style={{ fontWeight: 700 }}>{d.value}</span>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>

              {/* Delay Trend */}
              <div className="card">
                <div style={{ fontWeight: 700, marginBottom: '4px', color: 'var(--text-primary)' }}>Delay Trend</div>
                <div style={{ fontSize: '12px', color: '#EF4444', marginBottom: '12px' }}>Overdue tasks per day</div>
                {loading ? <Skeleton h={160} radius={8} /> : (
                  trend.length === 0
                    ? <div style={{ height: 160, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: 13 }}>No delay data available</div>
                    : (
                      <ResponsiveContainer width="100%" height={160}>
                        <LineChart data={trend}>
                          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                          <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'var(--text-muted)' }} />
                          <YAxis tick={{ fontSize: 10, fill: 'var(--text-muted)' }} />
                          <Tooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '8px', fontSize: '12px' }} />
                          <Line type="monotone" dataKey="delays" stroke="#EF4444" strokeWidth={2} dot={{ fill: '#EF4444', r: 3 }} />
                        </LineChart>
                      </ResponsiveContainer>
                    )
                )}
              </div>

              {/* Team Performance */}
              <div className="card">
                <div style={{ fontWeight: 700, marginBottom: '4px', color: 'var(--text-primary)' }}>Team Performance</div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '12px' }}>Completed vs delayed tasks</div>
                {loading ? <Skeleton h={160} radius={8} /> : (
                  teamPerf.length === 0
                    ? <div style={{ height: 160, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: 13 }}>No team performance data</div>
                    : (
                      <ResponsiveContainer width="100%" height={160}>
                        <BarChart data={teamPerf} barSize={8}>
                          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                          <XAxis dataKey="name" tick={{ fontSize: 10, fill: 'var(--text-muted)' }} />
                          <YAxis tick={{ fontSize: 10, fill: 'var(--text-muted)' }} />
                          <Tooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '8px', fontSize: '12px' }} />
                          <Bar dataKey="completed" fill="#10B981" radius={[4, 4, 0, 0]} />
                          <Bar dataKey="delayed"   fill="#EF4444" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    )
                )}
              </div>
            </div>

            {/* Alerts + Insights */}
            <div style={{ display: 'grid', gridTemplateColumns: '3fr 2fr', gap: '14px' }}>
              <div className="card">
                <div style={{ fontWeight: 700, marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <AlertTriangle size={15} color="#ef4444" /> Critical Alerts
                  <span style={{ background: 'rgba(239,68,68,0.15)', color: '#ef4444', borderRadius: '20px', padding: '1px 8px', fontSize: '11px', fontWeight: 700 }}>{alerts.length}</span>
                </div>
                {loading
                  ? Array(3).fill(0).map((_, i) => <div key={i} style={{ marginBottom: '10px' }}><Skeleton h={56} radius={8} /></div>)
                  : alerts.length === 0
                    ? <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>✓ No critical alerts. All tasks are on track.</div>
                    : alerts.slice(0, 5).map((alert: any) => (
                      <div key={alert.id} style={{ padding: '10px 12px', borderRadius: '8px', background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.1)', marginBottom: '8px' }}>
                        <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                          <div style={{ width: 7, height: 7, borderRadius: '50%', background: alert.status === 'blocked' ? '#ef4444' : '#f59e0b', flexShrink: 0, marginTop: '5px' }} />
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{alert.title}</div>
                            {alert.delay_reason && <div style={{ fontSize: '11px', color: '#f59e0b' }}>⚠ {alert.delay_reason}</div>}
                            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>{alert.project.name}</div>
                          </div>
                        </div>
                      </div>
                    ))
                }
              </div>
              <div className="card">
                <div style={{ fontWeight: 700, marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-primary)' }}>
                  <Zap size={15} color="var(--blue-300)" /> AI Insights
                </div>
                {loading
                  ? Array(3).fill(0).map((_, i) => <div key={i} style={{ marginBottom: '10px' }}><Skeleton h={70} radius={8} /></div>)
                  : insights.map((ins: any) => (
                    <div key={ins.id} style={{
                      padding: '12px 14px', borderRadius: '10px', marginBottom: '10px',
                      background: ins.type === 'danger' ? 'rgba(251,113,133,0.1)' : ins.type === 'warning' ? 'rgba(251,191,36,0.1)' : 'rgba(78,142,162,0.12)',
                      border: `1px solid ${ins.type === 'danger' ? 'rgba(251,113,133,0.3)' : ins.type === 'warning' ? 'rgba(251,191,36,0.3)' : 'rgba(123,189,232,0.25)'}`,
                      borderLeft: `3px solid ${ins.type === 'danger' ? '#FB7185' : ins.type === 'warning' ? '#FBBF24' : '#7BBDE8'}`,
                    }}>
                      <div style={{ fontSize: '12.5px', color: 'var(--blue-100)', lineHeight: 1.65, fontWeight: 400 }}>{ins.message}</div>
                    </div>
                  ))
                }
              </div>
            </div>
          </>
        )}

        {/* ══ Projects Tab ══════════════════════════════════════ */}
        {activeTab === 'projects' && (
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)', fontWeight: 700, fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <FolderKanban size={15} color="#4f8ef7" /> Project Monitoring
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)' }}>
                    {['Project', 'Status', 'Progress', 'Risk', 'Tasks', 'Overdue', 'End Date'].map(h => (
                      <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {loading
                    ? Array(5).fill(0).map((_, i) => <tr key={i}><td colSpan={7} style={{ padding: '12px 16px' }}><Skeleton h={20} /></td></tr>)
                    : projects.map((p: any) => (
                      <tr key={p.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}
                        onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.02)')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                      >
                        <td style={{ padding: '12px 16px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div style={{ width: 8, height: 8, borderRadius: '50%', background: p.color, flexShrink: 0 }} />
                            <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{p.name}</span>
                          </div>
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <span style={{ fontSize: '11px', padding: '3px 9px', borderRadius: '12px', background: 'rgba(79,142,247,0.1)', color: '#4f8ef7' }}>{p.status}</span>
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div style={{ width: 80, height: 5, borderRadius: '3px', background: 'rgba(255,255,255,0.08)' }}>
                              <div style={{ width: `${p.completion}%`, height: '100%', background: '#4f8ef7', borderRadius: '3px' }} />
                            </div>
                            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{p.completion}%</span>
                          </div>
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <span style={{ fontSize: '11px', padding: '3px 9px', borderRadius: '12px', background: `${RISK_COLOR[p.risk_level] ?? '#6b7280'}18`, color: RISK_COLOR[p.risk_level] ?? '#6b7280' }}>
                            {p.risk_level.charAt(0).toUpperCase() + p.risk_level.slice(1)}
                          </span>
                        </td>
                        <td style={{ padding: '12px 16px', color: 'var(--text-muted)' }}>{p.total_tasks}</td>
                        <td style={{ padding: '12px 16px', color: p.overdue_tasks > 0 ? '#ef4444' : 'var(--text-muted)', fontWeight: p.overdue_tasks > 0 ? 700 : 400 }}>{p.overdue_tasks}</td>
                        <td style={{ padding: '12px 16px', color: 'var(--text-muted)', fontSize: '12px' }}>
                          {p.end_date ? new Date(p.end_date).toLocaleDateString('en', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
                        </td>
                      </tr>
                    ))
                  }
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ══ Team Tab ══════════════════════════════════════════ */}
        {activeTab === 'team' && (
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)', fontWeight: 700, fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Users size={15} color="#4f8ef7" /> Team Performance Analysis
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)' }}>
                    {['Team Member', 'Role', 'Assigned', 'Completed', 'Pending', 'Overdue', 'Efficiency', 'Status', 'Actions'].map(h => (
                      <th
                        key={h}
                        onClick={() => handleSort(h)}
                        style={{
                          padding: '10px 16px', textAlign: 'left', fontSize: '11px', fontWeight: 600,
                          color: sortConfig.key === h ? 'white' : 'var(--text-muted)',
                          whiteSpace: 'nowrap', cursor: h === 'Actions' ? 'default' : 'pointer',
                          userSelect: 'none',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          {h}
                          {sortConfig.key === h && (
                            <span style={{ fontSize: '10px', color: '#7c5af3' }}>
                              {sortConfig.direction === 'asc' ? '↑' : '↓'}
                            </span>
                          )}
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {loading
                    ? Array(5).fill(0).map((_, i) => <tr key={i}><td colSpan={9} style={{ padding: '12px 16px' }}><Skeleton h={20} /></td></tr>)
                    : sortedTeamTable.map((m: any) => (
                      <tr key={m.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}
                        onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.02)')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                      >
                        <td style={{ padding: '12px 16px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div style={{ width: 28, height: 28, borderRadius: '50%', background: `hsl(${(m.id * 67) % 360},65%,50%)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: 700, color: 'white' }}>
                              {m.avatar || m.name[0]}
                            </div>
                            <div>
                              <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{m.name}</div>
                              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{m.department}</div>
                            </div>
                          </div>
                        </td>
                        <td style={{ padding: '12px 16px' }}><span style={{ fontSize: '11px', textTransform: 'capitalize', color: 'var(--text-muted)' }}>{m.role}</span></td>
                        <td style={{ padding: '12px 16px', color: 'var(--text-secondary)', fontWeight: 600 }}>{m.assigned}</td>
                        <td style={{ padding: '12px 16px', color: '#22c55e', fontWeight: 600 }}>{m.completed}</td>
                        <td style={{ padding: '12px 16px', color: 'var(--text-muted)' }}>{m.pending}</td>
                        <td style={{ padding: '12px 16px', color: m.overdue > 0 ? '#ef4444' : 'var(--text-muted)', fontWeight: m.overdue > 0 ? 700 : 400 }}>{m.overdue}</td>
                        <td style={{ padding: '12px 16px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div style={{ width: 60, height: 5, borderRadius: '3px', background: 'rgba(255,255,255,0.08)' }}>
                              <div style={{ width: `${m.efficiency}%`, height: '100%', background: statusColor(m.status), borderRadius: '3px' }} />
                            </div>
                            <span style={{ fontSize: '11px', color: statusColor(m.status), fontWeight: 700 }}>{m.efficiency}%</span>
                          </div>
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <span style={{ fontSize: '10px', padding: '3px 9px', borderRadius: '12px', background: `${statusColor(m.status)}18`, color: statusColor(m.status), fontWeight: 700 }}>
                            {m.status.charAt(0).toUpperCase() + m.status.slice(1)}
                          </span>
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <button
                            onClick={() => openAudit(m)}
                            style={{ padding: '4px 10px', borderRadius: '6px', fontSize: '10px', fontWeight: 700, background: 'rgba(239,68,68,0.1)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.2)', cursor: 'pointer' }}
                          >
                            Audit Chats
                          </button>
                        </td>
                      </tr>
                    ))
                  }
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ══ Users Tab (Create + Manage) ═══════════════════════ */}
        {activeTab === 'users' && (
          <div style={{ display: 'grid', gridTemplateColumns: '380px 1fr', gap: '16px', alignItems: 'start' }}>

            {/* Create User Card */}
            <div className="card">
              <div style={{ fontWeight: 700, fontSize: '14px', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <UserPlus size={15} color="#7c5af3" /> Create New User
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '20px' }}>
                Add a team member to this workspace
              </div>

              {userFormMsg && (
                <div style={{
                  display: 'flex', alignItems: 'center', gap: '8px',
                  padding: '10px 12px', borderRadius: '8px', marginBottom: '16px', fontSize: '13px',
                  background: userFormMsg.type === 'success' ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
                  border: `1px solid ${userFormMsg.type === 'success' ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}`,
                  color: userFormMsg.type === 'success' ? '#10B981' : '#ef4444',
                }}>
                  {userFormMsg.type === 'success' ? <CheckCircle2 size={14} /> : <XCircle size={14} />}
                  {userFormMsg.text}
                </div>
              )}

              <form onSubmit={handleCreateUser} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div>
                  <label style={labelStyle}>Full Name *</label>
                  <input
                    style={inputStyle}
                    placeholder="e.g. Jane Smith"
                    value={userForm.name}
                    onChange={e => setUserForm(f => ({ ...f, name: e.target.value }))}
                    required
                  />
                </div>
                <div>
                  <label style={labelStyle}>Email Address *</label>
                  <input
                    type="email"
                    style={inputStyle}
                    placeholder="jane@company.com"
                    value={userForm.email}
                    onChange={e => setUserForm(f => ({ ...f, email: e.target.value }))}
                    required
                  />
                </div>
                <div>
                  <label style={labelStyle}>Password *</label>
                  <input
                    type="password"
                    style={inputStyle}
                    placeholder="Min 6 characters"
                    value={userForm.password}
                    onChange={e => setUserForm(f => ({ ...f, password: e.target.value }))}
                    required
                    minLength={6}
                  />
                </div>
                <div>
                  <label style={labelStyle}>Role *</label>
                  <input
                    style={inputStyle}
                    placeholder="e.g. Member"
                    value={userForm.role}
                    onChange={e => setUserForm(f => ({ ...f, role: e.target.value }))}
                    required
                  />
                </div>
                <div>
                  <label style={labelStyle}>Department</label>
                  <input
                    style={inputStyle}
                    placeholder="e.g. Engineering"
                    value={userForm.department}
                    onChange={e => setUserForm(f => ({ ...f, department: e.target.value }))}
                  />
                </div>
                <button
                  type="submit"
                  disabled={userFormLoading}
                  style={{
                    padding: '10px', borderRadius: '8px', fontSize: '13px', fontWeight: 700,
                    background: userFormLoading ? 'rgba(124,90,243,0.4)' : 'linear-gradient(135deg,#7c5af3,#5a3edb)',
                    color: 'white', border: 'none', cursor: userFormLoading ? 'not-allowed' : 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                    transition: 'opacity 0.15s',
                  }}
                >
                  {userFormLoading ? (
                    <><RefreshCw size={13} style={{ animation: 'spin 1s linear infinite' }} /> Creating...</>
                  ) : (
                    <><UserPlus size={13} /> Create User</>
                  )}
                </button>
              </form>
            </div>

            {/* Existing Users Table */}
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)', fontWeight: 700, fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Users size={15} color="#4f8ef7" /> Workspace Members
                <span style={{ background: 'rgba(79,142,247,0.15)', color: '#4f8ef7', borderRadius: '20px', padding: '1px 8px', fontSize: '11px', fontWeight: 700 }}>
                  {userList.length}
                </span>
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border)' }}>
                      {['Member', 'Email', 'Role', 'Department', 'Tasks', 'Efficiency', 'Status', 'Actions'].map(h => (
                        <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {loading
                      ? Array(4).fill(0).map((_, i) => <tr key={i}><td colSpan={8} style={{ padding: '12px 16px' }}><Skeleton h={20} /></td></tr>)
                      : userList.map((m: any) => (
                        <tr key={m.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}
                          onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.02)')}
                          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                        >
                          <td style={{ padding: '12px 16px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <div style={{ width: 28, height: 28, borderRadius: '50%', background: `hsl(${(m.id * 67) % 360},65%,50%)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: 700, color: 'white', flexShrink: 0 }}>
                                {m.avatar || m.name?.[0]}
                              </div>
                              <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{m.name}</span>
                            </div>
                          </td>
                          <td style={{ padding: '12px 16px', color: 'var(--text-muted)', fontSize: '12px' }}>{m.email}</td>
                          <td style={{ padding: '12px 16px' }}>
                            <button 
                              onClick={() => {
                                const newRole = prompt('Enter new role for this user:', m.role);
                                if (newRole !== null && newRole.trim() !== '' && newRole !== m.role) {
                                  updateRole(m.id, newRole.trim());
                                }
                              }}
                              disabled={actionLoading === `role-${m.id}`}
                              style={{
                                background: m.role?.toLowerCase() === 'admin' ? 'rgba(239,68,68,0.1)' : m.role?.toLowerCase() === 'manager' ? 'rgba(245,158,11,0.1)' : 'rgba(79,142,247,0.1)',
                                color: m.role?.toLowerCase() === 'admin' ? '#ef4444' : m.role?.toLowerCase() === 'manager' ? '#f59e0b' : '#4f8ef7',
                                border: '1px solid var(--border)', borderRadius: '6px', padding: '4px 8px', fontSize: '10px', fontWeight: 700, cursor: 'pointer', outline: 'none',
                                display: 'inline-flex', alignItems: 'center', gap: 4, textTransform: 'capitalize',
                                opacity: actionLoading === `role-${m.id}` ? 0.5 : 1
                              }}
                              title="Click to edit role"
                            >
                              {actionLoading === `role-${m.id}` ? 'Updating...' : (m.role || 'Member')} <Edit3 size={10} />
                            </button>
                          </td>
                          <td style={{ padding: '12px 16px', color: 'var(--text-muted)', fontSize: '12px' }}>{m.department || '—'}</td>
                          <td style={{ padding: '12px 16px', color: 'var(--text-secondary)', fontWeight: 600 }}>{m.assigned}</td>
                          <td style={{ padding: '12px 16px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <div style={{ width: 50, height: 4, borderRadius: '3px', background: 'rgba(255,255,255,0.08)' }}>
                                <div style={{ width: `${m.efficiency}%`, height: '100%', background: statusColor(m.status), borderRadius: '3px' }} />
                              </div>
                              <span style={{ fontSize: '11px', color: statusColor(m.status), fontWeight: 700 }}>{m.efficiency}%</span>
                            </div>
                          </td>
                          <td style={{ padding: '12px 16px' }}>
                            <span style={{ fontSize: '10px', padding: '3px 9px', borderRadius: '12px', background: `${statusColor(m.status)}18`, color: statusColor(m.status), fontWeight: 700 }}>
                              {m.status?.charAt(0).toUpperCase() + m.status?.slice(1)}
                            </span>
                          </td>
                          <td style={{ padding: '12px 16px' }}>
                            <div style={{ display: 'flex', gap: '6px' }}>
                              <button
                                onClick={() => resetPassword(m.id)}
                                disabled={actionLoading === `reset-${m.id}`}
                                style={{ padding: '4px', borderRadius: '6px', background: 'rgba(79,142,247,0.1)', color: '#4f8ef7', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                title="Reset Password"
                              >
                                <Key size={14} />
                              </button>
                              <button
                                onClick={() => deleteUser(m.id)}
                                disabled={actionLoading === `delete-${m.id}` || m.email === adminUser?.email}
                                style={{ padding: '4px', borderRadius: '6px', background: 'rgba(239,68,68,0.1)', color: '#ef4444', border: 'none', cursor: m.email === adminUser?.email ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: m.email === adminUser?.email ? 0.3 : 1 }}
                                title={m.email === adminUser?.email ? "Cannot delete yourself" : "Delete User"}
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    }
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ── Audit Modal ── */}
        {auditUser && (
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(5px)' }}>
            <div style={{ background: 'var(--bg-secondary)', width: 600, height: '80vh', borderRadius: 16, border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: 16 }}>Audit Logs: {auditUser.name}</h3>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Read-only chat history view</div>
                </div>
                <button onClick={() => setAuditUser(null)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}><XCircle size={18} /></button>
              </div>
              <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px' }}>
                {auditLoading ? <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>Loading...</div>
                  : auditData?.length === 0 ? <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>No chats found for this user.</div>
                  : auditData?.map((chat: any) => (
                    <div key={chat.id} style={{ marginBottom: 24, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, padding: 16 }}>
                      <div style={{ fontWeight: 600, marginBottom: 12, color: '#4f8ef7' }}>{chat.type === 'direct' ? 'Direct: ' : 'Group: '}{chat.title}</div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {chat.messages.length === 0 && <span style={{fontSize:11, color:'var(--text-muted)'}}>No messages</span>}
                        {chat.messages.map((msg: any) => (
                          <div key={msg.id} style={{ fontSize: 12, display: 'flex', gap: 6, lineHeight: 1.4 }}>
                            <span style={{ color: msg.user.id === auditUser.id ? '#10B981' : 'var(--text-muted)', fontWeight: 600, whiteSpace: 'nowrap' }}>{msg.user.name}:</span>
                            <span style={{ color: 'var(--text-primary)' }}>{msg.content || (msg.type === 'image' ? '[Image Attachment]' : '[Link Attachment]')}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        )}

      </main>

      <ChatPopup />

      {/* Animations are now in globals.css */}
      <style>{`select option { background: #1a1f2e; color: white; }`}</style>
    </div>
  );
}

export default function AdminPanelPage() {
  return (
    <AdminGuard>
      <AdminPanelContent />
    </AdminGuard>
  );
}
