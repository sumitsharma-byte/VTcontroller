'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import AppLayout from '@/components/AppLayout';
import { useAuth } from '@/lib/auth';
import { projectsApi, foldersApi, type ApiProject, type ApiFolder, type ApiTask } from '@/lib/api';
import {
  ArrowLeft, Calendar, Users, Folder as FolderIcon,
  Clock, BarChart3, ExternalLink, Plus, MoreVertical,
  ChevronDown, ChevronRight, AlertTriangle, Check, MessageSquare, Trash2
} from 'lucide-react';
import Link from 'next/link';
import TaskDetailModal from '@/components/TaskDetailModal';

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  todo:        { label: 'To Do',       color: '#8892a4', bg: 'rgba(136,146,164,0.12)' },
  in_progress: { label: 'In Progress', color: '#4f8ef7', bg: 'rgba(79,142,247,0.12)' },
  done:        { label: 'Done',        color: '#22c55e', bg: 'rgba(34,197,94,0.12)'  },
  blocked:     { label: 'Blocked',     color: '#ef4444', bg: 'rgba(239,68,68,0.12)'  },
};

const PRIORITY_COLOR: Record<string, string> = {
  high: '#ef4444', medium: '#f59e0b', low: '#22c55e',
};

const RISK_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  green:  { label: 'On Track', color: '#22c55e', bg: 'rgba(34,197,94,0.1)'  },
  yellow: { label: 'At Risk',  color: '#f59e0b', bg: 'rgba(245,158,11,0.1)' },
  red:    { label: 'Critical', color: '#ef4444', bg: 'rgba(239,68,68,0.1)'  },
};

export default function ProjectDetailPage() {
  const params  = useParams();
  const router  = useRouter();
  const { user } = useAuth();
  const projectId = Number(params.id);

  const [project, setProject] = useState<ApiProject | null>(null);
  const [folders, setFolders] = useState<ApiFolder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');
  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null);
  const [selectedTasks, setSelectedTasks] = useState<{folderId: number, taskId: number}[]>([]);
  // Inline confirmation modal state
  const [confirmDialog, setConfirmDialog] = useState<{
    title: string; message: string; onConfirm: () => void;
  } | null>(null);

  // Folder creation
  const [showFolderModal, setShowFolderModal] = useState(false);
  const [newMonth, setNewMonth] = useState((new Date().getMonth() + 1).toString());
  const [newYear, setNewYear] = useState(new Date().getFullYear().toString());

  // Inline task inputs map: folderId -> text
  const [taskInputs, setTaskInputs] = useState<Record<number, string>>({});
  // Expanded folders: folderId -> bool
  const [expanded, setExpanded] = useState<Record<number, boolean>>({});

  useEffect(() => {
    if (!user?.current_workspace_id || !projectId) return;
    Promise.all([
      projectsApi.get(projectId),
      foldersApi.list(projectId),
    ])
      .then(([projRes, folderRes]) => {
        setProject(projRes.project);
        setFolders(folderRes.folders);
        // Expand all by default
        const exp: Record<number, boolean> = {};
        folderRes.folders.forEach(f => { exp[f.id] = true; });
        setExpanded(exp);
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, [user, projectId]);

  const handleCreateFolder = async () => {
    try {
      const res = await foldersApi.create(projectId, {
        month: parseInt(newMonth),
        year: parseInt(newYear)
      });
      setFolders(prev => [...prev, res.folder]);
      setExpanded(prev => ({ ...prev, [res.folder.id]: true }));
      setShowFolderModal(false);
    } catch (e: any) { alert(e.message); }
  };

  const handleCreateTask = async (folderId: number) => {
    const title = taskInputs[folderId]?.trim();
    if (!title) return;
    try {
      const res = await foldersApi.createTask(projectId, folderId, {
        title,
        status: 'todo',
        priority: 'medium',
      });
      setFolders(prev => prev.map(f => {
        if (f.id === folderId) {
          return { ...f, tasks: [...f.tasks, res.task], task_count: f.task_count + 1 };
        }
        return f;
      }));
      setTaskInputs(prev => ({ ...prev, [folderId]: '' }));
    } catch (e: any) { alert(e.message); }
  };

  const handleDeleteFolder = (folderId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setConfirmDialog({
      title: 'Delete Folder',
      message: 'Are you sure you want to delete this folder and all its tasks? This cannot be undone.',
      onConfirm: async () => {
        setConfirmDialog(null);
        try {
          await foldersApi.delete(projectId, folderId);
          setFolders(prev => prev.filter(f => f.id !== folderId));
        } catch (err: any) { console.error(err); }
      }
    });
  };

  const handleDeleteTask = async (folderId: number, taskId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this task?')) return;
    try {
      await foldersApi.deleteTask(projectId, folderId, taskId);
      setFolders(prev => prev.map(f => f.id === folderId ? { ...f, tasks: f.tasks.filter(t => t.id !== taskId), task_count: f.task_count - 1 } : f));
      setSelectedTasks(prev => prev.filter(t => t.taskId !== taskId));
    } catch (err: any) { alert(err.message || 'Failed to delete task'); }
  };

  const toggleTaskSelection = (folderId: number, taskId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedTasks(prev => {
      const exists = prev.find(item => item.taskId === taskId);
      if (exists) return prev.filter(item => item.taskId !== taskId);
      return [...prev, { folderId, taskId }];
    });
  };

  const handleBulkDeleteTasks = () => {
    const snap = [...selectedTasks];
    setConfirmDialog({
      title: `Delete ${snap.length} Task${snap.length > 1 ? 's' : ''}`,
      message: `Are you sure you want to permanently delete ${snap.length} selected task${snap.length > 1 ? 's' : ''}?`,
      onConfirm: async () => {
        setConfirmDialog(null);
        try {
          await Promise.all(snap.map(item => foldersApi.deleteTask(projectId, item.folderId, item.taskId)));
          setFolders(prev => prev.map(f => {
            const toDelete = snap.filter(i => i.folderId === f.id).map(i => i.taskId);
            if (!toDelete.length) return f;
            return { ...f, tasks: f.tasks.filter(t => !toDelete.includes(t.id)), task_count: Math.max(0, f.task_count - toDelete.length) };
          }));
          setSelectedTasks([]);
        } catch (err: any) { console.error('Bulk delete error:', err); }
      }
    });
  };

  const updateTaskLocally = (updatedTask: ApiTask) => {
    setFolders(prev => prev.map(f => {
      const hasTask = f.tasks.some(t => t.id === updatedTask.id);
      if (hasTask) {
        return {
          ...f,
          tasks: f.tasks.map(t => t.id === updatedTask.id ? { ...t, ...updatedTask } : t)
        };
      }
      return f;
    }));
  };

  const deleteTaskLocally = (taskId: number) => {
    setFolders(prev => prev.map(f => ({
      ...f,
      tasks: f.tasks.filter(t => t.id !== taskId)
    })));
  };

  if (loading) return (
    <AppLayout>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: '100%' }}>
        {[1,2,3].map(i => (
          <div key={`skel-${i}`} style={{ height: 80, borderRadius: 12, background: 'rgba(255,255,255,0.04)',
            animation: 'pulse 1.5s ease infinite', backgroundSize: '200% 100%' }} />
        ))}
      </div>
    </AppLayout>
  );

  if (error || !project) return (
    <AppLayout>
      <div style={{ textAlign: 'center', padding: '80px 0', color: 'var(--text-muted)' }}>
        <div style={{ fontSize: '40px', marginBottom: '12px' }}>⚠️</div>
        <div style={{ fontWeight: 600, marginBottom: '8px' }}>Project not found</div>
        <div style={{ fontSize: '13px', marginBottom: '20px' }}>{error}</div>
        <button className="btn btn-ghost" onClick={() => router.push('/projects')}>
          <ArrowLeft size={14} /> Back to Projects
        </button>
      </div>
    </AppLayout>
  );

  const risk = RISK_CONFIG[project.risk_level] || RISK_CONFIG['green'];

  return (
    <AppLayout>
      {/* Back nav & Header */}
      <div style={{ marginBottom: '24px' }}>
        <Link href="/projects" style={{
          display: 'inline-flex', alignItems: 'center', gap: '6px',
          color: 'var(--text-muted)', fontSize: '13px', textDecoration: 'none',
          transition: 'color 0.15s',
        }}>
          <ArrowLeft size={14} /> All Projects
        </Link>
      </div>

      <div style={{
        background: 'var(--bg-card)', border: '1px solid var(--border)',
        borderRadius: '16px', padding: '24px 28px', marginBottom: '24px',
        borderTop: `4px solid ${project.color}`,
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{
              width: 52, height: 52, borderRadius: '14px', background: `${project.color}22`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <div style={{ width: 22, height: 22, borderRadius: '6px', background: project.color }} />
            </div>
            <div>
              <h1 style={{ fontFamily: 'Space Grotesk, sans-serif', fontWeight: 800, fontSize: '24px', color: 'var(--text-primary)', marginBottom: '4px' }}>
                {project.name}
              </h1>
              {project.description && <p style={{ fontSize: '13px', color: 'var(--text-muted)', maxWidth: '500px' }}>{project.description}</p>}
            </div>
          </div>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            {selectedTasks.length > 0 && (
              <button 
                type="button"
                onClick={handleBulkDeleteTasks} 
                className="btn btn-ghost" 
                style={{ color: '#ef4444', border: '1px solid rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.1)', cursor: 'pointer', fontSize: '12px', padding: '4px 12px' }}
              >
                <Trash2 size={13} /> Delete {selectedTasks.length} Task{selectedTasks.length > 1 ? 's' : ''}
              </button>
            )}
            <span style={{ padding: '4px 12px', borderRadius: '20px', fontSize: '11px', fontWeight: 700, background: risk.bg, color: risk.color }}>{risk.label}</span>
            <Link href={`/board?project=${project.id}`}>
              <button className="btn btn-ghost" style={{ fontSize: '12px' }}><ExternalLink size={13} /> Open Board</button>
            </Link>
            <button className="btn btn-primary" onClick={() => setShowFolderModal(true)} style={{ fontSize: '12px' }}>
              <Plus size={13} /> Add Folder
            </button>
          </div>
        </div>
      </div>

      {/* Folders List (ClickUp Style) */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {folders.map(folder => {
          const isExp = expanded[folder.id];
          return (
            <div key={folder.id} style={{
              background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '12px', overflow: 'hidden'
            }}>
              {/* Folder Header */}
              <div style={{
                padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                background: 'rgba(255,255,255,0.02)', borderBottom: isExp ? '1px solid var(--border)' : 'none',
                cursor: 'pointer', transition: 'background 0.1s'
              }} onClick={() => setExpanded(p => ({ ...p, [folder.id]: !isExp }))}
              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.04)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.02)')}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {isExp ? <ChevronDown size={16} color="var(--text-muted)" /> : <ChevronRight size={16} color="var(--text-muted)" />}
                  <FolderIcon size={16} color={folder.color} fill={`${folder.color}44`} />
                  <span style={{ fontWeight: 700, fontSize: '14px', color: 'var(--text-primary)' }}>{folder.month_label}</span>
                  <span style={{ fontSize: '12px', color: 'var(--text-muted)', marginLeft: 8 }}>{folder.tasks.length} tasks</span>
                </div>
                <button
                  onClick={e => handleDeleteFolder(folder.id, e)}
                  style={{
                    background: 'transparent', border: 'none', color: 'var(--text-muted)',
                    cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center',
                    transition: 'color 0.2s',
                  }}
                  onMouseEnter={e => e.currentTarget.style.color = '#ef4444'}
                  onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
                  title="Delete Folder"
                >
                  <Trash2 size={15} />
                </button>
              </div>

              {/* Folder Tasks */}
              {isExp && (
                <div>
                  {/* Task Header Row */}
                  <div style={{
                    display: 'grid', gridTemplateColumns: '32px minmax(228px, 1fr) 130px 120px 90px 140px 110px',
                    padding: '10px 16px', borderBottom: '1px solid var(--border)',
                    fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.4px', textTransform: 'uppercase'
                  }}>
                    <div></div>
                    <div>Name</div>
                    <div>Assignee</div>
                    <div>Due date</div>
                    <div>Priority</div>
                    <div>Status</div>
                    <div>Progress</div>
                  </div>

                  {/* Tasks List */}
                  {folder.tasks.map((task) => {
                    const s = STATUS_CONFIG[task.status];
                    const isOverdue = task.is_overdue;
                    const priorityCfg = PRIORITY_COLOR[task.priority] || '#888';
                    const isSelected = selectedTasks.some(item => item.taskId === task.id);
                    return (
                      <div key={task.id} style={{
                        display: 'grid', gridTemplateColumns: '32px minmax(228px, 1fr) 130px 120px 90px 140px 110px',
                        alignItems: 'center', padding: '11px 16px',
                        borderBottom: '1px solid var(--border)',
                        transition: 'background 0.12s', position: 'relative',
                        background: isSelected ? 'rgba(79,142,247,0.06)' : 'transparent',
                      }}
                      onMouseEnter={e => (e.currentTarget.style.background = isSelected ? 'rgba(79,142,247,0.08)' : 'rgba(255,255,255,0.025)')}
                      onMouseLeave={e => (e.currentTarget.style.background = isSelected ? 'rgba(79,142,247,0.06)' : 'transparent')}>

                        {/* Task Select Checkbox — stops propagation fully */}
                        <div
                          style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-start', cursor: 'pointer', zIndex: 2, position: 'relative' }}
                          onClick={e => { e.stopPropagation(); e.preventDefault(); toggleTaskSelection(folder.id, task.id, e); }}
                        >
                          <div style={{
                            width: 16, height: 16, borderRadius: 4,
                            border: isSelected ? '2px solid #4f8ef7' : '1px solid var(--border)',
                            background: isSelected ? '#4f8ef7' : 'rgba(255,255,255,0.05)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            transition: 'all 0.2s', flexShrink: 0,
                          }}>
                            {isSelected && <Check size={10} color="white" strokeWidth={3} />}
                          </div>
                        </div>

                        {/* Name + subtask count — clicking this opens task modal */}
                        <div
                          style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}
                          onClick={() => setSelectedTaskId(task.id)}
                        >
                          <span style={{ fontSize: '13px', fontWeight: 500, color: task.status === 'done' ? 'var(--text-muted)' : 'var(--text-primary)', textDecoration: task.status === 'done' ? 'line-through' : 'none', flex: 1 }}>
                            {task.title}
                          </span>
                          {task.subtasks_total > 0 && (
                            <span style={{ fontSize: 10, color: 'var(--text-muted)', background: 'var(--bg-secondary)', padding: '1px 6px', borderRadius: 8, border: '1px solid var(--border)', whiteSpace: 'nowrap', flexShrink: 0 }}>
                              {task.subtasks_done}/{task.subtasks_total}
                            </span>
                          )}
                        </div>

                        {/* Assignees */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                          {task.assignees?.slice(0, 3).map((a, idx) => (
                            <div key={a.id} style={{
                              width: 24, height: 24, borderRadius: '50%', flexShrink: 0,
                              background: `hsl(${(a.id * 67) % 360}, 65%, 48%)`,
                              border: '2px solid var(--bg-card)', marginLeft: idx > 0 ? -8 : 0,
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              fontSize: '9px', fontWeight: 800, color: 'white', letterSpacing: 0,
                            }} title={a.name}>{a.name[0]}</div>
                          ))}
                          {task.assignees?.length > 3 && (
                            <div style={{ width: 24, height: 24, borderRadius: '50%', background: 'var(--bg-secondary)', border: '2px solid var(--bg-card)', marginLeft: -8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, color: 'var(--text-muted)', fontWeight: 700 }}>+{task.assignees.length - 3}</div>
                          )}
                          {!task.assignees?.length && <Users size={15} color="var(--text-muted)" style={{ opacity: 0.35 }} />}
                        </div>

                        {/* Due date */}
                        <div style={{ fontSize: '12px', color: isOverdue ? '#ff453a' : task.due_date ? 'var(--text-secondary)' : 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 5 }}>
                          <Calendar size={13} style={{ opacity: task.due_date ? 1 : 0.4, flexShrink: 0 }} />
                          {task.due_date
                            ? <><span>{new Date(task.due_date).toLocaleDateString('en', { month: 'short', day: 'numeric' })}</span>{isOverdue && <span style={{ fontSize: 9, background: 'rgba(255,69,58,0.12)', color: '#ff453a', border: '1px solid rgba(255,69,58,0.3)', borderRadius: 4, padding: '0 4px', fontWeight: 700, marginLeft: 2 }}>LATE</span>}</>
                            : <span style={{ opacity: 0.4 }}>—</span>}
                        </div>

                        {/* Priority */}
                        <div>
                          <span style={{ fontSize: 11, fontWeight: 700, color: priorityCfg, background: `${priorityCfg}18`, border: `1px solid ${priorityCfg}44`, padding: '2px 8px', borderRadius: 20, textTransform: 'capitalize' }}>
                            {task.priority}
                          </span>
                        </div>

                        {/* Status */}
                        <div>
                          <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: '11px', fontWeight: 700, background: s.bg, color: s.color, border: `1px solid ${s.color}44`, display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                            <span style={{ width: 5, height: 5, borderRadius: '50%', background: s.color, display: 'inline-block' }} />
                            {s.label}
                          </span>
                        </div>

                        {/* Progress + single delete button */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'flex-end', position: 'relative', zIndex: 2 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 11.5, color: 'var(--text-muted)' }}>
                            <MessageSquare size={13} style={{ opacity: 0.6 }} />
                            <span>{task.comments?.length || 0}</span>
                          </div>
                          {task.subtasks_total > 0 && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 4, width: 36 }}>
                              <div style={{ flex: 1, height: 3, borderRadius: 2, background: 'var(--border)', overflow: 'hidden' }}>
                                <div style={{ height: '100%', borderRadius: 2, background: task.subtasks_done === task.subtasks_total ? '#30d158' : 'var(--accent-blue)', width: `${Math.round(((task.subtasks_done || 0) / task.subtasks_total) * 100)}%`, transition: 'width 0.3s' }} />
                              </div>
                            </div>
                          )}
                          {/* Single task delete — uses inline confirm modal */}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              e.preventDefault();
                              const tid = task.id;
                              const fid = folder.id;
                              setConfirmDialog({
                                title: 'Delete Task',
                                message: `Delete "${task.title}"? This cannot be undone.`,
                                onConfirm: async () => {
                                  setConfirmDialog(null);
                                  try {
                                    await foldersApi.deleteTask(projectId, fid, tid);
                                    setFolders(prev => prev.map(f => f.id === fid
                                      ? { ...f, tasks: f.tasks.filter(t => t.id !== tid), task_count: Math.max(0, f.task_count - 1) }
                                      : f
                                    ));
                                    setSelectedTasks(prev => prev.filter(t => t.taskId !== tid));
                                  } catch (err: any) { console.error(err); }
                                }
                              });
                            }}
                            style={{
                              background: 'transparent', border: 'none',
                              cursor: 'pointer', color: 'var(--text-muted)',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              padding: '4px', borderRadius: 4, flexShrink: 0,
                              transition: 'color 0.15s, background 0.15s',
                            }}
                            onMouseEnter={e => { e.currentTarget.style.color = '#ef4444'; e.currentTarget.style.background = 'rgba(239,68,68,0.1)'; }}
                            onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.background = 'transparent'; }}
                            title="Delete Task"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    );
                  })}

                  {/* Inline Create Task */}
                  <div style={{ display: 'flex', alignItems: 'center', padding: '8px 16px', gap: '8px' }}>
                    <Plus size={14} color="var(--text-muted)" />
                    <input
                      type="text"
                      className="input"
                      placeholder="New Task..."
                      value={taskInputs[folder.id] || ''}
                      onChange={e => setTaskInputs(prev => ({ ...prev, [folder.id]: e.target.value }))}
                      onKeyDown={e => {
                        if (e.key === 'Enter') handleCreateTask(folder.id);
                      }}
                      style={{ border: 'none', background: 'transparent', flex: 1, fontSize: '13px', padding: '4px 0' }}
                    />
                    <button className="btn btn-ghost" onClick={() => handleCreateTask(folder.id)} style={{ padding: '4px 8px', fontSize: '11px' }}>
                      Save
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {folders.length === 0 && !loading && (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)' }}>
          <FolderIcon size={40} style={{ opacity: 0.3, margin: '0 auto 12px' }} />
          <div style={{ fontWeight: 600, fontSize: 14 }}>No Folders Yet</div>
          <div style={{ fontSize: 12, marginTop: 4 }}>Organize your project tasks by months or sprints.</div>
          <button className="btn btn-primary" onClick={() => setShowFolderModal(true)} style={{ marginTop: 16 }}>
            <Plus size={14} /> Create First Folder
          </button>
        </div>
      )}

      {/* Task Detail Modal */}
      {selectedTaskId && (
        <TaskDetailModal
          taskId={selectedTaskId}
          onClose={() => setSelectedTaskId(null)}
          onUpdated={updateTaskLocally}
          onDeleted={deleteTaskLocally}
        />
      )}

      {/* Create Folder Modal */}
      {showFolderModal && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 1000,
          background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }} onClick={e => { if (e.target === e.currentTarget) setShowFolderModal(false); }}>
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '16px', width: 400, padding: 24, animation: 'fadeInUp 0.2s ease' }}>
            <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 16, fontFamily: 'Space Grotesk, sans-serif' }}>Create Month Folder</h2>
            
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 12, color: 'var(--text-muted)', marginBottom: 6 }}>Month</label>
              <select className="input" value={newMonth} onChange={e => setNewMonth(e.target.value)} style={{ width: '100%' }}>
                {Array.from({ length: 12 }).map((_, i) => (
                  <option key={i+1} value={i+1}>{new Date(0, i).toLocaleString('en', { month: 'long' })}</option>
                ))}
              </select>
            </div>

            <div style={{ marginBottom: 24 }}>
              <label style={{ display: 'block', fontSize: 12, color: 'var(--text-muted)', marginBottom: 6 }}>Year</label>
              <select className="input" value={newYear} onChange={e => setNewYear(e.target.value)} style={{ width: '100%' }}>
                {Array.from({ length: 5 }).map((_, i) => {
                  const y = new Date().getFullYear() + i;
                  return <option key={y} value={y}>{y}</option>;
                })}
              </select>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button className="btn btn-ghost" onClick={() => setShowFolderModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleCreateFolder}>Create Folder</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Inline Confirm Dialog (replaces window.confirm) ── */}
      {confirmDialog && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 2000,
          background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <div style={{
            background: 'var(--bg-card)', border: '1px solid var(--border)',
            borderRadius: '16px', width: 360, padding: '28px 28px 24px',
            animation: 'fadeInUp 0.15s ease', boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(239,68,68,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Trash2 size={18} color="#ef4444" />
              </div>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', margin: 0, fontFamily: 'Space Grotesk, sans-serif' }}>
                {confirmDialog.title}
              </h3>
            </div>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.6, margin: '0 0 24px' }}>
              {confirmDialog.message}
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => setConfirmDialog(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDialog.onConfirm}
                style={{ background: '#ef4444', color: 'white', border: 'none', borderRadius: 8, padding: '8px 18px', fontWeight: 700, fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}
              >
                <Trash2 size={13} /> Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
