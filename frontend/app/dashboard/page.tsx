'use client';

import { useEffect, useState } from 'react';
import AppLayout from '@/components/AppLayout';
import { useAuth } from '@/lib/auth';
import { useRouter } from 'next/navigation';
import { adminApi, projectsApi, type AdminOverview, type AdminAlert, type AiInsight } from '@/lib/api';
import {
  ResponsiveContainer, PieChart, Pie, Cell, Tooltip,
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  BarChart, Bar,
} from 'recharts';
import {
  FolderKanban, CheckSquare, AlertTriangle, TrendingUp,
  Brain, RefreshCw, Zap,
} from 'lucide-react';

// ── Skeleton loader ───────────────────────────────────────
const Skeleton = ({ w = '100%', h = 20, radius = 6 }: { w?: string | number; h?: number; radius?: number }) => (
  <div style={{
    width: w, height: h, borderRadius: radius,
    background: 'linear-gradient(90deg, rgba(255,255,255,0.04) 25%, rgba(255,255,255,0.07) 50%, rgba(255,255,255,0.04) 75%)',
    backgroundSize: '200% 100%',
    animation: 'shimmer 1.5s infinite',
  }} />
);

export default function DashboardPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [overview, setOverview] = useState<AdminOverview | null>(null);
  const [alerts, setAlerts] = useState<AdminAlert[]>([]);
  const [insights, setInsights] = useState<AiInsight[]>([]);
  const [distrib, setDistrib] = useState<{ name: string; value: number; color: string }[]>([]);
  const [trend, setTrend] = useState<{ date: string; delays: number }[]>([]);
  const [teamPerf, setTeamPerf] = useState<{ name: string; completed: number; delayed: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchAll = async () => {
    try {
      const wsId = user?.current_workspace_id;
      const [ovRes, alertRes, insightRes, distribRes, trendRes, teamRes] = await Promise.allSettled([
        adminApi.overview(wsId),
        adminApi.criticalAlerts(wsId),
        adminApi.aiInsights(wsId),
        adminApi.taskDistribution(wsId),
        adminApi.delayTrend(wsId),
        adminApi.teamPerformance(wsId),
      ]);
      if (ovRes.status === 'fulfilled') setOverview(ovRes.value);
      if (alertRes.status === 'fulfilled') setAlerts(alertRes.value.alerts.slice(0, 4));
      if (insightRes.status === 'fulfilled') setInsights(insightRes.value.insights.slice(0, 2));
      if (distribRes.status === 'fulfilled') setDistrib(distribRes.value.distribution);
      if (trendRes.status === 'fulfilled')
        setTrend(trendRes.value.trend.slice(-8).map(t => ({
          date: new Date(t.date).toLocaleDateString('en', { month: 'short', day: 'numeric' }),
          delays: t.delays,
        })));
      if (teamRes.status === 'fulfilled')
        setTeamPerf(teamRes.value.team.slice(0, 6).map(t => ({ name: t.name, completed: t.completed, delayed: t.delayed })));
    } catch (err) {
      console.error('Dashboard fetch error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (user) {
      if (user.role === 'member') {
        router.replace('/my-tasks');
      } else {
        fetchAll();
      }
    }
  }, [user]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchAll();
  };

  const statCards = overview ? [
    { label: 'Total Projects', value: overview.total_projects, sub: `${overview.active_projects} active`, icon: FolderKanban, color: '#4f8ef7' },
    { label: 'Active Tasks', value: overview.active_tasks, sub: 'Currently in progress', icon: CheckSquare, color: '#22c55e' },
    { label: 'Overdue / Blocked', value: overview.critical_count, sub: 'Need immediate attention', icon: AlertTriangle, color: '#ef4444' },
    { label: 'Team Efficiency', value: `${overview.team_efficiency ?? 0}%`, sub: 'Avg across all members', icon: TrendingUp, color: '#7c5af3' },
  ] : [];

  return (
    <AppLayout>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontFamily: 'Space Grotesk, sans-serif', fontWeight: 800, fontSize: '22px', marginBottom: '2px' }}>
            Good {new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 18 ? 'afternoon' : 'evening'}, {user?.name?.split(' ')[0]}! 👋
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>Here's what's happening across your workspace</p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="btn btn-ghost"
          style={{ gap: '6px', fontSize: '13px' }}
        >
          <RefreshCw size={14} style={{ animation: refreshing ? 'spin 1s linear infinite' : 'none' }} />
          Refresh
        </button>
      </div>

      {/* Stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
        {loading ? Array(4).fill(0).map((_, i) => (
          <div key={`skel-${i}`} className="card" style={{ height: '110px' }}>
            <Skeleton h={14} w="60%" />
            <Skeleton h={36} w="40%" />
            <Skeleton h={12} w="80%" />
          </div>
        )) : statCards.map(card => (
          <div key={card.label} className="card" style={{ position: 'relative', overflow: 'hidden' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 500, marginBottom: '8px' }}>{card.label}</div>
                <div style={{ fontFamily: 'Space Grotesk, sans-serif', fontWeight: 800, fontSize: '32px', color: card.color }}>{card.value}</div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>{card.sub}</div>
              </div>
              <div style={{
                width: 40, height: 40, borderRadius: '10px',
                background: `${card.color}18`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <card.icon size={18} color={card.color} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* AI Insight strip */}
      {!loading && insights.length > 0 && (
        <div style={{
          padding: '12px 16px', borderRadius: '12px', marginBottom: '24px',
          background: 'linear-gradient(135deg, rgba(124,90,243,0.1), rgba(79,142,247,0.08))',
          border: '1px solid rgba(124,90,243,0.25)',
          display: 'flex', alignItems: 'center', gap: '12px',
        }}>
          <div style={{
            width: 34, height: 34, borderRadius: '9px',
            background: 'var(--gradient-primary)', flexShrink: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Brain size={16} color="white" />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '11px', color: '#7c5af3', fontWeight: 700, letterSpacing: '0.5px', marginBottom: '2px' }}>AI INSIGHT</div>
            <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{insights[0]?.message}</div>
          </div>
        </div>
      )}

      {/* Charts row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr 2fr', gap: '16px', marginBottom: '24px' }}>
        {/* Donut */}
        <div className="card">
          <div style={{ fontWeight: 700, fontSize: '14px', marginBottom: '4px' }}>Task Status</div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '16px' }}>By category</div>
          {loading ? <Skeleton h={160} radius={8} /> : (
            <>
              <ResponsiveContainer width="100%" height={130}>
                <PieChart>
                  <Pie data={distrib} cx="50%" cy="50%" innerRadius={35} outerRadius={60} paddingAngle={3} dataKey="value">
                    {distrib.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                  </Pie>
                  <Tooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '8px', fontSize: '12px' }} />
                </PieChart>
              </ResponsiveContainer>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', marginTop: '8px' }}>
                {distrib.map(d => (
                  <div key={d.name} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-muted)' }}>
                      <span style={{ width: 8, height: 8, borderRadius: '50%', background: d.color, display: 'inline-block' }} />{d.name}
                    </span>
                    <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{d.value}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Delay Trend */}
        <div className="card">
          <div style={{ fontWeight: 700, fontSize: '14px', marginBottom: '4px' }}>Delay Trend</div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '16px' }}>Tasks overdue per day</div>
          {loading ? <Skeleton h={160} radius={8} /> : (
            <ResponsiveContainer width="100%" height={160}>
              <LineChart data={trend}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'var(--text-muted)' }} />
                <YAxis tick={{ fontSize: 10, fill: 'var(--text-muted)' }} />
                <Tooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '8px', fontSize: '12px' }} />
                <Line type="monotone" dataKey="delays" stroke="#ef4444" strokeWidth={2} dot={{ fill: '#ef4444', r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Team Output */}
        <div className="card">
          <div style={{ fontWeight: 700, fontSize: '14px', marginBottom: '4px' }}>Team Output</div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '16px' }}>Completed vs delayed</div>
          {loading ? <Skeleton h={160} radius={8} /> : (
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={teamPerf} barSize={10}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: 'var(--text-muted)' }} />
                <YAxis tick={{ fontSize: 10, fill: 'var(--text-muted)' }} />
                <Tooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '8px', fontSize: '12px' }} />
                <Bar dataKey="completed" fill="#22c55e" radius={[4, 4, 0, 0]} />
                <Bar dataKey="delayed" fill="#ef4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Alerts + more insights */}
      <div style={{ display: 'grid', gridTemplateColumns: '3fr 2fr', gap: '16px' }}>
        {/* Critical Alerts */}
        <div className="card">
          <div style={{ fontWeight: 700, fontSize: '14px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AlertTriangle size={15} color="#ef4444" /> Critical Alerts
            {!loading && <span style={{ background: 'rgba(239,68,68,0.15)', color: '#ef4444', borderRadius: '20px', padding: '1px 8px', fontSize: '11px', fontWeight: 700 }}>{alerts.length}</span>}
          </div>
          {loading ? Array(3).fill(0).map((_, i) => <div key={i} style={{ marginBottom: '12px' }}><Skeleton h={56} radius={8} /></div>) : alerts.map(alert => (
            <div key={alert.id} style={{
              padding: '10px 12px', borderRadius: '8px',
              background: 'rgba(239,68,68,0.05)',
              border: '1px solid rgba(239,68,68,0.1)',
              marginBottom: '8px', display: 'flex', gap: '10px', alignItems: 'flex-start',
            }}>
              <div style={{
                width: 8, height: 8, borderRadius: '50%', flexShrink: 0, marginTop: '5px',
                background: alert.status === 'blocked' ? '#ef4444' : '#f59e0b',
              }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{alert.title}</div>
                {alert.delay_reason && (
                  <div style={{ fontSize: '11px', color: '#f59e0b' }}>⚠ {alert.delay_reason}</div>
                )}
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>{alert.project.name} · {alert.due_date && new Date(alert.due_date).toLocaleDateString('en', { month: 'short', day: 'numeric' })}</div>
              </div>
            </div>
          ))}
        </div>

        {/* AI Insights */}
        <div className="card">
          <div style={{ fontWeight: 700, fontSize: '14px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Zap size={15} color="#7c5af3" /> AI Insights
          </div>
          {loading ? Array(3).fill(0).map((_, i) => <div key={i} style={{ marginBottom: '12px' }}><Skeleton h={70} radius={8} /></div>) : insights.map(insight => (
            <div key={insight.id} style={{
              padding: '12px', borderRadius: '8px', marginBottom: '10px',
              background: insight.type === 'danger' ? 'rgba(239,68,68,0.06)' : insight.type === 'warning' ? 'rgba(245,158,11,0.06)' : 'rgba(79,142,247,0.06)',
              border: `1px solid ${insight.type === 'danger' ? 'rgba(239,68,68,0.15)' : insight.type === 'warning' ? 'rgba(245,158,11,0.15)' : 'rgba(79,142,247,0.15)'}`,
            }}>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>{insight.message}</div>
              <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '6px' }}>{insight.relatedTo}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Animations are now in globals.css */}
    </AppLayout>
  );
}
