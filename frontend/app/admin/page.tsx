'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import AppLayout from '@/components/AppLayout';
import { useAuth } from '@/lib/auth';
import { adminApi, type AdminOverview, type AdminAlert, type AiInsight, type TeamMember, type ProjectMonitor } from '@/lib/api';
import {
  ResponsiveContainer, PieChart, Pie, Cell, Tooltip,
  LineChart, Line, XAxis, YAxis, CartesianGrid, BarChart, Bar,
} from 'recharts';
import { Brain, RefreshCw, AlertTriangle, Zap, FolderKanban } from 'lucide-react';

const Skeleton = ({ h = 20, w = '100%', radius = 6 }: any) => (
  <div style={{ width: w, height: h, borderRadius: radius, background: 'rgba(255,255,255,0.05)', animation: 'shimmer 1.5s infinite', backgroundSize: '200% 100%', backgroundImage: 'linear-gradient(90deg,rgba(255,255,255,0.04)25%,rgba(255,255,255,0.07)50%,rgba(255,255,255,0.04)75%)' }} />
);

type ActiveTab = 'overview' | 'projects' | 'team';

export default function AdminPage() {
  const { user } = useAuth();
  const wsId = user?.current_workspace_id;

  const [overview, setOverview]       = useState<AdminOverview | null>(null);
  const [distrib, setDistrib]         = useState<any[]>([]);
  const [trend, setTrend]             = useState<any[]>([]);
  const [teamPerf, setTeamPerf]       = useState<any[]>([]);
  const [alerts, setAlerts]           = useState<AdminAlert[]>([]);
  const [insights, setInsights]       = useState<AiInsight[]>([]);
  const [teamTable, setTeamTable]     = useState<TeamMember[]>([]);
  const [projects, setProjects]       = useState<ProjectMonitor[]>([]);
  const [loading, setLoading]         = useState(true);
  const [refreshing, setRefreshing]   = useState(false);
  const [activeTab, setActiveTab]     = useState<ActiveTab>('overview');
  const [sortConfig, setSortConfig]   = useState<{ key: string | null, direction: 'asc' | 'desc' }>({ key: null, direction: 'asc' });

  const handleSort = (key: string) => {
    if (key === 'Actions') return;
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const getSortKey = (h: string): keyof TeamMember | null => {
    const map: Record<string, keyof TeamMember> = {
      'Team Member': 'name', 'Role': 'role', 'Assigned': 'assigned',
      'Completed': 'completed', 'Pending': 'pending', 'Overdue': 'overdue',
      'Efficiency': 'efficiency', 'Status': 'status'
    };
    return map[h] || null;
  };

  const sortedTeamTable = [...teamTable].sort((a, b) => {
    if (!sortConfig.key) return 0;
    const key = getSortKey(sortConfig.key);
    if (!key) return 0;
    
    let aVal = a[key];
    let bVal = b[key];
    
    if (typeof aVal === 'string' && typeof bVal === 'string') {
      return sortConfig.direction === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
    }
    if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
    if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
    return 0;
  });

  const fetchAll = async () => {
    try {
      const [ovRes, distribRes, trendRes, teamPerfRes, alertRes, insightRes, teamTableRes, projRes] = await Promise.all([
        adminApi.overview(wsId),
        adminApi.taskDistribution(wsId),
        adminApi.delayTrend(wsId),
        adminApi.teamPerformance(wsId),
        adminApi.criticalAlerts(wsId),
        adminApi.aiInsights(wsId),
        adminApi.teamTable(wsId),
        adminApi.projectMonitoring(wsId),
      ]);
      setOverview(ovRes);
      setDistrib(distribRes.distribution);
      setTrend(trendRes.trend.slice(-10).map(t => ({
        date: new Date(t.date).toLocaleDateString('en', { month: 'short', day: 'numeric' }),
        delays: t.delays,
      })));
      setTeamPerf(teamPerfRes.team.slice(0, 7).map(t => ({ name: t.name, completed: t.completed, delayed: t.delayed })));
      setAlerts(alertRes.alerts);
      setInsights(insightRes.insights);
      setTeamTable(teamTableRes.team);
      setProjects(projRes.projects);
    } catch (err) { console.error(err); }
    finally { setLoading(false); setRefreshing(false); }
  };

  const router = useRouter();

  useEffect(() => { 
    if (user) {
      if (user.role === 'member') {
        router.push('/dashboard');
        return;
      }
      fetchAll(); 
    }
  }, [user, router]);

  const handleRefresh = () => { setRefreshing(true); fetchAll(); };

  const RISK_COLOR = { green: 'var(--color-success)', yellow: 'var(--color-warning)', red: 'var(--color-danger)' };
  const statusColor = (s: string) => ({ good: '#10B981', warning: '#F59E0B', risk: '#F43F5E' }[s] ?? '#4A5178');

  return (
    <AppLayout>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
        <div>
          <h1 style={{ fontFamily: 'Space Grotesk, sans-serif', fontWeight: 800, fontSize: '22px', marginBottom: '2px' }}>AI Command Dashboard</h1>
          <p style={{ fontSize: '14px', color: 'var(--text-muted)' }}>Real-time intelligence for admin oversight</p>
        </div>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <span style={{ padding: '5px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: 600, background: 'var(--color-success-dim)', color: 'var(--color-success)', border: '1px solid rgba(16,185,129,0.3)' }}>● AI Active</span>
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
        {loading ? Array(4).fill(0).map((_, i) => <div key={i} className="card" style={{ height: '100px' }}><Skeleton h={14} w="60%" /><Skeleton h={36} w="40%" /></div>) : [
          { label: 'Total Projects',    value: overview?.total_projects,   sub: `${overview?.active_projects} active`, color: 'var(--blue-300)' },
          { label: 'Active Tasks',      value: overview?.active_tasks,     sub: 'In progress',    color: 'var(--color-success)' },
          { label: 'Overdue / Blocked', value: overview?.critical_count,   sub: 'Needs attention', color: 'var(--color-danger)' },
          { label: 'Team Efficiency',   value: `${overview?.team_efficiency ?? 0}%`, sub: 'Avg across team', color: 'var(--blue-400)' },
        ].map(card => (
          <div key={card.label} className="card">
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '8px', fontWeight: 500 }}>{card.label}</div>
            <div style={{ fontFamily: 'Space Grotesk, sans-serif', fontWeight: 800, fontSize: '30px', color: card.color }}>{card.value}</div>
            <div style={{ fontSize: '12px', color: 'var(--text-dim)', marginTop: '4px' }}>{card.sub}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '4px', marginBottom: '20px', background: 'var(--bg-secondary)', borderRadius: '10px', padding: '4px', width: 'fit-content' }}>
        {(['overview', 'projects', 'team'] as ActiveTab[]).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              padding: '7px 18px', borderRadius: '8px', fontSize: '13px', fontWeight: 600, cursor: 'pointer',
              border: 'none',
              background: activeTab === tab ? 'var(--bg-card)' : 'transparent',
              color: activeTab === tab ? 'var(--text-primary)' : 'var(--text-muted)',
              transition: 'all 0.15s',
            }}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {/* Overview Tab */}
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
                        {distrib.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                      </Pie>
                      <Tooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '8px', fontSize: '12px' }} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '8px' }}>
                    {distrib.map(d => (
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
                <ResponsiveContainer width="100%" height={160}>
                  <LineChart data={trend}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'var(--text-muted)' }} />
                    <YAxis tick={{ fontSize: 10, fill: 'var(--text-muted)' }} />
                    <Tooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '8px', fontSize: '12px' }} />
                    <Line type="monotone" dataKey="delays" stroke="#EF4444" strokeWidth={2} dot={{ fill: '#EF4444', r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>
            {/* Team Performance */}
            <div className="card">
              <div style={{ fontWeight: 700, marginBottom: '4px', color: 'var(--text-primary)' }}>Team Performance</div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '12px' }}>Completed vs delayed tasks</div>
              {loading ? <Skeleton h={160} radius={8} /> : (
                <ResponsiveContainer width="100%" height={160}>
                  <BarChart data={teamPerf} barSize={8}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis dataKey="name" tick={{ fontSize: 10, fill: 'var(--text-muted)' }} />
                    <YAxis tick={{ fontSize: 10, fill: 'var(--text-muted)' }} />
                    <Tooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '8px', fontSize: '12px' }} />
                    <Bar dataKey="completed" fill="#10B981" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="delayed" fill="#EF4444" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
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
              {loading ? Array(3).fill(0).map((_, i) => <div key={i} style={{ marginBottom: '10px' }}><Skeleton h={56} radius={8} /></div>) : alerts.slice(0, 5).map(alert => (
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
              ))}
            </div>
            <div className="card">
              <div style={{ fontWeight: 700, marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-primary)' }}>
                <Zap size={15} color="var(--blue-300)" /> AI Insights
              </div>
              {loading ? Array(3).fill(0).map((_, i) => <div key={i} style={{ marginBottom: '10px' }}><Skeleton h={70} radius={8} /></div>) : insights.map(ins => (
                <div key={ins.id} style={{
                  padding: '12px 14px', borderRadius: '10px', marginBottom: '10px',
                  background: ins.type === 'danger'
                    ? 'rgba(251, 113, 133, 0.1)'
                    : ins.type === 'warning'
                      ? 'rgba(251, 191, 36, 0.1)'
                      : 'rgba(78, 142, 162, 0.12)',
                  border: `1px solid ${ins.type === 'danger' ? 'rgba(251,113,133,0.3)' : ins.type === 'warning' ? 'rgba(251,191,36,0.3)' : 'rgba(123,189,232,0.25)'}`,
                  borderLeft: `3px solid ${ins.type === 'danger' ? '#FB7185' : ins.type === 'warning' ? '#FBBF24' : '#7BBDE8'}`,
                }}>
                  <div style={{ fontSize: '12.5px', color: 'var(--blue-100)', lineHeight: 1.65, fontWeight: 400 }}>{ins.message}</div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Projects Tab */}
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
                {loading ? Array(5).fill(0).map((_, i) => (
                  <tr key={i}><td colSpan={7} style={{ padding: '12px 16px' }}><Skeleton h={20} /></td></tr>
                )) : projects.map(p => (
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
                    <td style={{ padding: '12px 16px' }}><span style={{ fontSize: '11px', padding: '3px 9px', borderRadius: '12px', background: 'rgba(79,142,247,0.1)', color: '#4f8ef7' }}>{p.status}</span></td>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ width: 80, height: 5, borderRadius: '3px', background: 'rgba(255,255,255,0.08)' }}>
                          <div style={{ width: `${p.completion}%`, height: '100%', background: '#4f8ef7', borderRadius: '3px' }} />
                        </div>
                        <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{p.completion}%</span>
                      </div>
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{ fontSize: '11px', padding: '3px 9px', borderRadius: '12px', background: `${RISK_COLOR[p.risk_level as keyof typeof RISK_COLOR]}18`, color: RISK_COLOR[p.risk_level as keyof typeof RISK_COLOR] }}>
                        {p.risk_level.charAt(0).toUpperCase() + p.risk_level.slice(1)}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', color: 'var(--text-muted)' }}>{p.total_tasks}</td>
                    <td style={{ padding: '12px 16px', color: p.overdue_tasks > 0 ? '#ef4444' : 'var(--text-muted)' }}>{p.overdue_tasks}</td>
                    <td style={{ padding: '12px 16px', color: 'var(--text-muted)', fontSize: '12px' }}>{p.end_date ? new Date(p.end_date).toLocaleDateString('en', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Team Tab */}
      {activeTab === 'team' && (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)', fontWeight: 700, fontSize: '14px' }}>Team Performance Analysis</div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  {['Team Member', 'Role', 'Assigned', 'Completed', 'Pending', 'Overdue', 'Efficiency', 'Status', ...(user?.role === 'admin' ? ['Actions'] : [])].map(h => (
                    <th 
                      key={h} 
                      onClick={() => handleSort(h)}
                      style={{ 
                        padding: '10px 16px', textAlign: 'left', fontSize: '11px', fontWeight: 600, 
                        color: sortConfig.key === h ? 'white' : 'var(--text-muted)', 
                        whiteSpace: 'nowrap', cursor: h === 'Actions' ? 'default' : 'pointer',
                        userSelect: 'none'
                      }}>
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
                {loading ? Array(5).fill(0).map((_, i) => (
                  <tr key={i}><td colSpan={user?.role === 'admin' ? 9 : 8} style={{ padding: '12px 16px' }}><Skeleton h={20} /></td></tr>
                )) : sortedTeamTable.map(m => (
                  <tr key={m.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.02)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                  >
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ width: 28, height: 28, borderRadius: '50%', background: `hsl(${(m.id * 67) % 360},65%,50%)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: 700, color: 'white' }}>{m.avatar || m.name[0]}</div>
                        <div><div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{m.name}</div><div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{m.department}</div></div>
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
                    {user?.role === 'admin' && (
                      <td style={{ padding: '12px 16px' }}>
                        <button
                          onClick={() => router.push(`/chat?audit=${m.id}`)}
                          style={{ padding: '4px 10px', borderRadius: '6px', fontSize: '10px', fontWeight: 700, background: 'rgba(239,68,68,0.1)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.2)', cursor: 'pointer' }}
                        >
                          Audit Chats
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Animations are now in globals.css */}
    </AppLayout>
  );
}
