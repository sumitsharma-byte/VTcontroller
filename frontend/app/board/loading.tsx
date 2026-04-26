export default function BoardLoading() {
  return (
    <div style={{ padding: '28px 32px', minHeight: '100vh', background: 'var(--bg-primary)' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <div style={{ width: 120, height: 24, borderRadius: 6, background: 'rgba(255,255,255,0.05)', marginBottom: 8 }} />
          <div style={{ width: 220, height: 14, borderRadius: 6, background: 'rgba(255,255,255,0.03)' }} />
        </div>
      </div>

      {/* Project tabs skeleton */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        {[1, 2, 3].map(i => (
          <div key={i} style={{ width: 100, height: 30, borderRadius: 20, background: 'rgba(255,255,255,0.04)' }} />
        ))}
      </div>

      {/* Columns skeleton */}
      <div style={{ display: 'flex', gap: 14 }}>
        {[1, 2, 3, 4].map(col => (
          <div key={col} style={{
            flex: '0 0 280px', minHeight: 500, borderRadius: 14,
            background: 'rgba(255,255,255,0.02)',
            border: '1px solid rgba(255,255,255,0.05)',
            padding: 16,
          }}>
            <div style={{ width: '50%', height: 16, borderRadius: 4, background: 'rgba(255,255,255,0.05)', marginBottom: 14 }} />
            {[1, 2, 3].map(card => (
              <div key={card} style={{
                height: 80, borderRadius: 10, marginBottom: 8,
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.04)',
              }} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
