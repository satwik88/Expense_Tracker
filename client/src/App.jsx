import { useState, useEffect, useCallback, useRef } from 'react'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer
} from 'recharts'
import { AUTH } from './auth'
import { getCatMeta } from './categories'

const API = '/api'
const CATEGORIES = [
  'Salary', 'Freelance', 'Investment', 'Gift',
  'Food', 'Transport', 'Shopping', 'Bills', 'Entertainment', 'Health', 'Education', 'Other'
]

const formatDate = (d) => new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
const fmt = (n) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0 }).format(n)

export default function App() {
  const [unlocked, setUnlocked] = useState(false)
  const [entries, setEntries] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [chartRange, setChartRange] = useState('monthly')
  const [modalOpen, setModalOpen] = useState(false)
  const [toast, setToast] = useState('')

  // Form state
  const [amount, setAmount] = useState('')
  const [type, setType] = useState('deposit')
  const [category, setCategory] = useState('')
  const [note, setNote] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const dropdownRef = useRef(null)

  const showToast = useCallback((msg) => {
    setToast(msg)
    setTimeout(() => setToast(''), 2200)
  }, [])

  const fetchEntries = useCallback(async () => {
    try {
      const res = await fetch(`${API}/entries`)
      const data = await res.json()
      setEntries(data)
    } catch (e) {
      console.error('Failed to fetch entries', e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (AUTH.isUnlocked()) {
      setUnlocked(true)
      fetchEntries()
    }
  }, [fetchEntries])

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // Chart data
  const getChartData = useCallback(() => {
    const now = new Date()
    let days = 30
    if (chartRange === 'weekly') days = 7
    else if (chartRange === 'monthly') days = 30
    else if (chartRange === 'yearly') days = 365

    const cutoff = new Date(now - days * 86400000)
    const filtered = entries.filter(e => new Date(e.date) >= cutoff)
    // Build running balance from filtered
    const sorted = [...filtered].sort((a, b) => new Date(a.date) - new Date(b.date))
    let balance = 0
    const points = []
    const seenDates = new Set()
    sorted.forEach(e => {
      balance += e.type === 'deposit' ? e.amount : -e.amount
      if (!seenDates.has(e.date)) {
        seenDates.add(e.date)
        points.push({ date: e.date, balance, label: formatDate(e.date) })
      }
    })
    return points
  }, [entries, chartRange])

  const chartData = getChartData()

  // Summary stats
  const now = new Date()
  const thisMonth = now.getMonth()
  const thisYear = now.getFullYear()
  const monthEntries = entries.filter(e => {
    const d = new Date(e.date)
    return d.getMonth() === thisMonth && d.getFullYear() === thisYear
  })
  const totalDeposit = monthEntries.filter(e => e.type === 'deposit').reduce((s, e) => s + e.amount, 0)
  const totalWithdrawal = monthEntries.filter(e => e.type === 'withdrawal').reduce((s, e) => s + e.amount, 0)
  const net = totalDeposit - totalWithdrawal
  const balance = entries.reduce((s, e) => s + (e.type === 'deposit' ? e.amount : -e.amount), 0)

  // Last month comparison
  const lastMonth = now.getMonth() === 0 ? 11 : now.getMonth() - 1
  const lastMonthYear = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear()
  const lastMonthEntries = entries.filter(e => {
    const d = new Date(e.date)
    return d.getMonth() === lastMonth && d.getFullYear() === lastMonthYear
  })
  const lastMonthNet = lastMonthEntries.reduce((s, e) => s + (e.type === 'deposit' ? e.amount : -e.amount), 0)
  const changePct = lastMonthNet !== 0 ? ((net - lastMonthNet) / Math.abs(lastMonthNet) * 100).toFixed(0) : null

  // Filtered entries
  const filtered = filter === 'all' ? entries : entries.filter(e => e.category === filter)
  const monthName = now.toLocaleString('default', { month: 'long', year: 'numeric' })

  async function handleSubmit(e) {
    e.preventDefault()
    if (!amount || !category) return
    setSubmitting(true)
    try {
      await fetch(`${API}/entries`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: parseFloat(amount), type, category,
          note: note.trim(), date: new Date().toISOString().split('T')[0]
        })
      })
      setAmount(''); setNote(''); setCategory(''); setType('deposit')
      await fetchEntries()
      setModalOpen(false)
      showToast('✓ Entry added')
    } catch (err) {
      showToast('Failed to add entry')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDelete(id) {
    await fetch(`${API}/entries/${id}`, { method: 'DELETE' })
    await fetchEntries()
    showToast('Entry deleted')
  }

  if (!unlocked) return <LockScreen onUnlock={() => setUnlocked(true)} />

  if (loading) return <div className="spinner">Loading...</div>

  return (
    <div className="app">
      {/* Toast */}
      {toast && <div className={`toast ${toast ? 'show' : ''}`}>{toast}</div>}

      {/* ── Top Header ── */}
      <div className="top-header">
        <div>
          <div className="greeting">Welcome back</div>
          <div className="greeting-name">User</div>
        </div>
        <div className="header-right">
          <button className="notif-btn" title="Notifications">
            🔔
            <span className="notif-dot" />
          </button>
          <div className="avatar" title="Lock app" onClick={() => { AUTH.lock(); setUnlocked(false); }}>
            U
          </div>
        </div>
      </div>

      {/* ── Balance Card ── */}
      <div className="balance-card">
        <div className="balance-label">Total Balance</div>
        <div className="balance-amount">{fmt(balance)}</div>
        {changePct !== null && (
          <div className={`balance-change ${net >= lastMonthNet ? 'positive' : 'negative'}`}>
            {net >= lastMonthNet ? '↑' : '↓'} {Math.abs(changePct)}% vs last month
          </div>
        )}
      </div>

      {/* ── Quick Stats ── */}
      <div className="stats-row">
        <div className="stat-card">
          <div className="stat-icon">📥</div>
          <div className="stat-label">Income</div>
          <div className="stat-value green">{fmt(totalDeposit)}</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">📤</div>
          <div className="stat-label">Spent</div>
          <div className="stat-value red">{fmt(totalWithdrawal)}</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">📊</div>
          <div className="stat-label">Net</div>
          <div className={`stat-value ${net >= 0 ? 'green' : 'red'}`}>{fmt(net)}</div>
        </div>
      </div>

      {/* ── Chart ── */}
      <div className="chart-card">
        <div className="chart-header">
          <span className="chart-title">Balance Trend</span>
          <div className="chart-legend">
            <span><span className="dot red" /> Withdraw</span>
            <span><span className="dot green" /> Deposit</span>
          </div>
        </div>
        <div className="chart-tabs">
          {['weekly', 'monthly', 'yearly'].map(r => (
            <button key={r} className={`chart-tab ${chartRange === r ? 'active' : ''}`}
              onClick={() => setChartRange(r)}>
              {r.charAt(0).toUpperCase() + r.slice(1)}
            </button>
          ))}
        </div>
        <div className="chart-container">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="balanceGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#E53E3E" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#E53E3E" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.4)' }} axisLine={false} tickLine={false} />
              <YAxis hide />
              <Tooltip
                contentStyle={{ background: '#1e293b', border: 'none', borderRadius: 10, fontSize: 13 }}
                labelStyle={{ color: 'rgba(255,255,255,0.5)', fontSize: 11 }}
                formatter={(value) => [fmt(value), 'Balance']}
              />
              <Area
                type="monotone"
                dataKey="balance"
                stroke="#E53E3E"
                strokeWidth={2}
                fill="url(#balanceGrad)"
                dot={false}
                activeDot={{ r: 5, fill: '#E53E3E', stroke: '#fff', strokeWidth: 2 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ── Transactions Section ── */}
      <div className="section-header" ref={dropdownRef}>
        <span className="section-title">Transactions</span>
        <div style={{ position: 'relative' }}>
          <button className="dropdown-btn" onClick={() => setDropdownOpen(!dropdownOpen)}>
            {filter === 'all' ? 'All ▾' : `${filter} ▾`}
          </button>
          {dropdownOpen && (
            <div className="dropdown-menu open">
              <div className={`dropdown-item ${filter === 'all' ? 'active' : ''}`} onClick={() => { setFilter('all'); setDropdownOpen(false); }}>All</div>
              {CATEGORIES.map(c => (
                <div key={c} className={`dropdown-item ${filter === c ? 'active' : ''}`}
                  onClick={() => { setFilter(c); setDropdownOpen(false); }}>
                  {getCatMeta(c).emoji} {c}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Transaction List ── */}
      <div className="transactions-list">
        {filtered.length === 0 ? (
          <div className="empty-state">
            <div className="icon">📭</div>
            <p>No transactions yet.<br/>Tap + to add one!</p>
          </div>
        ) : (
          filtered.map(entry => {
            const meta = getCatMeta(entry.category)
            const isDeposit = entry.type === 'deposit'
            return (
              <div className="tx-item" key={entry.id}>
                <div className="tx-icon">{meta.emoji}</div>
                <div className="tx-details">
                  <div className="tx-category">{entry.category}</div>
                  <div className="tx-type">{entry.note || (isDeposit ? 'Deposit' : 'Withdrawal')}</div>
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

      {/* ── Bottom Nav ── */}
      <div className="bottom-nav">
        <button className="nav-item active" title="Home">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <path d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-4 0a1 1 0 01-1-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 01-1 1"/>
          </svg>
          Home
        </button>
        <button className="nav-item" title="Stats">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <path d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
          </svg>
          Stats
        </button>
        <button className="nav-item" title="Profile">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <path d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
          </svg>
          Profile
        </button>
        <button className="nav-add" onClick={() => setModalOpen(true)} title="Add entry">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
            <path d="M12 4v16m-8-8h16"/>
          </svg>
        </button>
      </div>

      {/* ── Add Entry Modal (Bottom Sheet) ── */}
      <div className={`modal-overlay ${modalOpen ? 'open' : ''}`} onClick={(e) => { if (e.target === e.currentTarget) setModalOpen(false) }}>
        <div className="modal-sheet">
          <div className="modal-handle" />
          <div className="modal-title">Add Transaction</div>

          <div className="modal-type-toggle">
            <button className={`modal-type-btn deposit ${type === 'deposit' ? 'active' : ''}`} onClick={() => setType('deposit')}>
              📥 Deposit
            </button>
            <button className={`modal-type-btn withdrawal ${type === 'withdrawal' ? 'active' : ''}`} onClick={() => setType('withdrawal')}>
              📤 Withdrawal
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

            <div className="form-group full" style={{ marginBottom: 12 }}>
              <label className="form-label">Category</label>
              <div className="cat-grid">
                {CATEGORIES.map(c => {
                  const m = getCatMeta(c)
                  return (
                    <div key={c} className={`cat-chip ${category === c ? 'active' : ''}`}
                      onClick={() => setCategory(c)}>
                      <span className="cat-emoji">{m.emoji}</span>
                      {c}
                    </div>
                  )
                })}
              </div>
            </div>

            <div className="form-group full" style={{ marginBottom: 16 }}>
              <label className="form-label">Note (optional)</label>
              <textarea className="form-textarea" placeholder="What was this for?"
                value={note} onChange={e => setNote(e.target.value)} maxLength={100} />
            </div>

            <button type="submit" className="modal-submit" disabled={submitting}>
              {submitting ? 'Saving…' : 'Add Entry'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
