import { useState, useEffect, useCallback, useRef } from 'react'
import {
  PieChart, Pie, Cell, ResponsiveContainer, Sector
} from 'recharts'
import { getCatMeta, autoCategorize, CATEGORIES, getRandomGreeting } from './categories'
import { AUTH } from './auth'
import LockScreen from './LockScreen'
import { MorphIcon } from "morphicons/react"
import DatePicker from './DatePicker'
import { User, X } from "lucide"

const STORAGE_KEY = 'mt_entries'
const THEME_KEY = 'mt_theme'

function loadEntries() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]') }
  catch { return [] }
}
function saveEntries(entries) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries))
}

function getSystemTheme() {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function resolveTheme(stored) {
  return stored === 'system' ? getSystemTheme() : stored
}



const FingerprintIcon = (props) => (
  <svg width="24" height="24" viewBox="0 0 512 512" fill="currentColor" {...props}>
    <path d="M48 256C48 141.1 141.1 48 256 48c63.1 0 119.6 28.1 157.8 72.5c8.6 10.1 23.8 11.2 33.8 2.6s11.2-23.8 2.6-33.8C403.3 34.6 333.7 0 256 0C114.6 0 0 114.6 0 256l0 40c0 13.3 10.7 24 24 24s24-10.7 24-24l0-40zm458.5-52.9c-2.7-13-15.5-21.3-28.4-18.5s-21.3 15.5-18.5 28.4c2.9 13.9 4.5 28.3 4.5 43.1l0 40c0 13.3 10.7 24 24 24s24-10.7 24-24l0-40c0-18.1-1.9-35.8-5.5-52.9zM256 80c-19 0-37.4 3-54.5 8.6c-15.2 5-18.7 23.7-8.3 35.9c7.1 8.3 18.8 10.8 29.4 7.9c10.6-2.9 21.8-4.4 33.4-4.4c70.7 0 128 57.3 128 128l0 24.9c0 25.2-1.5 50.3-4.4 75.3c-1.7 14.6 9.4 27.8 24.2 27.8c11.8 0 21.9-8.6 23.3-20.3c3.3-27.4 5-55 5-82.7l0-24.9c0-97.2-78.8-176-176-176zM150.7 148.7c-9.1-10.6-25.3-11.4-33.9-.4C93.7 178 80 215.4 80 256l0 24.9c0 24.2-2.6 48.4-7.8 71.9C68.8 368.4 80.1 384 96.1 384c10.5 0 19.9-7 22.2-17.3c6.4-28.1 9.7-56.8 9.7-85.8l0-24.9c0-27.2 8.5-52.4 22.9-73.1c7.2-10.4 8-24.6-.2-34.2zM256 160c-53 0-96 43-96 96l0 24.9c0 35.9-4.6 71.5-13.8 106.1c-3.8 14.3 6.7 29 21.5 29c9.5 0 17.9-6.2 20.4-15.4c10.5-39 15.9-79.2 15.9-119.7l0-24.9c0-28.7 23.3-52 52-52s52 23.3 52 52l0 24.9c0 36.3-3.5 72.4-10.4 107.9c-2.7 13.9 7.7 27.2 21.8 27.2c10.2 0 19-7 21-17c7.7-38.8 11.6-78.3 11.6-118.1l0-24.9c0-53-43-96-96-96zm24 96c0-13.3-10.7-24-24-24s-24 10.7-24 24l0 24.9c0 59.9-11 119.3-32.5 175.2l-5.9 15.3c-4.8 12.4 1.4 26.3 13.8 31s26.3-1.4 31-13.8l5.9-15.3C267.9 411.9 280 346.7 280 280.9l0-24.9z"/>
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

const renderActiveShape = (props) => {
  const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill } = props;
  return (
    <Sector
      cx={cx}
      cy={cy}
      innerRadius={innerRadius}
      outerRadius={outerRadius + 8}
      startAngle={startAngle}
      endAngle={endAngle}
      fill={fill}
    />
  );
};

export default function App() {
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
  const [unlocked, setUnlocked] = useState(false)
  const [lockModalOpen, setLockModalOpen] = useState(false)
  const [biometricSupported, setBiometricSupported] = useState(false)
  const [biometricLoading, setBiometricLoading] = useState(false)
  const [lockPin, setLockPin] = useState('')
  const [lockPinConfirm, setLockPinConfirm] = useState('')
  const [lockPinError, setLockPinError] = useState('')
  const [lockPinMode, setLockPinMode] = useState('setup') // 'setup' | 'confirm'
  const [changePinMode, setChangePinMode] = useState(null) // null = default buttons, 'check' = verify old PIN, 'setup' = enter new, 'confirm' = re-enter new
  const [changePinOld, setChangePinOld] = useState('')
  const [changePinNew, setChangePinNew] = useState('')
  const [changePinNewConfirm, setChangePinNewConfirm] = useState('')
  const [changePinError, setChangePinError] = useState('')
  const [changePinLoading, setChangePinLoading] = useState(false)
  const [bioChangeMode, setBioChangeMode] = useState(null) // null | 'enable' | 'confirm-enable'
  const [pendingDeleteId, setPendingDeleteId] = useState(null) // id of entry in "tap again to confirm" state
  const [bioChangeLoading, setBioChangeLoading] = useState(false)
  const [bioChangeError, setBioChangeError] = useState('')
  const [activeHomePieIndex, setActiveHomePieIndex] = useState(null)
  const [activeStatsPieIndex, setActiveStatsPieIndex] = useState(null)

  // Theme
  const [themeStored, setThemeStored] = useState(() => localStorage.getItem(THEME_KEY) || 'system')
  const [themeResolved, setThemeResolved] = useState(() => resolveTheme(themeStored))

  // Form state
  const [amount, setAmount] = useState('')
  const [type, setType] = useState('withdrawal')
  const [categoryInput, setCategoryInput] = useState('')
  const [description, setDescription] = useState('')
  const [manualCat, setManualCat] = useState('')
  const [txDate, setTxDate] = useState(() => new Date().toISOString().split('T')[0])
  const [submitting, setSubmitting] = useState(false)

  const historyScrollRef = useRef(null)

  // Theme effect — sync attribute and resolve
  useEffect(() => {
    const stored = localStorage.getItem(THEME_KEY) || 'system'
    setThemeStored(stored)
    const resolved = resolveTheme(stored)
    document.documentElement.setAttribute('data-theme', resolved)
    setThemeResolved(resolved)
  }, [])

  // Listen for system theme changes when in system mode
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = () => {
      const stored = localStorage.getItem(THEME_KEY) || 'system'
      if (stored === 'system') {
        const resolved = mq.matches ? 'dark' : 'light'
        document.documentElement.setAttribute('data-theme', resolved)
        setThemeResolved(resolved)
      }
    }
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  function setTheme(mode) {
    localStorage.setItem(THEME_KEY, mode)
    setThemeStored(mode)
    document.documentElement.setAttribute('data-theme', resolveTheme(mode))
    setThemeResolved(resolveTheme(mode))
  }

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
    fetchEntries()
  }, [fetchEntries])

  // On mount: if lock is enabled, always start locked regardless of sessionStorage.
  // We intentionally do NOT check AUTH.isUnlocked() here because sessionStorage
  // persists across page reloads in the same tab, which would bypass the lock.
  useEffect(() => {
    AUTH.isBiometricSupported().then(setBiometricSupported)
  }, [])

  // Re-check biometric support whenever lock modal opens
  useEffect(() => {
    if (lockModalOpen && !biometricSupported) {
      AUTH.isBiometricSupported().then(setBiometricSupported)
    }
  }, [lockModalOpen])

  // When the user unlocks the app, any element that retained focus from the
  // lock screen (biometric prompt, hidden inputs) can cause Android/WebView to
  // pop the on-screen keyboard on the next render cycle. Clear it immediately.
  useEffect(() => {
    if (unlocked) {
      const el = document.activeElement
      if (el && el !== document.body) {
        el.blur()
      }
    }
  }, [unlocked])

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
        date: txDate
      }
      const updated = [newEntry, ...entries]
      saveEntries(updated)
      setEntries(updated)
      setAmount(''); setCategoryInput(''); setDescription(''); setManualCat('')
      setTxDate(new Date().toISOString().split('T')[0])
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

  // Lock guard — show lock screen on top if user has enabled app lock (allows acrylic blur)
  const isLocked = !unlocked && AUTH.isLockEnabled();

  return (
    <>
      {isLocked && <LockScreen onUnlock={() => setUnlocked(true)} />}
      <div className="app" style={isLocked ? { height: '100vh', overflow: 'hidden' } : {}} onClick={(e) => {
        if (!e.target.closest('.recharts-wrapper')) {
        setActiveStatsPieIndex(null);
        setActiveHomePieIndex(null);
      }
    }}>
      {/* Toast */}
      {toast && <div className={`toast ${toast ? 'show' : ''}`}>{toast}</div>}

      {/* ── Top Header ── */}
      <div className="top-header">
        <div className="greeting-wrap">
          <div className="greeting">
            {typeof greeting === 'object' && greeting ? (
              <>
                <span className="greeting-pre">{greeting.pre}</span>
                <span className="greeting-name">{greeting.name}</span>
                <span className="greeting-post">{greeting.post}</span>
              </>
            ) : greeting}
          </div>
        </div>
        <div className="header-right">
          <div className="avatar" title={profileOpen ? 'Save & close' : 'Edit name'} onClick={() => {
            if (profileOpen) { AUTH.lock(); setProfileOpen(false); }
            else { setEditName(userName); setProfileOpen(true); }
          }}>
            <MorphIcon icon={profileOpen ? X : User} />
          </div>
        </div>
      </div>

      {/* ── Balance Card ── */}
      <div className="balance-card">
        <div className="balance-label">Total Balance</div>
        <div className="balance-amount">{fmt(balance)}</div>
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
                  <div className="chart-empty" style={{ padding: '30px 0', textAlign: 'center' }}>
                    <div className="chart-empty-icon">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: 40, height: 40, opacity: 0.5 }}>
                        <path d="M21 12V7H5a2 2 0 0 1 0-4h14v4" />
                        <path d="M3 5v14a2 2 0 0 0 2 2h16v-5" />
                        <path d="M18 12h0" />
                      </svg>
                    </div>
                    <p style={{ margin: '12px 0 4px', fontWeight: 600 }}>Your wallet is taking a nap.</p>
                    <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--muted)' }}>Wake it up with a new transaction!</p>
                  </div>
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
          {statsData.pieData.length === 0 ? (
            <div className="chart-empty" style={{ height: 200, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
              <div className="chart-empty-icon">
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.5 }}><circle cx="12" cy="12" r="10"></circle><path d="M16 16s-1.5-2-4-2-4 2-4 2"></path><line x1="9" y1="9" x2="9.01" y2="9"></line><line x1="15" y1="9" x2="15.01" y2="9"></line></svg>
              </div>
              <p style={{ margin: '12px 0 4px', fontWeight: 600 }}>It's a ghost town in here...</p>
              <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--muted)' }}>Try changing the period or add an expense!</p>
            </div>
          ) : (
            <div className="chart-container chart-container-with-legend">
              <div className="pie-chart-left">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={statsData.pieData} cx="50%" cy="50%" innerRadius={55} outerRadius={82} paddingAngle={3} dataKey="value" stroke="none" strokeWidth={0} onClick={(_, i) => setActiveStatsPieIndex(activeStatsPieIndex === i ? null : i)} activeIndex={activeStatsPieIndex} activeShape={renderActiveShape}>
                      {statsData.pieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                    </Pie>
                    <text x="50%" y="50%" textAnchor="middle" dominantBaseline="middle" className="pie-center-total">
                      {activeStatsPieIndex !== null && statsData.pieData[activeStatsPieIndex] ? (
                        <>
                          <tspan x="50%" dy="-1em" fontSize="12px" fillOpacity={0.6}>{statsData.pieData[activeStatsPieIndex].category}</tspan>
                          <tspan x="50%" dy="1.3em" fontSize="11px" fillOpacity={0.5}>{statsData.pieData[activeStatsPieIndex].pct}%</tspan>
                          <tspan x="50%" dy="1.4em" fontSize="16px">{fmt(statsData.pieData[activeStatsPieIndex].value)}</tspan>
                        </>
                      ) : (
                        fmt(statsData.pieData.reduce((s, d) => s + d.value, 0))
                      )}
                    </text>
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="pie-legend">
                {statsData.pieData.map((d, i) => (
                  <div key={i} className="pie-legend-row">
                    <span className="pie-legend-dot" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                    <span className="pie-legend-label">{d.category}</span>
                    <span className="pie-legend-val">{fmt(d.value)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
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
            <div className="chart-empty" style={{ height: 200, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
              <div className="chart-empty-icon">
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.5 }}><circle cx="12" cy="12" r="10"></circle><path d="M8 14s1.5 2 4 2 4-2 4-2"></path><line x1="9" y1="9" x2="9.01" y2="9"></line><line x1="15" y1="9" x2="15.01" y2="9"></line></svg>
              </div>
              <p style={{ margin: '12px 0 4px', fontWeight: 600 }}>Looks like a clean slate!</p>
              <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--muted)' }}>Tap the + button to add some action.</p>
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
                    innerRadius={55}
                    outerRadius={82}
                    paddingAngle={3}
                    dataKey="value"
                    stroke="none"
                    strokeWidth={0}
                    onClick={(_, i) => setActiveHomePieIndex(activeHomePieIndex === i ? null : i)}
                    activeIndex={activeHomePieIndex}
                    activeShape={renderActiveShape}
                  >
                    {chartData.map((d, i) => (
                      <Cell key={`cell-${i}`} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <text x="50%" y="50%" textAnchor="middle" dominantBaseline="middle" className="pie-center-total">
                    {activeHomePieIndex !== null && chartData[activeHomePieIndex] ? (
                      <>
                        <tspan x="50%" dy="-1em" fontSize="12px" fillOpacity={0.6}>{chartData[activeHomePieIndex].category}</tspan>
                        <tspan x="50%" dy="1.3em" fontSize="11px" fillOpacity={0.5}>{chartData[activeHomePieIndex].pct}%</tspan>
                        <tspan x="50%" dy="1.4em" fontSize="16px">{fmt(chartData[activeHomePieIndex].value)}</tspan>
                      </>
                    ) : (
                      fmt(chartData.reduce((s, d) => s + d.value, 0))
                    )}
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
      <div className="history-list" onClick={() => setPendingDeleteId(null)}>
        {historySorted.length === 0 ? (
          <div className="empty-state">
            <div className="icon">
              <svg viewBox="0 0 512 512" fill="currentColor" style={{ width: 48, height: 48 }}>
                <path d="M121 32C91.6 32 66 52 58.9 80.5L1.9 308.4C.6 313.5 0 318.7 0 323.9L0 416c0 35.3 28.7 64 64 64l384 0c35.3 0 64-28.7 64-64l0-92.1c0-5.2-.6-10.4-1.9-15.5l-57-227.9C446 52 420.4 32 391 32L121 32zm0 64l270 0 48 192-51.2 0c-12.1 0-23.2 6.8-28.6 17.7l-14.3 28.6c-5.4 10.8-16.5 17.7-28.6 17.7l-120.4 0c-12.1 0-23.2-6.8-28.6-17.7l-14.3-28.6c-5.4-10.8-16.5-17.7-28.6-17.7L73 288 121 96z"/>
              </svg>
            </div>
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
                <button
                  className={`tx-delete${pendingDeleteId === entry.id ? ' confirming' : ''}`}
                  onClick={(e) => {
                    e.stopPropagation()
                    if (pendingDeleteId === entry.id) {
                      handleDelete(entry.id)
                      setPendingDeleteId(null)
                    } else {
                      setPendingDeleteId(entry.id)
                    }
                  }}
                  title={pendingDeleteId === entry.id ? 'Tap again to confirm delete' : 'Delete'}
                >✕</button>
              </div>
            )
          })
        )}
      </div>
      </>}

      {/* ── Bottom Nav ── */}
      <div className="bottom-nav">
        <button className={`nav-item ${navView === 'home' ? 'active' : ''}`} onClick={() => setNavView('home')} title="Home">
          <svg viewBox="0 0 576 512" fill="currentColor">
            <path d="M575.8 255.5c0 18-15 32.1-32 32.1l-32 0 .7 160.2c0 2.7-.2 5.4-.5 8.1l0 16.2c0 22.1-17.9 40-40 40l-16 0c-1.1 0-2.2 0-3.3-.1c-1.4 .1-2.8 .1-4.2 .1L416 512l-24 0c-22.1 0-40-17.9-40-40l0-24 0-64c0-17.7-14.3-32-32-32l-64 0c-17.7 0-32 14.3-32 32l0 64 0 24c0 22.1-17.9 40-40 40l-24 0-31.9 0c-1.5 0-3-.1-4.5-.2c-1.2 .1-2.4 .2-3.6 .2l-16 0c-22.1 0-40-17.9-40-40l0-112c0-.9 0-1.9 .1-2.8l0-69.7-32 0c-18 0-32-14-32-32.1c0-9 3-17 10-24L266.4 8c7-7 15-8 22-8s15 2 21 7L564.8 231.5c8 7 12 15 11 24z"/>
          </svg>
          Home
        </button>
        <button className={`nav-item ${navView === 'stats' ? 'active' : ''}`} onClick={() => setNavView('stats')} title="Stats">
          <svg viewBox="0 0 512 512" fill="currentColor">
            <path d="M32 32c17.7 0 32 14.3 32 32l0 336c0 8.8 7.2 16 16 16l400 0c17.7 0 32 14.3 32 32s-14.3 32-32 32L80 480c-44.2 0-80-35.8-80-80L0 64C0 46.3 14.3 32 32 32zM160 224c17.7 0 32 14.3 32 32l0 64c0 17.7-14.3 32-32 32s-32-14.3-32-32l0-64c0-17.7 14.3-32 32-32zm128-64l0 160c0 17.7-14.3 32-32 32s-32-14.3-32-32l0-160c0-17.7 14.3-32 32-32s32 14.3 32 32zm64 32c17.7 0 32 14.3 32 32l0 96c0 17.7-14.3 32-32 32s-32-14.3-32-32l0-96c0-17.7 14.3-32 32-32zM480 96l0 224c0 17.7-14.3 32-32 32s-32-14.3-32-32l0-224c0-17.7 14.3-32 32-32s32 14.3 32 32z"/>
          </svg>
          Stats
        </button>
        <button className={`nav-item ${navView === 'history' ? 'active' : ''}`} onClick={() => setNavView('history')} title="History">
          <svg viewBox="0 0 512 512" fill="currentColor">
            <path d="M256 0a256 256 0 1 1 0 512A256 256 0 1 1 256 0zM232 120l0 136c0 8 4 15.5 10.7 20l96 64c11 7.4 25.9 4.4 33.3-6.7s4.4-25.9-6.7-33.3L280 243.2 280 120c0-13.3-10.7-24-24-24s-24 10.7-24 24z"/>
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
                <DatePicker value={txDate} onChange={setTxDate} />
              </div>
            </div>

            {/* Category: text input with auto-suggest + manual picker */}
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
              {/* Manual category chip picker — shown after typing something, or always visible when no match */}
              <div className="cat-picker" style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
                {CATEGORIES.filter(c => c !== 'Other' || !suggestedCat || manualCat).map(cat => {
                  const m = getCatMeta(cat)
                  const isActive = manualCat === cat
                  const isSuggested = cat === suggestedCat && !manualCat
                  return (
                    <button
                      key={cat}
                      type="button"
                      className={`cat-picker-chip${isActive ? ' active' : ''}${isSuggested && !isActive ? ' suggested' : ''}`}
                      onClick={() => setManualCat(isActive ? '' : cat)}
                      title={cat}
                    >
                      {m.emoji} {cat}
                    </button>
                  )
                })}
              </div>
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

      {/* ── Profile Modal (right-side drawer) ── */}
      <div className={`profile-modal ${profileOpen ? 'open' : ''}`} onClick={(e) => { if (e.target.classList.contains('profile-backdrop')) setProfileOpen(false) }}>
        <div className="profile-backdrop" />
        <div className="profile-drawer">

          <div className="modal-title" style={{ marginTop: 8 }}>Welcome</div>

          {/* Name */}
          <div className="profile-section-title">Name</div>
          <div className="form-group full" style={{ marginBottom: 20 }}>
            <input
              className="form-input"
              type="text"
              placeholder="Enter your name"
              value={editName}
              onChange={e => setEditName(e.target.value)}
              autoFocus
            />
            <button
              className="modal-submit"
              style={{ marginTop: 8 }}
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
          </div>

          {/* Theme */}
          <div className="profile-section-title">Theme</div>
          <div className="theme-options" style={{ marginBottom: 20 }}>
            {[
              { key: 'system', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><path d="M12 2v20a10 10 0 0 0 0-20z" fill="currentColor" stroke="none"></path></svg>, label: 'System' },
              { key: 'light', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>, label: 'Light' },
              { key: 'dark', icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>, label: 'Dark' },
            ].map(opt => (
              <button
                key={opt.key}
                className={`theme-opt ${themeStored === opt.key ? 'active' : ''}`}
                onClick={() => setTheme(opt.key)}
              >
                <span className="theme-opt-icon">{opt.icon}</span>
                <span className="theme-opt-label">{opt.label}</span>
              </button>
            ))}
          </div>

          {/* Reset Data */}
          <div className="profile-section-title">Data</div>
          <button
            className="modal-reset-btn"
            style={{ width: '100%', marginTop: 0 }}
            disabled={resetting}
            onClick={() => setConfirmResetOpen(true)}
          >
            {resetting ? 'Resetting…' : 'Reset All Data'}
          </button>

          {/* ── App Lock Section ── */}
          <div className="profile-section-title">App Lock</div>
          {AUTH.isLockEnabled() ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* PIN sub-section */}
              <div>
                <div className="form-label" style={{ marginBottom: 8 }}>PIN</div>
                {AUTH.isPinEnabled() ? (() => {
                  // Pin change sub-flow
                  if (changePinMode === 'check') {
                    return (
                      <>
                        <div className="form-label" style={{ marginBottom: 8, marginTop: 4, fontSize: '0.72rem' }}>Verify old PIN</div>
                        <div className="pin-dots" style={{ justifyContent: 'center', gap: 10, marginBottom: 8 }}>
                          {[0,1,2,3].map(i => <div key={i} className={`pin-dot ${i < changePinOld.length ? 'filled' : ''}`} />)}
                        </div>
                        {changePinError && <div className="pin-error" style={{ textAlign: 'center', marginBottom: 6, fontSize: '0.75rem' }}>{changePinError}</div>}
                        <div className="pin-keypad pin-pad-light" style={{ maxWidth: 200, margin: '0 auto 8px', gap: 10 }}>
                          {[1,2,3,4,5,6,7,8,9].map(n => <button key={n} className="pin-key" onClick={() => setChangePinOld(p => p.length < 4 ? p + n : p)}>{n}</button>)}
                          <button className="pin-key clear" onClick={() => setChangePinOld(p => p.slice(0, -1))}>
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 4H8l-7 8 7 8h13a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2z"/><line x1="18" y1="9" x2="12" y2="15"/><line x1="12" y1="9" x2="18" y2="15"/></svg>
                          </button>
                          <button className="pin-key" onClick={() => setChangePinOld(p => p.length < 4 ? p + '0' : p)}>0</button>
                          <button className="pin-key confirm" onClick={async () => {
                            if (changePinOld.length !== 4) return
                            const ok = await AUTH.verifyPin(changePinOld)
                            if (ok) { setChangePinMode('setup'); setChangePinOld(''); setChangePinError(''); }
                            else { setChangePinError('Incorrect PIN'); setChangePinOld(''); }
                          }}>
                            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                          </button>
                        </div>
                        <button className="pin-toggle" style={{ display: 'block', margin: '0 auto', fontSize: '0.75rem' }} onClick={() => { setChangePinMode(null); setChangePinOld(''); setChangePinError(''); }}>← Back</button>
                      </>
                    )
                  }
                  if (changePinMode === 'setup') {
                    return (
                      <>
                        <div className="form-label" style={{ marginBottom: 8, marginTop: 4, fontSize: '0.72rem' }}>Enter new PIN</div>
                        <div className="pin-dots" style={{ justifyContent: 'center', gap: 10, marginBottom: 8 }}>
                          {[0,1,2,3].map(i => <div key={i} className={`pin-dot ${i < changePinNew.length ? 'filled' : ''}`} />)}
                        </div>
                        {changePinError && <div className="pin-error" style={{ textAlign: 'center', marginBottom: 6, fontSize: '0.75rem' }}>{changePinError}</div>}
                        <div className="pin-keypad pin-pad-light" style={{ maxWidth: 200, margin: '0 auto 8px', gap: 10 }}>
                          {[1,2,3,4,5,6,7,8,9].map(n => <button key={n} className="pin-key" onClick={() => setChangePinNew(p => p.length < 4 ? p + n : p)}>{n}</button>)}
                          <button className="pin-key clear" onClick={() => setChangePinNew('')}>
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 4H8l-7 8 7 8h13a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2z"/><line x1="18" y1="9" x2="12" y2="15"/><line x1="12" y1="9" x2="18" y2="15"/></svg>
                          </button>
                          <button className="pin-key" onClick={() => setChangePinNew(p => p.length < 4 ? p + '0' : p)}>0</button>
                          <button className="pin-key confirm" onClick={() => { if (changePinNew.length === 4) { setChangePinMode('confirm'); setChangePinError(''); } }}>
                            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                          </button>
                        </div>
                        <button className="pin-toggle" style={{ display: 'block', margin: '0 auto', fontSize: '0.75rem' }} onClick={() => { setChangePinMode('check'); setChangePinNew(''); setChangePinError(''); }}>← Back</button>
                      </>
                    )
                  }
                  if (changePinMode === 'confirm') {
                    return (
                      <>
                        <div className="form-label" style={{ marginBottom: 8, marginTop: 4, fontSize: '0.72rem' }}>Re-enter new PIN</div>
                        <div className="pin-dots" style={{ justifyContent: 'center', gap: 10, marginBottom: 8 }}>
                          {[0,1,2,3].map(i => <div key={i} className={`pin-dot ${i < changePinNewConfirm.length ? 'filled' : ''}`} />)}
                        </div>
                        {changePinError && <div className="pin-error" style={{ textAlign: 'center', marginBottom: 6, fontSize: '0.75rem' }}>{changePinError}</div>}
                        <div className="pin-keypad pin-pad-light" style={{ maxWidth: 200, margin: '0 auto 8px', gap: 10 }}>
                          {[1,2,3,4,5,6,7,8,9].map(n => <button key={n} className="pin-key" onClick={() => setChangePinNewConfirm(p => p.length < 4 ? p + n : p)}>{n}</button>)}
                          <button className="pin-key clear" onClick={() => setChangePinNewConfirm('')}>
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 4H8l-7 8 7 8h13a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2z"/><line x1="18" y1="9" x2="12" y2="15"/><line x1="12" y1="9" x2="18" y2="15"/></svg>
                          </button>
                          <button className="pin-key" onClick={() => setChangePinNewConfirm(p => p.length < 4 ? p + '0' : p)}>0</button>
                          <button className="pin-key confirm" onClick={async () => {
                            if (changePinNewConfirm.length !== 4) return
                            if (changePinNew !== changePinNewConfirm) {
                              setChangePinError('PINs do not match. Try again.')
                              setChangePinMode('setup')
                              setChangePinNew('')
                              setChangePinNewConfirm('')
                              return
                            }
                            setChangePinLoading(true)
                            try {
                              const res = await AUTH.changePin(changePinOld, changePinNew)
                              if (!res.ok) { setChangePinError(res.error); }
                              else { setChangePinMode(null); setChangePinOld(''); setChangePinNew(''); setChangePinNewConfirm(''); setChangePinError(''); showToast('PIN changed'); }
                            } finally { setChangePinLoading(false); }
                          }}>
                            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                          </button>
                        </div>
                        <button className="pin-toggle" style={{ display: 'block', margin: '0 auto', fontSize: '0.75rem' }} onClick={() => { setChangePinMode('setup'); setChangePinNewConfirm(''); setChangePinError(''); }}>← Back</button>
                      </>
                    )
                  }
                  // Default: show action buttons
                  return (
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      <button className="modal-submit" style={{ flex: 1, background: 'var(--accent-bg)', color: 'var(--text)', border: '1px solid var(--border)', fontSize: '0.85rem', padding: '10px 12px' }}
                        onClick={() => { setChangePinMode('check'); setChangePinOld(''); setChangePinNew(''); setChangePinNewConfirm(''); setChangePinError(''); }}>
                        Change PIN
                      </button>
                      <button className="modal-reset-btn" style={{ fontSize: '0.85rem', padding: '10px 12px' }}
                        onClick={async () => {
                          AUTH.removePin()
                          showToast('PIN removed')
                        }}>
                        Remove PIN
                      </button>
                    </div>
                  )
                })() : (
                  <button className="modal-submit" style={{ width: '100%', marginTop: 0, background: 'var(--accent-bg)', color: 'var(--text)', border: '1px solid var(--border)', fontSize: '0.85rem', padding: '10px 12px' }}
                    onClick={() => { setLockModalOpen(true); }}>
                    Set PIN
                  </button>
                )}
              </div>

              {/* Biometric sub-section */}
              <div>
                <div className="form-label" style={{ marginBottom: 8 }}>Fingerprint Unlock</div>
                {biometricSupported ? (
                  AUTH.isBiometricEnabled() ? (
                    <>
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        <button className="modal-submit" style={{ flex: 1, background: 'var(--accent-bg)', color: 'var(--text)', border: '1px solid var(--border)', fontSize: '0.85rem', padding: '10px 12px' }}
                          disabled={bioChangeLoading}
                          onClick={async () => {
                            setBioChangeLoading(true)
                            setBioChangeError('')
                            try {
                              await AUTH.setupBiometric()
                              AUTH.setLockEnabled(true)
                              AUTH.unlock()
                              setUnlocked(true)
                              showToast('Biometric unlock enabled')
                            } catch (e) {
                              setBioChangeError(e?.message || 'Biometric setup failed')
                            } finally {
                              setBioChangeLoading(false)
                            }
                          }}>
                          {bioChangeLoading ? <span className="btn-loading"><FingerprintIcon className="pulse-icon" style={{ width: 16, height: 16 }} /> Setting up…</span> : 'Re-Enable Biometric'}
                        </button>
                        <button className="modal-reset-btn" style={{ fontSize: '0.85rem', padding: '10px 12px' }}
                          onClick={async () => {
                            AUTH.removeBiometric()
                            showToast('Biometric removed')
                          }}>
                          Remove Biometric
                        </button>
                      </div>
                      {bioChangeError && <div className="pin-error" style={{ textAlign: 'center', marginTop: 8, fontSize: '0.75rem' }}>{bioChangeError}</div>}
                    </>
                  ) : (
                    <>
                      <button className="modal-submit" style={{ width: '100%', marginTop: 0, background: 'var(--accent-bg)', color: 'var(--text)', border: '1px solid var(--border)', fontSize: '0.85rem', padding: '10px 12px' }}
                        disabled={bioChangeLoading}
                        onClick={async () => {
                          setBioChangeLoading(true)
                          setBioChangeError('')
                          try {
                            await AUTH.setupBiometric()
                            AUTH.setLockEnabled(true)
                            AUTH.unlock()
                            setUnlocked(true)
                            showToast('Biometric unlock enabled')
                          } catch (e) {
                            setBioChangeError(e?.message || 'Biometric setup failed')
                          } finally {
                            setBioChangeLoading(false)
                          }
                        }}>
                        {bioChangeLoading ? <span className="btn-loading"><FingerprintIcon className="pulse-icon" style={{ width: 16, height: 16 }} /> Setting up…</span> : 'Enable Fingerprint Unlock'}
                      </button>
                      {bioChangeError && <div className="pin-error" style={{ textAlign: 'center', marginTop: 8, fontSize: '0.75rem' }}>{bioChangeError}</div>}
                    </>
                  )
                ) : (
                  <span style={{ fontSize: '0.82rem', color: 'var(--muted)' }}>Not supported on this device</span>
                )}
              </div>

              <button className="modal-reset-btn" style={{ marginTop: 8 }}
                onClick={() => { AUTH.clearLock(); setUnlocked(false); setProfileOpen(false); setLockModalOpen(false); showToast('App lock disabled'); }}>
                Turn Off App Lock
              </button>
            </div>
          ) : (
            <button
              className="modal-submit"
              style={{ marginTop: 0, background: 'var(--accent-bg)', color: 'var(--text)', border: '1px solid var(--border)' }}
              onClick={() => setLockModalOpen(true)}
            >
              Set Up App Lock
            </button>
          )}
        </div>
      </div>

      {/* ── Lock Setup Modal ── */}
      <div className={`modal-overlay ${lockModalOpen ? 'open' : ''}`} onClick={(e) => { if (e.target === e.currentTarget) setLockModalOpen(false) }}>
        <div className="modal-sheet">
          <div className="modal-handle" />
          <div className="modal-title">Set Up App Lock</div>

          {/* PIN section */}
          <div style={{ marginBottom: 20 }}>
            <div className="form-label" style={{ marginBottom: 8 }}>{lockPinMode === 'setup' ? 'PIN Code' : 'Enter again to confirm'}</div>
            {lockPinMode === 'setup' ? (
              <>
                <div className="pin-dots" style={{ justifyContent: 'center', gap: 14, marginBottom: 12 }}>
                  {[0,1,2,3].map(i => (
                    <div key={i} className={`pin-dot ${i < lockPin.length ? 'filled' : ''}`} />
                  ))}
                </div>
                {lockPinError && <div className="pin-error" style={{ textAlign: 'center', marginBottom: 12 }}>{lockPinError}</div>}
                <div className="pin-keypad pin-pad-light" style={{ maxWidth: 220, margin: '0 auto' }}>
                  {[1,2,3,4,5,6,7,8,9].map(n => (
                    <button key={n} className="pin-key" onClick={() => setLockPin(p => p.length < 4 ? p + n : p)}>{n}</button>
                  ))}
                  <button className="pin-key clear" onClick={() => setLockPin('')}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 4H8l-7 8 7 8h13a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2z"/><line x1="18" y1="9" x2="12" y2="15"/><line x1="12" y1="9" x2="18" y2="15"/></svg>
                  </button>
                  <button className="pin-key" onClick={() => setLockPin(p => p.length < 4 ? p + '0' : p)}>0</button>
                  <button className="pin-key confirm" onClick={() => {
                    if (lockPin.length !== 4) return
                    setLockPinConfirm('')
                    setLockPinMode('confirm')
                    setLockPinError('')
                  }}>
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                  </button>
                </div>
              </>
            ) : lockPinMode === 'confirm' ? (
              <>
                <div className="pin-dots" style={{ justifyContent: 'center', gap: 14, marginBottom: 12 }}>
                  {[0,1,2,3].map(i => (
                    <div key={i} className={`pin-dot ${i < lockPinConfirm.length ? 'filled' : ''}`} />
                  ))}
                </div>
                {lockPinError && <div className="pin-error" style={{ textAlign: 'center', marginBottom: 12 }}>{lockPinError}</div>}
                <div className="pin-keypad pin-pad-light" style={{ maxWidth: 220, margin: '0 auto' }}>
                  {[1,2,3,4,5,6,7,8,9].map(n => (
                    <button key={n} className="pin-key" onClick={() => setLockPinConfirm(p => p.length < 4 ? p + n : p)}>{n}</button>
                  ))}
                  <button className="pin-key clear" onClick={() => setLockPinConfirm('')}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 4H8l-7 8 7 8h13a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2z"/><line x1="18" y1="9" x2="12" y2="15"/><line x1="12" y1="9" x2="18" y2="15"/></svg>
                  </button>
                  <button className="pin-key" onClick={() => setLockPinConfirm(p => p.length < 4 ? p + '0' : p)}>0</button>
                  <button className="pin-key confirm" onClick={async () => {
                    if (lockPinConfirm.length !== 4) return
                    if (lockPin !== lockPinConfirm) {
                      setLockPinError('PINs do not match. Try again.')
                      setLockPinMode('setup')
                      setLockPin('')
                      setLockPinConfirm('')
                      return
                    }
                    await AUTH.setPin(lockPin)
                    AUTH.setLockEnabled(true)
                    AUTH.unlock()
                    setUnlocked(true)
                    setLockModalOpen(false)
                    setProfileOpen(false)
                    showToast('PIN set — lock enabled')
                  }}>
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                  </button>
                </div>
                <button className="pin-toggle" style={{ display: 'block', margin: '12px auto 0' }}
                  onClick={() => { setLockPinMode('setup'); setLockPin(''); setLockPinConfirm(''); setLockPinError('') }}>
                  ← Back
                </button>
              </>
            ) : (
              <button className="modal-submit" style={{ marginTop: 0 }}
                onClick={() => { setLockPinMode('setup'); setLockPin(''); setLockPinConfirm(''); setLockPinError(''); }}>
                Set PIN
              </button>
            )}
          </div>

          {/* Biometric section */}
          {biometricSupported && (
            <div style={{ borderTop: '1px solid var(--border)', paddingTop: 20 }}>
              <div className="form-label" style={{ marginBottom: 10 }}>Fingerprint Unlock</div>
              {AUTH.isBiometricEnabled() ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <span style={{ fontSize: '0.82rem', color: 'var(--muted)' }}>✓ Biometric enabled</span>
                  <button
                    className="modal-reset-btn"
                    style={{ marginTop: 0 }}
                    onClick={async () => {
                      AUTH.removeBiometric()
                      showToast('Biometric removed')
                    }}
                  >
                    Remove Biometric
                  </button>
                </div>
              ) : (
                <button
                  className="modal-submit"
                  style={{ marginTop: 0, background: 'var(--accent-bg)', color: 'var(--text)', border: '1px solid var(--border)' }}
                  disabled={biometricLoading}
                  onClick={async () => {
                    setBiometricLoading(true)
                    try {
                      await AUTH.setupBiometric()
                      AUTH.setLockEnabled(true)
                      AUTH.unlock()
                      setUnlocked(true)
                      setLockModalOpen(false)
                      setProfileOpen(false)
                      showToast('Biometric unlock enabled')
                    } catch (e) {
                      showToast(e?.message || 'Biometric setup failed')
                    } finally {
                      setBiometricLoading(false)
                    }
                  }}
                >
                  {biometricLoading ? 'Setting up…' : 'Enable Fingerprint Unlock'}
                </button>
              )}
            </div>
          )}

          <button
            className="modal-close"
            onClick={() => setLockModalOpen(false)}
            style={{ position: 'absolute', top: 16, right: 16, background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '50%', width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--muted)', fontSize: '1rem' }}
          >
            <svg viewBox="0 0 384 512" fill="currentColor" style={{ width: 16, height: 16 }}>
              <path d="M342.6 150.6c12.5-12.5 12.5-32.8 0-45.3s-32.8-12.5-45.3 0L192 210.7 86.6 105.4c-12.5-12.5-32.8-12.5-45.3 0s-12.5 32.8 0 45.3L146.7 256 41.4 361.4c-12.5 12.5-12.5 32.8 0 45.3s32.8 12.5 45.3 0L192 301.3 297.4 406.6c12.5 12.5 32.8 12.5 45.3 0s12.5-32.8 0-45.3L237.3 256 342.6 150.6z"/>
            </svg>
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
    </>
  )
}
