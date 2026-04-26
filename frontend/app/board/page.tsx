'use client';

import { useEffect, useState, useCallback, memo } from 'react';
import { useSearchParams } from 'next/navigation';
import AppLayout from '@/components/AppLayout';
import { useAuth } from '@/lib/auth';
import { projectsApi, tasksApi, type ApiProject, type ApiTask } from '@/lib/api';
import {
  DndContext, DragEndEvent, DragOverEvent, DragStartEvent,
  PointerSensor, useSensor, useSensors, DragOverlay,
  closestCorners,
} from '@dnd-kit/core';
import {
  SortableContext, verticalListSortingStrategy, useSortable, arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Plus, AlertTriangle, Clock, Tag } from 'lucide-react';
import dynamic from 'next/dynamic';

// Lazy-load heavy modals — only downloaded when user interacts
const CreateTaskModal = dynamic(() => import('@/components/CreateTaskModal'), { ssr: false });
const TaskDetailModal = dynamic(() => import('@/components/TaskDetailModal'), { ssr: false });

const COLUMNS = [
  { id: 'todo',        label: 'To Do',       color: '#8892a4' },
  { id: 'in_progress', label: 'In Progress',  color: '#4f8ef7' },
  { id: 'done',        label: 'Done',         color: '#22c55e' },
  { id: 'blocked',     label: 'Blocked',      color: '#ef4444' },
];

const PRIORITY_COLOR: Record<string, string> = {
  high: '#ef4444', medium: '#f59e0b', low: '#22c55e',
};

// ── Draggable Task Card ───────────────────────────────────
const TaskCard = memo(function TaskCard({ task, isDragging = false, onTaskClick }: { task: ApiTask; isDragging?: boolean; onTaskClick?: (id: number) => void }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: `task-${task.id}` });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={{
        ...style,
        padding: '12px',
        background: 'var(--bg-card)',
        border: '1px solid var(--border)',
        borderRadius: '10px',
        cursor: 'grab',
        marginBottom: '8px',
        transition: 'box-shadow 0.15s, border-color 0.15s',
      }}
      {...attributes}
      {...listeners}
      onMouseEnter={e => {
        (e.currentTarget as HTMLElement).style.borderColor = 'rgba(79,142,247,0.4)';
        (e.currentTarget as HTMLElement).style.boxShadow = '0 4px 16px rgba(0,0,0,0.2)';
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)';
        (e.currentTarget as HTMLElement).style.boxShadow = 'none';
      }}
      onDoubleClick={() => onTaskClick?.(task.id)}
    >
      {/* Tags */}
      {task.tags.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginBottom: '8px' }}>
          {task.tags.map(tag => (
            <span key={tag.id} style={{
              padding: '2px 7px', borderRadius: '20px',
              background: `${tag.color}20`, color: tag.color,
              fontSize: '10px', fontWeight: 600,
            }}>{tag.name}</span>
          ))}
        </div>
      )}

      {/* Title – click to open detail */}
      <div
        onClick={(e) => { e.stopPropagation(); onTaskClick?.(task.id); }}
        style={{ fontWeight: 600, fontSize: '13.5px', color: 'var(--text-primary)', marginBottom: '8px', lineHeight: 1.4, cursor: 'pointer' }}
      >
        {task.title}
      </div>

      {/* Delay reason */}
      {task.delay_reason && (
        <div style={{
          padding: '6px 8px', borderRadius: '6px',
          background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.15)',
          fontSize: '11px', color: '#f59e0b', marginBottom: '8px',
          display: 'flex', alignItems: 'flex-start', gap: '5px',
        }}>
          <AlertTriangle size={11} style={{ flexShrink: 0, marginTop: '1px' }} />
          {task.delay_reason}
        </div>
      )}

      {/* Subtasks */}
      {task.subtasks_total > 0 && (
        <div style={{ marginBottom: '8px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: 'var(--text-muted)', marginBottom: '3px' }}>
            <span>Subtasks</span>
            <span>{task.subtasks_done}/{task.subtasks_total}</span>
          </div>
          <div style={{ height: 3, borderRadius: '2px', background: 'rgba(255,255,255,0.08)' }}>
            <div style={{ height: '100%', width: `${task.subtasks_total > 0 ? (task.subtasks_done / task.subtasks_total) * 100 : 0}%`, background: '#4f8ef7', borderRadius: '2px' }} />
          </div>
        </div>
      )}

      {/* Footer: assignees + due + priority */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex' }}>
          {task.assignees.slice(0, 3).map((a, i) => (
            <div key={a.id} style={{
              width: 22, height: 22, borderRadius: '50%',
              background: `hsl(${(a.id * 67) % 360}, 65%, 50%)`,
              border: '2px solid var(--bg-card)',
              marginLeft: i > 0 ? '-5px' : 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '8px', fontWeight: 700, color: 'white',
            }}>{a.avatar || a.name[0]}</div>
          ))}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {task.due_date && (
            <span style={{ fontSize: '10px', color: task.is_overdue ? '#ef4444' : 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '3px' }}>
              <Clock size={9} />
              {new Date(task.due_date).toLocaleDateString('en', { month: 'short', day: 'numeric' })}
            </span>
          )}
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: PRIORITY_COLOR[task.priority], display: 'inline-block' }} title={task.priority} />
        </div>
      </div>
    </div>
  );
});

// ── Droppable Column ──────────────────────────────────────
function Column({ col, tasks, onTaskClick, userRole }: { col: typeof COLUMNS[0]; tasks: ApiTask[]; onTaskClick?: (id: number) => void; userRole?: string }) {
  return (
    <div style={{
      background: 'var(--bg-secondary)',
      border: '1px solid var(--border)',
      borderRadius: '14px',
      padding: '16px',
      minHeight: '500px',
      display: 'flex',
      flexDirection: 'column',
      flex: 1,
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: col.color, display: 'inline-block' }} />
          <span style={{ fontWeight: 700, fontSize: '13.5px' }}>{col.label}</span>
          <span style={{ background: 'rgba(255,255,255,0.06)', borderRadius: '20px', padding: '1px 8px', fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)' }}>
            {tasks.length}
          </span>
        </div>
        {userRole !== 'member' && (
          <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '2px' }}>
            <Plus size={14} />
          </button>
        )}
      </div>

      {/* Tasks */}
      <SortableContext items={tasks.map(t => `task-${t.id}`)} strategy={verticalListSortingStrategy}>
        <div style={{ flex: 1 }}>
          {tasks.map(task => <TaskCard key={`card-${task.id}`} task={task} onTaskClick={onTaskClick} />)}
          {tasks.length === 0 && (
            <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--text-muted)', fontSize: '12px', border: '2px dashed var(--border)', borderRadius: '8px' }}>
              No tasks
            </div>
          )}
        </div>
      </SortableContext>

      {userRole !== 'member' && (
        <button style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '1px dashed var(--border)', background: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', marginTop: '8px' }}>
          <Plus size={12} /> Add task
        </button>
      )}
    </div>
  );
}

// ── Main Board Page ───────────────────────────────────────
export default function BoardPage() {
  const { user } = useAuth();
  const [projects,     setProjects]     = useState<ApiProject[]>([]);
  const [activeProject, setActiveProject] = useState<ApiProject | null>(null);
  const [tasks,         setTasks]         = useState<ApiTask[]>([]);
  const [activeTask,    setActiveTask]    = useState<ApiTask | null>(null);
  const [loading,       setLoading]       = useState(false);
  const [showCreate,    setShowCreate]    = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null);
  const searchParams = useSearchParams();

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  // Load projects
  useEffect(() => {
    if (searchParams.get('create') === 'true') {
      setShowCreate(true);
    }
  }, [searchParams]);

  useEffect(() => {
    if (!user?.current_workspace_id) return;
    projectsApi.list(user.current_workspace_id).then(res => {
      setProjects(res.projects);
      if (res.projects.length > 0) setActiveProject(res.projects[0]);
    });
  }, [user]);

  // Load tasks for selected project — deduplicate by id to prevent React key clashes
  useEffect(() => {
    if (!activeProject) return;
    setLoading(true);
    tasksApi.list(activeProject.id).then(res => {
      const seen = new Set<number>();
      const unique = res.tasks.filter(t => { if (seen.has(t.id)) return false; seen.add(t.id); return true; });
      setTasks(unique);
    }).finally(() => setLoading(false));
  }, [activeProject]);

  const tasksByStatus = useCallback((status: string) => {
    return tasks.filter(t => t.status === status).sort((a, b) => a.position - b.position);
  }, [tasks]);

  const handleDragStart = (event: DragStartEvent) => {
    const numId = Number(String(event.active.id).replace('task-', ''));
    const task = tasks.find(t => t.id === numId);
    setActiveTask(task ?? null);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveTask(null);
    if (!over || active.id === over.id) return;

    const taskId = Number(String(active.id).replace('task-', ''));
    const overId  = Number(String(over.id).replace('task-', ''));

    // Determine target status from container column
    const overTask = tasks.find(t => t.id === overId);
    const targetStatus = overTask?.status ?? tasks.find(t => t.id === taskId)?.status ?? 'todo';

    setTasks(prev => {
      const updated = prev.map(t => t.id === taskId ? { ...t, status: targetStatus as any } : t);
      // Build reorder payload
      const payload = COLUMNS.flatMap(col =>
        updated.filter(t => t.status === col.id).map((t, i) => ({ id: t.id, status: t.status, position: i }))
      );
      tasksApi.reorder(payload).catch(console.error);
      return updated;
    });
  };

  return (
    <AppLayout>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
        <div>
          <h1 style={{ fontFamily: 'Space Grotesk, sans-serif', fontWeight: 800, fontSize: '22px', marginBottom: '2px' }}>Board</h1>
          <p style={{ fontSize: '14px', color: 'var(--text-muted)' }}>Drag & drop tasks across columns</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {user?.role !== 'member' && (
            <>
              {/* Assignee avatars */}
              <div style={{ display: 'flex' }}>
                {Array.from(
                  new Map(tasks.flatMap(t => t.assignees).map(a => [a.id, a])).values()
                ).slice(0, 5).map((a, i) => (
                  <div key={a.id} style={{
                    width: 28, height: 28, borderRadius: '50%',
                    background: `hsl(${(a.id * 67) % 360}, 65%, 50%)`,
                    border: '2px solid var(--bg-primary)',
                    marginLeft: i > 0 ? '-8px' : 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '9px', fontWeight: 700, color: 'white',
                  }}>{a.avatar || a.name[0]}</div>
                ))}
              </div>
              <button className="btn btn-primary" onClick={() => setShowCreate(true)}><Plus size={15} /> New Task</button>
            </>
          )}
        </div>
      </div>

      {/* Project tabs */}
      {projects.length > 0 && (
        <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', flexWrap: 'wrap' }}>
          {projects.map(p => (
            <button
              key={p.id}
              onClick={() => setActiveProject(p)}
              style={{
                padding: '5px 14px', borderRadius: '20px', fontSize: '12px', fontWeight: 600, cursor: 'pointer',
                border: `1px solid ${activeProject?.id === p.id ? p.color : 'var(--border)'}`,
                background: activeProject?.id === p.id ? `${p.color}18` : 'transparent',
                color: activeProject?.id === p.id ? p.color : 'var(--text-muted)',
              }}
            >
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: p.color, display: 'inline-block', marginRight: '6px' }} />
              {p.name}
            </button>
          ))}
        </div>
      )}

      {/* Board */}
      <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div style={{ display: 'flex', gap: '14px', overflowX: 'auto', paddingBottom: '16px' }}>
          {COLUMNS.map(col => (
            <div key={col.id} style={{ flex: '0 0 280px' }}>
              <Column col={col} tasks={loading ? [] : tasksByStatus(col.id)} onTaskClick={(id) => setSelectedTaskId(id)} userRole={user?.role} />
            </div>
          ))}
        </div>

        <DragOverlay>
          {activeTask && (
            <div style={{ opacity: 0.9, transform: 'rotate(2deg)' }}>
              <TaskCard task={activeTask} />
            </div>
          )}
        </DragOverlay>
      </DndContext>
      {showCreate && activeProject && (
        <CreateTaskModal
          project={activeProject}
          onClose={() => setShowCreate(false)}
          onCreated={(t) => { setTasks(prev => [t, ...prev]); setShowCreate(false); }}
        />
      )}
      {selectedTaskId && (
        <TaskDetailModal
          taskId={selectedTaskId}
          onClose={() => setSelectedTaskId(null)}
          onUpdated={(updatedTask) => {
            setTasks(prev => prev.map(t => t.id === updatedTask.id ? { ...t, ...updatedTask } : t));
          }}
          onDeleted={(deletedId) => {
            setTasks(prev => prev.filter(t => t.id !== deletedId));
          }}
        />
      )}
    </AppLayout>
  );
}
