'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useAuth } from '@/lib/auth';
import {
  chatApi,
  type ApiChat,
  type ApiChatMessage,
  type ChatUser,
} from '@/lib/api';
import {
  MessageSquare, Send, X, Plus, Image as ImageIcon, Link2,
  ArrowLeft, Search, Check, ExternalLink, Trash2, Download
} from 'lucide-react';

// ── Helpers ───────────────────────────────────────────
const ROLE_COLOR: Record<string, string> = {
  admin: '#7c5af3', manager: '#4f8ef7', member: '#22c55e',
};

function miniAvatar(id: number, name: string, avatar?: string, size = 30) {
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', flexShrink: 0,
      background: `hsl(${(id * 67) % 360},65%,50%)`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.36, fontWeight: 700, color: 'white',
    }}>
      {avatar || name[0]}
    </div>
  );
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'now';
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return new Date(iso).toLocaleDateString('en', { month: 'short', day: 'numeric' });
}

function msgTime(iso: string) {
  return new Date(iso).toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit' });
}

let sharedAudioCtx: AudioContext | null = null;

function playChatSound() {
  try {
    if (!sharedAudioCtx) {
      const Ctx = window.AudioContext || (window as any).webkitAudioContext;
      if (!Ctx) return;
      sharedAudioCtx = new Ctx();
    }
    if (sharedAudioCtx.state === 'suspended') {
      sharedAudioCtx.resume();
    }
    
    const now = sharedAudioCtx.currentTime;
    
    // First tone (A5)
    const osc1 = sharedAudioCtx.createOscillator();
    const gain1 = sharedAudioCtx.createGain();
    osc1.connect(gain1);
    gain1.connect(sharedAudioCtx.destination);
    
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(880, now);
    gain1.gain.setValueAtTime(0, now);
    gain1.gain.linearRampToValueAtTime(0.3, now + 0.05);
    gain1.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
    osc1.start(now);
    osc1.stop(now + 0.2);

    // Second tone (C#6)
    const osc2 = sharedAudioCtx.createOscillator();
    const gain2 = sharedAudioCtx.createGain();
    osc2.connect(gain2);
    gain2.connect(sharedAudioCtx.destination);
    
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(1108.73, now + 0.1);
    gain2.gain.setValueAtTime(0, now + 0.1);
    gain2.gain.linearRampToValueAtTime(0.3, now + 0.15);
    gain2.gain.exponentialRampToValueAtTime(0.01, now + 0.4);
    osc2.start(now + 0.1);
    osc2.stop(now + 0.4);
  } catch (e) {
    console.error("Audio block:", e);
  }
}

// ── URL Card ─────────────────────────────────────────
function UrlCard({ msg, isMine }: { msg: ApiChatMessage, isMine?: boolean }) {
  return (
    <a href={msg.url!} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none', display: 'block', marginTop: 4 }}>
      <div style={{
        border: isMine ? '1px solid rgba(255,255,255,0.2)' : '1px solid rgba(79,142,247,0.25)', borderRadius: 8,
        background: isMine ? 'rgba(0,0,0,0.1)' : 'rgba(79,142,247,0.05)', overflow: 'hidden', maxWidth: 240,
      }}>
        {msg.url_image && (
          <img src={msg.url_image} alt="" style={{ width: '100%', maxHeight: 100, objectFit: 'cover' }}
            onError={e => (e.currentTarget.style.display = 'none')} />
        )}
        <div style={{ padding: '8px 10px' }}>
          <div style={{ fontSize: 10, color: isMine ? 'rgba(255,255,255,0.9)' : '#4f8ef7', display: 'flex', alignItems: 'center', gap: 3, marginBottom: 2 }}>
            <ExternalLink size={9} />
            {(() => { try { return new URL(msg.url!).hostname; } catch { return msg.url; } })()}
          </div>
          {msg.url_title && <div style={{ fontWeight: 700, fontSize: 11, color: isMine ? 'white' : 'var(--text-primary)' }}>{msg.url_title}</div>}
          {msg.url_description && <div style={{ fontSize: 10, color: isMine ? 'rgba(255,255,255,0.8)' : 'var(--text-muted)', marginTop: 2, lineHeight: 1.4 }}>{msg.url_description.slice(0, 80)}…</div>}
        </div>
      </div>
    </a>
  );
}

// ── New Chat selector (inline) ────────────────────────
function NewChatPanel({
  users, onBack, onCreate,
}: {
  users: ChatUser[];
  onBack: () => void;
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
  const toggle = (id: number) => setSelectedIds(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id]);

  const handleCreate = async () => {
    setLoading(true);
    try {
      if (tab === 'direct' && selectedIds.length === 1) onCreate((await chatApi.createDirect(selectedIds[0])).chat);
      else if (tab === 'group' && groupName && selectedIds.length >= 1) onCreate((await chatApi.createGroup(groupName, selectedIds)).chat);
    } catch { } finally { setLoading(false); }
  };

  const canCreate = tab === 'direct' ? selectedIds.length === 1 : (groupName.trim().length > 0 && selectedIds.length >= 1);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 8 }}>
        <button onClick={onBack} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex' }}>
          <ArrowLeft size={16} />
        </button>
        <span style={{ fontWeight: 700, fontSize: 13 }}>New Conversation</span>
      </div>

      <div style={{ padding: '8px 12px', display: 'flex', gap: 6 }}>
        {(['direct', 'group'] as const).map(t => (
          <button key={t} onClick={() => { setTab(t); setSelectedIds([]); }} style={{
            padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600, cursor: 'pointer',
            border: `1px solid ${tab === t ? '#4f8ef7' : 'var(--border)'}`,
            background: tab === t ? 'rgba(79,142,247,0.12)' : 'transparent',
            color: tab === t ? '#4f8ef7' : 'var(--text-muted)',
          }}>{t === 'direct' ? 'Direct' : 'Group'}</button>
        ))}
      </div>

      {tab === 'group' && (
        <div style={{ padding: '0 12px 6px' }}>
          <input className="input" placeholder="Group name…" value={groupName} onChange={e => setGroupName(e.target.value)} style={{ fontSize: 11, padding: '5px 9px' }} />
        </div>
      )}

      <div style={{ padding: '0 12px 6px', position: 'relative' }}>
        <Search size={11} style={{ position: 'absolute', left: 21, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
        <input className="input" placeholder="Search…" value={search} onChange={e => setSearch(e.target.value)} style={{ fontSize: 11, padding: '5px 9px 5px 26px' }} />
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '0 12px' }}>
        {filtered.map((u, i) => {
          const sel = selectedIds.includes(u.id);
          return (
            <div key={u.id} onClick={() => tab === 'direct' ? setSelectedIds([u.id]) : toggle(u.id)}
              style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 0', cursor: 'pointer', borderBottom: i < filtered.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}>
              {miniAvatar(u.id, u.name, u.avatar, 26)}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.name}</div>
                <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'capitalize' }}>{u.role}</div>
              </div>
              <div style={{
                width: 16, height: 16, borderRadius: '50%', border: `2px solid ${sel ? '#4f8ef7' : 'var(--border)'}`,
                background: sel ? '#4f8ef7' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              }}>
                {sel && <Check size={8} color="white" strokeWidth={3} />}
              </div>
            </div>
          );
        })}
      </div>

      <div style={{ padding: '10px 12px', borderTop: '1px solid var(--border)' }}>
        <button className="btn btn-primary" disabled={!canCreate || loading} onClick={handleCreate}
          style={{ width: '100%', justifyContent: 'center', fontSize: 12, opacity: (!canCreate || loading) ? 0.5 : 1 }}>
          {loading ? 'Creating…' : tab === 'direct' ? 'Open Chat' : 'Create Group'}
        </button>
      </div>
    </div>
  );
}

// ── Message view ──────────────────────────────────────
function MessageView({
  chat, userId, onBack,
}: {
  chat: ApiChat;
  userId: number;
  onBack: () => void;
}) {
  const [messages, setMessages] = useState<ApiChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState('');
  const [urlInput, setUrlInput] = useState('');
  const [showUrl, setShowUrl] = useState(false);
  const [pendingImg, setPendingImg] = useState<File | null>(null);
  const [pendingPreview, setPendingPreview] = useState<string | null>(null);
  const [imgCaption, setImgCaption] = useState('');
  const [sending, setSending] = useState(false);
  const [fullImage, setFullImage] = useState<string | null>(null);
  
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const prevMsgCountRef = useRef(0);

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await chatApi.messages(chat.id);
      if (silent && res.messages.length > prevMsgCountRef.current) {
        const lastMsg = res.messages[res.messages.length - 1];
        if (lastMsg && lastMsg.user.id !== userId) playChatSound();
      }
      prevMsgCountRef.current = res.messages.length;
      setMessages(res.messages);
    } catch { } finally { if (!silent) setLoading(false); }
  }, [chat.id, userId]); // removed messages.length — it caused infinite interval recreation

  // Visibility-aware polling: pause when tab is backgrounded to save resources
  useEffect(() => {
    load();
    pollingRef.current = setInterval(() => {
      if (document.visibilityState === 'visible') load(true);
    }, 4000);
    return () => { if (pollingRef.current) clearInterval(pollingRef.current); };
  }, [load]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const handleSend = async () => {
    if (!text.trim() && !pendingImg && !urlInput.trim()) return;
    setSending(true);
    try {
      let res;
      if (pendingImg) {
        res = await chatApi.sendImage(chat.id, pendingImg, imgCaption || undefined);
        setPendingImg(null); setPendingPreview(null); setImgCaption('');
      } else if (showUrl && urlInput.trim()) {
        res = await chatApi.sendUrl(chat.id, urlInput.trim(), text.trim() || undefined);
        setUrlInput(''); setShowUrl(false);
      } else if (text.trim()) {
        res = await chatApi.sendText(chat.id, text.trim());
      }
      if (res) setMessages(p => [...p, res!.message]);
      setText('');
    } catch (e) { console.error(e); } finally { setSending(false); }
  };

  const handleDelete = async (msgId: number) => {
    await chatApi.deleteMessage(chat.id, msgId).catch(() => {});
    setMessages(p => p.filter(m => m.id !== msgId));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const handleFilePick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; if (!f) return;
    if (f.size > 2 * 1024 * 1024) {
      alert("Image is too large. Please select an image under 2MB.");
      e.target.value = '';
      return;
    }
    setPendingImg(f); setPendingPreview(URL.createObjectURL(f)); e.target.value = '';
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Header */}
      <div style={{ padding: '10px 14px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
        <button onClick={onBack} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex' }}>
          <ArrowLeft size={16} />
        </button>
        <div style={{
          width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
          background: chat.type === 'group' ? 'linear-gradient(135deg,#7c5af3,#4f8ef7)' : `hsl(${((chat.other_user_id ?? 1) * 67) % 360},65%,50%)`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: chat.type === 'group' ? 13 : 10, fontWeight: 700, color: 'white',
        }}>
          {chat.type === 'group' ? (chat.avatar || '💬') : (chat.avatar || chat.name[0])}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{chat.name}</div>
          <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>
            {chat.type === 'group' ? `${chat.members.length} members` : (chat.other_user_role || '')}
          </div>
        </div>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '12px 14px' }}>
        {loading ? (
          <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: 11, paddingTop: 20 }}>Loading…</div>
        ) : messages.length === 0 ? (
          <div style={{ textAlign: 'center', color: 'var(--text-muted)', paddingTop: 24 }}>
            <div style={{ fontSize: 24, marginBottom: 6 }}>👋</div>
            <div style={{ fontSize: 12, fontWeight: 600 }}>Say hello!</div>
          </div>
        ) : messages.map(msg => {
          const isMine = msg.user.id === userId;
          return (
            <div key={msg.id} style={{ display: 'flex', gap: 6, marginBottom: 10, flexDirection: isMine ? 'row-reverse' : 'row', alignItems: 'flex-end' }}>
              {!isMine && miniAvatar(msg.user.id, msg.user.name, msg.user.avatar, 22)}
              <div style={{ maxWidth: '72%', display: 'flex', flexDirection: 'column', alignItems: isMine ? 'flex-end' : 'flex-start' }}>
                {!isMine && (
                  <div style={{ fontSize: 9, color: ROLE_COLOR[msg.user.role] || 'var(--text-muted)', fontWeight: 700, marginBottom: 2 }}>{msg.user.name}</div>
                )}
                <div
                  style={{
                    padding: msg.type === 'image' ? '3px' : '7px 10px',
                    borderRadius: isMine ? '12px 12px 3px 12px' : '12px 12px 12px 3px',
                    background: isMine ? '#4f8ef7' : 'var(--bg-card)',
                    border: isMine ? 'none' : '1px solid var(--border)',
                    color: isMine ? 'white' : 'var(--text-primary)',
                    fontSize: 12.5, lineHeight: 1.5, wordBreak: 'break-word',
                  }}
                  onMouseEnter={e => {
                    if (isMine) {
                      const btn = e.currentTarget.parentElement?.querySelector('.del-btn') as HTMLElement;
                      if (btn) btn.style.opacity = '1';
                    }
                  }}
                  onMouseLeave={e => {
                    const btn = e.currentTarget.parentElement?.querySelector('.del-btn') as HTMLElement;
                    if (btn) btn.style.opacity = '0';
                  }}
                >
                  {msg.type === 'image' && msg.image_url && (
                    <div>
                      <img 
                        src={msg.image_url.startsWith('http') ? msg.image_url : `http://localhost:8000${msg.image_url}`} 
                        alt="shared" 
                        style={{ borderRadius: 8, maxWidth: 200, maxHeight: 160, objectFit: 'cover', display: 'block', cursor: 'pointer', background: 'rgba(255,255,255,0.1)' }}
                        onClick={() => setFullImage(msg.image_url!.startsWith('http') ? msg.image_url! : `http://localhost:8000${msg.image_url}`)} 
                      />
                      {msg.content && <div style={{ padding: '5px 4px 2px', fontSize: 11 }}>{msg.content}</div>}
                    </div>
                  )}
                  {msg.type === 'url' && (
                    <div>
                      {msg.content && msg.content !== msg.url && <div style={{ marginBottom: 4, fontSize: 12 }}>{msg.content}</div>}
                      <UrlCard msg={msg} isMine={isMine} />
                    </div>
                  )}
                  {msg.type === 'text' && <span>{msg.content}</span>}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
                  <span style={{ fontSize: 9, color: 'var(--text-muted)' }}>{msgTime(msg.created_at)}</span>
                  {isMine && (
                    <button className="del-btn" onClick={() => handleDelete(msg.id)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', display: 'flex', padding: 0, opacity: 0, transition: 'opacity 0.15s' }}>
                      <Trash2 size={9} />
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Image preview */}
      {pendingPreview && (
        <div style={{ padding: '6px 12px', borderTop: '1px solid var(--border)', display: 'flex', gap: 8, alignItems: 'center', background: 'var(--bg-secondary)', flexShrink: 0 }}>
          <div style={{ position: 'relative' }}>
            <img src={pendingPreview} alt="" style={{ height: 48, borderRadius: 6, objectFit: 'cover' }} />
            <button onClick={() => { setPendingImg(null); setPendingPreview(null); }} style={{ position: 'absolute', top: -4, right: -4, background: '#ef4444', border: 'none', borderRadius: '50%', width: 14, height: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'white' }}>
              <X size={8} />
            </button>
          </div>
          <input className="input" placeholder="Caption…" value={imgCaption} onChange={e => setImgCaption(e.target.value)} style={{ fontSize: 11, flex: 1, padding: '4px 8px' }} />
        </div>
      )}

      {/* URL input strip */}
      {showUrl && (
        <div style={{ padding: '5px 10px', borderTop: '1px solid var(--border)', display: 'flex', gap: 6, alignItems: 'center', background: 'var(--bg-secondary)', flexShrink: 0 }}>
          <Link2 size={12} color="#4f8ef7" />
          <input className="input" placeholder="Paste URL…" value={urlInput} onChange={e => setUrlInput(e.target.value)} style={{ fontSize: 11, flex: 1, padding: '4px 8px' }} autoFocus />
          <button onClick={() => { setShowUrl(false); setUrlInput(''); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex' }}><X size={12} /></button>
        </div>
      )}

      {/* Input bar */}
      <div style={{ padding: '8px 10px', borderTop: '1px solid var(--border)', display: 'flex', gap: 6, alignItems: 'flex-end', background: 'var(--bg-secondary)', flexShrink: 0 }}>
        <button onClick={() => fileRef.current?.click()} title="Share image/screenshot"
          style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 7, padding: '5px', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', flexShrink: 0 }}>
          <ImageIcon size={13} />
        </button>
        <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFilePick} />

        <button onClick={() => setShowUrl(v => !v)} title="Share URL"
          style={{ background: showUrl ? 'rgba(79,142,247,0.12)' : 'var(--bg-card)', border: `1px solid ${showUrl ? '#4f8ef7' : 'var(--border)'}`, borderRadius: 7, padding: '5px', cursor: 'pointer', color: showUrl ? '#4f8ef7' : 'var(--text-muted)', display: 'flex', flexShrink: 0 }}>
          <Link2 size={13} />
        </button>

        <textarea
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type a message…"
          rows={1}
          style={{
            flex: 1, resize: 'none', padding: '6px 10px',
            background: 'var(--bg-card)', border: '1px solid var(--border)',
            borderRadius: 8, color: 'var(--text-primary)', fontSize: 12,
            lineHeight: 1.5, maxHeight: 80, overflowY: 'auto',
            outline: 'none', fontFamily: 'inherit',
          }}
          onFocus={e => (e.currentTarget.style.borderColor = '#4f8ef7')}
          onBlur={e => (e.currentTarget.style.borderColor = 'var(--border)')}
        />

        <button
          onClick={handleSend}
          disabled={sending || (!text.trim() && !pendingImg && !urlInput.trim())}
          style={{
            background: '#4f8ef7', border: 'none', borderRadius: 8,
            padding: '6px 10px', cursor: 'pointer', color: 'white',
            display: 'flex', alignItems: 'center',
            opacity: (sending || (!text.trim() && !pendingImg && !urlInput.trim())) ? 0.4 : 1,
            flexShrink: 0,
          }}
        >
          <Send size={13} />
        </button>
      </div>

      {/* Full Image Lightbox Overlay */}
      {fullImage && (
        <div 
          onClick={() => setFullImage(null)}
          style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.85)', zIndex: 99999,
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            backdropFilter: 'blur(12px)', cursor: 'zoom-out'
          }}
        >
          <img src={fullImage} alt="preview" style={{ maxWidth: '90%', maxHeight: '80vh', objectFit: 'contain', borderRadius: 12, boxShadow: '0 20px 60px rgba(0,0,0,0.5)' }} />
          <div style={{ marginTop: 24, display: 'flex', gap: 16 }}>
            <a 
              href={fullImage} download="vtc-chat-attachment" target="_blank" rel="noreferrer"
              onClick={e => e.stopPropagation()}
              style={{
                background: '#4f8ef7', color: 'white', padding: '10px 20px', borderRadius: 8,
                textDecoration: 'none', fontWeight: 600, fontSize: 13, display: 'flex', alignItems: 'center', gap: 6,
                boxShadow: '0 4px 12px rgba(79,142,247,0.4)', transition: 'background 0.2s',
              }}
              onMouseEnter={e => e.currentTarget.style.background = '#3b7de3'}
              onMouseLeave={e => e.currentTarget.style.background = '#4f8ef7'}
            >
              <Download size={14} /> Download Image
            </a>
            <button 
              onClick={(e) => { e.stopPropagation(); setFullImage(null); }}
              style={{
                background: 'rgba(255,255,255,0.1)', color: 'white', border: 'none', padding: '10px 20px', borderRadius: 8,
                fontWeight: 600, fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
                transition: 'background 0.2s'
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.15)'}
              onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
            >
              <X size={14} /> Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main ChatPopup ────────────────────────────────────
export default function ChatPopup() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [chats, setChats] = useState<ApiChat[]>([]);
  const [wsUsers, setWsUsers] = useState<ChatUser[]>([]);
  const [activeChat, setActiveChat] = useState<ApiChat | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [chatSearch, setChatSearch] = useState('');
  const [loaded, setLoaded] = useState(false);

  // Unlock AudioContext on first user interaction to bypass browser autoplay policies
  useEffect(() => {
    const unlockAudio = () => {
      if (!sharedAudioCtx) {
        const Ctx = window.AudioContext || (window as any).webkitAudioContext;
        if (Ctx) sharedAudioCtx = new Ctx();
      }
      if (sharedAudioCtx && sharedAudioCtx.state === 'suspended') {
        sharedAudioCtx.resume();
      }
      document.removeEventListener('click', unlockAudio);
      document.removeEventListener('keydown', unlockAudio);
    };
    document.addEventListener('click', unlockAudio);
    document.addEventListener('keydown', unlockAudio);
    return () => {
      document.removeEventListener('click', unlockAudio);
      document.removeEventListener('keydown', unlockAudio);
    };
  }, []);

  // Load chats when popup first opens
  useEffect(() => {
    if (!open || !user || loaded) return;
    Promise.all([chatApi.list(), chatApi.users()]).then(([chatRes, userRes]) => {
      setChats(chatRes.chats);
      setWsUsers(userRes.users);
      setLoaded(true);
    }).catch(() => {});
  }, [open, user, loaded]);

  // Poll for new chats every 10s while popup is open and tab is visible
  useEffect(() => {
    if (!open || !user) return;
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        chatApi.list().then(res => setChats(res.chats)).catch(() => {});
      }
    }, 10000);
    return () => clearInterval(interval);
  }, [open, user]);

  const totalUnread = chats.reduce((s, c) => s + c.unread_count, 0);

  const prevUnreadRef = useRef(totalUnread);
  useEffect(() => {
    if (totalUnread > prevUnreadRef.current) {
      playChatSound();
    }
    prevUnreadRef.current = totalUnread;
  }, [totalUnread]);

  const handleNewChat = (chat: ApiChat) => {
    setChats(prev => {
      const exists = prev.find(c => c.id === chat.id);
      return exists ? prev : [chat, ...prev];
    });
    setActiveChat(chat);
    setShowNew(false);
  };

  const filteredChats = chats.filter(c =>
    c.name.toLowerCase().includes(chatSearch.toLowerCase())
  );

  return (
    <>
      {/* ── Floating bubble ── */}
      <button
        onClick={() => setOpen(v => !v)}
        style={{
          position: 'fixed', bottom: 28, right: 28, zIndex: 500,
          width: 52, height: 52, borderRadius: '50%',
          background: open ? '#374151' : 'linear-gradient(135deg,#7c5af3,#4f8ef7)',
          border: 'none', cursor: 'pointer', color: 'white',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 8px 30px rgba(79,142,247,0.4)',
          transition: 'transform 0.2s, background 0.2s',
          transform: open ? 'rotate(90deg) scale(0.9)' : 'scale(1)',
        }}
        onMouseEnter={e => !open && ((e.currentTarget as HTMLElement).style.transform = 'scale(1.1)')}
        onMouseLeave={e => !open && ((e.currentTarget as HTMLElement).style.transform = 'scale(1)')}
        title="Team Chat"
      >
        {open ? <X size={20} /> : <MessageSquare size={21} />}
        {!open && totalUnread > 0 && (
          <span style={{
            position: 'absolute', top: 0, right: 0,
            background: '#ef4444', color: 'white',
            borderRadius: '50%', width: 18, height: 18,
            fontSize: 9, fontWeight: 700,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            border: '2px solid var(--bg-primary)',
          }}>
            {totalUnread > 9 ? '9+' : totalUnread}
          </span>
        )}
      </button>

      {/* ── Popup window ── */}
      {open && (
        <div
          style={{
            position: 'fixed', bottom: 90, right: 28, zIndex: 499,
            width: 360, height: 520,
            background: 'var(--bg-secondary)',
            backgroundColor: '#091220', // Ensure complete opacity fallback
            backdropFilter: 'blur(24px)', // Aggressive blur so nothing behind is readable
            border: '1px solid var(--border)',
            borderRadius: 16,
            boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
            display: 'flex', flexDirection: 'column',
            overflow: 'hidden',
            animation: 'popupIn 0.2s cubic-bezier(0.34,1.56,0.64,1)',
          }}
        >
          {/* Show new-chat panel */}
          {showNew ? (
            <NewChatPanel
              users={wsUsers}
              onBack={() => setShowNew(false)}
              onCreate={handleNewChat}
            />
          ) : activeChat ? (
            <MessageView
              chat={activeChat}
              userId={user?.id ?? 0}
              onBack={() => setActiveChat(null)}
            />
          ) : (
            /* Chat list */
            <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
              {/* Header */}
              <div style={{ padding: '14px 16px 10px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                    <span style={{ fontFamily: 'Space Grotesk, sans-serif', fontWeight: 800, fontSize: 15 }}>Team Chat</span>
                    {totalUnread > 0 && (
                      <span style={{ background: '#ef4444', color: 'white', borderRadius: 20, padding: '0 7px', fontSize: 10, fontWeight: 700 }}>
                        {totalUnread}
                      </span>
                    )}
                  </div>
                  <button onClick={() => setShowNew(true)} className="btn btn-primary" style={{ padding: '4px 10px', fontSize: 11, gap: 4 }}>
                    <Plus size={12} /> New
                  </button>
                </div>
                <div style={{ position: 'relative' }}>
                  <Search size={11} style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                  <input className="input" placeholder="Search conversations…" value={chatSearch} onChange={e => setChatSearch(e.target.value)}
                    style={{ fontSize: 12, padding: '6px 10px 6px 26px' }} />
                </div>
              </div>

              {/* List */}
              <div style={{ flex: 1, overflowY: 'auto' }}>
                {!loaded ? (
                  Array(4).fill(0).map((_, i) => (
                    <div key={i} style={{ display: 'flex', gap: 10, padding: '12px 16px', alignItems: 'center' }}>
                      <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(255,255,255,0.06)', flexShrink: 0 }} />
                      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 5 }}>
                        <div style={{ height: 11, borderRadius: 4, background: 'rgba(255,255,255,0.06)', width: '55%' }} />
                        <div style={{ height: 9, borderRadius: 4, background: 'rgba(255,255,255,0.04)', width: '75%' }} />
                      </div>
                    </div>
                  ))
                ) : filteredChats.length === 0 ? (
                  <div style={{ padding: '32px 20px', textAlign: 'center', color: 'var(--text-muted)' }}>
                    <MessageSquare size={28} style={{ opacity: 0.2, marginBottom: 8, display: 'block', margin: '0 auto 8px' }} />
                    <div style={{ fontSize: 12, fontWeight: 600 }}>No chats yet</div>
                    <div style={{ fontSize: 11, marginTop: 4 }}>Click <strong>+ New</strong> to start chatting</div>
                  </div>
                ) : filteredChats.map(chat => (
                  <div
                    key={chat.id}
                    onClick={() => setActiveChat(chat)}
                    style={{
                      display: 'flex', gap: 10, alignItems: 'center', padding: '10px 14px',
                      cursor: 'pointer', transition: 'background 0.12s',
                      borderBottom: '1px solid rgba(255,255,255,0.03)',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.03)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                  >
                    <div style={{
                      width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
                      background: chat.type === 'group'
                        ? 'linear-gradient(135deg,#7c5af3,#4f8ef7)'
                        : `hsl(${((chat.other_user_id ?? 1) * 67) % 360},65%,50%)`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: chat.type === 'group' ? 15 : 12, fontWeight: 700, color: 'white',
                    }}>
                      {chat.type === 'group' ? (chat.avatar || '💬') : (chat.avatar || chat.name[0])}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontWeight: 600, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--text-primary)' }}>{chat.name}</span>
                        {chat.latest_message && <span style={{ fontSize: 9, color: 'var(--text-muted)', flexShrink: 0 }}>{timeAgo(chat.latest_message.created_at)}</span>}
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 2 }}>
                        <span style={{ fontSize: 11, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {chat.latest_message
                            ? (chat.latest_message.type === 'image' ? '📷 Image' : chat.latest_message.type === 'url' ? '🔗 Link' : chat.latest_message.content)
                            : 'Start chatting…'}
                        </span>
                        {chat.unread_count > 0 && (
                          <span style={{ background: '#4f8ef7', color: 'white', borderRadius: 20, padding: '0 6px', fontSize: 9, fontWeight: 700, flexShrink: 0, marginLeft: 4 }}>
                            {chat.unread_count}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* popupIn animation is now in globals.css */}
    </>
  );
}
