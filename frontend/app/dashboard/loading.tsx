export default function DashboardLoading() {
  return (
    <div style={{ padding: '28px 32px', minHeight: '100vh', background: 'var(--bg-primary)' }}>
      {/* Header skeleton */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <div style={{ width: 250, height: 24, borderRadius: 6, background: 'rgba(255,255,255,0.05)', marginBottom: 8 }} />
          <div style={{ width: 300, height: 14, borderRadius: 6, background: 'rgba(255,255,255,0.03)' }} />
        </div>
      </div>

      {/* Stat cards skeleton */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
        {[1, 2, 3, 4].map(i => (
          <div key={i} style={{
            height: 110, borderRadius: 12,
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.05)',
            padding: 20,
          }}>
            <div style={{ width: '60%', height: 14, borderRadius: 4, background: 'rgba(255,255,255,0.05)', marginBottom: 12 }} />
            <div style={{ width: '40%', height: 36, borderRadius: 4, background: 'rgba(255,255,255,0.04)', marginBottom: 8 }} />
            <div style={{ width: '80%', height: 12, borderRadius: 4, background: 'rgba(255,255,255,0.03)' }} />
          </div>
        ))}
      </div>

      {/* Charts skeleton */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr 2fr', gap: 16 }}>
        {[180, 200, 200].map((h, i) => (
          <div key={i} style={{
            height: h, borderRadius: 12,
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.05)',
          }} />
        ))}
      </div>
    </div>
  );
}
