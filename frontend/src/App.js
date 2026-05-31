import { useState, useEffect } from 'react';
import './App.css';

const API     = process.env.REACT_APP_API_URL || 'https://adplain-backend-production.up.railway.app';
const API_KEY = process.env.REACT_APP_API_KEY || '';

function apiFetch(url) {
  return fetch(url, { headers: { 'x-api-key': API_KEY } });
}

// ─── Score config ─────────────────────────────────────────
const SCORE = {
  winner: {
    label: 'WINNER', color: 'var(--green)', dot: 'var(--green)',
    bg: 'rgba(74,222,128,.08)', border: 'rgba(74,222,128,.2)',
    leftBorder: 'var(--green)', glow: '0 0 0 1px rgba(74,222,128,.1), 0 4px 24px rgba(74,222,128,.07)',
  },
  pause: {
    label: 'PAUSE', color: 'var(--red)', dot: 'var(--red)',
    bg: 'rgba(248,113,113,.08)', border: 'rgba(248,113,113,.2)',
    leftBorder: 'var(--red)', glow: 'none',
  },
  watch: {
    label: 'WATCH', color: 'var(--amber)', dot: 'var(--amber)',
    bg: 'rgba(251,191,36,.08)', border: 'rgba(251,191,36,.2)',
    leftBorder: 'var(--amber)', glow: 'none',
  },
};

const DATE_LABELS = {
  last_7d: 'Last 7 days', last_14d: 'Last 14 days', last_30d: 'Last 30 days',
};

// ─── ScoreBadge ───────────────────────────────────────────
function ScoreBadge({ score }) {
  const s = SCORE[score] || SCORE.watch;
  return (
    <div style={{
      display: 'inline-flex', alignItems: 'center', gap: '5px',
      background: s.bg, border: `1px solid ${s.border}`,
      borderRadius: '6px', padding: '4px 9px', flexShrink: 0,
    }}>
      <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: s.dot }} />
      <span style={{ fontSize: '11px', fontWeight: 700, color: s.color, letterSpacing: '.08em' }}>
        {s.label}
      </span>
    </div>
  );
}

// ─── StatBox ─────────────────────────────────────────────
function StatBox({ label, value, sub, color, accentColor, accentBg }) {
  return (
    <div style={{
      background: accentBg || 'var(--bg-card)',
      border: '1px solid var(--border-subtle)',
      borderLeft: accentColor ? `3px solid ${accentColor}` : '1px solid var(--border-subtle)',
      borderRadius: '12px',
      padding: '16px 18px',
    }}>
      <div style={{
        fontSize: '10px', fontWeight: 700, letterSpacing: '.1em',
        textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '10px',
      }}>
        {label}
      </div>
      <div style={{
        fontSize: '34px', fontWeight: 800, color: color || 'var(--text-primary)',
        letterSpacing: '-.04em', lineHeight: 1,
      }}>
        {value}
      </div>
      {sub && (
        <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '7px' }}>{sub}</div>
      )}
    </div>
  );
}

// ─── SummaryStrip ─────────────────────────────────────────
function SummaryStrip({ results }) {
  const totalSpend  = results.reduce((s, r) => s + r.ads.reduce((a, ad) => a + parseFloat(ad.spend), 0), 0);
  const totalAds    = results.reduce((s, r) => s + r.ads.length, 0);
  const totalWin    = results.reduce((s, r) => s + r.ads.filter(a => a.score === 'winner').length, 0);
  const totalPause  = results.reduce((s, r) => s + r.ads.filter(a => a.score === 'pause').length, 0);
  const moneyAtRisk = results.reduce((s, r) =>
    s + r.ads.filter(a => a.score === 'pause').reduce((a, ad) => a + parseFloat(ad.spend), 0), 0);

  return (
    <div className="stats-grid">
      <StatBox label="7-Day Spend"    value={`$${totalSpend.toFixed(0)}`}   sub="across all accounts" />
      <StatBox label="Active Ads"     value={totalAds}                       sub="running this week" />
      <StatBox label="Winners"        value={totalWin}    color="var(--green)"
               accentColor="var(--green)"  accentBg="var(--green-bg)"
               sub={`${totalWin === 1 ? 'ad' : 'ads'} performing well`} />
      <StatBox label="Pause Today"    value={totalPause}  color="var(--red)"
               accentColor="var(--red)"    accentBg="var(--red-bg)"
               sub={`${totalPause === 1 ? 'ad' : 'ads'} to stop`} />
      <StatBox label="Money at Risk"  value={`$${moneyAtRisk.toFixed(0)}`} color="var(--red)"
               accentColor="var(--red)"    accentBg="var(--red-bg)"
               sub="spent on pause ads" />
    </div>
  );
}

// ─── SkeletonCard ─────────────────────────────────────────
function SkeletonCard() {
  return (
    <div style={{
      background: 'var(--bg-card)', border: '1px solid var(--border-default)',
      borderLeft: '3px solid var(--border-subtle)',
      borderRadius: '12px', padding: '20px 22px', marginBottom: '12px',
    }}>
      <div style={{ display: 'flex', gap: '10px', marginBottom: '16px', alignItems: 'center' }}>
        <div className="skeleton" style={{ width: '62px', height: '24px', borderRadius: '6px' }} />
        <div className="skeleton" style={{ flex: 1, height: '16px', maxWidth: '200px' }} />
      </div>
      <div style={{ display: 'flex', gap: '8px', marginBottom: '14px' }}>
        {[80, 72, 72, 80].map((w, i) => (
          <div key={i} className="skeleton" style={{ width: w, height: '52px', borderRadius: '8px' }} />
        ))}
      </div>
      <div className="skeleton" style={{ height: '3px', borderRadius: '2px' }} />
    </div>
  );
}

// ─── LoadingMessages ──────────────────────────────────────
const LOADING_MSGS = ['Reading your ads...', 'Comparing performance...', 'Writing your summary...'];

function LoadingState() {
  const [idx, setIdx] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setIdx(i => (i + 1) % LOADING_MSGS.length), 3000);
    return () => clearInterval(t);
  }, []);

  return (
    <div style={{ paddingTop: '24px' }}>
      <SkeletonCard />
      <SkeletonCard />
      <div style={{ textAlign: 'center', padding: '32px 0 16px' }}>
        <div style={{ fontSize: '15px', color: 'var(--text-secondary)', marginBottom: '6px', minHeight: '24px' }}>
          {LOADING_MSGS[idx]}
        </div>
        <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
          AI is reading every ad · takes 20–40 seconds
        </div>
      </div>
    </div>
  );
}

// ─── AdCard ───────────────────────────────────────────────
function AdCard({ ad, totalAccountSpend }) {
  const s    = SCORE[ad.score] || SCORE.watch;
  const pct  = totalAccountSpend > 0
    ? Math.min(100, Math.round((parseFloat(ad.spend) / totalAccountSpend) * 100))
    : 0;

  const allMetrics = [
    { label: 'Spend',      value: `$${ad.spend}`,              desktop: false },
    { label: 'CTR',        value: `${ad.ctr}%`,                desktop: false },
    ...(ad.costPerResult ? [{ label: 'Cost/Result', value: `$${ad.costPerResult}`, desktop: false }] : []),
    { label: 'CPC',        value: `$${ad.cpc}`,                desktop: true  },
    { label: 'Clicks',     value: ad.clicks.toLocaleString(),   desktop: true  },
  ];

  return (
    <div className="fade-in" style={{
      background: 'var(--bg-card)',
      border: '1px solid var(--border-default)',
      borderLeft: `3px solid ${s.leftBorder}`,
      borderRadius: '12px', padding: '18px 20px', marginBottom: '12px',
      boxShadow: s.glow,
    }}>
      {/* Badge + name row — badge is FIRST (left) */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', marginBottom: '14px' }}>
        <ScoreBadge score={ad.score} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)',
            lineHeight: 1.3, marginBottom: '2px',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {ad.name}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{ad.campaign}</div>
        </div>
      </div>

      {/* Metrics */}
      <div className="metrics-row">
        {allMetrics.map((m, i) => (
          <div key={i} className={`metric-pill${m.desktop ? ' metric-desktop' : ''}`}>
            <div style={{
              fontSize: '10px', color: 'var(--text-muted)', fontWeight: 600,
              letterSpacing: '.07em', textTransform: 'uppercase', marginBottom: '4px',
            }}>
              {m.label}
            </div>
            <div style={{ fontSize: '17px', fontWeight: 700, color: 'var(--text-primary)' }}>
              {m.value}
            </div>
          </div>
        ))}
      </div>

      {/* Conversions */}
      {ad.conversions.length > 0 && (
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '14px' }}>
          {ad.conversions.map((cv, i) => {
            const icon = cv.type === 'Leads' ? '🎯' : cv.type === 'Purchases' ? '💰' :
                         cv.type === 'Contacts' ? '📞' : '💬';
            return (
              <span key={i} style={{
                background: 'rgba(74,222,128,.08)', border: '1px solid rgba(74,222,128,.2)',
                color: 'var(--green)', borderRadius: '8px',
                padding: '5px 12px', fontSize: '13px', fontWeight: 700,
              }}>
                {icon} {cv.value} {cv.type}
              </span>
            );
          })}
        </div>
      )}

      {/* Spend bar — % of total account spend */}
      <div style={{ height: '3px', background: 'var(--bg-elevated)', borderRadius: '2px' }}>
        <div style={{
          height: '100%', width: `${pct}%`,
          background: s.leftBorder, borderRadius: '2px',
          transition: 'width .5s ease', opacity: 0.5,
        }} />
      </div>
    </div>
  );
}

// ─── AISummary ────────────────────────────────────────────
const AI_SECTION_CLASS = { '🟢': 'ai-section-green', '🔴': 'ai-section-red', '💡': 'ai-section-amber' };
const AI_SECTION_COLOR = { '🟢': 'var(--green)', '🔴': 'var(--red)', '💡': 'var(--amber)' };

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
    <div style={{
      background: 'var(--bg-card)', border: '1px solid rgba(74,222,128,.12)',
      borderRadius: '16px', padding: '22px 24px', marginBottom: '28px',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
        <span style={{
          background: 'rgba(74,222,128,.1)', border: '1px solid rgba(74,222,128,.2)',
          color: 'var(--green)', borderRadius: '999px', padding: '3px 12px',
          fontSize: '11px', fontWeight: 700, letterSpacing: '.08em',
        }}>
          ✦ AI ANALYSIS
        </span>
        <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Plain English · Updated just now</span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {sections.map((section, i) => {
          const trim  = section.trim();
          const emoji = trim.startsWith('🟢') ? '🟢' : trim.startsWith('🔴') ? '🔴' : '💡';
          const color = AI_SECTION_COLOR[emoji];
          const cls   = AI_SECTION_CLASS[emoji] || 'ai-section-amber';
          const lines = trim.split('\n').filter(l => l.trim());
          const header    = lines[0];
          const bodyLines = lines.slice(1).filter(l => l.trim());
          const isSteps   = emoji === '💡';
          const isOpen    = expanded[i] || false;

          if (isSteps) {
            return (
              <div key={i} className={`ai-section ${cls}`}>
                <div style={{
                  fontSize: '11px', fontWeight: 700, color, letterSpacing: '.1em',
                  textTransform: 'uppercase', marginBottom: '14px',
                }}>
                  {header}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {bodyLines.map((step, j) => {
                    const m    = step.match(/^(\d+)\.\s*(?:\[([^\]]+)\]\s*)?(.+)/s);
                    const num  = m ? m[1] : String(j + 1);
                    const time = m ? m[2] : null;
                    const text = m ? m[3] : step;
                    return (
                      <div key={j} style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                        {/* Circle number badge */}
                        <div style={{
                          flexShrink: 0, width: '24px', height: '24px', borderRadius: '50%',
                          background: `${color}18`, border: `1px solid ${color}40`,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: '11px', fontWeight: 800, color,
                        }}>
                          {num}
                        </div>
                        <div style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.65, paddingTop: '3px' }}>
                          {time && (
                            <span style={{
                              fontSize: '10px', fontWeight: 700, color,
                              background: `${color}15`, borderRadius: '4px',
                              padding: '1px 6px', marginRight: '7px', letterSpacing: '.04em',
                            }}>
                              {time}
                            </span>
                          )}
                          {text}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          }

          // Text sections — first 2 sentences visible, rest behind toggle
          const bodyText = bodyLines.join(' ');
          const sentences = bodyText.match(/[^.!?]*[.!?]+/g) || [bodyText];
          const preview   = sentences.slice(0, 2).join(' ').trim();
          const rest      = sentences.slice(2).join(' ').trim();
          const hasMore   = rest.length > 0;

          return (
            <div key={i} className={`ai-section ${cls}`}>
              <div style={{
                fontSize: '11px', fontWeight: 700, color, letterSpacing: '.1em',
                textTransform: 'uppercase', marginBottom: '12px',
              }}>
                {header}
              </div>
              <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1.55, marginBottom: '6px' }}>
                {preview}
              </div>
              {isOpen && rest && (
                <div style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.75, marginBottom: '10px' }}>
                  {rest}
                </div>
              )}
              {hasMore && (
                <button
                  onClick={() => setExpanded(e => ({ ...e, [i]: !e[i] }))}
                  style={{
                    background: 'none', border: 'none', padding: 0,
                    fontSize: '12px', fontWeight: 600, color,
                    cursor: 'pointer', letterSpacing: '.02em',
                  }}
                >
                  {isOpen ? '↑ Show less' : '↓ Show full analysis'}
                </button>
              )}
            </div>
          );
        })}
      </div>

      <div style={{ fontSize: '10px', color: 'var(--text-muted)', textAlign: 'center', marginTop: '16px', letterSpacing: '.04em' }}>
        Generated by Claude AI · Not financial advice
      </div>
    </div>
  );
}

// ─── AccountSection ───────────────────────────────────────
function AccountSection({ account, dateRangeLabel }) {
  const totalSpend       = account.ads.reduce((s, a) => s + parseFloat(a.spend), 0);
  const totalAccountSpend = totalSpend; // alias for AdCard prop clarity
  const winners          = account.ads.filter(a => a.score === 'winner').length;
  const pauses           = account.ads.filter(a => a.score === 'pause').length;

  return (
    <div style={{ marginBottom: '72px' }}>
      {/* Account header */}
      <div style={{
        marginBottom: '28px', paddingBottom: '20px',
        borderBottom: '1px solid var(--border-default)',
      }}>
        <div style={{
          fontSize: '10px', fontWeight: 700, letterSpacing: '.12em',
          textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '6px',
        }}>
          Ad Account
        </div>
        <div style={{
          fontSize: '28px', fontWeight: 800, color: 'var(--text-primary)',
          letterSpacing: '-.03em', lineHeight: 1.1, marginBottom: '10px',
        }}>
          {account.name}
        </div>
        {/* Inline stat pills */}
        <div className="account-stats">
          {account.cache ? (
            <span className="stat-pill stat-pill-cached">
              ⏱ Cached · {account.cacheAge}m ago
            </span>
          ) : account.generatedAt ? (
            <span className="stat-pill stat-pill-live">
              ● Live data
            </span>
          ) : null}
          <span className="stat-pill">
            ${totalSpend.toFixed(0)} {dateRangeLabel.toLowerCase()}
          </span>
          {winners > 0 && (
            <span className="stat-pill stat-pill-green">
              ↑ {winners} winner{winners !== 1 ? 's' : ''}
            </span>
          )}
          {pauses > 0 && (
            <span className="stat-pill stat-pill-red">
              ⚠ {pauses} pause{pauses !== 1 ? 's' : ''}
            </span>
          )}
        </div>
      </div>

      {/* Empty state */}
      {account.status === 'no_ads' && (
        <div style={{
          textAlign: 'center', padding: '56px 32px',
          background: 'var(--bg-card)', border: '1px solid var(--border-default)',
          borderRadius: '16px',
        }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>📊</div>
          <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '8px' }}>
            No ads this week
          </div>
          <div style={{ fontSize: '13px', color: 'var(--text-muted)', maxWidth: '300px', margin: '0 auto', lineHeight: 1.6 }}>
            Connect a campaign in Meta Ads Manager and AdPlain will analyze it here.
          </div>
        </div>
      )}

      {account.summary && <AISummary summary={account.summary} />}
      {account.ads.map((ad, i) => (
        <AdCard key={i} ad={ad} totalAccountSpend={totalAccountSpend} />
      ))}
    </div>
  );
}

// ─── StatusPanel ──────────────────────────────────────────
function StatusPanel({ onClose }) {
  const [status,  setStatus]  = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch(`${API}/api/status`)
      .then(r => r.json())
      .then(d => { setStatus(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  return (
    <div
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,.65)',
        display: 'flex', alignItems: 'flex-start', justifyContent: 'flex-end',
        zIndex: 100, padding: '60px 20px 0',
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: 'var(--bg-card)', border: '1px solid var(--border-subtle)',
          borderRadius: '16px', padding: '22px 26px', width: '320px',
          maxHeight: '80vh', overflowY: 'auto',
        }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
          <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>System Status</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '18px', cursor: 'pointer' }}>✕</button>
        </div>

        {loading && (
          <div style={{ fontSize: '13px', color: 'var(--text-muted)', textAlign: 'center', padding: '20px 0' }}>Checking...</div>
        )}

        {status && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {[
              { label: 'Meta API',   ok: status.metaApi   === 'ok' },
              { label: 'Claude API', ok: status.claudeApi === 'ok' },
            ].map((s, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid var(--border-default)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: 'var(--text-secondary)' }}>
                  <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: s.ok ? 'var(--green)' : 'var(--red)', display: 'inline-block' }} />
                  {s.label}
                </div>
                <span style={{ fontSize: '12px', color: s.ok ? 'var(--green)' : 'var(--red)' }}>{s.ok ? 'connected' : 'error'}</span>
              </div>
            ))}
            {[
              { label: 'Uptime',        value: `${status.uptime?.minutes ?? '—'}m` },
              { label: 'Cached results', value: status.cache?.count ?? 0 },
            ].map((row, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--border-default)', fontSize: '13px' }}>
                <span style={{ color: 'var(--text-secondary)' }}>{row.label}</span>
                <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{row.value}</span>
              </div>
            ))}
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', textAlign: 'center' }}>
              {new Date(status.serverTime).toLocaleTimeString()}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main App ─────────────────────────────────────────────
export default function App() {
  const [data,       setData]       = useState(null);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState(null);
  const [lastRun,    setLastRun]    = useState(null);
  const [dateRange,  setDateRange]  = useState('last_7d');
  const [showStatus, setShowStatus] = useState(false);

  async function fetchAnalysis(force = false, range = dateRange) {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ dateRange: range });
      if (force) params.set('force', 'true');
      const res  = await apiFetch(`${API}/api/analysis?${params}`);
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      setData(json.results);
      setLastRun(new Date());
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchAnalysis(false, dateRange); }, [dateRange]); // eslint-disable-line

  const dateRangeLabel = DATE_LABELS[dateRange] || 'Last 7 days';

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)' }}>

      {/* Nav */}
      <div style={{
        background: 'var(--bg-card)', borderBottom: '1px solid var(--border-default)',
        padding: '0 20px', height: '52px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        position: 'sticky', top: 0, zIndex: 10,
      }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
          <span style={{ fontWeight: 800, fontSize: '17px', color: 'var(--text-primary)', letterSpacing: '-.03em' }}>
            Ad<span style={{ color: 'var(--green)' }}>Plain</span>
          </span>
          <span style={{
            fontSize: '10px', color: 'var(--text-muted)', background: 'var(--bg-elevated)',
            border: '1px solid var(--border-subtle)', borderRadius: '4px', padding: '2px 6px',
            fontWeight: 700, letterSpacing: '.06em',
          }}>BETA</span>
        </div>

        {/* Controls */}
        <div className="nav-inner">
          <select
            value={dateRange}
            onChange={e => setDateRange(e.target.value)}
            disabled={loading}
            style={{
              background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)',
              color: 'var(--text-secondary)', borderRadius: '7px', padding: '5px 10px',
              fontSize: '12px', fontWeight: 600, cursor: loading ? 'wait' : 'pointer', outline: 'none',
            }}
          >
            <option value="last_7d">Last 7 days</option>
            <option value="last_14d">Last 14 days</option>
            <option value="last_30d">Last 30 days</option>
          </select>

          <button className="nav-status-btn" onClick={() => setShowStatus(true)}>
            System Status
          </button>

          {lastRun && !loading && (
            <span className="nav-updated">
              Updated {lastRun.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}

          <button
            onClick={() => fetchAnalysis(true)}
            disabled={loading}
            style={{
              background: loading ? 'var(--bg-elevated)' : 'rgba(74,222,128,.1)',
              border: `1px solid ${loading ? 'var(--border-subtle)' : 'rgba(74,222,128,.3)'}`,
              color: loading ? 'var(--text-muted)' : 'var(--green)',
              borderRadius: '7px', padding: '6px 16px',
              fontSize: '12px', fontWeight: 700,
              cursor: loading ? 'wait' : 'pointer', letterSpacing: '.03em',
              whiteSpace: 'nowrap',
            }}
          >
            {loading ? 'Analyzing...' : '↻ Refresh'}
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="content-pad" style={{ maxWidth: '880px', margin: '0 auto', padding: '44px 28px' }}>

        {/* Page title */}
        <div style={{ marginBottom: '36px' }}>
          <h1 style={{
            fontSize: '26px', fontWeight: 800, color: 'var(--text-primary)',
            letterSpacing: '-.03em', marginBottom: '5px',
          }}>
            Your Ad Performance
          </h1>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
            {dateRangeLabel} · All accounts · Plain English
          </p>
        </div>

        {/* Loading — skeleton cards + cycling message */}
        {loading && <LoadingState />}

        {/* Error */}
        {error && !loading && (
          <div style={{
            background: 'var(--red-bg)', border: '1px solid rgba(248,113,113,.25)',
            borderRadius: '14px', padding: '24px', color: 'var(--red)',
          }}>
            <div style={{ fontWeight: 700, marginBottom: '6px', fontSize: '15px' }}>Connection error</div>
            <div style={{ fontSize: '13px', opacity: .8, marginBottom: '10px' }}>{error}</div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              Make sure the backend server is running.
            </div>
          </div>
        )}

        {/* Results */}
        {data && !loading && (
          <>
            <SummaryStrip results={data} />
            {data.map((account, i) => (
              <AccountSection key={i} account={account} dateRangeLabel={dateRangeLabel} />
            ))}
          </>
        )}
      </div>

      {showStatus && <StatusPanel onClose={() => setShowStatus(false)} />}
    </div>
  );
}
