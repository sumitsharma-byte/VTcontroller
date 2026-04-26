export default function ProjectsLoading() {
  return (
    <div style={{ padding: '28px 32px', minHeight: '100vh', background: 'var(--bg-primary)' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <div style={{ width: 140, height: 24, borderRadius: 6, background: 'rgba(255,255,255,0.05)', marginBottom: 8 }} />
          <div style={{ width: 200, height: 14, borderRadius: 6, background: 'rgba(255,255,255,0.03)' }} />
        </div>
      </div>

      {/* Filter skeleton */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 24 }}>
        <div style={{ width: 250, height: 36, borderRadius: 8, background: 'rgba(255,255,255,0.04)' }} />
        <div style={{ display: 'flex', gap: 8 }}>
          {[1, 2, 3, 4].map(i => (
            <div key={i} style={{ width: 70, height: 32, borderRadius: 20, background: 'rgba(255,255,255,0.04)' }} />
          ))}
        </div>
      </div>

      {/* Project cards skeleton */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
        {[1, 2, 3, 4, 5, 6].map(i => (
          <div key={i} style={{
            height: 220, borderRadius: 16,
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.05)',
          }} />
        ))}
      </div>
    </div>
  );
}
