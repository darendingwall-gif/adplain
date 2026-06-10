import { useState, useEffect } from 'react';
import './App.css';

const API     = process.env.REACT_APP_API_URL || (window.location.hostname === 'localhost' ? 'http://localhost:3001' : '');
const API_KEY = process.env.REACT_APP_API_KEY || '';

function apiFetch(url) {
  return fetch(url, { headers: { 'x-api-key': API_KEY } });
}

const DATE_LABELS = {
  last_7d: 'Last 7 days', last_14d: 'Last 14 days', last_30d: 'Last 30 days',
};

const SCORE_CONFIG = {
  winner: { label: 'WINNER', badgeBg: '#1a6b3c', badgeColor: '#fff', leftBorder: '#1a6b3c', shadow: '0 1px 3px rgba(26,107,60,.1)', barFill: '#1a6b3c' },
  pause:  { label: 'PAUSE',  badgeBg: '#8a2a1a', badgeColor: '#fff', leftBorder: '#8a2a1a', shadow: 'none',                         barFill: '#8a2a1a' },
  watch:  { label: 'WATCH',  badgeBg: '#f5f3ef', badgeColor: '#8a8678', leftBorder: '#e8e5e0', shadow: 'none', border: '#e8e5e0',   barFill: '#d0ccc0' },
};

// ─── Hero stats strip ─────────────────────────────────────
function HeroStrip({ results }) {
  const spend   = results.reduce((s, r) => s + r.ads.reduce((a, ad) => a + parseFloat(ad.spend), 0), 0);
  const total   = results.reduce((s, r) => s + r.ads.length, 0);
  const winners = results.reduce((s, r) => s + r.ads.filter(a => a.score === 'winner').length, 0);
  const pauses  = results.reduce((s, r) => s + r.ads.filter(a => a.score === 'pause').length, 0);
  const saved   = results.reduce((s, r) =>
    s + r.ads.filter(a => a.score === 'pause').reduce((a, ad) => a + parseFloat(ad.spend), 0), 0);

  const stats = [
    { label: '7-Day Spend',  value: `$${spend.toFixed(0)}`,  sub: 'across all accounts',   valueColor: '#fff' },
    { label: 'Ads Running',  value: total,                    sub: 'active this week',       valueColor: '#fff' },
    { label: 'Winners',      value: winners,                  sub: 'performing well',        valueColor: '#4ade80' },
    { label: 'Pause Today',  value: pauses,                   sub: `~$${saved.toFixed(0)} saved/wk`, valueColor: '#f87171' },
  ];

  return (
    <div style={{ background: 'var(--hero)' }}>
      <div className="hero-grid">
        {stats.map((s, i) => (
          <div key={i} className="hero-stat">
            <div style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '.08em', color: 'rgba(255,255,255,.4)', marginBottom: '8px' }}>
              {s.label}
            </div>
            <div style={{ fontSize: '26px', fontWeight: 600, color: s.valueColor, letterSpacing: '-.02em', lineHeight: 1 }}>
              {s.value}
            </div>
            <div style={{ fontSize: '11px', color: 'rgba(255,255,255,.3)', marginTop: '5px' }}>{s.sub}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Skeleton loading ─────────────────────────────────────
const LOADING_MSGS = [
  'Reading your ads...',
  'Comparing performance...',
  'Writing your plain English summary...',
];

function SkeletonCard() {
  return (
    <div style={{
      background: '#fff', border: '1px solid var(--border)',
      borderLeft: '4px solid #e8e5e0', borderRadius: '12px',
      padding: '16px 18px', marginBottom: '10px',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '14px' }}>
        <div>
          <div className="skeleton" style={{ width: 180, height: 14, marginBottom: 6 }} />
          <div className="skeleton" style={{ width: 110, height: 11 }} />
        </div>
        <div className="skeleton" style={{ width: 60, height: 22, borderRadius: 5 }} />
      </div>
      <div className="metrics-grid" style={{ marginBottom: 12 }}>
        {[0,1,2,3].map(i => <div key={i} className="skeleton" style={{ height: 52, borderRadius: 7 }} />)}
      </div>
      <div className="skeleton" style={{ height: 3, borderRadius: 999 }} />
    </div>
  );
}

function LoadingState() {
  const [idx, setIdx] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setIdx(i => (i + 1) % LOADING_MSGS.length), 3000);
    return () => clearInterval(t);
  }, []);
  return (
    <div>
      <SkeletonCard /><SkeletonCard /><SkeletonCard />
      <div style={{ textAlign: 'center', padding: '24px 0 8px' }}>
        <div style={{ fontSize: '14px', color: 'var(--ink-2)', marginBottom: 4, minHeight: 22 }}>
          {LOADING_MSGS[idx]}
        </div>
        <div style={{ fontSize: '12px', color: 'var(--muted)' }}>Takes 20–40 seconds</div>
      </div>
    </div>
  );
}

// ─── Ad card ──────────────────────────────────────────────
function AdCard({ ad, maxSpend }) {
  const s   = SCORE_CONFIG[ad.score] || SCORE_CONFIG.watch;
  const pct = maxSpend > 0 ? Math.min(100, Math.round((parseFloat(ad.spend) / maxSpend) * 100)) : 0;

  const metrics = [
    { label: 'Spend',       value: `$${ad.spend}` },
    { label: 'CTR',         value: `${ad.ctr}%` },
    { label: ad.costPerResult ? 'Cost/Result' : 'CPC', value: ad.costPerResult ? `$${ad.costPerResult}` : `$${ad.cpc}` },
    { label: 'Clicks',      value: ad.clicks.toLocaleString() },
  ];

  const convColor = (type) => type === 'Messages' || type === 'Contacts'
    ? { bg: '#eef3ff', color: '#1a3a7a', border: '#b8ccec' }
    : { bg: 'var(--green-bg)', color: 'var(--green)', border: 'var(--green-border)' };

  return (
    <div className="fade-up" style={{
      background: '#fff',
      border: '1px solid var(--border)',
      borderLeft: `4px solid ${s.leftBorder}`,
      borderRadius: '12px', padding: '16px 18px', marginBottom: '10px',
      boxShadow: s.shadow,
    }}>
      {/* Top row: name left, badge right */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '10px', marginBottom: '12px' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--ink)', marginBottom: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {ad.name}
          </div>
          <div style={{ fontSize: '11px', color: 'var(--muted)' }}>{ad.campaign}</div>
        </div>
        <div style={{
          background: s.badgeBg, color: s.badgeColor,
          border: s.border ? `1px solid ${s.border}` : 'none',
          borderRadius: '5px', padding: '3px 10px',
          fontSize: '11px', fontWeight: 600, letterSpacing: '.04em',
          flexShrink: 0,
        }}>
          {s.label}
        </div>
      </div>

      {/* 4 metrics in grid */}
      <div className="metrics-grid">
        {metrics.map((m, i) => (
          <div key={i} style={{ background: 'var(--bg)', borderRadius: '7px', padding: '8px 10px' }}>
            <div style={{ fontSize: '10px', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: '4px' }}>
              {m.label}
            </div>
            <div style={{ fontSize: '16px', fontWeight: 600, color: 'var(--ink)' }}>
              {m.value}
            </div>
          </div>
        ))}
      </div>

      {/* Conversions */}
      {ad.conversions.length > 0 && (
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '12px' }}>
          {ad.conversions.map((cv, i) => {
            const icon = cv.type === 'Leads' ? '🎯' : cv.type === 'Purchases' ? '💰' : cv.type === 'Contacts' ? '📞' : '💬';
            const c = convColor(cv.type);
            return (
              <span key={i} className="pill" style={{ background: c.bg, color: c.color, borderColor: c.border, fontSize: '12px' }}>
                {icon} {cv.value} {cv.type}
              </span>
            );
          })}
        </div>
      )}

      {/* Spend bar */}
      <div style={{ height: '3px', background: 'var(--border)', borderRadius: '999px', marginBottom: '5px' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: s.barFill, borderRadius: '999px', transition: 'width .5s ease' }} />
      </div>
      <div style={{ fontSize: '10px', color: 'var(--muted)' }}>{pct}% of account spend this week</div>
    </div>
  );
}

// ─── AI summary ───────────────────────────────────────────
const SECTION_THEME = {
  '🟢': { bg: '#f0faf4', border: '#c8e8d4', color: '#1a6b3c', dot: '#1a6b3c',  label: 'WHAT\'S WORKING' },
  '🔴': { bg: '#fdf2f0', border: '#e8c8c0', color: '#8a2a1a', dot: '#8a2a1a',  label: 'WHAT TO STOP'    },
  '💡': { bg: '#fdf8ed', border: '#e8d8a0', color: '#7a4a0a', dot: '#7a4a0a',  label: 'NEXT STEPS'      },
};

function AISummary({ summary }) {
  const [expanded, setExpanded] = useState({});
  if (!summary) return null;

  const cleaned = summary
    .replace(/^#{1,6}\s*/gm, '')
    .replace(/^[-*]{3,}\s*$/gm, '')
    .replace(/\*\*/g, '')
    .replace(/\*/g, '');

  const sections = cleaned.split(/(?=🟢|🔴|💡)/).filter(s => s.trim());

  return (
    <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid var(--border)', overflow: 'hidden', marginBottom: '20px' }}>
      {/* Gradient top accent */}
      <div style={{ height: '3px', background: 'linear-gradient(90deg, #1a6b3c, #4ade80)' }} />

      <div style={{ padding: '20px' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
          <span style={{ background: 'var(--green-bg)', color: 'var(--green)', border: '1px solid var(--green-border)', borderRadius: '4px', padding: '3px 8px', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em' }}>
            ✦ AI ANALYSIS
          </span>
          <span style={{ fontSize: '12px', color: 'var(--muted)' }}>Updated just now · Plain English</span>
        </div>

        {/* Sections */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {sections.map((section, i) => {
            const trim  = section.trim();
            const emoji = trim.startsWith('🟢') ? '🟢' : trim.startsWith('🔴') ? '🔴' : '💡';
            const theme = SECTION_THEME[emoji];
            const lines = trim.split('\n').filter(l => l.trim());
            const bodyLines = lines.slice(1).filter(l => l.trim());
            const isSteps   = emoji === '💡';
            const isOpen    = expanded[i] || false;

            return (
              <div key={i} style={{ background: theme.bg, border: `1px solid ${theme.border}`, borderRadius: '8px', padding: '14px 16px' }}>
                {/* Section header */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '7px', marginBottom: '10px' }}>
                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: theme.dot, flexShrink: 0 }} />
                  <span style={{ fontSize: '11px', fontWeight: 700, color: theme.color, letterSpacing: '.06em', textTransform: 'uppercase' }}>
                    {theme.label}
                  </span>
                </div>

                {isSteps ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {bodyLines.map((step, j) => {
                      const m    = step.match(/^(\d+)\.\s*(?:\[([^\]]+)\]\s*)?(.+)/s);
                      const num  = m ? m[1] : String(j + 1);
                      const time = m ? m[2] : null;
                      const text = m ? m[3] : step;
                      return (
                        <div key={j} style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                          <div style={{ flexShrink: 0, width: '20px', height: '20px', borderRadius: '50%', background: theme.color, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: 600 }}>
                            {num}
                          </div>
                          <div style={{ fontSize: '13px', color: 'var(--ink-2)', lineHeight: 1.5, paddingTop: '2px' }}>
                            {time && (
                              <span style={{ fontSize: '10px', fontWeight: 700, color: theme.color, background: `${theme.border}`, borderRadius: '3px', padding: '1px 5px', marginRight: '6px' }}>
                                {time}
                              </span>
                            )}
                            {text}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  (() => {
                    const bodyText  = bodyLines.join(' ');
                    const sentences = bodyText.match(/[^.!?]*[.!?]+/g) || [bodyText];
                    const preview   = sentences.slice(0, 2).join(' ').trim();
                    const rest      = sentences.slice(2).join(' ').trim();
                    const hasMore   = rest.length > 0;
                    return (
                      <>
                        <div style={{ fontSize: '13px', color: 'var(--ink-2)', lineHeight: 1.65 }}>{preview}</div>
                        {isOpen && rest && (
                          <div style={{ fontSize: '13px', color: 'var(--ink-2)', lineHeight: 1.65, marginTop: '8px' }}>{rest}</div>
                        )}
                        {hasMore && (
                          <button onClick={() => setExpanded(e => ({ ...e, [i]: !e[i] }))} style={{ background: 'none', border: 'none', padding: '6px 0 0', fontSize: '12px', fontWeight: 600, color: theme.color, cursor: 'pointer' }}>
                            {isOpen ? '↑ Show less' : '↓ Show more'}
                          </button>
                        )}
                      </>
                    );
                  })()
                )}
              </div>
            );
          })}
        </div>

        <div style={{ fontSize: '10px', color: 'var(--muted)', textAlign: 'center', marginTop: '14px' }}>
          Generated by Claude AI · Not financial advice
        </div>
      </div>
    </div>
  );
}

// ─── Account section ──────────────────────────────────────
function AccountSection({ account, dateRangeLabel }) {
  const totalSpend = account.ads.reduce((s, a) => s + parseFloat(a.spend), 0);
  const maxSpend   = account.ads.reduce((m, a) => Math.max(m, parseFloat(a.spend)), 0);
  const winners    = account.ads.filter(a => a.score === 'winner').length;
  const pauses     = account.ads.filter(a => a.score === 'pause').length;

  return (
    <div style={{ marginBottom: '56px' }}>
      {/* Header */}
      <div className="account-header">
        <div>
          <div style={{ fontSize: '18px', fontWeight: 600, color: 'var(--ink)', letterSpacing: '-.02em' }}>
            {account.name}
          </div>
          {account.cache ? (
            <div style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '3px' }}>Cached · {account.cacheAge}m ago</div>
          ) : account.generatedAt ? (
            <div style={{ fontSize: '11px', color: 'var(--green)', marginTop: '3px' }}>● Live data</div>
          ) : null}
        </div>
        <div className="account-pills">
          <span className="pill" style={{ background: 'var(--green-bg)', color: 'var(--green)', borderColor: 'var(--green-border)' }}>
            {winners} Winner{winners !== 1 ? 's' : ''}
          </span>
          <span className="pill" style={{ background: 'var(--red-bg)', color: 'var(--red)', borderColor: 'var(--red-border)' }}>
            {pauses} Pause{pauses !== 1 ? 's' : ''}
          </span>
          <span className="pill" style={{ background: '#f5f3ef', color: 'var(--muted)', borderColor: '#e8e5e0' }}>
            ${totalSpend.toFixed(0)} {dateRangeLabel.toLowerCase()}
          </span>
        </div>
      </div>

      {/* Empty state */}
      {account.status === 'no_ads' && (
        <div style={{ textAlign: 'center', padding: '52px 32px', background: '#fff', border: '1px solid var(--border)', borderRadius: '12px' }}>
          <div style={{ fontSize: '48px', marginBottom: '14px' }}>📊</div>
          <div style={{ fontSize: '17px', fontWeight: 600, color: 'var(--ink)', marginBottom: '8px' }}>No ads this week</div>
          <div style={{ fontSize: '13px', color: 'var(--muted)', maxWidth: '280px', margin: '0 auto', lineHeight: 1.6 }}>
            Run a campaign in Meta Ads Manager and AdPlain will analyze it here.
          </div>
        </div>
      )}

      {account.summary && <AISummary summary={account.summary} />}

      {account.ads.length > 0 && (
        <>
          <div style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.08em', color: 'var(--muted)', marginBottom: '10px' }}>
            Your Ads This Week
          </div>
          {account.ads.map((ad, i) => <AdCard key={i} ad={ad} maxSpend={maxSpend} />)}
        </>
      )}
    </div>
  );
}

// ─── Status panel ─────────────────────────────────────────
function StatusPanel({ onClose }) {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch(`${API}/api/status`)
      .then(r => r.json())
      .then(d => { setStatus(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)', display: 'flex', alignItems: 'flex-start', justifyContent: 'flex-end', zIndex: 100, padding: '60px 20px 0' }} onClick={onClose}>
      <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: '14px', padding: '22px 24px', width: '300px', maxHeight: '80vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--ink)' }}>System Status</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--muted)', fontSize: '16px', cursor: 'pointer' }}>✕</button>
        </div>
        {loading && <div style={{ fontSize: '13px', color: 'var(--muted)', textAlign: 'center', padding: '16px 0' }}>Checking...</div>}
        {status && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
            {[{ label: 'Meta API', ok: status.metaApi === 'ok' }, { label: 'Claude API', ok: status.claudeApi === 'ok' }].map((s, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 0', borderBottom: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '7px', fontSize: '13px', color: 'var(--ink-2)' }}>
                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: s.ok ? '#1a6b3c' : '#8a2a1a', display: 'inline-block' }} />
                  {s.label}
                </div>
                <span style={{ fontSize: '12px', color: s.ok ? '#1a6b3c' : '#8a2a1a' }}>{s.ok ? 'connected' : 'error'}</span>
              </div>
            ))}
            {[{ label: 'Uptime', value: `${status.uptime?.minutes ?? '—'}m` }, { label: 'Cached', value: status.cache?.count ?? 0 }].map((r, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '9px 0', borderBottom: '1px solid var(--border)', fontSize: '13px' }}>
                <span style={{ color: 'var(--muted)' }}>{r.label}</span>
                <span style={{ color: 'var(--ink)', fontWeight: 600 }}>{r.value}</span>
              </div>
            ))}
            <div style={{ fontSize: '11px', color: 'var(--muted)', textAlign: 'center', paddingTop: '12px' }}>
              {new Date(status.serverTime).toLocaleTimeString()}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── App ──────────────────────────────────────────────────
export default function App() {
  const [data,       setData]       = useState(null);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState(null);
  const [dateRange,  setDateRange]  = useState('last_7d');
  const [showStatus, setShowStatus] = useState(false);

  async function fetchAnalysis(force = false, range = dateRange) {
    setLoading(true); setError(null);
    try {
      const p = new URLSearchParams({ dateRange: range });
      if (force) p.set('force', 'true');
      const res  = await apiFetch(`${API}/api/analysis?${p}`);
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      setData(json.results);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchAnalysis(false, dateRange); }, [dateRange]); // eslint-disable-line

  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
  const dateRangeLabel = DATE_LABELS[dateRange] || 'Last 7 days';

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>

      {/* Nav */}
      <div style={{ background: '#fff', borderBottom: '1px solid var(--border)', padding: '0 24px', height: '52px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 10 }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
          <div className="pulse-dot" style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#4ade80', flexShrink: 0 }} />
          <span style={{ fontSize: '16px', fontWeight: 600, letterSpacing: '-.03em' }}>
            <span style={{ color: '#1a1916' }}>Ad</span><span style={{ color: '#1a6b3c' }}>Plain</span>
          </span>
        </div>

        {/* Right controls */}
        <div className="nav-right">
          <span className="nav-date">{today}</span>
          <select
            value={dateRange}
            onChange={e => setDateRange(e.target.value)}
            disabled={loading}
            style={{ background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--muted)', borderRadius: '6px', padding: '5px 8px', fontSize: '12px', fontWeight: 500, cursor: loading ? 'wait' : 'pointer', outline: 'none' }}
          >
            <option value="last_7d">Last 7 days</option>
            <option value="last_14d">Last 14 days</option>
            <option value="last_30d">Last 30 days</option>
          </select>
          <button onClick={() => setShowStatus(true)} style={{ background: 'none', border: 'none', color: 'var(--muted)', fontSize: '12px', cursor: 'pointer', padding: '4px', display: 'none' }} className="nav-status-hidden">
            Status
          </button>
          <button
            onClick={() => fetchAnalysis(true)}
            disabled={loading}
            style={{ background: '#1a1916', color: '#fff', border: 'none', borderRadius: '6px', padding: '6px 16px', fontSize: '12px', fontWeight: 500, cursor: loading ? 'wait' : 'pointer', opacity: loading ? .6 : 1, whiteSpace: 'nowrap' }}
          >
            {loading ? 'Analyzing...' : '↻ Refresh'}
          </button>
        </div>
      </div>

      {/* Hero strip — shown only when data is loaded */}
      {data && !loading && <HeroStrip results={data} />}

      {/* Body */}
      <div className="body-pad" style={{ maxWidth: '860px', margin: '0 auto', padding: '28px 24px' }}>

        {loading && <LoadingState />}

        {error && !loading && (
          <div style={{ background: 'var(--red-bg)', border: '1px solid var(--red-border)', borderRadius: '12px', padding: '20px', color: 'var(--red)', marginTop: '16px' }}>
            <div style={{ fontWeight: 600, marginBottom: '4px' }}>Connection error</div>
            <div style={{ fontSize: '13px', opacity: .85, marginBottom: '8px' }}>{error}</div>
            <div style={{ fontSize: '12px', color: 'var(--muted)' }}>Make sure the backend server is running.</div>
          </div>
        )}

        {data && !loading && data.map((account, i) => (
          <AccountSection key={i} account={account} dateRangeLabel={dateRangeLabel} />
        ))}
      </div>

      {showStatus && <StatusPanel onClose={() => setShowStatus(false)} />}
    </div>
  );
}
