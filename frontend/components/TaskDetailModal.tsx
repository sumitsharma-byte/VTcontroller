'use client';

import { useEffect, useState, useCallback, useRef, type ReactNode } from 'react';
import {
  X, Clock, Calendar, Check, MessageSquare, Plus, Activity,
  AlertTriangle, Paperclip, Trash2, ChevronRight, Tag, Users,
  Edit3, Save, RotateCcw, Image, Link, Wand2, Upload, ExternalLink, FileText
} from 'lucide-react';
import { tasksApi, tagsApi, workspacesApi, type ApiTask, type WorkspaceMember, type ApiComment } from '@/lib/api';
import { useAuth } from '@/lib/auth';

interface Props {
  taskId: number;
  onClose: () => void;
  onUpdated?: (task: ApiTask) => void;
  onDeleted?: (taskId: number) => void;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; dot: string }> = {
  todo:        { label: 'To Do',       color: '#8892a4', bg: 'rgba(136,146,164,0.15)', dot: '#8892a4' },
  in_progress: { label: 'In Progress', color: '#4f8ef7', bg: 'rgba(79,142,247,0.15)',  dot: '#4f8ef7' },
  done:        { label: 'Done',        color: '#30d158', bg: 'rgba(48,209,88,0.15)',   dot: '#30d158' },
  blocked:     { label: 'Blocked',     color: '#ff453a', bg: 'rgba(255,69,58,0.15)',   dot: '#ff453a' },
};

const PRIORITY_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  high:   { label: 'High',   color: '#ff453a', bg: 'rgba(255,69,58,0.12)'   },
  medium: { label: 'Medium', color: '#ff9f0a', bg: 'rgba(255,159,10,0.12)'  },
  low:    { label: 'Low',    color: '#30d158', bg: 'rgba(48,209,88,0.12)'   },
};

// ── Toast ────────────────────────────────────────────────────
interface Toast { id: number; msg: string; type: 'success' | 'error' }
let toastId = 0;

function ToastArea({ toasts }: { toasts: Toast[] }) {
  return (
    <div style={{ position: 'absolute', top: 16, right: 16, zIndex: 10, display: 'flex', flexDirection: 'column', gap: 8 }}>
      {toasts.map(t => (
        <div key={t.id} style={{
          background: t.type === 'success' ? 'rgba(48,209,88,0.12)' : 'rgba(255,69,58,0.12)',
          border: `1px solid ${t.type === 'success' ? 'rgba(48,209,88,0.4)' : 'rgba(255,69,58,0.4)'}`,
          color: t.type === 'success' ? '#30d158' : '#ff453a',
          borderRadius: 8, padding: '8px 14px', fontSize: 12, fontWeight: 600,
          animation: 'toastIn 0.2s ease',
          backdropFilter: 'blur(10px)',
        }}>
          {t.type === 'success' ? '✓ ' : '✕ '}{t.msg}
        </div>
      ))}
    </div>
  );
}

// ── Attribute Row ────────────────────────────────────────────
function AttributeRow({ icon: Icon, label, children }: { icon: any; label: string; children: ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', minHeight: 38, gap: 0 }}>
      <div style={{ display: 'flex', alignItems: 'center', width: 148, color: 'var(--text-muted)', fontSize: 12.5, gap: 7, flexShrink: 0 }}>
        <Icon size={13} />
        <span>{label}</span>
      </div>
      <div style={{ color: 'var(--text-primary)', fontSize: 13, flex: 1, display: 'flex', alignItems: 'center' }}>
        {children}
      </div>
    </div>
  );
}

// ── Subtask progress ─────────────────────────────────────────
function SubtaskProgress({ done, total }: { done: number; total: number }) {
  if (!total) return null;
  const pct = Math.round((done / total) * 100);
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
      <div style={{ flex: 1, height: 4, borderRadius: 2, background: 'var(--border)', overflow: 'hidden' }}>
        <div style={{ height: '100%', borderRadius: 2, width: `${pct}%`, background: pct === 100 ? '#30d158' : 'var(--accent-blue)', transition: 'width 0.4s ease' }} />
      </div>
      <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, whiteSpace: 'nowrap' }}>{done}/{total} done</span>
    </div>
  );
}

export default function TaskDetailModal({ taskId, onClose, onUpdated, onDeleted }: Props) {
  const { user } = useAuth();
  const [task, setTask]         = useState<ApiTask | null>(null);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState('');
  const [toasts, setToasts]     = useState<Toast[]>([]);
  const [rightTab, setRightTab] = useState<'activity' | 'comments'>('activity');

  // Editing states
  const [isEditingTitle, setIsEditingTitle]   = useState(false);
  const [titleInput, setTitleInput]           = useState('');
  const [savingTitle, setSavingTitle]         = useState(false);
  const [isEditingDesc, setIsEditingDesc]     = useState(false);
  const [descInput, setDescInput]             = useState('');
  const [savingDesc, setSavingDesc]           = useState(false);

  // Assignees
  const [workspaceMembers, setWorkspaceMembers] = useState<WorkspaceMember[]>([]);
  const [showAssigneeMenu, setShowAssigneeMenu] = useState(false);
  const assigneeRef = useRef<HTMLDivElement>(null);

  // Tags
  const [availableTags, setAvailableTags] = useState<{id:number;name:string;color:string}[]>([]);
  const [showTagMenu, setShowTagMenu]     = useState(false);
  const [tagSearch, setTagSearch]         = useState('');
  const [creatingTag, setCreatingTag]     = useState(false);
  const tagRef = useRef<HTMLDivElement>(null);

  // Subtasks
  const [isAddingSubtask, setIsAddingSubtask] = useState(false);
  const [subtaskTitle, setSubtaskTitle]       = useState('');
  const [shareEmail, setShareEmail]           = useState('');
  const [sharing, setSharing]                 = useState(false);

  // Comments
  const [comment, setComment]     = useState('');
  const [submitting, setSubmitting] = useState(false);
  const commentsEndRef = useRef<HTMLDivElement>(null);

  // Timer
  const [timeTracked, setTimeTracked] = useState(0);
  const [isTiming, setIsTiming]       = useState(false);

  // Custom Fields — REMOVED
  // Description attachments
  const [descAttachments, setDescAttachments] = useState<{type: 'image' | 'url'; value: string; name: string}[]>([]);
  const [isImprovingAi, setIsImprovingAi] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<{
    correctedText: string;
    changes: { original: string; corrected: string; message: string; type: string }[];
  } | null>(null);
  const imgInputRef = useRef<HTMLInputElement>(null);
  const descTextareaRef = useRef<HTMLTextAreaElement>(null);
  const dateInputRef = useRef<HTMLInputElement>(null);

  // Activity feed (local synthetic events + comments merged)
  const [activityFeed, setActivityFeed] = useState<{ id: string; type: 'comment' | 'event'; ts: string; text: string; user: string }[]>([]);

  // ── Toast helper ──────────────────────────────────────────
  const toast = useCallback((msg: string, type: 'success' | 'error' = 'success') => {
    const id = ++toastId;
    setToasts(prev => [...prev, { id, msg, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 2800);
  }, []);

  // ── Load ─────────────────────────────────────────────────
  const loadTask = useCallback(async () => {
    try {
      setLoading(true);
      const res = await tasksApi.get(taskId);
      setTask(res.task);
      if (user?.current_workspace_id) {
        const memRes = await workspacesApi.members(user.current_workspace_id);
        setWorkspaceMembers(memRes.members || []);
      }
      const tagRes = await tagsApi.list();
      setAvailableTags(tagRes.tags || []);
      // Build activity feed from comments
      const feed = (res.task.comments || []).map((c: ApiComment) => ({
        id: `c-${c.id}`,
        type: 'comment' as const,
        ts: c.created_at,
        text: c.content,
        user: c.user.name,
      }));
      setActivityFeed(feed);
    } catch (err: any) {
      setError(err.message || 'Failed to load task');
    } finally {
      setLoading(false);
    }
  }, [taskId, user]);

  useEffect(() => { loadTask(); }, [loadTask]);

  // Escape to close
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose]);

  // Timer
  useEffect(() => {
    let iv: any;
    if (isTiming) iv = setInterval(() => setTimeTracked(t => t + 1), 1000);
    return () => clearInterval(iv);
  }, [isTiming]);

  // Click-outside assignee menu
  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (assigneeRef.current && !assigneeRef.current.contains(e.target as Node)) setShowAssigneeMenu(false);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  // Click-outside tag menu
  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (tagRef.current && !tagRef.current.contains(e.target as Node)) setShowTagMenu(false);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  // Scroll comments to bottom
  useEffect(() => {
    if (rightTab === 'comments') commentsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [task?.comments, rightTab]);

  const formatTime = (s: number) => {
    const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
    return `${h > 0 ? h + 'h ' : ''}${m}m ${sec}s`;
  };

  // ── Adds a synthetic activity event ──────────────────────
  const addActivityEvent = (text: string) => {
    setActivityFeed(prev => [...prev, {
      id: `e-${Date.now()}`, type: 'event', ts: new Date().toISOString(),
      text, user: user?.name || 'You',
    }]);
  };

  // ── Update helpers ────────────────────────────────────────
  const updateField = async (data: Record<string, any>, successMsg: string, activityMsg?: string) => {
    if (!task) return;
    try {
      const res = await tasksApi.update(task.id, data);
      setTask(res.task);
      onUpdated?.(res.task);
      toast(successMsg);
      if (activityMsg) addActivityEvent(activityMsg);
    } catch (e: any) {
      toast(e.message || 'Update failed', 'error');
    }
  };

  const handleUpdateTitle = async () => {
    if (!task || !titleInput.trim() || titleInput === task.title) { setIsEditingTitle(false); return; }
    setSavingTitle(true);
    await updateField({ title: titleInput }, 'Title saved', `Renamed to "${titleInput}"`);
    setSavingTitle(false);
    setIsEditingTitle(false);
  };

  const handleUpdateDescription = async () => {
    setSavingDesc(true);
    // Also append attachment URLs to the description if any
    let finalDesc = descInput;
    if (descAttachments.length > 0) {
      const lines = descAttachments.map(a => a.type === 'url' ? `[${a.name}](${a.value})` : `![${a.name}](${a.value})`);
      finalDesc = (finalDesc ? finalDesc + '\n\n' : '') + '---\n' + lines.join('\n');
    }
    // Immediately patch local state so the description shows right away
    setTask(prev => prev ? { ...prev, description: finalDesc } : prev);
    await updateField({ description: finalDesc }, 'Description saved');
    setSavingDesc(false);
    setIsEditingDesc(false);
    setDescAttachments([]);
  };

  const handleToggleAssignee = async (memberId: number, memberName: string) => {
    if (!task) return;
    const ids = task.assignees?.map(a => a.id) || [];
    const isAssigned = ids.includes(memberId);
    const newIds = isAssigned ? ids.filter(id => id !== memberId) : [...ids, memberId];
    await updateField(
      { assignee_ids: newIds },
      isAssigned ? `${memberName} removed` : `${memberName} assigned`,
      isAssigned ? `Removed assignee ${memberName}` : `Assigned ${memberName}`
    );
  };

  const handleToggleTag = async (tagId: number, tagName: string) => {
    if (!task) return;
    const ids = task.tags?.map(t => t.id) || [];
    const has = ids.includes(tagId);
    const newIds = has ? ids.filter(i => i !== tagId) : [...ids, tagId];
    await updateField({ tag_ids: newIds }, has ? `Tag removed` : `Tag added`, has ? `Removed tag "${tagName}"` : `Added tag "${tagName}"`);
  };

  const handleCreateTag = async () => {
    const name = tagSearch.trim();
    if (!name) return;
    setCreatingTag(true);
    try {
      const res = await tagsApi.create(name);
      const newTag = res.tag;
      setAvailableTags(prev => [...prev, newTag]);
      // Auto-assign to this task
      const ids = [...(task?.tags?.map(t => t.id) || []), newTag.id];
      await updateField({ tag_ids: ids }, `Tag "${name}" created & added`);
      setTagSearch('');
    } catch (e: any) { toast(e.message || 'Failed to create tag', 'error'); }
    setCreatingTag(false);
  };

  const handleAddComment = async () => {
    if (!task || !comment.trim()) return;
    setSubmitting(true);
    try {
      const res = await tasksApi.addComment(task.id, comment.trim());
      setTask(prev => prev ? { ...prev, comments: [...(prev.comments || []), res.comment] } : prev);
      setActivityFeed(prev => [...prev, {
        id: `c-${res.comment.id}`, type: 'comment', ts: res.comment.created_at,
        text: res.comment.content, user: res.comment.user.name,
      }]);
      setComment('');
      setRightTab('activity');
      toast('Comment added');
    } catch (e: any) { toast(e.message || 'Failed to post comment', 'error'); }
    setSubmitting(false);
  };

  const handleCreateSubtask = async () => {
    if (!task || !subtaskTitle.trim()) return;
    try {
      const res = await tasksApi.create(task.project_id, { title: subtaskTitle, parent_task_id: task.id });
      setTask(prev => prev ? { ...prev, subtasks: [...(prev.subtasks || []), res.task], subtasks_total: (prev.subtasks_total || 0) + 1 } : prev);
      setSubtaskTitle('');
      setIsAddingSubtask(false);
      toast('Subtask created');
      addActivityEvent(`Added subtask "${subtaskTitle}"`);
    } catch (e: any) { toast(e.message || 'Failed to create subtask', 'error'); }
  };

  const handleShareTask = async () => {
    if (!task || !shareEmail.trim()) return;
    const email = shareEmail.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { toast('Invalid email address', 'error'); return; }
    
    setSharing(true);
    try {
      await tasksApi.share(task.id, email);
      toast(`Task shared with ${email}`);
      setShareEmail('');
      setShowAssigneeMenu(false);
      addActivityEvent(`Shared task via email to ${email}`);
    } catch (e: any) {
      toast(e.message || 'Failed to share task', 'error');
    } finally {
      setSharing(false);
    }
  };

  const handleToggleSubtaskStatus = async (sub: ApiTask) => {
    const newStatus = sub.status === 'done' ? 'todo' : 'done';
    try {
      const res = await tasksApi.update(sub.id, { status: newStatus });
      setTask(prev => {
        if (!prev) return prev;
        const subtasks = prev.subtasks?.map(s => s.id === sub.id ? res.task : s) || [];
        const done = subtasks.filter(s => s.status === 'done').length;
        return { ...prev, subtasks, subtasks_done: done };
      });
    } catch {}
  };

  const handleAiImprove = async () => {
    if (!descInput.trim()) { toast('Write something first to improve', 'error'); return; }
    setIsImprovingAi(true);
    setAiSuggestions(null);
    try {
      const body = new URLSearchParams({
        text: descInput,
        language: 'en-US',
        enabledOnly: 'false',
      });

      const res = await fetch('https://api.languagetool.org/v2/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
        body: body.toString(),
      });

      if (!res.ok) throw new Error('Grammar check service unavailable');
      const data = await res.json();

      interface LTMatch {
        offset: number;
        length: number;
        message: string;
        replacements: { value: string }[];
        rule: { issueType: string; description: string };
        context: { text: string; offset: number; length: number };
      }
      const matches: LTMatch[] = (data.matches || []).filter((m: LTMatch) => m.replacements.length > 0);

      if (matches.length === 0) {
        toast('✓ Text looks great — no issues found!');
        setIsImprovingAi(false);
        return;
      }

      // Build corrected text (apply in reverse offset order)
      let corrected = descInput;
      const sorted = [...matches].sort((a, b) => b.offset - a.offset);
      for (const m of sorted) {
        corrected = corrected.slice(0, m.offset) + m.replacements[0].value + corrected.slice(m.offset + m.length);
      }
      // Sentence capitalisation
      corrected = corrected
        .replace(/^([a-z])/, c => c.toUpperCase())
        .replace(/([.!?]\s+)([a-z])/g, (_, p, c) => p + c.toUpperCase())
        .replace(/\s{2,}/g, ' ')
        .trim();

      // Build change list for review (forward order)
      const changes = matches
        .sort((a, b) => a.offset - b.offset)
        .map(m => ({
          original: descInput.slice(m.offset, m.offset + m.length),
          corrected: m.replacements[0].value,
          message: m.message,
          type: m.rule.issueType,
        }));

      setAiSuggestions({ correctedText: corrected, changes });
    } catch (err: any) {
      toast(err.message || 'AI improvement failed', 'error');
    }
    setIsImprovingAi(false);
  };

  const handleImageFile = (file: File) => {
    if (!file.type.startsWith('image/')) { toast('Only image files supported', 'error'); return; }
    if (file.size > 5 * 1024 * 1024) { toast('Image must be under 5MB', 'error'); return; }
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      setDescAttachments(prev => [...prev, { type: 'image', value: dataUrl, name: file.name }]);
      toast('Image attached');
    };
    reader.readAsDataURL(file);
  };

  const handlePasteDesc = (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (const item of Array.from(items)) {
      if (item.type.startsWith('image/')) {
        e.preventDefault();
        const file = item.getAsFile();
        if (file) handleImageFile(file);
        return;
      }
    }
  };

  const handleAddUrl = () => {
    const url = prompt('Enter URL:');
    if (!url) return;
    let name = url;
    try { name = new URL(url).hostname; } catch {}
    setDescAttachments(prev => [...prev, { type: 'url', value: url, name }]);
    toast('Link attached');
  };

  const handleDeleteTask = async () => {
    if (!task || !confirm('Delete this task permanently? This cannot be undone.')) return;
    try {
      await tasksApi.delete(task.id);
      onDeleted?.(task.id);
      onClose();
    } catch (e: any) { toast(e.message || 'Delete failed', 'error'); }
  };

  // ── Loading / Error ───────────────────────────────────────
  if (loading) return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
        <div style={{ width: 36, height: 36, borderRadius: '50%', border: '3px solid var(--border)', borderTopColor: 'var(--accent-blue)', animation: 'spin 0.8s linear infinite' }} />
        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Loading task...</span>
      </div>
    </div>
  );

  if (error || !task) return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16, padding: 32, textAlign: 'center', maxWidth: 340 }}>
        <div style={{ fontSize: 32, marginBottom: 12 }}>⚠️</div>
        <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 8 }}>Failed to load task</div>
        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 20 }}>{error}</div>
        <button className="btn btn-ghost" onClick={onClose}><X size={14} /> Close</button>
      </div>
    </div>
  );

  const status   = STATUS_CONFIG[task.status]   || STATUS_CONFIG['todo'];
  const priority = PRIORITY_CONFIG[task.priority] || PRIORITY_CONFIG['medium'];
  const subtasksDone  = task.subtasks_done  ?? (task.subtasks?.filter(s => s.status === 'done').length ?? 0);
  const subtasksTotal = task.subtasks_total ?? (task.subtasks?.length ?? 0);

  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{
        background: 'var(--bg-primary)', border: '1px solid var(--border)',
        borderRadius: 18, width: '92vw', maxWidth: 1180, height: '87vh',
        display: 'flex', overflow: 'hidden', boxShadow: '0 32px 80px rgba(0,0,0,0.9)',
        animation: 'taskModalIn 0.22s cubic-bezier(0.16,1,0.3,1)',
        position: 'relative',
      }}>
        <ToastArea toasts={toasts} />

        {/* ── LEFT PANE ─────────────────────────────────────── */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflowY: 'auto', borderRight: '1px solid var(--border)' }}>

          {/* Breadcrumb header */}
          <div style={{ padding: '20px 36px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-muted)', fontSize: 12 }}>
              <Check size={12} />
              <span>Task</span>
              <ChevronRight size={12} />
              <span style={{ background: 'var(--bg-secondary)', padding: '1px 8px', borderRadius: 4, fontFamily: 'monospace', letterSpacing: 1 }}>#{task.id}</span>
              {/* Status pill in breadcrumb */}
              <span style={{ padding: '2px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, background: status.bg, color: status.color, border: `1px solid ${status.color}44`, marginLeft: 4 }}>
                <span style={{ display: 'inline-block', width: 6, height: 6, borderRadius: '50%', background: status.dot, marginRight: 5 }} />
                {status.label}
              </span>
            </div>
            <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', borderRadius: 6, padding: 4, transition: 'color 0.15s' }}
              onMouseEnter={e => (e.currentTarget.style.color = 'var(--text-primary)')}
              onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-muted)')}>
              <X size={18} />
            </button>
          </div>

          <div style={{ padding: '0 36px', flex: 1, paddingBottom: 40 }}>
            {/* Title */}
            <div style={{ margin: '14px 0 6px' }}>
              {isEditingTitle ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <input
                    type="text" value={titleInput}
                    onChange={e => setTitleInput(e.target.value)}
                    onBlur={handleUpdateTitle}
                    onKeyDown={e => e.key === 'Enter' && handleUpdateTitle()}
                    autoFocus
                    style={{ flex: 1, fontSize: 26, fontWeight: 700, background: 'transparent', border: 'none', outline: 'none', color: 'var(--text-primary)', fontFamily: 'Space Grotesk, sans-serif', borderBottom: '2px solid var(--accent-blue)' }}
                  />
                  {savingTitle && <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Saving...</span>}
                </div>
              ) : (
                <h1
                  style={{ fontSize: 26, fontWeight: 700, cursor: 'text', color: 'var(--text-primary)', fontFamily: 'Space Grotesk, sans-serif', lineHeight: 1.3 }}
                  onClick={() => { setTitleInput(task.title); setIsEditingTitle(true); }}
                  title="Click to edit title"
                >
                  {task.title}
                  <Edit3 size={14} style={{ marginLeft: 8, color: 'var(--text-muted)', opacity: 0, transition: 'opacity 0.15s', verticalAlign: 'middle' }}
                    onMouseEnter={e => ((e.currentTarget as SVGSVGElement).style.opacity = '1')}
                    onMouseLeave={e => ((e.currentTarget as SVGSVGElement).style.opacity = '0')}
                  />
                </h1>
              )}
            </div>

            {/* Subtask progress */}
            <SubtaskProgress done={subtasksDone} total={subtasksTotal} />

            {/* AI prompt bar */}
            <div style={{ background: 'var(--bg-secondary)', borderRadius: 8, padding: '9px 14px', display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5, color: 'var(--text-muted)', marginBottom: 28, border: '1px solid var(--border)' }}>
              <span style={{ color: 'var(--accent-purple)', fontSize: 14 }}>✧</span>
              Ask AI to write a description, generate subtasks, or find similar tasks...
            </div>

            {/* Attributes grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 32px', borderBottom: '1px solid var(--border)', paddingBottom: 20, marginBottom: 24 }}>
              {/* Left col */}
              <div>
                <AttributeRow icon={Activity} label="Status">
                  <select
                    value={task.status}
                    onChange={e => updateField({ status: e.target.value }, 'Status updated', `Status changed to ${STATUS_CONFIG[e.target.value]?.label}`)}
                    style={{ background: status.bg, color: status.color, border: `1px solid ${status.color}44`, borderRadius: 6, padding: '3px 10px', outline: 'none', fontWeight: 700, fontSize: 11, cursor: 'pointer', letterSpacing: 0.3 }}
                  >
                    {Object.entries(STATUS_CONFIG).map(([k, v]) => (
                      <option key={k} value={k} style={{ color: '#111', background: '#fff' }}>{v.label}</option>
                    ))}
                  </select>
                </AttributeRow>

                <AttributeRow icon={Calendar} label="Due Date">
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, position: 'relative' }}>
                    {/* Hidden native date input — opened programmatically */}
                    <input
                      ref={dateInputRef}
                      id="task-due-date"
                      type="date"
                      value={task.due_date ? task.due_date.split('T')[0] : ''}
                      onChange={e => updateField({ due_date: e.target.value || null }, 'Due date updated', `Due date set to ${e.target.value || 'none'}`)}
                      style={{ position: 'absolute', opacity: 0, width: 0, height: 0, pointerEvents: 'none' }}
                    />
                    {/* Custom display */}
                    <span
                      style={{ fontSize: 13, color: task.is_overdue ? 'var(--accent-red)' : task.due_date ? 'var(--text-primary)' : 'var(--text-muted)', fontWeight: task.due_date ? 500 : 400 }}
                    >
                      {task.due_date
                        ? new Date(task.due_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
                        : 'Set due date'}
                    </span>
                    {/* Custom calendar icon — fully themed */}
                    <button
                      type="button"
                      onClick={() => {
                        // Try showPicker (modern browsers) then fallback to click
                        try { (dateInputRef.current as any)?.showPicker?.(); } catch { dateInputRef.current?.click(); }
                      }}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px 4px', borderRadius: 4, display: 'flex', alignItems: 'center', color: task.is_overdue ? 'var(--accent-red)' : 'var(--text-muted)', transition: 'color 0.15s' }}
                      onMouseEnter={e => (e.currentTarget.style.color = 'var(--accent-blue)')}
                      onMouseLeave={e => (e.currentTarget.style.color = task.is_overdue ? 'var(--accent-red)' : 'var(--text-muted)')}
                      title="Pick date"
                    >
                      <Calendar size={14} />
                    </button>
                    {task.due_date && (
                      <button
                        type="button"
                        onClick={() => updateField({ due_date: null }, 'Due date cleared')}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px 4px', borderRadius: 4, display: 'flex', alignItems: 'center', color: 'var(--text-muted)', transition: 'color 0.15s', fontSize: 11 }}
                        onMouseEnter={e => (e.currentTarget.style.color = 'var(--accent-red)')}
                        onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-muted)')}
                        title="Clear date"
                      >
                        ×
                      </button>
                    )}
                  </div>
                </AttributeRow>

                <AttributeRow icon={Clock} label="Track Time">
                  {isTiming ? (
                    <div
                      style={{ color: 'var(--accent-red)', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 7, fontSize: 12.5 }}
                      onClick={() => { setIsTiming(false); toast(`Timer stopped: ${formatTime(timeTracked)}`); }}
                    >
                      <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--accent-red)', animation: 'pulse 1.2s infinite', display: 'inline-block' }} />
                      {formatTime(timeTracked)} — Stop
                    </div>
                  ) : (
                    <div style={{ color: 'var(--accent-blue)', cursor: 'pointer', fontWeight: 500, fontSize: 12.5 }} onClick={() => setIsTiming(true)}>
                      ▶ {timeTracked > 0 ? formatTime(timeTracked) : 'Start Timer'}
                    </div>
                  )}
                </AttributeRow>
              </div>

              {/* Right col */}
              <div>
                <AttributeRow icon={Users} label="Assignees">
                  <div style={{ position: 'relative', width: '100%' }} ref={assigneeRef}>
                    <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 4, cursor: 'pointer' }} onClick={() => setShowAssigneeMenu(!showAssigneeMenu)}>
                      {task.assignees?.map(a => (
                        <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'var(--bg-secondary)', border: '1px solid var(--border)', padding: '2px 8px', borderRadius: 20, fontSize: 11.5 }}>
                          <div style={{ width: 16, height: 16, borderRadius: '50%', background: `hsl(${(a.id * 67) % 360}, 65%, 50%)`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: 8, fontWeight: 800 }}>{a.name[0]}</div>
                          {a.name}
                        </div>
                      ))}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 22, height: 22, borderRadius: '50%', border: '1.5px dashed var(--border-light)', color: 'var(--text-muted)', transition: 'border-color 0.15s' }}>
                        <Plus size={12} />
                      </div>
                    </div>
                    {showAssigneeMenu && (
                      <div style={{ position: 'absolute', top: '110%', left: 0, marginTop: 4, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10, width: 250, zIndex: 20, overflow: 'hidden', boxShadow: '0 16px 48px rgba(0,0,0,0.6)' }}>
                        <div style={{ padding: '8px 14px', fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', borderBottom: '1px solid var(--border)', letterSpacing: 0.5 }}>TEAM MEMBERS</div>
                        <div style={{ maxHeight: 220, overflowY: 'auto' }}>
                          {workspaceMembers.map(m => {
                            const isAssigned = task.assignees?.some(a => a.id === m.id);
                            return (
                              <div
                                key={m.id}
                                style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '9px 14px', cursor: 'pointer', background: isAssigned ? 'rgba(10,132,255,0.06)' : 'transparent', transition: 'background 0.1s' }}
                                onClick={() => handleToggleAssignee(m.id, m.name)}
                                onMouseEnter={e => (e.currentTarget.style.background = isAssigned ? 'rgba(10,132,255,0.1)' : 'rgba(255,255,255,0.04)')}
                                onMouseLeave={e => (e.currentTarget.style.background = isAssigned ? 'rgba(10,132,255,0.06)' : 'transparent')}
                              >
                                <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                                  <div style={{ width: 28, height: 28, borderRadius: '50%', background: `hsl(${(m.id * 67) % 360}, 65%, 50%)`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: 11, fontWeight: 800 }}>{m.name[0]}</div>
                                  <div>
                                    <div style={{ fontSize: 13, fontWeight: 500 }}>{m.name}</div>
                                    <div style={{ fontSize: 10.5, color: 'var(--text-muted)' }}>{m.role}</div>
                                  </div>
                                </div>
                                <div style={{ width: 18, height: 18, borderRadius: 4, border: `2px solid ${isAssigned ? 'var(--accent-blue)' : 'var(--border)'}`, background: isAssigned ? 'var(--accent-blue)' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s' }}>
                                  {isAssigned && <Check size={10} color="white" />}
                                </div>
                              </div>
                            );
                          })}
                        </div>

                        {/* Share via Email */}
                        <div style={{ padding: '12px 14px', borderTop: '1px solid var(--border)', background: 'rgba(0,0,0,0.1)' }}>
                          <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 8, letterSpacing: 0.5 }}>SHARE VIA EMAIL</div>
                          <div style={{ display: 'flex', gap: 6 }}>
                            <input 
                              type="email" 
                              placeholder="Enter email..."
                              value={shareEmail}
                              onChange={e => setShareEmail(e.target.value)}
                              onKeyDown={e => e.key === 'Enter' && handleShareTask()}
                              style={{ flex: 1, background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 6, padding: '5px 10px', fontSize: 11.5, color: 'var(--text-primary)', outline: 'none' }}
                            />
                            <button 
                              className="btn btn-primary" 
                              onClick={handleShareTask}
                              disabled={sharing || !shareEmail.trim()}
                              style={{ padding: '4px 10px', fontSize: 10.5, fontWeight: 700 }}
                            >
                              {sharing ? '...' : 'Share'}
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </AttributeRow>

                <AttributeRow icon={AlertTriangle} label="Priority">
                  <select
                    value={task.priority}
                    onChange={e => updateField({ priority: e.target.value }, 'Priority updated', `Priority set to ${e.target.value}`)}
                    style={{ background: priority.bg, color: priority.color, border: `1px solid ${priority.color}44`, borderRadius: 6, padding: '3px 10px', outline: 'none', fontWeight: 700, fontSize: 11, cursor: 'pointer' }}
                  >
                    {Object.entries(PRIORITY_CONFIG).map(([k, v]) => (
                      <option key={k} value={k} style={{ color: '#111', background: '#fff' }}>{v.label}</option>
                    ))}
                  </select>
                </AttributeRow>

                <AttributeRow icon={Tag} label="Tags">
                  <div style={{ position: 'relative', width: '100%' }} ref={tagRef}>
                    <div
                      style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 4, cursor: 'pointer', minHeight: 24 }}
                      onClick={() => { setShowTagMenu(!showTagMenu); setTagSearch(''); }}
                    >
                      {task.tags?.map(t => (
                        <span
                          key={t.id}
                          style={{ color: t.color, fontSize: 11, background: `${t.color}22`, padding: '2px 8px 2px 8px', borderRadius: 20, border: `1px solid ${t.color}44`, fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 4 }}
                        >
                          {t.name}
                          <span
                            style={{ cursor: 'pointer', opacity: 0.6, fontSize: 10, lineHeight: 1 }}
                            onClick={e => { e.stopPropagation(); handleToggleTag(t.id, t.name); }}
                          >✕</span>
                        </span>
                      ))}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 22, height: 22, borderRadius: '50%', border: '1.5px dashed var(--border-light)', color: 'var(--text-muted)', transition: 'border-color 0.15s', flexShrink: 0 }}>
                        <Plus size={12} />
                      </div>
                    </div>

                    {showTagMenu && (
                      <div style={{ position: 'absolute', top: '110%', left: 0, marginTop: 4, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10, width: 260, zIndex: 20, overflow: 'hidden', boxShadow: '0 16px 48px rgba(0,0,0,0.6)' }}>
                        {/* Search / Create */}
                        <div style={{ padding: '8px 10px', borderBottom: '1px solid var(--border)' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'var(--bg-secondary)', borderRadius: 6, padding: '5px 10px', border: '1px solid var(--border)' }}>
                            <Tag size={11} color="var(--text-muted)" />
                            <input
                              autoFocus
                              type="text"
                              placeholder="Search or create tag..."
                              value={tagSearch}
                              onChange={e => setTagSearch(e.target.value)}
                              onKeyDown={e => { if (e.key === 'Enter') handleCreateTag(); if (e.key === 'Escape') setShowTagMenu(false); }}
                              style={{ background: 'none', border: 'none', outline: 'none', fontSize: 12, color: 'var(--text-primary)', width: '100%', fontFamily: 'inherit' }}
                            />
                          </div>
                        </div>

                        {/* Tag list */}
                        <div style={{ maxHeight: 200, overflowY: 'auto' }}>
                          {availableTags
                            .filter(t => t.name.toLowerCase().includes(tagSearch.toLowerCase()))
                            .map(t => {
                              const selected = task.tags?.some(tt => tt.id === t.id);
                              return (
                                <div
                                  key={t.id}
                                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '9px 14px', cursor: 'pointer', background: selected ? `${t.color}10` : 'transparent', transition: 'background 0.1s' }}
                                  onClick={() => handleToggleTag(t.id, t.name)}
                                  onMouseEnter={e => (e.currentTarget.style.background = selected ? `${t.color}18` : 'rgba(255,255,255,0.04)')}
                                  onMouseLeave={e => (e.currentTarget.style.background = selected ? `${t.color}10` : 'transparent')}
                                >
                                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: 12.5 }}>
                                    <span style={{ width: 10, height: 10, borderRadius: '50%', background: t.color, flexShrink: 0 }} />
                                    {t.name}
                                  </span>
                                  <div style={{ width: 16, height: 16, borderRadius: 4, border: `2px solid ${selected ? t.color : 'var(--border)'}`, background: selected ? t.color : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s' }}>
                                    {selected && <Check size={9} color="white" />}
                                  </div>
                                </div>
                              );
                            })}

                          {/* Create new tag option */}
                          {tagSearch.trim() && !availableTags.some(t => t.name.toLowerCase() === tagSearch.toLowerCase()) && (
                            <div
                              style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 14px', cursor: 'pointer', borderTop: '1px solid var(--border)', color: 'var(--accent-blue)' }}
                              onClick={handleCreateTag}
                              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(79,142,247,0.06)')}
                              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                            >
                              <Plus size={12} />
                              <span style={{ fontSize: 12.5, fontWeight: 600 }}>
                                {creatingTag ? 'Creating...' : `Create "${tagSearch.trim()}"`}
                              </span>
                            </div>
                          )}

                          {!availableTags.length && !tagSearch && (
                            <div style={{ padding: '14px', fontSize: 12, color: 'var(--text-muted)', textAlign: 'center' }}>No tags yet — type to create one</div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </AttributeRow>
              </div>
            </div>

            {/* Description — Rich Editor */}
            <div style={{ marginBottom: 28 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
                <Edit3 size={13} /> Description
              </div>

              {isEditingDesc ? (
                <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--accent-blue)', borderRadius: 10, overflow: 'hidden' }}>
                  {/* Toolbar */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '8px 10px', borderBottom: '1px solid var(--border)', flexWrap: 'wrap' }}>
                    {/* AI Improve */}
                    <button
                      type="button"
                      onClick={handleAiImprove}
                      disabled={isImprovingAi}
                      style={{ display: 'flex', alignItems: 'center', gap: 5, background: aiSuggestions ? 'rgba(175,82,222,0.25)' : isImprovingAi ? 'rgba(175,82,222,0.2)' : 'rgba(175,82,222,0.1)', border: '1px solid rgba(175,82,222,0.4)', color: '#af52de', borderRadius: 6, padding: '4px 10px', fontSize: 11.5, fontWeight: 600, cursor: isImprovingAi ? 'wait' : 'pointer', transition: 'all 0.2s' }}
                    >
                      <Wand2 size={12} />
                      {isImprovingAi ? 'Checking...' : aiSuggestions ? `${aiSuggestions.changes.length} fix${aiSuggestions.changes.length > 1 ? 'es' : ''} found` : 'AI Improve'}
                    </button>

                    <div style={{ width: 1, height: 18, background: 'var(--border)', margin: '0 4px' }} />

                    {/* Image Upload */}
                    <button
                      type="button"
                      onClick={() => imgInputRef.current?.click()}
                      style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'transparent', border: '1px solid var(--border)', color: 'var(--text-muted)', borderRadius: 6, padding: '4px 10px', fontSize: 11.5, fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s' }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent-blue)'; e.currentTarget.style.color = 'var(--accent-blue)'; }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-muted)'; }}
                      title="Attach image file"
                    >
                      <Image size={12} /> Image
                    </button>
                    <input
                      ref={imgInputRef}
                      type="file"
                      accept="image/*"
                      style={{ display: 'none' }}
                      onChange={e => { const f = e.target.files?.[0]; if (f) handleImageFile(f); e.target.value = ''; }}
                    />

                    {/* URL/Link */}
                    <button
                      type="button"
                      onClick={handleAddUrl}
                      style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'transparent', border: '1px solid var(--border)', color: 'var(--text-muted)', borderRadius: 6, padding: '4px 10px', fontSize: 11.5, fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s' }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent-blue)'; e.currentTarget.style.color = 'var(--accent-blue)'; }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-muted)'; }}
                      title="Attach URL/link"
                    >
                      <Link size={12} /> URL
                    </button>

                    <span style={{ marginLeft: 'auto', fontSize: 10.5, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Upload size={10} /> Paste image here
                    </span>
                  </div>

                  {/* Textarea */}
                  <textarea
                    ref={descTextareaRef}
                    value={descInput}
                    onChange={e => setDescInput(e.target.value)}
                    onPaste={handlePasteDesc}
                    rows={6}
                    placeholder="Describe the task... (paste images directly here)"
                    style={{ width: '100%', background: 'transparent', border: 'none', outline: 'none', resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.7, fontSize: 13.5, color: 'var(--text-primary)', padding: '14px 14px 10px', boxSizing: 'border-box' }}
                    autoFocus
                  />

                  {/* AI Suggestion Review Panel */}
                  {aiSuggestions && (
                    <div style={{ borderTop: '1px solid rgba(175,82,222,0.3)', background: 'rgba(175,82,222,0.06)', padding: '12px 14px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 700, color: '#af52de' }}>
                          <Wand2 size={12} />
                          AI found {aiSuggestions.changes.length} correction{aiSuggestions.changes.length > 1 ? 's' : ''}
                        </div>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button
                            type="button"
                            onClick={() => { setDescInput(aiSuggestions.correctedText); setAiSuggestions(null); toast('✓ All corrections applied'); }}
                            style={{ background: '#af52de', border: 'none', color: 'white', borderRadius: 6, padding: '4px 12px', fontSize: 11.5, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}
                          >
                            <Check size={11} /> Accept All
                          </button>
                          <button
                            type="button"
                            onClick={() => setAiSuggestions(null)}
                            style={{ background: 'transparent', border: '1px solid var(--border)', color: 'var(--text-muted)', borderRadius: 6, padding: '4px 10px', fontSize: 11.5, cursor: 'pointer' }}
                          >
                            Dismiss
                          </button>
                        </div>
                      </div>

                      {/* Corrected preview */}
                      <div style={{ background: 'var(--bg-card)', border: '1px solid rgba(175,82,222,0.2)', borderRadius: 8, padding: '10px 12px', marginBottom: 10, fontSize: 13, lineHeight: 1.7, color: 'var(--text-primary)' }}>
                        <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.5px', marginBottom: 6 }}>CORRECTED PREVIEW</div>
                        {aiSuggestions.correctedText}
                      </div>

                      {/* Per-change list */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 160, overflowY: 'auto' }}>
                        {aiSuggestions.changes.map((c, i) => (
                          <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 12px', fontSize: 12 }}>
                            <div style={{ flexShrink: 0, width: 18, height: 18, borderRadius: '50%', background: c.type === 'misspelling' ? 'rgba(255,69,58,0.15)' : 'rgba(255,159,10,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 800, color: c.type === 'misspelling' ? '#ff453a' : '#ff9f0a', marginTop: 1 }}>
                              {i + 1}
                            </div>
                            <div style={{ flex: 1 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                                <span style={{ color: '#ff453a', textDecoration: 'line-through', fontWeight: 600 }}>{c.original}</span>
                                <span style={{ color: 'var(--text-muted)', fontSize: 10 }}>→</span>
                                <span style={{ color: '#30d158', fontWeight: 700 }}>{c.corrected}</span>
                              </div>
                              <div style={{ color: 'var(--text-muted)', fontSize: 11, lineHeight: 1.4 }}>{c.message}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Attachments preview */}
                  {descAttachments.length > 0 && (
                    <div style={{ padding: '8px 14px', borderTop: '1px solid var(--border)', display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                      {descAttachments.map((a, i) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, padding: '4px 10px', fontSize: 11.5 }}>
                          {a.type === 'image'
                            ? <><Image size={11} color="#4f8ef7" /><span style={{ color: 'var(--text-secondary)', maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.name}</span><img src={a.value} alt={a.name} style={{ width: 32, height: 32, borderRadius: 4, objectFit: 'cover' }} /></>
                            : <><ExternalLink size={11} color="#30d158" /><span style={{ color: 'var(--text-secondary)', maxWidth: 130, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.name}</span></>}
                          <button type="button" onClick={() => setDescAttachments(prev => prev.filter((_, j) => j !== i))} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 0, display: 'flex' }}><X size={11} /></button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Save / Cancel */}
                  <div style={{ display: 'flex', gap: 8, padding: '10px 14px', borderTop: '1px solid var(--border)', background: 'rgba(0,0,0,0.06)' }}>
                    <button
                      type="button"
                      className="btn btn-primary"
                      onClick={handleUpdateDescription}
                      disabled={savingDesc}
                      style={{ fontSize: 12, padding: '7px 18px', display: 'flex', alignItems: 'center', gap: 6 }}
                    >
                      <Save size={13} /> {savingDesc ? 'Saving...' : 'Save'}
                    </button>
                    <button
                      type="button"
                      className="btn btn-ghost"
                      onClick={() => { setIsEditingDesc(false); setDescAttachments([]); }}
                      style={{ fontSize: 12, padding: '7px 12px', display: 'flex', alignItems: 'center', gap: 6 }}
                    >
                      <RotateCcw size={13} /> Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div
                  style={{ fontSize: 13.5, color: task.description ? 'var(--text-primary)' : 'var(--text-muted)', lineHeight: 1.75, cursor: 'text', padding: '14px', borderRadius: 10, background: 'var(--bg-secondary)', border: '1px solid var(--border)', minHeight: 72, transition: 'border-color 0.15s', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}
                  onClick={() => { setDescInput(task.description || ''); setIsEditingDesc(true); }}
                  onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--accent-blue)')}
                  onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}
                  title="Click to edit description"
                >
                  {task.description || (
                    <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <FileText size={14} style={{ opacity: 0.4 }} />
                      Click to add a description, images, or links...
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Subtasks */}
            <div style={{ marginBottom: 28 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Check size={13} /> Subtasks
                  {subtasksTotal > 0 && (
                    <span style={{ fontSize: 11, color: 'var(--text-muted)', background: 'var(--bg-secondary)', padding: '1px 7px', borderRadius: 10, fontWeight: 500 }}>
                      {subtasksDone}/{subtasksTotal}
                    </span>
                  )}
                </div>
                {!isAddingSubtask && (
                  <button className="btn btn-ghost" style={{ fontSize: 11, padding: '4px 10px' }} onClick={() => setIsAddingSubtask(true)}>
                    <Plus size={12} /> Add subtask
                  </button>
                )}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {task.subtasks?.map(sub => (
                  <div
                    key={sub.id}
                    style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 14px', background: 'var(--bg-secondary)', borderRadius: 8, border: '1px solid var(--border)', transition: 'border-color 0.15s' }}
                    onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--border-light)')}
                    onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}
                  >
                    <div
                      onClick={() => handleToggleSubtaskStatus(sub)}
                      style={{ width: 16, height: 16, borderRadius: 4, border: `2px solid ${sub.status === 'done' ? 'var(--accent-green)' : 'var(--border-light)'}`, background: sub.status === 'done' ? 'var(--accent-green)' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0, transition: 'all 0.15s' }}
                    >
                      {sub.status === 'done' && <Check size={10} color="white" strokeWidth={3} />}
                    </div>
                    <span style={{ fontSize: 13, color: sub.status === 'done' ? 'var(--text-muted)' : 'var(--text-primary)', textDecoration: sub.status === 'done' ? 'line-through' : 'none', transition: 'all 0.2s', flex: 1 }}>{sub.title}</span>
                    {sub.assignees?.[0] && (
                      <div style={{ width: 20, height: 20, borderRadius: '50%', background: `hsl(${(sub.assignees[0].id * 67) % 360}, 65%, 50%)`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: 9, fontWeight: 800 }} title={sub.assignees[0].name}>{sub.assignees[0].name[0]}</div>
                    )}
                  </div>
                ))}
                {isAddingSubtask && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                    <input
                      type="text" autoFocus value={subtaskTitle}
                      onChange={e => setSubtaskTitle(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') handleCreateSubtask(); if (e.key === 'Escape') setIsAddingSubtask(false); }}
                      placeholder="Subtask title..."
                      className="input" style={{ flex: 1, fontSize: 13, padding: '7px 12px' }}
                    />
                    <button className="btn btn-primary" onClick={handleCreateSubtask} style={{ fontSize: 12, padding: '7px 14px' }}>Save</button>
                    <button className="btn btn-ghost" onClick={() => setIsAddingSubtask(false)} style={{ padding: '7px 10px' }}><X size={14} /></button>
                  </div>
                )}
              </div>
            </div>

            {/* Custom Fields — Removed as per request */}
          </div>
        </div>

        {/* ── RIGHT PANE ────────────────────────────────────── */}
        <div style={{ width: 340, background: 'var(--bg-card)', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
          {/* Tabs */}
          <div style={{ borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 20px' }}>
            <div style={{ display: 'flex' }}>
              {(['activity', 'comments'] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => setRightTab(tab)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '14px 4px', marginRight: 20, fontSize: 13, fontWeight: 600, color: rightTab === tab ? 'var(--text-primary)' : 'var(--text-muted)', borderBottom: `2px solid ${rightTab === tab ? 'var(--accent-blue)' : 'transparent'}`, transition: 'all 0.15s', textTransform: 'capitalize' }}
                >
                  {tab === 'activity' ? <><Activity size={13} style={{ verticalAlign: 'middle', marginRight: 5 }} />Activity</> : <><MessageSquare size={13} style={{ verticalAlign: 'middle', marginRight: 5 }} />Comments {task.comments?.length ? `(${task.comments.length})` : ''}</>}
                </button>
              ))}
            </div>
            {(task.created_by === user?.id || user?.role !== 'member') && (
              <button
                style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 5, opacity: 0.7, transition: 'opacity 0.15s' }}
                onClick={handleDeleteTask}
                onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
                onMouseLeave={e => (e.currentTarget.style.opacity = '0.7')}
              >
                <Trash2 size={13} /> Delete
              </button>
            )}
          </div>

          {/* Feed */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
            {rightTab === 'activity' ? (
              activityFeed.length > 0 ? activityFeed.map(item => (
                <div key={item.id} style={{ display: 'flex', gap: 10 }}>
                  <div style={{ width: 28, height: 28, borderRadius: '50%', background: item.type === 'comment' ? `hsl(${(item.user.charCodeAt(0) * 67) % 360}, 65%, 45%)` : 'var(--bg-secondary)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800, color: item.type === 'comment' ? 'white' : 'var(--text-muted)', flexShrink: 0 }}>
                    {item.type === 'comment' ? item.user[0] : <Activity size={12} />}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 4 }}>
                      <span style={{ fontSize: 12.5, fontWeight: 600 }}>{item.user}</span>
                      <span style={{ fontSize: 10.5, color: 'var(--text-muted)' }}>{new Date(item.ts).toLocaleString('en', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    {item.type === 'comment' ? (
                      <div style={{ fontSize: 12.5, background: 'var(--bg-secondary)', padding: '8px 12px', borderRadius: 8, lineHeight: 1.6, border: '1px solid var(--border)' }}>{item.text}</div>
                    ) : (
                      <div style={{ fontSize: 12, color: 'var(--text-muted)', fontStyle: 'italic' }}>{item.text}</div>
                    )}
                  </div>
                </div>
              )) : (
                <div style={{ textAlign: 'center', paddingTop: 40, color: 'var(--text-muted)' }}>
                  <Activity size={28} style={{ opacity: 0.3, marginBottom: 8 }} />
                  <div style={{ fontSize: 13 }}>No activity yet</div>
                  <div style={{ fontSize: 11.5, marginTop: 4 }}>Changes and comments will appear here</div>
                </div>
              )
            ) : (
              task.comments?.length ? task.comments.map(c => (
                <div key={c.id} style={{ display: 'flex', gap: 10 }}>
                  <div style={{ width: 28, height: 28, borderRadius: '50%', background: `hsl(${(c.user.id * 67) % 360}, 65%, 45%)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800, color: 'white', flexShrink: 0 }}>{c.user.name[0]}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 4 }}>
                      <span style={{ fontSize: 12.5, fontWeight: 600 }}>{c.user.name}</span>
                      <span style={{ fontSize: 10.5, color: 'var(--text-muted)' }}>{new Date(c.created_at).toLocaleString('en', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    <div style={{ fontSize: 12.5, background: 'var(--bg-secondary)', padding: '8px 12px', borderRadius: 8, lineHeight: 1.6, border: '1px solid var(--border)' }}>{c.content}</div>
                  </div>
                </div>
              )) : (
                <div style={{ textAlign: 'center', paddingTop: 40, color: 'var(--text-muted)' }}>
                  <MessageSquare size={28} style={{ opacity: 0.3, marginBottom: 8 }} />
                  <div style={{ fontSize: 13 }}>No comments yet</div>
                  <div style={{ fontSize: 11.5, marginTop: 4 }}>Be the first to comment</div>
                </div>
              )
            )}
            <div ref={commentsEndRef} />
          </div>

          {/* Comment Input */}
          <div style={{ padding: '14px 20px', borderTop: '1px solid var(--border)', background: 'var(--bg-card)' }}>
            <div style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: 10, padding: '10px 12px', transition: 'border-color 0.15s' }}
              onFocusCapture={e => (e.currentTarget.style.borderColor = 'var(--accent-blue)')}
              onBlurCapture={e => (e.currentTarget.style.borderColor = 'var(--border)')}
            >
              <textarea
                placeholder="Write a comment... (Ctrl+Enter to send)"
                rows={2}
                style={{ width: '100%', background: 'transparent', border: 'none', resize: 'none', color: 'var(--text-primary)', outline: 'none', fontSize: 13, lineHeight: 1.6, fontFamily: 'inherit' }}
                value={comment}
                onChange={e => setComment(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && e.ctrlKey) handleAddComment(); }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
                <span style={{ fontSize: 10.5, color: 'var(--text-muted)' }}>Ctrl+Enter to send</span>
                <button
                  onClick={handleAddComment}
                  disabled={submitting || !comment.trim()}
                  style={{ background: 'var(--accent-blue)', border: 'none', borderRadius: 6, padding: '5px 14px', color: 'white', fontWeight: 600, fontSize: 12, cursor: submitting || !comment.trim() ? 'not-allowed' : 'pointer', opacity: submitting || !comment.trim() ? 0.5 : 1, transition: 'opacity 0.15s' }}
                >
                  {submitting ? 'Sending...' : 'Send'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Animations are now in globals.css */}
      <style>{`
        /* Fix native date picker calendar icon — completely hidden */
        input[type="date"]::-webkit-calendar-picker-indicator {
          display: none;
          -webkit-appearance: none;
        }
      `}</style>
    </div>
  );
}
