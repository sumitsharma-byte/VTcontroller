'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import AppLayout from '@/components/AppLayout';
import { useAuth } from '@/lib/auth';
import {
  chatApi,
  type ApiChat,
  type ApiChatMessage,
  type ChatUser,
} from '@/lib/api';
import {
  Send, Plus, Image, Link2, Users, Search,
  Hash, MessageSquare, Trash2, X, Check,
  ExternalLink, ChevronDown,
} from 'lucide-react';

// ── Helpers ───────────────────────────────────────────
const ROLE_COLOR: Record<string, string> = {
  admin: '#7c5af3', manager: '#4f8ef7', member: '#22c55e',
};

function Avatar({ user, size = 34 }: { user: { id: number; name: string; avatar?: string }; size?: number }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', flexShrink: 0,
      background: `hsl(${(user.id * 67) % 360},65%,50%)`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.35, fontWeight: 700, color: 'white',
    }}>
      {user.avatar || user.name[0]}
    </div>
  );
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return new Date(iso).toLocaleDateString('en', { month: 'short', day: 'numeric' });
}

function urlTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit' });
}

// ── URL Preview Card ──────────────────────────────────
function UrlCard({ msg }: { msg: ApiChatMessage }) {
  return (
    <a
      href={msg.url!}
      target="_blank"
      rel="noopener noreferrer"
      style={{ textDecoration: 'none', display: 'block', marginTop: msg.content && msg.content !== msg.url ? 8 : 0 }}
    >
      <div style={{
        border: '1px solid rgba(79,142,247,0.25)',
        borderRadius: '10px', overflow: 'hidden',
        background: 'rgba(79,142,247,0.05)',
        maxWidth: 340,
        transition: 'border-color 0.15s',
      }}>
        {msg.url_image && (
          <img
            src={msg.url_image}
            alt="preview"
            style={{ width: '100%', maxHeight: 160, objectFit: 'cover' }}
            onError={e => (e.currentTarget.style.display = 'none')}
          />
        )}
        <div style={{ padding: '10px 12px' }}>
          <div style={{ fontSize: '11px', color: '#4f8ef7', marginBottom: '3px', display: 'flex', alignItems: 'center', gap: 4 }}>
            <ExternalLink size={10} /> {new URL(msg.url!).hostname}
          </div>
          {msg.url_title && (
            <div style={{ fontWeight: 700, fontSize: '13px', color: 'var(--text-primary)', marginBottom: '3px' }}>
              {msg.url_title}
            </div>
          )}
          {msg.url_description && (
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', lineHeight: 1.5 }}>
              {msg.url_description}
            </div>
          )}
        </div>
      </div>
    </a>
  );
}

// ── New Chat / Group Modal ────────────────────────────
function NewChatModal({
  users, onClose, onCreate,
}: {
  users: ChatUser[];
  onClose: () => void;
  onCreate: (chat: ApiChat) => void;
}) {
  const [tab, setTab] = useState<'direct' | 'group'>('direct');
  const [search, setSearch] = useState('');
  const [groupName, setGroupName] = useState('');
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [loading, setLoading] = useState(false);

  const filtered = users.filter(u =>
    u.name.toLowerCase().includes(search.toLowerCase()) ||
    u.department?.toLowerCase().includes(search.toLowerCase())
  );

  const toggle = (id: number) =>
    setSelectedIds(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id]);

  const handleCreate = async () => {
    setLoading(true);
    try {
      if (tab === 'direct' && selectedIds.length === 1) {
        const res = await chatApi.createDirect(selectedIds[0]);
        onCreate(res.chat);
      } else if (tab === 'group' && groupName && selectedIds.length >= 1) {
        const res = await chatApi.createGroup(groupName, selectedIds);
        onCreate(res.chat);
      }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const canCreate = tab === 'direct'
    ? selectedIds.length === 1
    : (groupName.trim().length > 0 && selectedIds.length >= 1);

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{
        background: 'var(--bg-secondary)', border: '1px solid var(--border)',
        borderRadius: '16px', width: 480, maxHeight: '80vh',
        display: 'flex', flexDirection: 'column',
        boxShadow: '0 32px 80px rgba(0,0,0,0.5)',
        animation: 'fadeInUp 0.18s ease',
      }}>
        {/* Header */}
        <div style={{
          padding: '18px 22px', borderBottom: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <span style={{ fontFamily: 'Space Grotesk, sans-serif', fontWeight: 700, fontSize: '15px' }}>
            New Conversation
          </span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex' }}>
            <X size={16} />
          </button>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', padding: '12px 22px', gap: 8 }}>
          {(['direct', 'group'] as const).map(t => (
            <button
              key={t}
              onClick={() => { setTab(t); setSelectedIds([]); }}
              style={{
                padding: '5px 14px', borderRadius: '20px', fontSize: '12px', fontWeight: 600,
                cursor: 'pointer',
                border: `1px solid ${tab === t ? '#4f8ef7' : 'var(--border)'}`,
                background: tab === t ? 'rgba(79,142,247,0.12)' : 'transparent',
                color: tab === t ? '#4f8ef7' : 'var(--text-muted)',
              }}
            >
              {t === 'direct' ? '💬 Direct Message' : '👥 Group Chat'}
            </button>
          ))}
        </div>

        {/* Group name */}
        {tab === 'group' && (
          <div style={{ padding: '0 22px 12px' }}>
            <input
              className="input"
              placeholder="Group name…"
              value={groupName}
              onChange={e => setGroupName(e.target.value)}
              style={{ fontSize: 13 }}
            />
          </div>
        )}

        {/* Search */}
        <div style={{ padding: '0 22px 10px', position: 'relative' }}>
          <Search size={13} style={{ position: 'absolute', left: 34, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            className="input"
            placeholder="Search members…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ paddingLeft: 32, fontSize: 12 }}
          />
        </div>

        {/* Member list */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '0 22px' }}>
          {filtered.map((u, i) => {
            const sel = selectedIds.includes(u.id);
            return (
              <div
                key={u.id}
                onClick={() => tab === 'direct' ? setSelectedIds([u.id]) : toggle(u.id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '9px 0',
                  borderBottom: i < filtered.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
                  cursor: 'pointer',
                  background: sel ? 'rgba(79,142,247,0.04)' : 'transparent',
                }}
              >
                <Avatar user={u} size={32} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--text-primary)' }}>{u.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'capitalize' }}>
                    {u.role} · {u.department}
                  </div>
                </div>
                <div style={{
                  width: 18, height: 18, borderRadius: '50%', border: `2px solid ${sel ? '#4f8ef7' : 'var(--border)'}`,
                  background: sel ? '#4f8ef7' : 'transparent',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}>
                  {sel && <Check size={10} color="white" strokeWidth={3} />}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div style={{ padding: '14px 22px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end' }}>
          <button
            className="btn btn-primary"
            disabled={!canCreate || loading}
            onClick={handleCreate}
            style={{ opacity: (!canCreate || loading) ? 0.5 : 1 }}
          >
            {loading ? 'Creating…' : tab === 'direct' ? 'Open Chat' : 'Create Group'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Message bubble ────────────────────────────────────
function MessageBubble({
  msg, isMine, onDelete,
}: {
  msg: ApiChatMessage;
  isMine: boolean;
  onDelete: (id: number) => void;
}) {
  const [hover, setHover] = useState(false);

  return (
    <div
      style={{
        display: 'flex', gap: 8, marginBottom: 12,
        flexDirection: isMine ? 'row-reverse' : 'row',
        alignItems: 'flex-end',
      }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      {!isMine && <Avatar user={msg.user} size={28} />}

      <div style={{ maxWidth: '68%', display: 'flex', flexDirection: 'column', alignItems: isMine ? 'flex-end' : 'flex-start' }}>
        {/* Sender name (only for others) */}
        {!isMine && (
          <div style={{ fontSize: 11, color: ROLE_COLOR[msg.user.role] || 'var(--text-muted)', fontWeight: 600, marginBottom: 3 }}>
            {msg.user.name}
          </div>
        )}

        <div style={{
          padding: msg.type === 'image' ? '4px' : '10px 14px',
          borderRadius: isMine ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
          background: isMine ? '#4f8ef7' : 'var(--bg-card)',
          border: isMine ? 'none' : '1px solid var(--border)',
          color: isMine ? 'white' : 'var(--text-primary)',
          fontSize: 13.5, lineHeight: 1.5, wordBreak: 'break-word',
          maxWidth: '100%',
        }}>
          {/* Image message */}
          {msg.type === 'image' && msg.image_url && (
            <div>
              <img
                src={msg.image_url}
                alt="shared"
                style={{
                  borderRadius: 10, maxWidth: 280, maxHeight: 240,
                  objectFit: 'cover', display: 'block', cursor: 'pointer',
                }}
                onClick={() => window.open(msg.image_url!, '_blank')}
              />
              {msg.content && (
                <div style={{ padding: '8px 6px 4px', fontSize: 13, color: isMine ? 'rgba(255,255,255,0.9)' : 'var(--text-primary)' }}>
                  {msg.content}
                </div>
              )}
            </div>
          )}

          {/* URL message */}
          {msg.type === 'url' && (
            <div>
              {msg.content && msg.content !== msg.url && (
                <div style={{ marginBottom: 6 }}>{msg.content}</div>
              )}
              <UrlCard msg={msg} />
            </div>
          )}

          {/* Text message */}
          {msg.type === 'text' && <span>{msg.content}</span>}
        </div>

        {/* Timestamp + delete */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 3 }}>
          <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{urlTime(msg.created_at)}</span>
          {hover && isMine && (
            <button
              onClick={() => onDelete(msg.id)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', display: 'flex', padding: '0 2px' }}
            >
              <Trash2 size={10} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main Chat Page ────────────────────────────────────
export default function ChatPage() {
  const { user } = useAuth();

  const [chats, setChats] = useState<ApiChat[]>([]);
  const [wsUsers, setWsUsers] = useState<ChatUser[]>([]);
  const [activeChat, setActiveChat] = useState<ApiChat | null>(null);
  const [messages, setMessages] = useState<ApiChatMessage[]>([]);
  const [text, setText] = useState('');
  const [urlInput, setUrlInput] = useState('');
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [loadingChats, setLoadingChats] = useState(true);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [sending, setSending] = useState(false);
  const [showNewChat, setShowNewChat] = useState(false);
  const [chatSearch, setChatSearch] = useState('');
  const [imgCaption, setImgCaption] = useState('');
  const [pendingImg, setPendingImg] = useState<File | null>(null);
  const [pendingPreview, setPendingPreview] = useState<string | null>(null);
  const [auditUserId, setAuditUserId] = useState<number | undefined>();

  const bottomRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined' && user) {
       const params = new URLSearchParams(window.location.search);
       const audit = params.get('audit');
       if (audit && (user.role === 'admin' || user.role === 'manager')) {
          setAuditUserId(parseInt(audit));
       }
    }
  }, [user]);

  // ── Load chats & workspace users ─────────────────────
  useEffect(() => {
    if (!user) return;
    // Do not fetch until auditUserId is initialized if audit param is present
    if (typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('audit') && auditUserId === undefined) return;

    Promise.all([chatApi.list(auditUserId), chatApi.users()]).then(([chatRes, userRes]) => {
      setChats(chatRes.chats);
      setWsUsers(userRes.users);
    }).finally(() => setLoadingChats(false));
  }, [user, auditUserId]);

  // ── Load messages on chat switch ──────────────────────
  const loadMessages = useCallback(async (chat: ApiChat, silent = false) => {
    if (!silent) setLoadingMsgs(true);
    try {
      const res = await chatApi.messages(chat.id, auditUserId);
      setMessages(res.messages);
      if (!auditUserId) {
        // update unread to 0 for this chat (skip for audit so we don't mess up read receipts)
        setChats(prev => prev.map(c => c.id === chat.id ? { ...c, unread_count: 0 } : c));
      }
    } catch { }
    finally { if (!silent) setLoadingMsgs(false); }
  }, [auditUserId]);

  useEffect(() => {
    if (!activeChat) return;
    loadMessages(activeChat);

    // Poll every 4 seconds
    pollingRef.current = setInterval(() => loadMessages(activeChat, true), 4000);
    return () => { if (pollingRef.current) clearInterval(pollingRef.current); };
  }, [activeChat, loadMessages]);

  // ── Auto-scroll bottom ────────────────────────────────
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // ── Send text ─────────────────────────────────────────
  const handleSend = async () => {
    if (!activeChat || (!text.trim() && !pendingImg && !urlInput.trim())) return;
    setSending(true);
    try {
      let res: { message: ApiChatMessage } | null = null;

      if (pendingImg) {
        res = await chatApi.sendImage(activeChat.id, pendingImg, text.trim() || undefined);
        setPendingImg(null); setPendingPreview(null);
      } else if (showUrlInput && urlInput.trim()) {
        res = await chatApi.sendUrl(activeChat.id, urlInput.trim(), text.trim() || undefined);
        setUrlInput(''); setShowUrlInput(false);
      } else if (text.trim()) {
        res = await chatApi.sendText(activeChat.id, text.trim());
      }

      if (res) {
        setMessages(p => [...p, res!.message]);
        setChats(prev => prev.map(c => c.id === activeChat.id
          ? { ...c, latest_message: { content: res!.message.content, type: res!.message.type, created_at: res!.message.created_at, user_name: user?.name ?? '' } }
          : c));
      }
      setText('');
    } catch (e) { console.error(e); }
    finally { setSending(false); }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  // ── Delete message ────────────────────────────────────
  const handleDelete = async (msgId: number) => {
    if (!activeChat) return;
    await chatApi.deleteMessage(activeChat.id, msgId).catch(() => {});
    setMessages(p => p.filter(m => m.id !== msgId));
  };

  // ── File pick ─────────────────────────────────────────
  const handleFilePick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setPendingImg(f);
    setPendingPreview(URL.createObjectURL(f));
    e.target.value = '';
  };

  // ── New chat created ──────────────────────────────────
  const handleNewChat = (chat: ApiChat) => {
    setChats(prev => {
      const exists = prev.find(c => c.id === chat.id);
      return exists ? prev : [chat, ...prev];
    });
    setActiveChat(chat);
    setShowNewChat(false);
  };

  const filteredChats = chats.filter(c =>
    c.name.toLowerCase().includes(chatSearch.toLowerCase())
  );

  const totalUnread = chats.reduce((s, c) => s + c.unread_count, 0);

  return (
    <AppLayout>
      <div style={{ display: 'flex', height: 'calc(100vh - 64px - 56px)', gap: 0, borderRadius: 14, overflow: 'hidden', border: '1px solid var(--border)' }}>

        {/* ── Left sidebar: chat list ── */}
        <div style={{
          width: 280, flexShrink: 0,
          background: 'var(--bg-secondary)',
          borderRight: '1px solid var(--border)',
          display: 'flex', flexDirection: 'column',
        }}>
          {/* Header */}
          <div style={{ padding: '16px 16px 10px', borderBottom: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, flexWrap: 'wrap', gap: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                {auditUserId && (
                  <div style={{ flexBasis: '100%', marginBottom: 10 }}>
                    <span style={{ background: '#ef4444', color: 'white', borderRadius: 4, padding: '3px 8px', fontSize: 10, fontWeight: 800 }}>AUDIT MODE</span>
                  </div>
                )}
                <span style={{ fontFamily: 'Space Grotesk, sans-serif', fontWeight: 800, fontSize: 15 }}>Messages</span>
                {totalUnread > 0 && (
                  <span style={{ background: '#ef4444', color: 'white', borderRadius: 20, padding: '0px 7px', fontSize: 10, fontWeight: 700 }}>
                    {totalUnread}
                  </span>
                )}
              </div>
              <button
                onClick={() => setShowNewChat(true)}
                className="btn btn-primary"
                style={{ padding: '5px 10px', fontSize: 11, gap: 4 }}
              >
                <Plus size={13} /> New
              </button>
            </div>
            {/* Search */}
            <div style={{ position: 'relative' }}>
              <Search size={12} style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                className="input"
                placeholder="Search conversations…"
                value={chatSearch}
                onChange={e => setChatSearch(e.target.value)}
                style={{ paddingLeft: 28, fontSize: 12, padding: '6px 10px 6px 28px' }}
              />
            </div>
          </div>

          {/* Chat list */}
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {loadingChats ? (
              Array(5).fill(0).map((_, i) => (
                <div key={i} style={{ padding: '12px 16px', display: 'flex', gap: 10, alignItems: 'center' }}>
                  <div style={{ width: 38, height: 38, borderRadius: '50%', background: 'rgba(255,255,255,0.05)' }} />
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 5 }}>
                    <div style={{ height: 12, borderRadius: 4, background: 'rgba(255,255,255,0.05)', width: '60%' }} />
                    <div style={{ height: 10, borderRadius: 4, background: 'rgba(255,255,255,0.04)', width: '80%' }} />
                  </div>
                </div>
              ))
            ) : filteredChats.length === 0 ? (
              <div style={{ padding: 32, textAlign: 'center', color: 'var(--text-muted)', fontSize: 12 }}>
                <MessageSquare size={28} style={{ marginBottom: 8, opacity: 0.3, display: 'block', margin: '0 auto 8px' }} />
                No conversations yet.<br />Click <strong>+ New</strong> to start one.
              </div>
            ) : filteredChats.map(chat => {
              const isActive = activeChat?.id === chat.id;
              return (
                <div
                  key={chat.id}
                  onClick={() => setActiveChat(chat)}
                  style={{
                    display: 'flex', gap: 10, alignItems: 'center',
                    padding: '10px 14px', cursor: 'pointer',
                    background: isActive ? 'rgba(79,142,247,0.1)' : 'transparent',
                    borderLeft: isActive ? '2px solid #4f8ef7' : '2px solid transparent',
                    transition: 'all 0.15s',
                  }}
                  onMouseEnter={e => { if (!isActive) (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.02)'; }}
                  onMouseLeave={e => { if (!isActive) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                >
                  {chat.type === 'group' ? (
                    <div style={{
                      width: 38, height: 38, borderRadius: '50%', flexShrink: 0,
                      background: 'linear-gradient(135deg,#7c5af3,#4f8ef7)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 16,
                    }}>
                      {chat.avatar || '💬'}
                    </div>
                  ) : (
                    <div style={{
                      width: 38, height: 38, borderRadius: '50%', flexShrink: 0,
                      background: `hsl(${((chat.other_user_id ?? 1) * 67) % 360},65%,50%)`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 13, fontWeight: 700, color: 'white',
                    }}>
                      {chat.avatar || chat.name[0]}
                    </div>
                  )}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontWeight: 600, fontSize: 13, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {chat.name}
                      </span>
                      {chat.latest_message && (
                        <span style={{ fontSize: 10, color: 'var(--text-muted)', flexShrink: 0 }}>
                          {timeAgo(chat.latest_message.created_at)}
                        </span>
                      )}
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 2 }}>
                      <span style={{ fontSize: 11, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {chat.latest_message
                          ? (chat.latest_message.type === 'image' ? '📷 Image' : chat.latest_message.type === 'url' ? '🔗 Link' : chat.latest_message.content)
                          : 'No messages yet'}
                      </span>
                      {chat.unread_count > 0 && (
                        <span style={{
                          background: '#4f8ef7', color: 'white', borderRadius: 20,
                          padding: '1px 7px', fontSize: 10, fontWeight: 700, flexShrink: 0, marginLeft: 4,
                        }}>
                          {chat.unread_count}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Right: message area ── */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: 'var(--bg-primary)' }}>
          {!activeChat ? (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', gap: 12 }}>
              <MessageSquare size={48} style={{ opacity: 0.15 }} />
              <div style={{ fontWeight: 700, fontSize: 16 }}>Select a conversation</div>
              <div style={{ fontSize: 13 }}>or start a new one with your team</div>
              <button className="btn btn-primary" onClick={() => setShowNewChat(true)} style={{ marginTop: 8 }}>
                <Plus size={14} /> New Conversation
              </button>
            </div>
          ) : (
            <>
              {/* Chat header */}
              <div style={{
                padding: '12px 20px', borderBottom: '1px solid var(--border)',
                display: 'flex', alignItems: 'center', gap: 12,
                background: 'var(--bg-secondary)',
              }}>
                {activeChat.type === 'group' ? (
                  <div style={{
                    width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
                    background: 'linear-gradient(135deg,#7c5af3,#4f8ef7)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15,
                  }}>
                    {activeChat.avatar || '💬'}
                  </div>
                ) : (
                  <div style={{
                    width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
                    background: `hsl(${((activeChat.other_user_id ?? 1) * 67) % 360},65%,50%)`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 12, fontWeight: 700, color: 'white',
                  }}>
                    {activeChat.avatar || activeChat.name[0]}
                  </div>
                )}
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text-primary)' }}>{activeChat.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                    {activeChat.type === 'group'
                      ? `${activeChat.members.length} members`
                      : activeChat.other_user_role
                        ? activeChat.other_user_role.charAt(0).toUpperCase() + activeChat.other_user_role.slice(1)
                        : ''}
                  </div>
                </div>
                {activeChat.type === 'group' && (
                  <div style={{ display: 'flex', marginLeft: 'auto' }}>
                    {activeChat.members.slice(0, 5).map((m, i) => (
                      <div key={m.id} style={{
                        width: 24, height: 24, borderRadius: '50%',
                        background: `hsl(${(m.id * 67) % 360},65%,50%)`,
                        border: '2px solid var(--bg-secondary)',
                        marginLeft: i > 0 ? -6 : 0,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 8, fontWeight: 700, color: 'white',
                      }} title={m.name}>
                        {m.avatar || m.name[0]}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Message list */}
              <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
                {loadingMsgs ? (
                  <div style={{ textAlign: 'center', color: 'var(--text-muted)', paddingTop: 40, fontSize: 13 }}>Loading messages…</div>
                ) : messages.length === 0 ? (
                  <div style={{ textAlign: 'center', color: 'var(--text-muted)', paddingTop: 40 }}>
                    <div style={{ fontSize: 32, marginBottom: 10 }}>👋</div>
                    <div style={{ fontWeight: 600 }}>Say hello!</div>
                    <div style={{ fontSize: 12, marginTop: 4 }}>This is the start of your conversation</div>
                  </div>
                ) : messages.map(msg => (
                  <MessageBubble
                    key={msg.id}
                    msg={msg}
                    isMine={msg.user.id === user?.id}
                    onDelete={handleDelete}
                  />
                ))}
                <div ref={bottomRef} />
              </div>

              {/* Image preview */}
              {pendingPreview && (
                <div style={{
                  padding: '10px 20px', borderTop: '1px solid var(--border)',
                  background: 'var(--bg-secondary)', display: 'flex', gap: 12, alignItems: 'center',
                }}>
                  <div style={{ position: 'relative' }}>
                    <img src={pendingPreview} alt="preview" style={{ height: 70, borderRadius: 8, objectFit: 'cover', border: '1px solid rgba(255,255,255,0.1)' }} />
                    <button
                      onClick={() => { setPendingImg(null); setPendingPreview(null); }}
                      style={{
                        position: 'absolute', top: -6, right: -6, background: '#ef4444', border: 'none',
                        borderRadius: '50%', width: 18, height: 18, display: 'flex', alignItems: 'center',
                        justifyContent: 'center', cursor: 'pointer', color: 'white',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                      }}
                    >
                      <X size={10} />
                    </button>
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                    Image attached. Type any caption below and press Enter to send.
                  </div>
                </div>
              )}

              {/* URL input */}
              {showUrlInput && (
                <div style={{
                  padding: '10px 20px', borderTop: '1px solid var(--border)',
                  background: 'var(--bg-secondary)', display: 'flex', gap: 8, alignItems: 'center',
                }}>
                  <Link2 size={14} color="#4f8ef7" />
                  <input
                    className="input"
                    placeholder="Paste a URL to share…"
                    value={urlInput}
                    onChange={e => setUrlInput(e.target.value)}
                    style={{ fontSize: 13, flex: 1 }}
                    autoFocus
                  />
                  <button
                    onClick={() => { setShowUrlInput(false); setUrlInput(''); }}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex' }}
                  >
                    <X size={14} />
                  </button>
                </div>
              )}

              {/* Input bar */}
              <div style={{
                padding: '12px 20px', borderTop: '1px solid var(--border)',
                background: 'var(--bg-secondary)',
                display: 'flex', gap: 8, alignItems: 'flex-end',
              }}>
                {/* Attach image */}
                <button
                  onClick={() => fileRef.current?.click()}
                  title="Share screenshot / image"
                  style={{
                    background: 'var(--bg-card)', border: '1px solid var(--border)',
                    borderRadius: 8, padding: '8px', cursor: 'pointer',
                    color: 'var(--text-muted)', display: 'flex',
                    transition: 'color 0.15s',
                    flexShrink: 0,
                  }}
                  onMouseEnter={e => (e.currentTarget.style.color = '#4f8ef7')}
                  onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-muted)')}
                >
                  <Image size={16} />
                </button>
                <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFilePick} />

                {/* Share URL */}
                <button
                  onClick={() => setShowUrlInput(v => !v)}
                  title="Share a URL"
                  style={{
                    background: showUrlInput ? 'rgba(79,142,247,0.12)' : 'var(--bg-card)',
                    border: `1px solid ${showUrlInput ? '#4f8ef7' : 'var(--border)'}`,
                    borderRadius: 8, padding: '8px', cursor: 'pointer',
                    color: showUrlInput ? '#4f8ef7' : 'var(--text-muted)',
                    display: 'flex', transition: 'all 0.15s', flexShrink: 0,
                  }}
                >
                  <Link2 size={16} />
                </button>

                {/* Text input */}
                <textarea
                  value={text}
                  onChange={e => setText(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={pendingImg ? 'Add a caption… (Enter to send)' : showUrlInput ? 'Optional message… (Enter to send)' : 'Type a message… (Enter to send)'}
                  rows={1}
                  style={{
                    flex: 1, resize: 'none', padding: '9px 12px',
                    background: 'var(--bg-card)', border: '1px solid var(--border)',
                    borderRadius: 10, color: 'var(--text-primary)', fontSize: 13,
                    lineHeight: 1.5, maxHeight: 100, overflowY: 'auto',
                    outline: 'none', fontFamily: 'inherit',
                    transition: 'border-color 0.15s',
                  }}
                  onFocus={e => (e.currentTarget.style.borderColor = '#4f8ef7')}
                  onBlur={e => (e.currentTarget.style.borderColor = 'var(--border)')}
                />

                {/* Send */}
                <button
                  onClick={handleSend}
                  disabled={sending || (!text.trim() && !pendingImg && !urlInput.trim())}
                  style={{
                    background: '#4f8ef7', border: 'none', borderRadius: 10,
                    padding: '9px 14px', cursor: 'pointer', color: 'white',
                    display: 'flex', alignItems: 'center', gap: 5,
                    opacity: (sending || (!text.trim() && !pendingImg && !urlInput.trim())) ? 0.5 : 1,
                    transition: 'opacity 0.15s',
                    flexShrink: 0, fontSize: 13, fontWeight: 600,
                  }}
                >
                  <Send size={14} /> {sending ? '…' : 'Send'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {showNewChat && (
        <NewChatModal users={wsUsers} onClose={() => setShowNewChat(false)} onCreate={handleNewChat} />
      )}

      <style>{`
        @keyframes fadeInUp { from { opacity:0; transform:translateY(10px); } to { opacity:1; transform:translateY(0); } }
      `}</style>
    </AppLayout>
  );
}
