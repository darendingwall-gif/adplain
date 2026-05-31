import { useState, useEffect } from 'react';
import './App.css';

const API     = process.env.REACT_APP_API_URL || 'https://adplain-backend-production.up.railway.app';
const API_KEY = process.env.REACT_APP_API_KEY || '';

function apiFetch(url) {
  return fetch(url, { headers: { 'x-api-key': API_KEY } });
}

const SCORE = {
  winner: { label: 'WINNER', bg: '#0a2016', color: '#4ade80', border: '#164d2e', dot: '#4ade80',  accent: 'rgba(74,222,128,.5)'  },
  pause:  { label: 'PAUSE',  bg: '#200a0a', color: '#f87171', border: '#4d1616', dot: '#f87171',  accent: 'rgba(248,113,113,.5)' },
  watch:  { label: 'WATCH',  bg: '#1a1500', color: '#fbbf24', border: '#4d3d00', dot: '#fbbf24',  accent: 'rgba(251,191,36,.4)'  },
};

const SECTION_STYLE = {
  '🟢': { color: '#4ade80', bg: 'rgba(74,222,128,.05)',  border: 'rgba(74,222,128,.14)'  },
  '🔴': { color: '#f87171', bg: 'rgba(248,113,113,.05)', border: 'rgba(248,113,113,.14)' },
  '💡': { color: '#fbbf24', bg: 'rgba(251,191,36,.05)',  border: 'rgba(251,191,36,.14)'  },
};

// ─── ScoreBadge ───────────────────────────────────────────
function ScoreBadge({ score }) {
  const s = SCORE[score] || SCORE.watch;
  return (
    <div style={{
      display: 'inline-flex', alignItems: 'center', gap: '6px',
      background: s.bg, border: `1px solid ${s.border}`,
      borderRadius: '6px', padding: '4px 10px', flexShrink: 0,
    }}>
      <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: s.dot }} />
      <span style={{ fontSize: '11px', fontWeight: 700, color: s.color, letterSpacing: '.08em' }}>
        {s.label}
      </span>
    </div>
  );
}

// ─── StatBox ─────────────────────────────────────────────
function StatBox({ label, value, sub, color, accent }) {
  return (
    <div style={{
      background: '#111110',
      border: '1px solid #252522',
      ...(accent && { borderLeft: `3px solid ${accent}` }),
      borderRadius: '10px', padding: '18px 18px', flex: 1, minWidth: '80px',
    }}>
      <div style={{
        fontSize: '10px', fontWeight: 600, letterSpacing: '.09em',
        textTransform: 'uppercase', color: '#504e48', marginBottom: '8px',
      }}>
        {label}
      </div>
      <div style={{
        fontSize: '28px', fontWeight: 700, color: color || '#f0ede6',
        letterSpacing: '-.03em', lineHeight: 1,
      }}>
        {value}
      </div>
      {sub && (
        <div style={{ fontSize: '11px', color: '#504e48', marginTop: '6px' }}>{sub}</div>
      )}
    </div>
  );
}

// ─── SummaryStrip ─────────────────────────────────────────
function SummaryStrip({ results }) {
  const totalSpend   = results.reduce((s, r) => s + r.ads.reduce((a, ad) => a + parseFloat(ad.spend), 0), 0);
  const totalWinners = results.reduce((s, r) => s + r.ads.filter(a => a.score === 'winner').length, 0);
  const totalPauses  = results.reduce((s, r) => s + r.ads.filter(a => a.score === 'pause').length, 0);
  const totalAds     = results.reduce((s, r) => s + r.ads.length, 0);
  const moneySaved   = results.reduce((s, r) =>
    s + r.ads.filter(a => a.score === 'pause').reduce((a, ad) => a + parseFloat(ad.spend), 0), 0);

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '48px' }}>
      <StatBox label="7-Day Spend"  value={`$${totalSpend.toFixed(0)}`} sub="across all accounts" />
      <StatBox label="Ads Running"  value={totalAds}                     sub="active this week" />
      <StatBox label="Winners"      value={totalWinners} color="#4ade80"  sub="performing well"
               accent="#4ade80" />
      <StatBox label="Pause Today"  value={totalPauses}  color="#f87171"
               sub={`~$${moneySaved.toFixed(0)} wasted/wk`} accent="#f87171" />
    </div>
  );
}

// ─── AdCard ───────────────────────────────────────────────
function AdCard({ ad, maxSpend }) {
  const s      = SCORE[ad.score] || SCORE.watch;
  const spendN = parseFloat(ad.spend);
  const pct    = maxSpend > 0 ? Math.round((spendN / maxSpend) * 100) : 0;

  return (
    <div style={{
      background: '#111110',
      border: '1px solid #1e1e1b',
      borderLeft: `3px solid ${s.accent}`,
      borderRadius: '12px', padding: '20px 22px', marginBottom: '12px',
    }}>
      {/* Name + badge */}
      <div style={{
        display: 'flex', justifyContent: 'space-between',
        alignItems: 'flex-start', marginBottom: '14px', gap: '12px',
      }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontSize: '14px', fontWeight: 600, color: '#f0ede6',
            marginBottom: '3px', whiteSpace: 'nowrap',
            overflow: 'hidden', textOverflow: 'ellipsis',
          }}>
            {ad.name}
          </div>
          <div style={{ fontSize: '12px', color: '#504e48' }}>{ad.campaign}</div>
        </div>
        <ScoreBadge score={ad.score} />
      </div>

      {/* Metrics */}
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '12px' }}>
        {[
          { label: 'Spend',      value: `$${ad.spend}` },
          { label: 'CTR',        value: `${ad.ctr}%` },
          { label: 'CPC',        value: `$${ad.cpc}` },
          { label: 'Clicks',     value: ad.clicks.toLocaleString() },
          ...(ad.costPerResult ? [{ label: 'Per Result', value: `$${ad.costPerResult}` }] : []),
        ].map((m, i) => (
          <div key={i} style={{
            background: '#0f0f0d', border: '1px solid #1e1e1b',
            borderRadius: '8px', padding: '8px 12px', minWidth: '70px',
          }}>
            <div style={{
              fontSize: '10px', color: '#504e48', fontWeight: 600,
              letterSpacing: '.07em', textTransform: 'uppercase', marginBottom: '3px',
            }}>
              {m.label}
            </div>
            <div style={{ fontSize: '16px', fontWeight: 700, color: '#f0ede6' }}>
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
                background: '#0a2016', border: '1px solid #164d2e',
                color: '#4ade80', borderRadius: '6px',
                padding: '4px 10px', fontSize: '12px', fontWeight: 600,
              }}>
                {icon} {cv.type}: {cv.value}
              </span>
            );
          })}
        </div>
      )}

      {/* Spend progress bar */}
      <div style={{ height: '3px', background: '#1a1a17', borderRadius: '2px' }}>
        <div style={{
          height: '100%', width: `${pct}%`,
          background: s.accent, borderRadius: '2px',
          transition: 'width .4s ease',
        }} />
      </div>
    </div>
  );
}

// ─── AISummary ────────────────────────────────────────────
function AISummary({ summary }) {
  if (!summary) return null;

  const cleaned = summary
    .replace(/^#{1,6}\s*/gm, '')
    .replace(/^[-*]{3,}\s*$/gm, '')
    .replace(/\*\*/g, '')
    .replace(/\*/g, '');

  const sections = cleaned.split(/(?=🟢|🔴|💡)/).filter(s => s.trim());

  return (
    <div style={{
      background: '#111110', border: '1px solid rgba(74,222,128,.12)',
      borderRadius: '16px', padding: '28px 32px', marginBottom: '28px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '24px' }}>
        <span style={{
          background: 'rgba(74,222,128,.1)', border: '1px solid rgba(74,222,128,.2)',
          color: '#4ade80', borderRadius: '999px', padding: '3px 12px',
          fontSize: '11px', fontWeight: 700, letterSpacing: '.08em',
        }}>
          ✦ AI ANALYSIS
        </span>
        <span style={{ fontSize: '12px', color: '#504e48' }}>Plain English · Updated just now</span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        {sections.map((section, i) => {
          const trim  = section.trim();
          const emoji = trim.startsWith('🟢') ? '🟢' : trim.startsWith('🔴') ? '🔴' : '💡';
          const style = SECTION_STYLE[emoji] || SECTION_STYLE['💡'];
          const lines = trim.split('\n').filter(l => l.trim());
          const header    = lines[0];
          const bodyLines = lines.slice(1).filter(l => l.trim());
          const bodyText  = bodyLines.join(' ');

          // Pull first sentence as headline
          const dotIdx   = bodyText.search(/[.!?](?=\s|$)/);
          const headline = dotIdx >= 0 ? bodyText.slice(0, dotIdx + 1) : bodyText.slice(0, 120);
          const rest     = dotIdx >= 0 ? bodyText.slice(dotIdx + 1).trim() : '';

          const isSteps = emoji === '💡';

          return (
            <div key={i} style={{
              background: style.bg, border: `1px solid ${style.border}`,
              borderRadius: '12px', padding: '20px 22px',
            }}>
              {/* Section label */}
              <div style={{
                fontSize: '11px', fontWeight: 700, color: style.color,
                letterSpacing: '.08em', textTransform: 'uppercase', marginBottom: '10px',
              }}>
                {header}
              </div>

              {isSteps ? (
                // Numbered steps — each step gets its own row with a number badge
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {bodyLines.map((step, j) => {
                    const m    = step.match(/^(\d+)\.\s*(?:\[([^\]]+)\]\s*)?(.+)/s);
                    const num  = m ? m[1] : String(j + 1);
                    const time = m ? m[2] : null;
                    const text = m ? m[3] : step;
                    return (
                      <div key={j} style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                        <div style={{
                          flexShrink: 0, width: '22px', height: '22px',
                          background: style.border, borderRadius: '50%',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: '11px', fontWeight: 700, color: style.color,
                        }}>
                          {num}
                        </div>
                        <div style={{ fontSize: '13px', color: '#a8a49c', lineHeight: 1.65 }}>
                          {time && (
                            <span style={{
                              fontSize: '11px', fontWeight: 600, color: style.color,
                              background: style.border, borderRadius: '4px',
                              padding: '1px 6px', marginRight: '6px',
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
              ) : (
                // Text section — bold headline + lighter body
                <div>
                  {headline && (
                    <div style={{
                      fontSize: '14px', fontWeight: 600, color: '#d8d4cc',
                      lineHeight: 1.5, marginBottom: rest ? '8px' : 0,
                    }}>
                      {headline}
                    </div>
                  )}
                  {rest && (
                    <div style={{ fontSize: '13px', color: '#7a7670', lineHeight: 1.75 }}>
                      {rest}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── AccountSection ───────────────────────────────────────
function AccountSection({ account, dateRangeLabel }) {
  const weeklySpend = account.ads.reduce((s, a) => s + parseFloat(a.spend), 0);
  const winners     = account.ads.filter(a => a.score === 'winner').length;
  const pauses      = account.ads.filter(a => a.score === 'pause').length;
  const maxSpend    = account.ads.reduce((m, a) => Math.max(m, parseFloat(a.spend)), 0);

  return (
    <div style={{ marginBottom: '72px' }}>
      {/* Account header */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end',
        marginBottom: '28px', paddingBottom: '20px',
        borderBottom: '1px solid #1e1e1b', flexWrap: 'wrap', gap: '12px',
      }}>
        <div>
          <div style={{
            fontSize: '10px', fontWeight: 700, letterSpacing: '.12em',
            textTransform: 'uppercase', color: '#504e48', marginBottom: '4px',
          }}>
            Ad Account
          </div>
          <div style={{ fontSize: '24px', fontWeight: 700, color: '#f0ede6', letterSpacing: '-.02em' }}>
            {account.name}
          </div>
          {account.cache && (
            <div style={{ fontSize: '11px', color: '#504e48', marginTop: '4px' }}>
              Cached · {account.cacheAge}m ago
            </div>
          )}
          {!account.cache && account.generatedAt && (
            <div style={{ fontSize: '11px', color: 'rgba(74,222,128,.5)', marginTop: '4px' }}>
              Live data
            </div>
          )}
        </div>
        <div style={{ display: 'flex', gap: '20px', alignItems: 'flex-end' }}>
          {[
            { label: dateRangeLabel + ' Spend', value: `$${weeklySpend.toFixed(2)}`, color: '#f0ede6' },
            { label: 'Winners',                  value: winners,                      color: '#4ade80' },
            { label: 'Pause',                    value: pauses,                       color: pauses > 0 ? '#f87171' : '#504e48' },
          ].map((stat, i) => (
            <div key={i} style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '10px', color: '#504e48', marginBottom: '2px',
                            textTransform: 'uppercase', letterSpacing: '.08em' }}>
                {stat.label}
              </div>
              <div style={{ fontSize: '20px', fontWeight: 700, color: stat.color }}>
                {stat.value}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* No ads */}
      {account.status === 'no_ads' && (
        <div style={{
          textAlign: 'center', padding: '48px', color: '#504e48',
          background: '#111110', border: '1px solid #1e1e1b',
          borderRadius: '12px', fontSize: '14px',
        }}>
          No ads ran in the last {dateRangeLabel.toLowerCase()}
        </div>
      )}

      {account.summary && <AISummary summary={account.summary} />}
      {account.ads.map((ad, i) => <AdCard key={i} ad={ad} maxSpend={maxSpend} />)}
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

  const dot = ok => (
    <span style={{
      display: 'inline-block', width: '7px', height: '7px', borderRadius: '50%',
      background: ok ? '#4ade80' : '#f87171', marginRight: '8px', flexShrink: 0,
    }} />
  );

  return (
    <div
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,.6)',
        display: 'flex', alignItems: 'flex-start', justifyContent: 'flex-end',
        zIndex: 100, padding: '60px 24px 0',
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: '#111110', border: '1px solid #252522',
          borderRadius: '16px', padding: '24px 28px', width: '340px',
          maxHeight: '80vh', overflowY: 'auto',
        }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          marginBottom: '20px',
        }}>
          <div style={{ fontSize: '14px', fontWeight: 700, color: '#f0ede6' }}>System Status</div>
          <button onClick={onClose} style={{
            background: 'none', border: 'none', color: '#504e48',
            fontSize: '18px', cursor: 'pointer', lineHeight: 1,
          }}>✕</button>
        </div>

        {loading && (
          <div style={{ fontSize: '13px', color: '#504e48', textAlign: 'center', padding: '20px 0' }}>
            Checking...
          </div>
        )}

        {status && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Services */}
            <div>
              <div style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '.1em',
                            textTransform: 'uppercase', color: '#504e48', marginBottom: '10px' }}>
                Services
              </div>
              {[
                { label: 'Meta API',   ok: status.metaApi   === 'ok', detail: status.metaApi   },
                { label: 'Claude API', ok: status.claudeApi === 'ok', detail: status.claudeApi },
              ].map((s, i) => (
                <div key={i} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '8px 0', borderBottom: '1px solid #1e1e1b',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', fontSize: '13px', color: '#a8a49c' }}>
                    {dot(s.ok)} {s.label}
                  </div>
                  <div style={{ fontSize: '12px', color: s.ok ? '#4ade80' : '#f87171' }}>
                    {s.ok ? 'connected' : 'error'}
                  </div>
                </div>
              ))}
            </div>

            {/* Server */}
            <div>
              <div style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '.1em',
                            textTransform: 'uppercase', color: '#504e48', marginBottom: '10px' }}>
                Server
              </div>
              {[
                { label: 'Uptime',       value: `${status.uptime?.minutes ?? '—'}m` },
                { label: 'Cache entries', value: status.cache?.count ?? 0 },
              ].map((row, i) => (
                <div key={i} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '8px 0', borderBottom: '1px solid #1e1e1b',
                  fontSize: '13px',
                }}>
                  <span style={{ color: '#a8a49c' }}>{row.label}</span>
                  <span style={{ color: '#f0ede6', fontWeight: 600 }}>{row.value}</span>
                </div>
              ))}
            </div>

            {/* Cache entries */}
            {status.cache?.count > 0 && (
              <div>
                <div style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '.1em',
                              textTransform: 'uppercase', color: '#504e48', marginBottom: '10px' }}>
                  Cached Analyses
                </div>
                {status.cache.entries.map((e, i) => (
                  <div key={i} style={{
                    fontSize: '12px', color: '#7a7670', padding: '5px 0',
                    borderBottom: '1px solid #1a1a17',
                  }}>
                    <span style={{ color: '#a8a49c' }}>{e.key}</span>
                    <span style={{ float: 'right' }}>{e.ageMin}m ago</span>
                  </div>
                ))}
              </div>
            )}

            <div style={{ fontSize: '11px', color: '#3a3a35', textAlign: 'center', paddingTop: '4px' }}>
              {new Date(status.serverTime).toLocaleTimeString()}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main App ─────────────────────────────────────────────
const DATE_LABELS = {
  last_7d:  'Last 7 days',
  last_14d: 'Last 14 days',
  last_30d: 'Last 30 days',
};

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

  // Refetch whenever the date range changes (also runs on initial mount)
  useEffect(() => { fetchAnalysis(false, dateRange); }, [dateRange]); // eslint-disable-line

  const dateRangeLabel = DATE_LABELS[dateRange] || 'Last 7 days';

  return (
    <div style={{ minHeight: '100vh', background: '#0f0f0d' }}>

      {/* Nav */}
      <div style={{
        background: '#111110', borderBottom: '1px solid #1e1e1b',
        padding: '0 28px', height: '52px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        position: 'sticky', top: 0, zIndex: 10,
      }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontWeight: 700, fontSize: '17px', color: '#f0ede6', letterSpacing: '-.02em' }}>
            Ad<span style={{ color: '#4ade80' }}>Plain</span>
          </span>
          <span style={{
            fontSize: '10px', color: '#504e48', background: '#1a1a17',
            border: '1px solid #252522', borderRadius: '4px', padding: '2px 7px',
            fontWeight: 600, letterSpacing: '.06em',
          }}>
            BETA
          </span>
        </div>

        {/* Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {/* Date range selector */}
          <select
            value={dateRange}
            onChange={e => setDateRange(e.target.value)}
            disabled={loading}
            style={{
              background: '#1a1a17', border: '1px solid #252522', color: '#a8a49c',
              borderRadius: '7px', padding: '5px 10px', fontSize: '12px',
              fontWeight: 600, cursor: loading ? 'wait' : 'pointer', outline: 'none',
            }}
          >
            <option value="last_7d">Last 7 days</option>
            <option value="last_14d">Last 14 days</option>
            <option value="last_30d">Last 30 days</option>
          </select>

          {/* Status link */}
          <button
            onClick={() => setShowStatus(true)}
            style={{
              background: 'none', border: 'none', color: '#504e48',
              fontSize: '12px', cursor: 'pointer', padding: '5px 4px',
            }}
          >
            System Status
          </button>

          {/* Last run */}
          {lastRun && !loading && (
            <span style={{ fontSize: '12px', color: '#504e48' }}>
              Updated {lastRun.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}

          {/* Refresh — always uses force=true */}
          <button
            onClick={() => fetchAnalysis(true)}
            disabled={loading}
            style={{
              background: loading ? '#1a1a17' : 'rgba(74,222,128,.1)',
              border: `1px solid ${loading ? '#252522' : 'rgba(74,222,128,.25)'}`,
              color: loading ? '#504e48' : '#4ade80',
              borderRadius: '7px', padding: '6px 16px',
              fontSize: '12px', fontWeight: 600,
              cursor: loading ? 'wait' : 'pointer', letterSpacing: '.03em',
            }}
          >
            {loading ? 'Analyzing...' : '↻ Refresh'}
          </button>
        </div>
      </div>

      {/* Content */}
      <div style={{ maxWidth: '860px', margin: '0 auto', padding: '52px 32px' }}>

        {/* Page title */}
        <div style={{ marginBottom: '40px' }}>
          <h1 style={{
            fontSize: '28px', fontWeight: 700, color: '#f0ede6',
            letterSpacing: '-.03em', marginBottom: '6px',
          }}>
            Your Ad Performance
          </h1>
          <p style={{ fontSize: '13px', color: '#504e48', letterSpacing: '.01em' }}>
            {dateRangeLabel} · All accounts · Plain English
          </p>
        </div>

        {/* Loading */}
        {loading && (
          <div style={{ textAlign: 'center', padding: '100px 0' }}>
            <div className="spinner" style={{
              width: '40px', height: '40px', border: '2px solid #252522',
              borderTop: '2px solid #4ade80', borderRadius: '50%',
              margin: '0 auto 20px',
            }} />
            <div style={{ fontSize: '15px', color: '#6a6660', marginBottom: '6px' }}>
              Pulling your ad data...
            </div>
            <div style={{ fontSize: '12px', color: '#3a3a35' }}>
              AI is reading every ad · takes 20–40 seconds
            </div>
          </div>
        )}

        {/* Error */}
        {error && !loading && (
          <div style={{
            background: '#200a0a', border: '1px solid #4d1616',
            borderRadius: '12px', padding: '24px', color: '#f87171',
          }}>
            <div style={{ fontWeight: 700, marginBottom: '6px' }}>Connection error</div>
            <div style={{ fontSize: '13px', opacity: .75 }}>{error}</div>
            <div style={{ fontSize: '12px', color: '#6a6660', marginTop: '12px' }}>
              Make sure your backend server is running on port 3001.
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
