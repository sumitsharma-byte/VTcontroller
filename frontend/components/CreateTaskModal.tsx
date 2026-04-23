'use client';

import { useState, useEffect } from 'react';
import { X, CheckSquare, Search, Check } from 'lucide-react';
import { tasksApi, workspacesApi, type ApiTask, type ApiProject, type WorkspaceMember } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useNotifications } from '@/lib/useNotifications';

interface Props {
  project: ApiProject;
  onClose: () => void;
  onCreated: (task: ApiTask) => void;
}

export default function CreateTaskModal({ project, onClose, onCreated }: Props) {
  const { user } = useAuth();
  const { addNotification } = useNotifications();
  const [form, setForm] = useState({
    title: '',
    description: '',
    priority: 'medium' as 'low' | 'medium' | 'high',
    status: 'todo' as 'todo' | 'in_progress' | 'done' | 'blocked',
    due_date: '',
  });
  const [members,       setMembers]       = useState<WorkspaceMember[]>([]);
  const [selectedIds,   setSelectedIds]   = useState<number[]>([]);
  const [memberSearch,  setMemberSearch]  = useState('');
  const [loadingMembers, setLoadingMembers] = useState(true);
  const [submitting,    setSubmitting]    = useState(false);
  const [error,         setError]         = useState('');

  useEffect(() => {
    if (!user?.current_workspace_id) return;
    workspacesApi.members(user.current_workspace_id)
      .then(res => setMembers(res.members))
      .catch(() => {/* non-fatal */})
      .finally(() => setLoadingMembers(false));
  }, [user]);

  const toggleMember = (id: number) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) { setError('Task title is required'); return; }
    setSubmitting(true);
    setError('');
    try {
      const payload = {
        ...form,
        due_date: form.due_date || undefined,
        assignee_ids: selectedIds,
      };
      const res = await tasksApi.create(project.id, payload);
      
      if (selectedIds.length > 0) {
         addNotification({
            type: 'assignment',
            read: false,
            title: `${selectedIds.length} User(s) Assigned`,
            body: `You assigned ${selectedIds.length} user(s) to "${form.title}"`,
            time: 'Just now',
            project: project.name,
         });
      }

      onCreated(res.task);
    } catch (err: any) {
      setError(err.message || 'Failed to create task');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredMembers = members.filter(m =>
    m.name.toLowerCase().includes(memberSearch.toLowerCase()) ||
    m.department?.toLowerCase().includes(memberSearch.toLowerCase())
  );

  const PRIORITY_OPTIONS = [
    { value: 'low',    label: 'Low',    color: '#22c55e' },
    { value: 'medium', label: 'Medium', color: '#f59e0b' },
    { value: 'high',   label: 'High',   color: '#ef4444' },
  ];

  const STATUS_OPTIONS = [
    { value: 'todo',        label: 'To Do'       },
    { value: 'in_progress', label: 'In Progress' },
    { value: 'done',        label: 'Done'         },
    { value: 'blocked',     label: 'Blocked'      },
  ];

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '20px',
      }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{
        background: 'var(--bg-secondary)', border: '1px solid var(--border)',
        borderRadius: '16px', width: '100%', maxWidth: '560px',
        boxShadow: '0 24px 60px rgba(0,0,0,0.5)',
        animation: 'fadeInUp 0.2s ease',
        maxHeight: '90vh', overflowY: 'auto',
      }}>
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '20px 24px', borderBottom: '1px solid var(--border)',
          position: 'sticky', top: 0, background: 'var(--bg-secondary)', zIndex: 2,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: 32, height: 32, borderRadius: '8px', background: project.color,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <CheckSquare size={15} color="white" />
            </div>
            <div>
              <div style={{ fontFamily: 'Space Grotesk, sans-serif', fontWeight: 700, fontSize: '15px' }}>New Task</div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{project.name}</div>
            </div>
          </div>
          <button onClick={onClose} style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'var(--text-muted)', padding: '4px', borderRadius: '6px',
            display: 'flex',
          }}>
            <X size={16} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>

          {/* Title */}
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
              Task Title *
            </label>
            <input
              className="input"
              value={form.title}
              onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              placeholder="e.g. Design new landing page"
              autoFocus
            />
          </div>

          {/* Description */}
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
              Description
            </label>
            <textarea
              className="input"
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              placeholder="Add task details, acceptance criteria, or context..."
              rows={3}
              style={{ resize: 'vertical', lineHeight: 1.5, minHeight: '72px' }}
            />
          </div>

          {/* Priority + Status */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px' }}>
                Priority
              </label>
              <div style={{ display: 'flex', gap: '6px' }}>
                {PRIORITY_OPTIONS.map(p => (
                  <button
                    key={p.value}
                    type="button"
                    onClick={() => setForm(f => ({ ...f, priority: p.value as any }))}
                    style={{
                      flex: 1, padding: '6px 0', borderRadius: '8px', fontSize: '11px', fontWeight: 700,
                      cursor: 'pointer',
                      border: `1px solid ${form.priority === p.value ? p.color : 'var(--border)'}`,
                      background: form.priority === p.value ? `${p.color}18` : 'transparent',
                      color: form.priority === p.value ? p.color : 'var(--text-muted)',
                      transition: 'all 0.15s',
                    }}
                  >{p.label}</button>
                ))}
              </div>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px' }}>
                Status
              </label>
              <select
                className="input"
                value={form.status}
                onChange={e => setForm(f => ({ ...f, status: e.target.value as any }))}
                style={{ fontSize: '12px' }}
              >
                {STATUS_OPTIONS.map(s => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Due date */}
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
              Due Date
            </label>
            <input
              className="input"
              type="date"
              value={form.due_date}
              onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))}
            />
          </div>

          {/* ── Assignee Picker ── */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
              <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>
                Assign To
              </label>
              {selectedIds.length > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  {/* Selected avatars preview */}
                  <div style={{ display: 'flex' }}>
                    {selectedIds.slice(0, 4).map((id, i) => {
                      const m = members.find(x => x.id === id);
                      return m ? (
                        <div key={id} title={m.name} style={{
                          width: 20, height: 20, borderRadius: '50%', flexShrink: 0,
                          background: `hsl(${(id * 67) % 360}, 65%, 50%)`,
                          border: '2px solid var(--bg-secondary)',
                          marginLeft: i > 0 ? '-5px' : 0,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: '8px', fontWeight: 700, color: 'white',
                        }}>{m.avatar || m.name[0]}</div>
                      ) : null;
                    })}
                  </div>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                    {selectedIds.length} selected
                  </span>
                  <button
                    type="button"
                    onClick={() => setSelectedIds([])}
                    style={{ fontSize: '10px', color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer', padding: '0 2px' }}
                  >Clear</button>
                </div>
              )}
            </div>

            {/* Search members */}
            <div style={{ position: 'relative', marginBottom: '8px' }}>
              <Search size={13} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                className="input"
                value={memberSearch}
                onChange={e => setMemberSearch(e.target.value)}
                placeholder="Search team members..."
                style={{ paddingLeft: '30px', fontSize: '12px' }}
              />
            </div>

            {/* Member list */}
            <div style={{
              border: '1px solid var(--border)', borderRadius: '10px',
              overflow: 'hidden', maxHeight: '200px', overflowY: 'auto',
            }}>
              {loadingMembers ? (
                <div style={{ padding: '16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '12px' }}>
                  Loading members...
                </div>
              ) : filteredMembers.length === 0 ? (
                <div style={{ padding: '16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '12px' }}>
                  No members found
                </div>
              ) : filteredMembers.map((member, i) => {
                const isSelected = selectedIds.includes(member.id);
                return (
                  <div
                    key={member.id}
                    onClick={() => toggleMember(member.id)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '10px',
                      padding: '10px 14px',
                      borderBottom: i < filteredMembers.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
                      cursor: 'pointer',
                      background: isSelected ? 'rgba(79,142,247,0.08)' : 'transparent',
                      transition: 'background 0.12s',
                    }}
                    onMouseEnter={e => { if (!isSelected) (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.03)'; }}
                    onMouseLeave={e => { if (!isSelected) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                  >
                    {/* Avatar */}
                    <div style={{
                      width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
                      background: `hsl(${(member.id * 67) % 360}, 65%, 50%)`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '11px', fontWeight: 700, color: 'white',
                    }}>{member.avatar || member.name[0]}</div>

                    {/* Info */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: '13px', color: 'var(--text-primary)' }}>{member.name}</div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'flex', gap: '6px' }}>
                        <span style={{ textTransform: 'capitalize' }}>{member.role}</span>
                        {member.department && <><span>·</span><span>{member.department}</span></>}
                      </div>
                    </div>

                    {/* Checkbox */}
                    <div style={{
                      width: 20, height: 20, borderRadius: '6px', flexShrink: 0,
                      border: `2px solid ${isSelected ? '#4f8ef7' : 'var(--border)'}`,
                      background: isSelected ? '#4f8ef7' : 'transparent',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      transition: 'all 0.15s',
                    }}>
                      {isSelected && <Check size={12} color="white" strokeWidth={3} />}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {error && (
            <div style={{
              padding: '10px 12px', borderRadius: '8px',
              background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)',
              color: '#ef4444', fontSize: '13px',
            }}>{error}</div>
          )}

          {/* Actions */}
          <div style={{ display: 'flex', gap: '10px', paddingTop: '4px' }}>
            <button type="button" className="btn btn-ghost" onClick={onClose} style={{ flex: 1, justifyContent: 'center' }}>
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={submitting}
              style={{ flex: 1, justifyContent: 'center', opacity: submitting ? 0.7 : 1 }}
            >
              {submitting ? 'Creating...' : `Create Task${selectedIds.length > 0 ? ` & Assign (${selectedIds.length})` : ''}`}
            </button>
          </div>
        </form>
      </div>
      <style>{`@keyframes fadeInUp { from { opacity:0; transform:translateY(12px); } to { opacity:1; transform:translateY(0); } }`}</style>
    </div>
  );
}
