import { useState, useEffect, useCallback, useRef } from 'react'
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer
} from 'recharts'
import { AUTH } from './auth'
import { getCatMeta, autoCategorize, CATEGORIES, getRandomGreeting } from './categories'
import LockScreen from './LockScreen'

const STORAGE_KEY = 'mt_entries'

function loadEntries() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]') }
  catch { return [] }
}
function saveEntries(entries) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries))
}

const WALLET_ICON = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 12V7H5a2 2 0 0 1 0-4h14v4" />
    <path d="M3 5v14a2 2 0 0 0 2 2h16v-5" />
    <path d="M18 12h0" />
  </svg>
)

const PIE_COLORS = [
  '#6B7F8D', // slate blue
  '#A0937D', // warm taupe
  '#7A9E9F', // muted teal
  '#C28B8B', // dusty rose
  '#8A9A7B', // muted olive
  '#9B8EA8', // dusty lavender
  '#C4A882', // warm sand
  '#7B9A8F', // sage
  '#B0B0B0', // grey (catch-all)
]

const formatDate = (d) => {
  const date = new Date(d)
  const day = date.getDate()
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
  return `${day} ${months[date.getMonth()]}`
}
const fmt = (n) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0 }).format(n)

export default function App() {
  const [unlocked, setUnlocked] = useState(false)
  const [entries, setEntries] = useState([])
  const [loading, setLoading] = useState(true)
  const [chartRange, setChartRange] = useState('monthly')
  const [navView, setNavView] = useState('home')
  const [historyFilter, setHistoryFilter] = useState('all')
  const [statsView, setStatsView] = useState('month') // 'day' | 'week' | 'month'
  const [statsDate, setStatsDate] = useState(new Date())
  const [modalOpen, setModalOpen] = useState(false)
  const [toast, setToast] = useState('')
  const [userName, setUserName] = useState(() => localStorage.getItem('mt_username') || 'User')
  const [greeting, setGreeting] = useState('')
  const [profileOpen, setProfileOpen] = useState(false)
  const [editName, setEditName] = useState('')
  const [confirmResetOpen, setConfirmResetOpen] = useState(false)
  const [resetting, setResetting] = useState(false)

  // Form state
  const [amount, setAmount] = useState('')
  const [type, setType] = useState('withdrawal')
  const [categoryInput, setCategoryInput] = useState('')
  const [description, setDescription] = useState('')
  const [manualCat, setManualCat] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const historyScrollRef = useRef(null)
  // Set random greeting once on mount
  useEffect(() => {
    const name = localStorage.getItem('mt_username') || 'User'
    setGreeting(getRandomGreeting(name))
  }, [])

  const showToast = useCallback((msg) => {
    setToast(msg)
    setTimeout(() => setToast(''), 2200)
  }, [])

  const fetchEntries = useCallback(() => {
    setEntries(loadEntries())
    setLoading(false)
  }, [])

  useEffect(() => {
    if (AUTH.isUnlocked()) {
      setUnlocked(true)
      fetchEntries()
    }
  }, [fetchEntries])

  // ── Stats / Calendar helpers ──
  const DAYS = ['Su','Mo','Tu','We','Th','Fr','Sa']
  const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']

  const getWeekStart = (d) => {
    const r = new Date(d)
    r.setDate(r.getDate() - r.getDay())
    r.setHours(0,0,0,0)
    return r
  }
  const fmtDateKey = (d) => d.toISOString().split('T')[0]

  const getStatsForRange = (start, endExclusive) => {
    const inRange = entries.filter(e => {
      const d = new Date(e.date)
      return d >= start && d < endExclusive
    })
    const credited = inRange.filter(e => e.type === 'deposit').reduce((s, e) => s + e.amount, 0)
    const spent = inRange.filter(e => e.type === 'withdrawal').reduce((s, e) => s + e.amount, 0)
    const net = credited - spent
    const grouped = {}
    inRange.filter(e => e.type === 'withdrawal').forEach(e => {
      grouped[e.category] = (grouped[e.category] || 0) + e.amount
    })
    const total = Object.values(grouped).reduce((s, v) => s + v, 0)
    const pieData = Object.entries(grouped).map(([category, amount]) => ({
      category, name: category, value: amount,
      pct: total ? ((amount / total) * 100).toFixed(0) : '0'
    }))
    return { credited, spent, net, pieData, count: inRange.length }
  }

  const statsRange = (() => {
    const d = statsDate
    if (statsView === 'day') {
      const start = new Date(d); start.setHours(0,0,0,0)
      const end = new Date(d); end.setHours(23,59,59,999)
      return { start, end }
    }
    if (statsView === 'week') {
      const start = getWeekStart(d)
      const end = new Date(start); end.setDate(end.getDate() + 7)
      return { start, end }
    }
    // month
    const start = new Date(d.getFullYear(), d.getMonth(), 1)
    const end = new Date(d.getFullYear(), d.getMonth() + 1, 1)
    return { start, end }
  })()
  const statsData = getStatsForRange(statsRange.start, statsRange.end)

  const prevPeriod = () => {
    const d = new Date(statsDate)
    if (statsView === 'day') d.setDate(d.getDate() - 1)
    else if (statsView === 'week') d.setDate(d.getDate() - 7)
    else d.setMonth(d.getMonth() - 1)
    setStatsDate(d)
  }
  const nextPeriod = () => {
    const d = new Date(statsDate)
    if (statsView === 'day') d.setDate(d.getDate() + 1)
    else if (statsView === 'week') d.setDate(d.getDate() + 7)
    else d.setMonth(d.getMonth() + 1)
    setStatsDate(d)
  }
  const goToToday = () => setStatsDate(new Date())

  const statsPeriodLabel = () => {
    const d = statsDate
    if (statsView === 'day') return d.toLocaleDateString('en-IN', { weekday:'short', day:'numeric', month:'short', year:'numeric' })
    if (statsView === 'week') {
      const s = getWeekStart(d)
      const e = new Date(s); e.setDate(e.getDate() + 6)
      return s.toLocaleDateString('en-IN', { day:'numeric', month:'short' }) + ' – ' + e.toLocaleDateString('en-IN', { day:'numeric', month:'short' })
    }
    return MONTHS[d.getMonth()] + ' ' + d.getFullYear()
  }

  // Calendar grid for month view
  const buildCalendarDays = () => {
    const d = statsDate
    const year = d.getFullYear(), month = d.getMonth()
    const firstDay = new Date(year, month, 1).getDay()
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    const todayKey = fmtDateKey(new Date())
    const rangeStart = new Date(year, month, 1)
    const rangeEnd = new Date(year, month + 1, 1)
    const days = []
    for (let i = 0; i < firstDay; i++) days.push(null)
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day)
      const key = fmtDateKey(date)
      const hasTx = entries.some(tx => {
        const td = new Date(tx.date)
        return td >= rangeStart && td < rangeEnd && fmtDateKey(td) === key
      })
      days.push({ day, key, hasTx, isToday: key === todayKey })
    }
    return { days, year, month }
  }

  // Week days array
  const buildWeekDays = () => {
    const s = getWeekStart(statsDate)
    const e = new Date(s); e.setDate(e.getDate() + 7)
    const todayKey = fmtDateKey(new Date())
    return Array.from({length: 7}, (_, i) => {
      const d = new Date(s); d.setDate(d.getDate() + i)
      const key = fmtDateKey(d)
      const hasTx = entries.some(tx => {
        const td = new Date(tx.date)
        return td >= s && td < e && fmtDateKey(td) === key
      })
      return { day: d.getDate(), weekday: DAYS[d.getDay()], key, hasTx, isToday: key === todayKey, date: d }
    })
  }

  // Day detail transactions
  const dayTransactions = (() => {
    if (statsView !== 'day') return []
    const key = fmtDateKey(statsDate)
    return entries.filter(e => e.date.startsWith(key)).sort((a,b) => new Date(b.date) - new Date(a.date))
  })()

  // ── Pie chart data — withdrawal entries grouped by category for the selected range
  const getPieChartData = useCallback(() => {
    const now = new Date()
    const days = chartRange === 'weekly' ? 7 : chartRange === 'yearly' ? 365 : 30
    const cutoff = new Date(now - days * 86400000)
    const withdrawals = entries.filter(e => e.type === 'withdrawal' && new Date(e.date) >= cutoff)
    if (withdrawals.length === 0) return []
    const grouped = {}
    withdrawals.forEach(e => {
      grouped[e.category] = (grouped[e.category] || 0) + e.amount
    })
    const total = Object.values(grouped).reduce((s, v) => s + v, 0)
    return Object.entries(grouped).map(([category, amount]) => ({
      category,
      name: category,
      value: amount,
      pct: ((amount / total) * 100).toFixed(0)
    }))
  }, [entries, chartRange])

  const chartData = getPieChartData()

  // Summary stats
  const now = new Date()
  const thisMonth = now.getMonth()
  const thisYear = now.getFullYear()
  const monthEntries = entries.filter(e => {
    const d = new Date(e.date)
    return d.getMonth() === thisMonth && d.getFullYear() === thisYear
  })
  const totalCredited = monthEntries.filter(e => e.type === 'deposit').reduce((s, e) => s + e.amount, 0)
  const totalSpent = monthEntries.filter(e => e.type === 'withdrawal').reduce((s, e) => s + e.amount, 0)
  const net = totalCredited - totalSpent
  const balance = entries.reduce((s, e) => s + (e.type === 'deposit' ? e.amount : -e.amount), 0)

  const lastMonth = now.getMonth() === 0 ? 11 : now.getMonth() - 1
  const lastMonthYear = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear()
  const lastMonthEntries = entries.filter(e => {
    const d = new Date(e.date)
    return d.getMonth() === lastMonth && d.getFullYear() === lastMonthYear
  })
  const lastMonthNet = lastMonthEntries.reduce((s, e) => s + (e.type === 'deposit' ? e.amount : -e.amount), 0)
  const changePct = lastMonthNet !== 0 ? ((net - lastMonthNet) / Math.abs(lastMonthNet) * 100).toFixed(0) : null

  // History view filters (category) + sorts newest first
  const historyFiltered = historyFilter === 'all' ? [...entries] : [...entries].filter(e => e.category === historyFilter)
  const historySorted = historyFiltered.sort((a, b) => new Date(b.date) - new Date(a.date))

  // ── Category auto-suggest ──
  const suggestedCat = categoryInput.trim() ? autoCategorize(categoryInput) : null
  const resolvedCat = manualCat || suggestedCat || 'Other'

  async function handleSubmit(e) {
    e.preventDefault()
    if (!amount || !resolvedCat) return
    setSubmitting(true)
    try {
      const newEntry = {
        id: Date.now().toString(),
        amount: parseFloat(amount),
        type,
        category: resolvedCat,
        note: description.trim() || categoryInput.trim(),
        date: new Date().toISOString().split('T')[0]
      }
      const updated = [newEntry, ...entries]
      saveEntries(updated)
      setEntries(updated)
      setAmount(''); setCategoryInput(''); setDescription(''); setManualCat('')
      setModalOpen(false)
      showToast('✓ Entry added')
    } catch (err) {
      showToast('Failed to add entry')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDelete(id) {
    const updated = entries.filter(e => e.id !== id)
    saveEntries(updated)
    setEntries(updated)
    showToast('Entry deleted')
  }

  function handleResetAllData() {
    setResetting(true)
    try {
      localStorage.removeItem(STORAGE_KEY)
      setEntries([])
      setProfileOpen(false)
      setConfirmResetOpen(false)
      showToast('All data reset')
    } catch (err) {
      console.error('Reset failed:', err)
      showToast('Failed to reset data')
    } finally {
      setResetting(false)
    }
  }

  if (!unlocked) return <LockScreen onUnlock={() => setUnlocked(true)} />

  return (
    <div className="app">
      {/* Toast */}
      {toast && <div className={`toast ${toast ? 'show' : ''}`}>{toast}</div>}

      {/* ── Top Header ── */}
      <div className="top-header">
        <div>
          <div className="greeting">{typeof greeting === 'object' && greeting ? <>
            <span>{greeting.pre}</span>
            <span className="greeting-name">{greeting.name}</span>
            <span>{greeting.post}</span>
          </> : greeting}</div>
        </div>
        <div className="header-right">
          <div className="avatar" title={profileOpen ? 'Save & close' : 'Edit name / Lock app'} onClick={() => {
            if (profileOpen) { AUTH.lock(); setUnlocked(false); setProfileOpen(false); }
            else { setEditName(userName); setProfileOpen(true); }
          }}>
            {WALLET_ICON}
          </div>
        </div>
      </div>

      {/* ── Balance Card ── */}
      <div className="balance-card">
        <div className="balance-label">Total Balance</div>
        <div className="balance-amount">{fmt(balance)}</div>
        {changePct !== null && (
          <div className="balance-change">
            {net >= lastMonthNet ? '↑' : '↓'} {Math.abs(changePct)}% vs last month
          </div>
        )}
      </div>

      {/* ── Quick Stats Row ── */}
      <div className="stats-row">
        <div className="stat-card">
          <div className="stat-label">Credited</div>
          <div className="stat-value green">{fmt(totalCredited)}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Spent</div>
          <div className="stat-value red">{fmt(totalSpent)}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Total</div>
          <div className="stat-value">{fmt(net)}</div>
        </div>
      </div>

      {/* ── Stats View ── */}
      {navView === 'stats' && <>
      <div className="stats-page">
        {/* Period nav */}
        <div className="stats-period-nav">
          <button className="period-btn" onClick={prevPeriod}>‹</button>
          <span className="period-label" onClick={goToToday} title="Go to today">{statsPeriodLabel()}</span>
          <button className="period-btn" onClick={nextPeriod}>›</button>
        </div>
        {/* View toggles */}
        <div className="stats-view-tabs">
          {['day','week','month'].map(v => (
            <button key={v} className={`view-tab ${statsView === v ? 'active' : ''}`} onClick={() => setStatsView(v)}>
              {v.charAt(0).toUpperCase() + v.slice(1)}
            </button>
          ))}
        </div>
        {/* Calendar / stats content */}
        <div className="stats-body">
          {statsView === 'month' && (() => {
            const { days } = buildCalendarDays()
            return (
              <div className="cal-grid">
                <div className="cal-header">
                  {DAYS.map(d => <span key={d} className="cal-dow">{d}</span>)}
                </div>
                {days.map((cell, i) => cell ? (
                  <button key={i} className={`cal-day ${cell.isToday ? 'today' : ''} ${cell.hasTx ? 'has-tx' : ''}`}
                    onClick={() => { setStatsDate(new Date(cell.key + 'T00:00:00')); setStatsView('day') }}>
                    <span className="cal-day-num">{cell.day}</span>
                    {cell.hasTx && <span className="cal-dot" />}
                  </button>
                ) : <div key={i} />)}
              </div>
            )
          })()}
          {statsView === 'week' && (() => {
            const wd = buildWeekDays()
            return (
              <div className="week-grid">
                {wd.map((d, i) => (
                  <button key={i} className={`week-day ${d.isToday ? 'today' : ''} ${d.hasTx ? 'has-tx' : ''}`}
                    onClick={() => { setStatsDate(d.date); setStatsView('day') }}>
                    <span className="week-dow">{d.weekday}</span>
                    <span className="week-num">{d.day}</span>
                    {d.hasTx && <span className="cal-dot" />}
                  </button>
                ))}
              </div>
            )
          })()}
          {statsView === 'day' && (() => {
            const txs = dayTransactions
            const key = fmtDateKey(statsDate)
            const hasTx = entries.some(e => e.date.startsWith(key))
            return (
              <div className="day-detail">
                <div className={`day-indicator ${hasTx ? 'has-tx' : ''}`}>
                  <span className="day-indicator-dot" />
                  <span className="day-indicator-text">{statsDate.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'short' })}</span>
                  {hasTx && <span className="day-indicator-count">{txs.length} txns</span>}
                </div>
                {txs.length === 0 ? (
                  <div className="chart-empty"><div className="chart-empty-icon">📭</div><p>No transactions</p></div>
                ) : txs.map(e => {
                  const meta = getCatMeta(e.category)
                  const isDep = e.type === 'deposit'
                  return (
                    <div className="tx-item" key={e.id}>
                      <div className="tx-icon">{meta.emoji}</div>
                      <div className="tx-details">
                        <div className="tx-category">{e.category}</div>
                        <div className="tx-type">{e.note || (isDep ? 'Credited' : 'Spent')}</div>
                      </div>
                      <div className={`tx-amount ${isDep ? 'green' : 'red'}`}>
                        {isDep ? '+' : '−'}{fmt(e.amount)}
                      </div>
                    </div>
                  )
                })}
              </div>
            )
          })()}
        </div>
        {/* Stats cards */}
        <div className="stats-row" style={{ marginTop: 14 }}>
          <div className="stat-card">
            <div className="stat-label">Credited</div>
            <div className="stat-value green">{fmt(statsData.credited)}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Spent</div>
            <div className="stat-value red">{fmt(statsData.spent)}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Net</div>
            <div className={`stat-value ${statsData.net >= 0 ? 'green' : 'red'}`}>{fmt(statsData.net)}</div>
          </div>
        </div>
        {/* Pie chart */}
        <div className="chart-card">
          <div className="chart-header">
            <span className="chart-title">Spending by Category</span>
          </div>
          <div className="chart-container">
            {statsData.pieData.length === 0 ? (
              <div className="chart-empty">
                <div className="chart-empty-icon">📊</div>
                <p>No spending in this period</p>
              </div>
            ) : (
              <>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={statsData.pieData} cx="50%" cy="50%" innerRadius={55} outerRadius={82} paddingAngle={3} dataKey="value" stroke="none">
                    {statsData.pieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                  </Pie>
                  <Tooltip content={({ active, payload }) => {
                    if (!active || !payload?.[0]) return null
                    const item = payload[0].payload
                    return (
                      <div className="pie-tooltip">
                        <div className="pie-tooltip-cat">{item.category}</div>
                        <div className="pie-tooltip-val">{fmt(item.value)}</div>
                        <div className="pie-tooltip-pct">{item.pct}%</div>
                      </div>
                    )
                  }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="pie-legend">
                {statsData.pieData.map((d, i) => (
                  <div key={i} className="pie-legend-row">
                    <span className="pie-legend-dot" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                    <span className="pie-legend-label">{d.category}</span>
                    <span className="pie-legend-val">{fmt(d.value)}</span>
                    <span className="pie-legend-pct">{d.pct}%</span>
                  </div>
                ))}
              </div>
              </>
            )}
          </div>
        </div>
      </div>
      </>}

      {/* ── Spending by Category (Home) ── */}
      {navView === 'home' && <>
      <div className="chart-card">
        <div className="chart-header">
          <span className="chart-title">{chartRange === 'weekly' ? 'Weekly' : chartRange === 'monthly' ? 'Monthly' : 'Yearly'} Spending</span>
        </div>
        <div className="chart-tabs">
          {['weekly', 'monthly', 'yearly'].map(r => (
            <button key={r} className={`chart-tab ${chartRange === r ? 'active' : ''}`}
              onClick={() => setChartRange(r)}>
              {r.charAt(0).toUpperCase() + r.slice(1)}
            </button>
          ))}
        </div>
        <div className="chart-container chart-container-with-legend">
          {chartData.length === 0 ? (
            <div className="chart-empty">
              <div className="chart-empty-icon">📊</div>
              <p>No spending in this period</p>
            </div>
          ) : (
            <>
            <div className="pie-chart-left">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={58}
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="value"
                    stroke="none"
                  >
                    {chartData.map((d, i) => (
                      <Cell key={`cell-${i}`} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    content={({ active, payload }) => {
                      if (!active || !payload?.[0]) return null
                      const item = payload[0].payload
                      return (
                        <div className="pie-tooltip">
                          <div className="pie-tooltip-cat">{item.category}</div>
                          <div className="pie-tooltip-val">{fmt(item.value)}</div>
                          <div className="pie-tooltip-pct">{item.pct}%</div>
                        </div>
                      )
                    }}
                  />
                  <text x="50%" y="50%" textAnchor="middle" dominantBaseline="middle" className="pie-center-total">
                    {fmt(chartData.reduce((s, d) => s + d.value, 0))}
                  </text>
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="pie-legend">
              {chartData.map((d, i) => (
                <div key={i} className="pie-legend-row">
                  <span className="pie-legend-dot" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                  <span className="pie-legend-label">{d.category}</span>
                  <span className="pie-legend-val">{fmt(d.value)}</span>
                  <span className="pie-legend-pct">{d.pct}%</span>
                </div>
              ))}
            </div>
            </>
          )}
        </div>
      </div>
      </>}

      {/* ── History View ── */}
      {navView === 'history' && <>
      <div className="history-header">
        <span className="section-title">History</span>
        <span style={{ fontSize: '0.78rem', color: 'var(--muted)' }}>{historySorted.length} entries</span>
      </div>
      <div className="history-filter-bar">
        <button
          className={`history-filter-chip ${historyFilter === 'all' ? 'active' : ''}`}
          onClick={() => setHistoryFilter('all')}
        >All</button>
        {CATEGORIES.map(cat => (
          <button
            key={cat}
            className={`history-filter-chip ${historyFilter === cat ? 'active' : ''}`}
            onClick={() => setHistoryFilter(cat)}
          >{getCatMeta(cat).emoji} {cat}</button>
        ))}
      </div>
      <div className="history-list">
        {historySorted.length === 0 ? (
          <div className="empty-state">
            <div className="icon">📭</div>
            <p>No transactions yet.</p>
          </div>
        ) : (
          historySorted.map(entry => {
            const meta = getCatMeta(entry.category)
            const isDeposit = entry.type === 'deposit'
            return (
              <div className="tx-item" key={entry.id}>
                <div className="tx-icon">{meta.emoji}</div>
                <div className="tx-details">
                  <div className="tx-category">{entry.category}</div>
                  <div className="tx-type">{entry.note || (isDeposit ? 'Credited' : 'Spent')}</div>
                </div>
                <div className="tx-right">
                  <div className={`tx-amount ${isDeposit ? 'green' : 'red'}`}>
                    {isDeposit ? '+' : '−'}{fmt(entry.amount)}
                  </div>
                  <div className="tx-date">{formatDate(entry.date)}</div>
                </div>
                <button className="tx-delete" onClick={() => handleDelete(entry.id)} title="Delete">✕</button>
              </div>
            )
          })
        )}
      </div>
      </>}

      {/* ── Bottom Nav ── */}
      <div className="bottom-nav">
        <button className={`nav-item ${navView === 'home' ? 'active' : ''}`} onClick={() => setNavView('home')} title="Home">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <path d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-4 0a1 1 0 01-1-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 01-1 1"/>
          </svg>
          Home
        </button>
        <button className={`nav-item ${navView === 'stats' ? 'active' : ''}`} onClick={() => setNavView('stats')} title="Stats">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <path d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
          </svg>
          Stats
        </button>
        <button className={`nav-item ${navView === 'history' ? 'active' : ''}`} onClick={() => setNavView('history')} title="History">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <circle cx="12" cy="12" r="10"/>
            <path d="M12 6v6l4 2"/>
          </svg>
          History
        </button>
      </div>

      {/* ── Floating Add Button ── */}
      <button className="fab" onClick={() => setModalOpen(true)} title="Add entry">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
          <path d="M12 4v16m-8-8h16"/>
        </svg>
      </button>

      {/* ── Add Entry Modal ── */}
      <div className={`modal-overlay ${modalOpen ? 'open' : ''}`} onClick={(e) => { if (e.target === e.currentTarget) setModalOpen(false) }}>
        <div className="modal-sheet">
          <div className="modal-handle" />
          <div className="modal-title">Add Transaction</div>

          <div className="modal-type-toggle">
            <button className={`modal-type-btn withdrawal ${type === 'withdrawal' ? 'active' : ''}`} onClick={() => setType('withdrawal')}>
              Spent
            </button>
            <button className={`modal-type-btn deposit ${type === 'deposit' ? 'active' : ''}`} onClick={() => setType('deposit')}>
              Credited
            </button>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Amount (₹)</label>
                <input className="form-input" type="number" min="0" step="0.01" placeholder="0.00"
                  value={amount} onChange={e => setAmount(e.target.value)} required />
              </div>
              <div className="form-group">
                <label className="form-label">Date</label>
                <input className="form-input" type="date"
                  value={new Date().toISOString().split('T')[0]} readOnly />
              </div>
            </div>

            {/* Category: text input with auto-suggest + override */}
            <div className="form-group full" style={{ marginBottom: 12 }}>
              <label className="form-label">Note / Category</label>
              <input
                className="form-input"
                type="text"
                placeholder='e.g. "swiggy order", "pocket money from dad"'
                value={categoryInput}
                onChange={e => { setCategoryInput(e.target.value); setManualCat('') }}
                autoFocus
              />
              {suggestedCat && !manualCat && (
                <div className="cat-suggestion">
                  <span className="suggested-text">{getCatMeta(suggestedCat).emoji} Auto: {suggestedCat}</span>
                  <button
                    type="button"
                    className="cat-override-btn"
                    onClick={() => setManualCat(suggestedCat)}
                  >
                    Apply
                  </button>
                </div>
              )}
              {manualCat && (
                <div className="cat-chip active" style={{ display: 'inline-flex', marginTop: 6 }}>
                  {getCatMeta(manualCat).emoji} {manualCat}
                  <button type="button" className="chip-clear" onClick={() => setManualCat('')}>✕</button>
                </div>
              )}
            </div>

            <div className="form-group full" style={{ marginBottom: 16 }}>
              <label className="form-label">Description (optional)</label>
              <textarea
                className="form-textarea"
                placeholder="Details about this transaction…"
                value={description}
                onChange={e => setDescription(e.target.value)}
                maxLength={100}
              />
            </div>

            <button type="submit" className="modal-submit" disabled={submitting}>
              {submitting ? 'Saving…' : type === 'deposit' ? 'Add Credit' : 'Add Expense'}
            </button>
          </form>
        </div>
      </div>

      {/* ── Profile Modal ── */}
      <div className={`modal-overlay ${profileOpen ? 'open' : ''}`} onClick={(e) => { if (e.target === e.currentTarget) setProfileOpen(false) }}>
        <div className="modal-sheet">
          <div className="modal-handle" />
          <div className="modal-title">Welcome</div>
          <div className="form-group full" style={{ marginBottom: 16 }}>
            <label className="form-label">Your Name</label>
            <input
              className="form-input"
              type="text"
              placeholder="Enter your name"
              value={editName}
              onChange={e => setEditName(e.target.value)}
              autoFocus
            />
          </div>
          <button
            className="modal-submit"
            onClick={() => {
              const name = editName.trim()
              if (name) {
                localStorage.setItem('mt_username', name)
                setUserName(name)
                setGreeting(getRandomGreeting(name))
              }
              setProfileOpen(false)
            }}
          >
            Save
          </button>
          <button
            className="modal-reset-btn"
            disabled={resetting}
            onClick={() => setConfirmResetOpen(true)}
          >
            {resetting ? 'Resetting…' : 'Reset All Data'}
          </button>
          <button
            className="modal-close"
            onClick={() => setProfileOpen(false)}
            style={{ position: 'absolute', top: 16, right: 16, background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '50%', width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--muted)', fontSize: '1rem' }}
          >
            ✕
          </button>
        </div>
      </div>

      {/* ── Reset Confirmation Modal ── */}
      <div className={`modal-overlay ${confirmResetOpen ? 'open' : ''}`} onClick={(e) => { if (e.target === e.currentTarget) setConfirmResetOpen(false) }}>
        <div className="modal-sheet">
          <div className="modal-handle" />
          <div className="modal-title" style={{ color: 'var(--red)' }}>Reset All Data?</div>
          <p style={{ fontSize: '0.9rem', color: 'var(--muted)', lineHeight: 1.6, margin: '0 0 20px' }}>
            This will delete all your transactions and reset the app. This can't be undone.
            <br /><br />
            Your PIN and biometric lock will remain intact.
          </p>
          <div style={{ display: 'flex', gap: 12, marginTop: 20 }}>
            <button
              className="modal-reset-btn"
              style={{ flex: 1, width: 'auto', borderColor: 'var(--text)', color: 'var(--text)', margin: 0 }}
              onClick={() => setConfirmResetOpen(false)}
            >
              Cancel
            </button>
            <button
              className="modal-reset-btn"
              style={{ flex: 1, width: 'auto', margin: 0 }}
              disabled={resetting}
              onClick={handleResetAllData}
            >
              {resetting ? 'Resetting…' : 'Reset All Data'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
