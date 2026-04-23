'use client';

import { useEffect, useState, useMemo } from 'react';
import AppLayout from '@/components/AppLayout';
import { useAuth } from '@/lib/auth';
import { tasksApi, type ApiTask, type MyTasksResponse } from '@/lib/api';
import TaskDetailModal from '@/components/TaskDetailModal';
import Link from 'next/link';
import {
  CheckSquare, Clock, AlertTriangle, Check,
  Calendar, ChevronDown, ChevronRight, RefreshCw,
  ExternalLink, Layers,
} from 'lucide-react';

// ── Constants ─────────────────────────────────────────────
const STATUS_CFG = {
  in_progress: { label: 'In Progress', color: '#4f8ef7', bg: 'rgba(79,142,247,0.12)',   dot: '#4f8ef7' },
  todo:        { label: 'To Do',       color: '#8892a4', bg: 'rgba(136,146,164,0.12)',  dot: '#8892a4' },
  blocked:     { label: 'Blocked',     color: '#ef4444', bg: 'rgba(239,68,68,0.12)',    dot: '#ef4444' },
  done:        { label: 'Done',        color: '#22c55e', bg: 'rgba(34,197,94,0.12)',    dot: '#22c55e' },
} as const;

type StatusKey = keyof typeof STATUS_CFG;

const PRIORITY_COLOR: Record<string, string> = {
  high: '#ef4444', medium: '#f59e0b', low: '#22c55e',
};

const ALL_STATUSES: StatusKey[] = ['in_progress', 'todo', 'blocked', 'done'];

// ── Skeleton ──────────────────────────────────────────────
const Skeleton = ({ h = 56 }: { h?: number }) => (
  <div style={{
    height: h, borderRadius: 10,
    background: 'linear-gradient(90deg, rgba(255,255,255,0.04) 25%, rgba(255,255,255,0.07) 50%, rgba(255,255,255,0.04) 75%)',
    backgroundSize: '200% 100%',
    animation: 'shimmer 1.5s infinite',
    marginBottom: 8,
  }} />
);

// ── Task Row ──────────────────────────────────────────────
function TaskRow({
  task,
  onClick,
}: { task: ApiTask; onClick: () => void }) {
  const s = STATUS_CFG[task.status as StatusKey] ?? STATUS_CFG.todo;
  const pc = PRIORITY_COLOR[task.priority] ?? '#888';
  const isOverdue = task.is_overdue;

  return (
    <div
      onClick={onClick}
      style={{
        display: 'grid',
        gridTemplateColumns: 'minmax(240px,1fr) 160px 120px 90px 140px 130px',
        alignItems: 'center',
        padding: '11px 16px',
        borderBottom: '1px solid var(--border)',
        cursor: 'pointer',
        transition: 'background 0.12s',
      }}
      onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.025)')}
      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
    >
      {/* Title */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{
          width: 16, height: 16, borderRadius: 4, flexShrink: 0,
          border: `2px solid ${task.status === 'done' ? '#30d158' : 'var(--border-light)'}`,
          background: task.status === 'done' ? '#30d158' : 'transparent',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          {task.status === 'done' && <Check size={10} color="white" strokeWidth={3} />}
        </div>
        <span style={{
          fontSize: 13, fontWeight: 500,
          color: task.status === 'done' ? 'var(--text-muted)' : 'var(--text-primary)',
          textDecoration: task.status === 'done' ? 'line-through' : 'none',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>{task.title}</span>
      </div>

      {/* Project */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, overflow: 'hidden' }}>
        {task.project && (
          <>
            <div style={{
              width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
              background: task.project.color,
            }} />
            <span style={{
              fontSize: 12, color: 'var(--text-secondary)',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>{task.project.name}</span>
          </>
        )}
      </div>

      {/* Due date */}
      <div style={{
        fontSize: 12,
        color: isOverdue ? '#ff453a' : task.due_date ? 'var(--text-secondary)' : 'var(--text-muted)',
        display: 'flex', alignItems: 'center', gap: 5,
      }}>
        <Calendar size={13} style={{ opacity: task.due_date ? 1 : 0.4, flexShrink: 0 }} />
        {task.due_date
          ? <>{new Date(task.due_date + 'T00:00:00').toLocaleDateString('en', { month: 'short', day: 'numeric' })}
              {isOverdue && <span style={{ fontSize: 9, background: 'rgba(255,69,58,0.12)', color: '#ff453a', border: '1px solid rgba(255,69,58,0.3)', borderRadius: 4, padding: '0 4px', fontWeight: 700, marginLeft: 2 }}>LATE</span>}
            </>
          : <span style={{ opacity: 0.4 }}>—</span>}
      </div>

      {/* Priority */}
      <div>
        <span style={{
          fontSize: 11, fontWeight: 700, textTransform: 'capitalize',
          color: pc, background: `${pc}18`, border: `1px solid ${pc}44`,
          padding: '2px 8px', borderRadius: 20,
        }}>{task.priority}</span>
      </div>

      {/* Status */}
      <div>
        <span style={{
          padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700,
          background: s.bg, color: s.color, border: `1px solid ${s.color}44`,
          display: 'inline-flex', alignItems: 'center', gap: 5,
        }}>
          <span style={{ width: 5, height: 5, borderRadius: '50%', background: s.dot, display: 'inline-block' }} />
          {s.label}
        </span>
      </div>

      {/* Open in project */}
      <div>
        {task.project && (
          <Link
            href={`/projects/${task.project.id}`}
            onClick={e => e.stopPropagation()}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 4,
              fontSize: 11, color: 'var(--text-muted)',
              padding: '3px 8px', borderRadius: 6,
              border: '1px solid var(--border)', textDecoration: 'none',
              transition: 'all 0.15s',
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLElement).style.color = 'var(--accent-blue)';
              (e.currentTarget as HTMLElement).style.borderColor = 'var(--accent-blue)';
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLElement).style.color = 'var(--text-muted)';
              (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)';
            }}
          >
            <ExternalLink size={11} /> View Project
          </Link>
        )}
      </div>
    </div>
  );
}

// ── Status Section ────────────────────────────────────────
function StatusSection({
  statusKey, tasks, onTaskClick,
}: { statusKey: StatusKey; tasks: ApiTask[]; onTaskClick: (id: number) => void }) {
  const [open, setOpen] = useState(statusKey !== 'done');
  const cfg = STATUS_CFG[statusKey];

  if (tasks.length === 0) return null;

  return (
    <div style={{
      background: 'var(--bg-card)', border: '1px solid var(--border)',
      borderRadius: 12, overflow: 'hidden', marginBottom: 16,
    }}>
      {/* Section header */}
      <div
        onClick={() => setOpen(o => !o)}
        style={{
          padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10,
          background: 'rgba(255,255,255,0.02)', cursor: 'pointer',
          borderBottom: open ? '1px solid var(--border)' : 'none',
          transition: 'background 0.1s',
        }}
        onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.04)')}
        onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.02)')}
      >
        {open
          ? <ChevronDown size={15} color="var(--text-muted)" />
          : <ChevronRight size={15} color="var(--text-muted)" />}
        <span style={{ width: 8, height: 8, borderRadius: '50%', background: cfg.dot, display: 'inline-block' }} />
        <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-primary)' }}>{cfg.label}</span>
        <span style={{
          fontSize: 11, fontWeight: 700,
          background: cfg.bg, color: cfg.color,
          border: `1px solid ${cfg.color}44`,
          borderRadius: 20, padding: '1px 8px',
        }}>{tasks.length}</span>
      </div>

      {/* Column headers */}
      {open && (
        <div>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(240px,1fr) 160px 120px 90px 140px 130px',
            padding: '10px 16px',
            fontSize: 11, fontWeight: 700, color: 'var(--text-muted)',
            letterSpacing: '0.4px', textTransform: 'uppercase',
            borderBottom: '1px solid var(--border)',
          }}>
            <div>Task Name</div>
            <div>Project</div>
            <div>Due Date</div>
            <div>Priority</div>
            <div>Status</div>
            <div>Action</div>
          </div>
          {tasks.map(task => (
            <TaskRow key={task.id} task={task} onClick={() => onTaskClick(task.id)} />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────
export default function MyTasksPage() {
  const { user, loading: authLoading } = useAuth();
  const [data, setData] = useState<MyTasksResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null);
  const [activeFilter, setActiveFilter] = useState<StatusKey | 'all'>('all');

  const fetchTasks = async (wsId: number, background = false) => {
    if (!background) setLoading(true);
    else setRefreshing(true);
    setError('');
    try {
      const res = await tasksApi.myTasks(wsId);
      setData(res);
    } catch (err: any) {
      console.error('My tasks fetch error:', err);
      setError(err?.message ?? 'Failed to load tasks');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (user?.current_workspace_id) {
      fetchTasks(user.current_workspace_id);
    }
  }, [user?.current_workspace_id]);

  // Update task in local state after modal edit
  const updateTaskLocally = (updated: ApiTask) => {
    if (!data) return;
    const updatedTasks = data.tasks.map(t => t.id === updated.id ? { ...t, ...updated } : t);
    const rebuild = (arr: ApiTask[]) => arr.map(t => t.id === updated.id ? { ...t, ...updated } : t);
    setData(prev => prev ? {
      ...prev,
      tasks: updatedTasks,
      grouped: {
        in_progress: rebuild(prev.grouped.in_progress),
        todo:        rebuild(prev.grouped.todo),
        blocked:     rebuild(prev.grouped.blocked),
        done:        rebuild(prev.grouped.done),
      },
    } : prev);
  };

  const deleteTaskLocally = (taskId: number) => {
    if (!data) return;
    const remove = (arr: ApiTask[]) => arr.filter(t => t.id !== taskId);
    setData(prev => prev ? {
      ...prev,
      tasks: prev.tasks.filter(t => t.id !== taskId),
      grouped: {
        in_progress: remove(prev.grouped.in_progress),
        todo:        remove(prev.grouped.todo),
        blocked:     remove(prev.grouped.blocked),
        done:        remove(prev.grouped.done),
      },
    } : prev);
    setSelectedTaskId(null);
  };

  // Apply filter
  const filteredGrouped = useMemo(() => {
    if (!data) return null;
    if (activeFilter === 'all') return data.grouped;
    return {
      in_progress: activeFilter === 'in_progress' ? data.grouped.in_progress : [],
      todo:        activeFilter === 'todo'        ? data.grouped.todo        : [],
      blocked:     activeFilter === 'blocked'     ? data.grouped.blocked     : [],
      done:        activeFilter === 'done'        ? data.grouped.done        : [],
    };
  }, [data, activeFilter]);

  const totals = data?.totals;

  return (
    <AppLayout>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{
            fontFamily: 'Space Grotesk, sans-serif', fontWeight: 800, fontSize: 22,
            color: 'var(--text-primary)', marginBottom: 2,
            display: 'flex', alignItems: 'center', gap: 10,
          }}>
            <CheckSquare size={22} color="var(--accent-blue)" />
            My Tasks
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>
            All tasks assigned to you across every project
          </p>
        </div>
        <button
          onClick={() => user?.current_workspace_id && fetchTasks(user.current_workspace_id, true)}
          disabled={refreshing || !user}
          className="btn btn-ghost"
          style={{ gap: 6, fontSize: 13 }}
        >
          <RefreshCw size={14} style={{ animation: refreshing ? 'spin 1s linear infinite' : 'none' }} />
          Refresh
        </button>
      </div>

      {/* Summary stat chips */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
        {([
          { key: 'all',         label: 'All',         icon: Layers,        color: '#7c5af3' },
          { key: 'in_progress', label: 'In Progress',  icon: Clock,         color: '#4f8ef7' },
          { key: 'todo',        label: 'To Do',        icon: CheckSquare,   color: '#8892a4' },
          { key: 'blocked',     label: 'Blocked',      icon: AlertTriangle, color: '#ef4444' },
          { key: 'done',        label: 'Done',         icon: Check,         color: '#22c55e' },
        ] as const).map(({ key, label, icon: Icon, color }) => {
          const count = key === 'all' ? totals?.all : totals?.[key];
          const active = activeFilter === key;
          return (
            <button
              key={key}
              onClick={() => setActiveFilter(key)}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '8px 14px', borderRadius: 10, border: '1px solid',
                borderColor: active ? color : 'var(--border)',
                background: active ? `${color}18` : 'var(--bg-card)',
                color: active ? color : 'var(--text-secondary)',
                cursor: 'pointer', fontSize: 13, fontWeight: 600,
                transition: 'all 0.15s',
              }}
            >
              <Icon size={14} />
              {label}
              <span style={{
                background: active ? `${color}30` : 'var(--bg-secondary)',
                color: active ? color : 'var(--text-muted)',
                borderRadius: 20, padding: '1px 7px', fontSize: 11, fontWeight: 700,
              }}>
                {loading ? '—' : count ?? 0}
              </span>
            </button>
          );
        })}
      </div>

      {/* Task list grouped by status */}
      {(authLoading || loading) ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {[1, 2, 3, 4].map(i => (
            <div key={i} style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, padding: 16 }}>
              <Skeleton h={20} />
              <Skeleton h={56} />
              <Skeleton h={56} />
              <Skeleton h={56} />
            </div>
          ))}
        </div>
      ) : error ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)' }}>
          <AlertTriangle size={40} style={{ opacity: 0.3, margin: '0 auto 12px', color: '#ef4444' }} />
          <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 6 }}>Could not load tasks</div>
          <div style={{ fontSize: 12, marginBottom: 16 }}>{error}</div>
          <button
            className="btn btn-ghost"
            onClick={() => user?.current_workspace_id && fetchTasks(user.current_workspace_id)}
          >Try again</button>
        </div>
      ) : totals?.all === 0 ? (
        <div style={{ textAlign: 'center', padding: '80px 0', color: 'var(--text-muted)' }}>
          <CheckSquare size={48} style={{ opacity: 0.2, margin: '0 auto 16px' }} />
          <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 6 }}>No tasks assigned to you yet</div>
          <div style={{ fontSize: 13 }}>When a manager or colleague assigns a task to you, it will appear here.</div>
        </div>
      ) : filteredGrouped ? (
        ALL_STATUSES.map(status => (
          <StatusSection
            key={status}
            statusKey={status}
            tasks={filteredGrouped[status]}
            onTaskClick={setSelectedTaskId}
          />
        ))
      ) : null}

      {/* Task Detail Modal */}
      {selectedTaskId && (
        <TaskDetailModal
          taskId={selectedTaskId}
          onClose={() => setSelectedTaskId(null)}
          onUpdated={updateTaskLocally}
          onDeleted={deleteTaskLocally}
        />
      )}

      <style>{`
        @keyframes shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }
        @keyframes spin    { to { transform: rotate(360deg); } }
      `}</style>
    </AppLayout>
  );
}
