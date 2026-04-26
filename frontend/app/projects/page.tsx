'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import AppLayout from '@/components/AppLayout';
import { useAuth } from '@/lib/auth';
import { projectsApi, type ApiProject } from '@/lib/api';
import { Plus, Search, CheckCircle, AlertTriangle, Trash2, Check } from 'lucide-react';
import dynamic from 'next/dynamic';

const CreateProjectModal = dynamic(() => import('@/components/CreateProjectModal'), { ssr: false });

const RISK_CONFIG = {
  green: { label: 'On Track', color: '#22c55e', bg: 'rgba(34,197,94,0.1)' },
  yellow: { label: 'At Risk', color: '#f59e0b', bg: 'rgba(245,158,11,0.1)' },
  red: { label: 'Critical', color: '#ef4444', bg: 'rgba(239,68,68,0.1)' },
};

const Skeleton = ({ h = 20, w = '100%', radius = 6 }: any) => (
  <div style={{ width: w, height: h, borderRadius: radius, background: 'rgba(255,255,255,0.05)', animation: 'shimmer 1.5s infinite', backgroundSize: '200% 100%', backgroundImage: 'linear-gradient(90deg, rgba(255,255,255,0.04) 25%, rgba(255,255,255,0.07) 50%, rgba(255,255,255,0.04) 75%)' }} />
);

export default function ProjectsPage() {
  const { user } = useAuth();
  const router   = useRouter();
  const [projects, setProjects] = useState<ApiProject[]>([]);
  const [filtered, setFiltered] = useState<ApiProject[]>([]);
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState('');
  const [filterRisk, setFilterRisk] = useState<string>('all');
  const [error, setError] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [selected, setSelected] = useState<number[]>([]);

  const handleDeleteSingle = async (projectId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this project?')) return;
    try {
      await projectsApi.delete(projectId);
      setProjects(prev => prev.filter(p => p.id !== projectId));
      setSelected(prev => prev.filter(id => id !== projectId));
    } catch (err: any) {
      setError(err.message || 'Failed to delete project');
    }
  };

  const handleDeleteMultiple = async () => {
    if (!confirm(`Are you sure you want to delete ${selected.length} projects?`)) return;
    try {
      await Promise.all(selected.map(id => projectsApi.delete(id)));
      setProjects(prev => prev.filter(p => !selected.includes(p.id)));
      setSelected([]);
    } catch (err: any) {
      setError(err.message || 'Failed to delete some projects');
    }
  };

  const toggleSelection = (projectId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelected(prev => prev.includes(projectId) ? prev.filter(id => id !== projectId) : [...prev, projectId]);
  };

  useEffect(() => {
    if (!user?.current_workspace_id) return;
    projectsApi.list(user.current_workspace_id)
      .then(res => { setProjects(res.projects); setFiltered(res.projects); })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, [user]);

  useEffect(() => {
    let result = projects;
    if (search) result = result.filter(p => p.name.toLowerCase().includes(search.toLowerCase()));
    if (filterRisk !== 'all') result = result.filter(p => p.risk_level === filterRisk);
    setFiltered(result);
  }, [search, filterRisk, projects]);

  return (
    <AppLayout>
      {/* Header */}
      <div className="project-controls">
        <div>
          <h1 style={{ fontFamily: 'Space Grotesk, sans-serif', fontWeight: 800, fontSize: '22px', marginBottom: '2px' }}>Projects</h1>
          <p style={{ fontSize: '14px', color: 'var(--text-muted)' }}>{projects.length} projects in your workspace</p>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          {selected.length > 0 && (
            <button className="btn btn-ghost" style={{ color: '#ef4444', border: '1px solid rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.1)', padding: '8px 12px' }} onClick={handleDeleteMultiple}>
              <Trash2 size={15} /> <span className="hide-on-mobile">Delete {selected.length}</span>
            </button>
          )}
          <button className="btn btn-primary" onClick={() => setShowCreate(true)}><Plus size={15} /> <span className="hide-on-mobile">New Project</span></button>
        </div>
      </div>

      {/* Filters */}
      <div className="filters-container">
        <div style={{ position: 'relative', flex: '1 1 200px', maxWidth: 320 }}>
          <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            className="input"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search projects..."
            style={{ paddingLeft: '32px', height: '36px', fontSize: '13px' }}
          />
        </div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {['all', 'green', 'yellow', 'red'].map(risk => (
            <button
              key={risk}
              onClick={() => setFilterRisk(risk)}
              style={{
                padding: '6px 14px', borderRadius: '20px', fontSize: '12px', fontWeight: 600, cursor: 'pointer',
                border: `1px solid ${filterRisk === risk ? '#4f8ef7' : 'var(--border)'}`,
                background: filterRisk === risk ? 'rgba(79,142,247,0.1)' : 'transparent',
                color: filterRisk === risk ? '#4f8ef7' : 'var(--text-muted)',
              }}
            >
              {risk === 'all' ? 'All' : RISK_CONFIG[risk as keyof typeof RISK_CONFIG].label}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div style={{ padding: '12px 16px', borderRadius: '8px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#ef4444', fontSize: '13px', marginBottom: '16px' }}>
          {error}
        </div>
      )}

      {/* Grid */}
      <div className="projects-grid">
        {loading ? Array(6).fill(0).map((_, i) => (
          <div key={`skel-${i}`} className="card" style={{ height: '200px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <Skeleton h={20} w="70%" />
            <Skeleton h={14} />
            <Skeleton h={8} radius={4} />
            <Skeleton h={14} w="50%" />
          </div>
        )) : filtered.map(project => {
          const risk = RISK_CONFIG[project.risk_level];
          return (
            <div key={project.id} style={{
              background: `linear-gradient(145deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.01) 100%)`,
              border: `1px solid rgba(255,255,255,0.05)`,
              borderRadius: '16px',
              padding: '24px',
              cursor: 'pointer',
              position: 'relative',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
              transition: 'all 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
            }}
            onClick={() => router.push(`/projects/${project.id}`)}
            onMouseEnter={e => {
              e.currentTarget.style.transform = 'translateY(-4px)';
              e.currentTarget.style.boxShadow = `0 12px 30px -10px ${project.color}40, 0 4px 20px rgba(0,0,0,0.3)`;
              e.currentTarget.style.border = `1px solid ${project.color}40`;
            }}
            onMouseLeave={e => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,0,0,0.2)';
              e.currentTarget.style.border = `1px solid rgba(255,255,255,0.05)`;
            }}
            >
              {/* Subtle dynamic glow orb inside the card */}
              <div style={{
                position: 'absolute', top: '-15%', right: '-15%',
                width: '180px', height: '180px',
                background: project.color,
                filter: 'blur(90px)',
                opacity: 0.15,
                pointerEvents: 'none',
              }} />

              {/* Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px', position: 'relative' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  {/* Select Checkbox */}
                  <div
                    onClick={(e) => toggleSelection(project.id, e)}
                    style={{
                      width: 22, height: 22, borderRadius: 6, border: '1px solid var(--border)',
                      background: selected.includes(project.id) ? '#4f8ef7' : 'rgba(255,255,255,0.05)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      cursor: 'pointer', zIndex: 10, flexShrink: 0,
                      transition: 'background 0.2s, border 0.2s',
                    }}
                  >
                    {selected.includes(project.id) && <Check size={14} color="white" strokeWidth={3} />}
                  </div>
                  
                  <div style={{ width: 44, height: 44, borderRadius: '12px', background: `linear-gradient(135deg, ${project.color}30, ${project.color}10)`, display: 'flex', alignItems: 'center', justifyContent: 'center', border: `1px solid ${project.color}30`, flexShrink: 0 }}>
                    <div style={{ width: 16, height: 16, borderRadius: '5px', background: project.color, boxShadow: `0 0 12px ${project.color}90` }} />
                  </div>
                  <div>
                    <div style={{ fontFamily: 'Space Grotesk, sans-serif', fontWeight: 700, fontSize: '18px', color: 'var(--text-primary)', letterSpacing: '-0.3px', marginBottom: '2px' }}>{project.name}</div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                      {project.end_date ? `Due ${new Date(project.end_date).toLocaleDateString('en', { month: 'short', day: 'numeric', year: 'numeric' })}` : 'No set deadline'}
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ padding: '4px 10px', borderRadius: '8px', fontSize: '11px', fontWeight: 650, background: risk.bg, color: risk.color, border: `1px solid ${risk.color}30` }}>
                    {risk.label}
                  </span>
                  {(user?.role === 'admin' || project.members.some(m => m.id === user?.id)) && (
                    <button
                      onClick={(e) => handleDeleteSingle(project.id, e)}
                      style={{
                        background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.2)',
                        borderRadius: '8px', padding: '5px', cursor: 'pointer', color: '#ef4444',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10,
                        transition: 'background 0.2s'
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.2)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.08)'}
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              </div>

              {/* Description */}
              {project.description && (
                <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.6)', marginBottom: '20px', lineHeight: 1.6, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', position: 'relative' }}>
                  {project.description}
                </p>
              )}

              <div style={{ flex: 1 }} /> {/* Push footer to bottom if cards vary in height */}

              {/* Progress */}
              <div style={{ marginBottom: '18px', position: 'relative' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '8px', fontWeight: 500 }}>
                  <span>Progress</span>
                  <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{project.completion}%</span>
                </div>
                <div style={{ height: '6px', borderRadius: '6px', background: 'rgba(255,255,255,0.06)', overflow: 'hidden', position: 'relative' }}>
                  <div style={{ height: '100%', width: `${project.completion}%`, background: `linear-gradient(90deg, ${project.color}AA, ${project.color})`, borderRadius: '6px', boxShadow: `0 0 10px ${project.color}50` }} />
                </div>
              </div>

              {/* Stats + Members */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '16px', borderTop: '1px solid rgba(255,255,255,0.06)', position: 'relative' }}>
                <div style={{ display: 'flex', gap: '16px' }}>
                  <span style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 500 }}>
                    <CheckCircle size={14} color="#22c55e" /> <span style={{ color: 'var(--text-primary)' }}>{project.total_tasks - project.overdue_tasks}</span> done
                  </span>
                  {project.overdue_tasks > 0 && (
                    <span style={{ fontSize: '12px', color: '#ef4444', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 500 }}>
                      <AlertTriangle size={14} /> <span>{project.overdue_tasks} overdue</span>
                    </span>
                  )}
                </div>
                {/* Member avatars */}
                <div style={{ display: 'flex' }}>
                  {project.members.slice(0, 4).map((m, i) => (
                    <div key={m.id} style={{
                      width: 26, height: 26, borderRadius: '50%',
                      background: `hsl(${(m.id * 67) % 360}, 65%, 50%)`,
                      border: '2px solid var(--bg-primary)',
                      marginLeft: i > 0 ? '-8px' : 0,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '10px', fontWeight: 700, color: 'white',
                    }}>{m.avatar || m.name[0]}</div>
                  ))}
                  {project.members.length > 4 && (
                    <div style={{ 
                      width: 26, height: 26, borderRadius: '50%', background: 'rgba(255,255,255,0.05)', 
                      border: '2px solid var(--bg-primary)', marginLeft: '-8px', 
                      display: 'flex', alignItems: 'center', justifyContent: 'center', 
                      fontSize: '10px', fontWeight: 600, color: 'var(--text-muted)' 
                    }}>+{project.members.length - 4}</div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {!loading && filtered.length === 0 && (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)' }}>
          <div style={{ fontSize: '32px', marginBottom: '12px' }}>🔍</div>
          <div style={{ fontWeight: 600 }}>No projects found</div>
          <div style={{ fontSize: '13px', marginTop: '4px' }}>Try adjusting your search or filters</div>
        </div>
      )}

      {/* Animations & responsive styles */}
      <style>{`
        .project-controls { display: flex; align-items: center; justify-content: space-between; margin-bottom: 24px; gap: 16px; flex-wrap: wrap; }
        .filters-container { display: flex; gap: 12px; margin-bottom: 24px; align-items: center; flex-wrap: wrap; }
        .projects-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(min(100%, 320px), 1fr)); gap: 16px; }
        @media (max-width: 600px) {
          .hide-on-mobile { display: none; }
        }
      `}</style>
      {showCreate && (
        <CreateProjectModal
          workspaceId={user?.current_workspace_id!}
          onClose={() => setShowCreate(false)}
          onCreated={(p: ApiProject) => { setProjects(prev => [p, ...prev]); setShowCreate(false); }}
        />
      )}
    </AppLayout>
  );
}
