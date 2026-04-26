export default function MyTasksLoading() {
  return (
    <div style={{ padding: '28px 32px', minHeight: '100vh', background: 'var(--bg-primary)' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <div style={{ width: 160, height: 24, borderRadius: 6, background: 'rgba(255,255,255,0.05)', marginBottom: 8 }} />
          <div style={{ width: 280, height: 14, borderRadius: 6, background: 'rgba(255,255,255,0.03)' }} />
        </div>
      </div>

      {/* Filter chips skeleton */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 24 }}>
        {[1, 2, 3, 4, 5].map(i => (
          <div key={i} style={{ width: 110, height: 38, borderRadius: 10, background: 'rgba(255,255,255,0.04)' }} />
        ))}
      </div>

      {/* Task groups skeleton */}
      {[1, 2, 3].map(group => (
        <div key={group} style={{
          borderRadius: 12, marginBottom: 16, overflow: 'hidden',
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid rgba(255,255,255,0.05)',
        }}>
          <div style={{ height: 44, background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid rgba(255,255,255,0.05)' }} />
          {[1, 2, 3].map(row => (
            <div key={row} style={{ height: 48, borderBottom: '1px solid rgba(255,255,255,0.03)' }} />
          ))}
        </div>
      ))}
    </div>
  );
}
