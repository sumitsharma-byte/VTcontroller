'use client';

import { useEffect, useState, useCallback } from 'react';
import AppLayout from '@/components/AppLayout';
import { useAuth } from '@/lib/auth';
import { tasksApi, projectsApi, type ApiTask, type ApiProject } from '@/lib/api';
import { ChevronLeft, ChevronRight, Calendar as CalIcon, AlertTriangle, Clock } from 'lucide-react';

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const DAYS   = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

const PRIORITY_COLOR: Record<string, string> = {
  high: '#ef4444', medium: '#f59e0b', low: '#22c55e',
};

const STATUS_COLOR: Record<string, string> = {
  todo: '#8892a4', in_progress: '#4f8ef7', done: '#22c55e', blocked: '#ef4444',
};

export default function CalendarPage() {
  const { user } = useAuth();
  const today = new Date();
  const [year,  setYear]    = useState(today.getFullYear());
  const [month, setMonth]   = useState(today.getMonth());
  const [tasks, setTasks]   = useState<ApiTask[]>([]);
  const [projects, setProjects] = useState<ApiProject[]>([]);
  const [loading, setLoading]   = useState(true);
  const [selected, setSelected] = useState<Date | null>(null);

  useEffect(() => {
    if (!user?.current_workspace_id) return;
    // Fetch projects + all user tasks in just 2 API calls (was N+1 before)
    Promise.all([
      projectsApi.list(user.current_workspace_id),
      tasksApi.myTasks(),
    ]).then(([projRes, taskRes]) => {
      setProjects(projRes.projects);
      setTasks(taskRes.tasks);
    }).finally(() => setLoading(false));
  }, [user]);

  const prevMonth = () => { if (month === 0) { setMonth(11); setYear(y => y - 1); } else setMonth(m => m - 1); };
  const nextMonth = () => { if (month === 11) { setMonth(0); setYear(y => y + 1); } else setMonth(m => m + 1); };

  // Build calendar grid
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = [...Array(firstDay).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];
  while (cells.length % 7 !== 0) cells.push(null);

  const tasksForDay = useCallback((day: number) => {
    return tasks.filter(t => {
      if (!t.due_date) return false;
      const d = new Date(t.due_date);
      return d.getFullYear() === year && d.getMonth() === month && d.getDate() === day;
    });
  }, [tasks, year, month]);

  const selectedTasks = selected ? tasksForDay(selected.getDate()) : [];
  const upcomingTasks = tasks
    .filter(t => t.due_date && t.status !== 'done' && new Date(t.due_date) >= today)
    .sort((a, b) => new Date(a.due_date!).getTime() - new Date(b.due_date!).getTime())
    .slice(0, 8);
  const overdueTasks = tasks.filter(t => t.due_date && t.status !== 'done' && new Date(t.due_date) < today);

  return (
    <AppLayout>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontFamily: 'Space Grotesk, sans-serif', fontWeight: 800, fontSize: '22px', marginBottom: '2px' }}>
            Calendar
          </h1>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
            {tasks.length} tasks across {projects.length} projects
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          {overdueTasks.length > 0 && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              padding: '6px 14px', borderRadius: '8px',
              background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)',
              color: '#ef4444', fontSize: '12px', fontWeight: 600,
            }}>
              <AlertTriangle size={13} /> {overdueTasks.length} overdue
            </div>
          )}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: '20px', alignItems: 'start' }}>
        {/* Calendar Grid */}
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '14px', overflow: 'hidden' }}>
          {/* Month nav */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '16px 20px', borderBottom: '1px solid var(--border)',
          }}>
            <button onClick={prevMonth} style={{
              background: 'var(--bg-secondary)', border: '1px solid var(--border)',
              borderRadius: '8px', padding: '6px 10px', cursor: 'pointer',
              color: 'var(--text-secondary)', display: 'flex', alignItems: 'center',
            }}><ChevronLeft size={16} /></button>

            <span style={{ fontFamily: 'Space Grotesk, sans-serif', fontWeight: 700, fontSize: '18px' }}>
              {MONTHS[month]} {year}
            </span>

            <button onClick={nextMonth} style={{
              background: 'var(--bg-secondary)', border: '1px solid var(--border)',
              borderRadius: '8px', padding: '6px 10px', cursor: 'pointer',
              color: 'var(--text-secondary)', display: 'flex', alignItems: 'center',
            }}><ChevronRight size={16} /></button>
          </div>

          {/* Day headers */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', borderBottom: '1px solid var(--border)' }}>
            {DAYS.map(d => (
              <div key={d} style={{
                padding: '10px 0', textAlign: 'center',
                fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)',
                letterSpacing: '0.5px',
              }}>{d}</div>
            ))}
          </div>

          {/* Cells */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)' }}>
            {cells.map((day, idx) => {
              if (!day) return (
                <div key={`empty-${idx}`} style={{
                  minHeight: '88px', borderRight: (idx + 1) % 7 !== 0 ? '1px solid var(--border)' : 'none',
                  borderBottom: '1px solid var(--border)',
                  background: 'rgba(0,0,0,0.15)',
                }} />
              );

              const isToday = day === today.getDate() && month === today.getMonth() && year === today.getFullYear();
              const isSelected = selected && selected.getDate() === day && selected.getMonth() === month && selected.getFullYear() === year;
              const dayTasks = tasksForDay(day);
              const hasOverdue = dayTasks.some(t => t.is_overdue || (t.due_date && new Date(t.due_date) < today && t.status !== 'done'));

              return (
                <div
                  key={day}
                  onClick={() => setSelected(new Date(year, month, day))}
                  style={{
                    minHeight: '88px',
                    borderRight: (idx + 1) % 7 !== 0 ? '1px solid var(--border)' : 'none',
                    borderBottom: '1px solid var(--border)',
                    padding: '8px',
                    cursor: 'pointer',
                    background: isSelected ? 'rgba(79,142,247,0.08)' : 'transparent',
                    transition: 'background 0.15s',
                  }}
                  onMouseEnter={e => { if (!isSelected) (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.02)'; }}
                  onMouseLeave={e => { if (!isSelected) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                >
                  {/* Day number */}
                  <div style={{
                    width: 26, height: 26, borderRadius: '50%',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '12px', fontWeight: isToday ? 800 : 500,
                    background: isToday ? '#4f8ef7' : 'transparent',
                    color: isToday ? 'white' : hasOverdue ? '#ef4444' : 'var(--text-primary)',
                    marginBottom: '4px',
                  }}>{day}</div>

                  {/* Task pills */}
                  {dayTasks.slice(0, 3).map(t => (
                    <div key={t.id} style={{
                      fontSize: '10px', fontWeight: 600, marginBottom: '2px',
                      padding: '2px 6px', borderRadius: '4px',
                      background: `${STATUS_COLOR[t.status]}18`,
                      color: STATUS_COLOR[t.status],
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>{t.title}</div>
                  ))}
                  {dayTasks.length > 3 && (
                    <div style={{ fontSize: '10px', color: 'var(--text-muted)', paddingLeft: '2px' }}>
                      +{dayTasks.length - 3} more
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Sidebar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {/* Selected day tasks */}
          {selected && (
            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '12px', overflow: 'hidden' }}>
              <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <CalIcon size={14} color="var(--accent-blue)" />
                <span style={{ fontWeight: 700, fontSize: '13px' }}>
                  {selected.toLocaleDateString('en', { month: 'short', day: 'numeric' })}
                </span>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>· {selectedTasks.length} tasks</span>
              </div>
              {selectedTasks.length === 0 ? (
                <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '12px' }}>
                  No tasks due this day
                </div>
              ) : selectedTasks.map(t => (
                <div key={t.id} style={{ padding: '10px 16px', borderBottom: '1px solid rgba(255,255,255,0.04)', display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: PRIORITY_COLOR[t.priority], marginTop: '5px', flexShrink: 0 }} />
                  <div>
                    <div style={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '2px' }}>{t.title}</div>
                    <div style={{ fontSize: '10px', color: STATUS_COLOR[t.status] }}>{t.status.replace('_', ' ')}</div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Upcoming tasks */}
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '12px', overflow: 'hidden' }}>
            <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Clock size={14} color="var(--accent-blue)" />
              <span style={{ fontWeight: 700, fontSize: '13px' }}>Upcoming</span>
            </div>
            {loading ? (
              <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {[1,2,3].map(i => <div key={`skel-${i}`} style={{ height: 36, borderRadius: 6, background: 'rgba(255,255,255,0.04)' }} />)}
              </div>
            ) : upcomingTasks.length === 0 ? (
              <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '12px' }}>
                No upcoming tasks 🎉
              </div>
            ) : upcomingTasks.map(t => (
              <div key={t.id} style={{ padding: '10px 16px', borderBottom: '1px solid rgba(255,255,255,0.04)', display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: PRIORITY_COLOR[t.priority], marginTop: '5px', flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.title}</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '1px' }}>
                    {t.due_date && new Date(t.due_date).toLocaleDateString('en', { month: 'short', day: 'numeric' })}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Animations are now in globals.css */}
    </AppLayout>
  );
}
