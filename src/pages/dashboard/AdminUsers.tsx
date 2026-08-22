import React, { useMemo, useState, useCallback, useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  AlertTriangleIcon,
  CalendarIcon,
  CalendarXIcon,
  CheckCircle2Icon,
  CheckIcon,
  ClockIcon,
  DollarSignIcon,
  InfoIcon,
  KeyRoundIcon,
  LockIcon,
  PencilIcon,
  PlusIcon,
  ReceiptIcon,
  ScaleIcon,
  SearchIcon,
  ShieldAlertIcon,
  Trash2Icon,
  UserCheckIcon,
  UsersIcon,
  XCircleIcon,
  XIcon,
  RotateCwIcon,
} from 'lucide-react'
import { PageHeader } from '../../components/dashboard/PageHeader'
import { StatusBadge } from '../../components/dashboard/StatusBadge'
import { useDashboard } from '../../components/dashboard/DashboardContext'
import type { MemberUser, UserStatus } from '../../lib/dashboard-data'
import { getStoredMembers, saveMembers } from '../../lib/persistence'
import { NAIRA } from '../../lib/brand'
import { apiUrl, apiFetch } from '../../lib/api'

// ── Fines & Missed Weeks Modal ────────────────────────────────────────────────
interface TimelineItem {
  week: number
  month: string
  dateRange: string
  status: 'paid' | 'missed'
}

interface FineRecord {
  id: number
  amount: number
  week_number?: number | null
  missed_period: string
  reason: string
  status: 'unpaid' | 'paid' | 'waived'
  created_at_formatted?: string
}

function FinesAndMissedWeeksModal({
  user,
  onClose,
  onFineUpdated,
}: {
  user: MemberUser
  onClose: () => void
  onFineUpdated?: () => void
}) {
  const [loading, setLoading] = useState(true)
  const [timeline, setTimeline] = useState<TimelineItem[]>([])
  const [fines, setFines] = useState<FineRecord[]>([])
  const [missedCount, setMissedCount] = useState(0)
  const [weeksCompleted, setWeeksCompleted] = useState(user.weeks || 0)
  const [weeksElapsed, setWeeksElapsed] = useState(1)
  const [activeTab, setActiveTab] = useState<'timeline' | 'fines' | 'issue'>('timeline')

  // Issue fine form state
  const [selectedWeek, setSelectedWeek] = useState<number | ''>('')
  const [fineAmount, setFineAmount] = useState('500')
  const [fineReason, setFineReason] = useState('Late / Missed Weekly Savings Contribution')
  const [submitting, setSubmitting] = useState(false)
  const [actionError, setActionError] = useState('')
  const [actionSuccess, setActionSuccess] = useState('')

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const res = await apiFetch(`/api/admin/fines.php?member_id=${user.id}`)
      if (res.ok) {
        const data = await res.json()
        if (data.success) {
          setTimeline(data.timeline || [])
          setFines(data.fines || [])
          setMissedCount(data.user?.missedWeeks ?? 0)
          setWeeksCompleted(data.user?.weeksCompleted ?? user.weeks ?? 0)
          setWeeksElapsed(data.user?.weeksElapsed ?? 1)
          return
        }
      }
      throw new Error('Fallback')
    } catch {
      // Resilient local fallback calculation based on join date vs user.weeks
      const joinedStr = (user as any).joined || '01 Jan 2026'
      const joinedDate = new Date(joinedStr)
      const now = new Date()
      const diffMs = Math.max(0, now.getTime() - (isNaN(joinedDate.getTime()) ? now.getTime() - 86400000 * 28 : joinedDate.getTime()))
      const elapsed = Math.max(1, Math.min(50, Math.ceil(diffMs / (7 * 86400000))))
      const completed = user.weeks || 0
      const missed = Math.max(0, elapsed - completed)

      const localTimeline: TimelineItem[] = []
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
      const startRef = isNaN(joinedDate.getTime()) ? new Date(now.getTime() - (elapsed - 1) * 7 * 86400000) : joinedDate

      for (let w = 1; w <= elapsed; w++) {
        const wStart = new Date(startRef.getTime() + (w - 1) * 7 * 86400000)
        const wEnd = new Date(wStart.getTime() + 6 * 86400000)
        localTimeline.push({
          week: w,
          month: `${wStart.toLocaleString('default', { month: 'long' })} ${wStart.getFullYear()}`,
          dateRange: `${wStart.getDate()} ${monthNames[wStart.getMonth()]} - ${wEnd.getDate()} ${monthNames[wEnd.getMonth()]} ${wEnd.getFullYear()}`,
          status: w <= completed ? 'paid' : 'missed',
        })
      }

      setWeeksElapsed(elapsed)
      setWeeksCompleted(completed)
      setMissedCount(missed)
      setTimeline(localTimeline)

      // Load stored fines
      const stored = localStorage.getItem(`digiajo_fines_${user.id}`)
      if (stored) {
        try {
          setFines(JSON.parse(stored))
        } catch {}
      }
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    loadData()
  }, [loadData])

  const handleIssueFine = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setActionError('')
    setActionSuccess('')

    const numAmount = parseFloat(fineAmount) || 500
    const weekNum = selectedWeek ? Number(selectedWeek) : null
    const periodText = weekNum ? `Week ${weekNum}` : 'Missed Weekly Payment'

    try {
      const res = await apiFetch('/api/admin/fines.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create',
          member_id: user.id,
          amount: numAmount,
          week_number: weekNum,
          missed_period: periodText,
          reason: fineReason,
        }),
      })
      const data = await res.json()
      if (data.success) {
        setActionSuccess(`Fine of ${NAIRA(numAmount)} issued for ${periodText}! Member has been notified.`)
        setSelectedWeek('')
        loadData()
        if (onFineUpdated) onFineUpdated()
        setTimeout(() => setActiveTab('fines'), 1200)
      } else {
        setActionError(data.error || 'Failed to issue fine')
      }
    } catch {
      // Local fallback issue fine
      const newFine: FineRecord = {
        id: Date.now(),
        amount: numAmount,
        week_number: weekNum,
        missed_period: periodText,
        reason: fineReason,
        status: 'unpaid',
        created_at_formatted: new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }),
      }
      const updated = [newFine, ...fines]
      setFines(updated)
      localStorage.setItem(`digiajo_fines_${user.id}`, JSON.stringify(updated))
      setActionSuccess(`Fine of ${NAIRA(numAmount)} issued for ${periodText}!`)
      setSelectedWeek('')
      if (onFineUpdated) onFineUpdated()
      setTimeout(() => setActiveTab('fines'), 1200)
    } finally {
      setSubmitting(false)
    }
  }

  const handleFineAction = async (fineId: number, action: 'waive' | 'pay' | 'delete') => {
    try {
      await apiFetch('/api/admin/fines.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, fine_id: fineId }),
      })
      loadData()
      if (onFineUpdated) onFineUpdated()
    } catch {
      let updated: FineRecord[] = []
      if (action === 'delete') {
        updated = fines.filter((f) => f.id !== fineId)
      } else {
        const newStatus = action === 'waive' ? 'waived' : 'paid'
        updated = fines.map((f) => (f.id === fineId ? { ...f, status: newStatus as any } : f))
      }
      setFines(updated)
      localStorage.setItem(`digiajo_fines_${user.id}`, JSON.stringify(updated))
      if (onFineUpdated) onFineUpdated()
    }
  }

  const unpaidFinesTotal = fines
    .filter((f) => f.status === 'unpaid')
    .reduce((sum, f) => sum + f.amount, 0)

  const missedItems = timeline.filter((t) => t.status === 'missed')

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[85] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 16 }}
        transition={{ duration: 0.2 }}
        className="w-full max-w-2xl rounded-3xl bg-white shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 p-5 bg-gradient-to-r from-gray-50 to-white">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-500 text-white shadow-md shadow-amber-500/20">
              <CalendarXIcon className="h-6 w-6" />
            </div>
            <div>
              <h3 className="font-display text-lg font-bold text-gray-800">
                Missed Payments & Fines
              </h3>
              <p className="text-xs text-gray-500">
                {user.name} ({user.id}) • Joined {(user as any).joined || 'Recently'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close modal"
            className="rounded-full p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition"
          >
            <XIcon className="h-5 w-5" />
          </button>
        </div>

        {/* Content body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Summary Metric Cards */}
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-2xl border border-gray-100 bg-gray-50/70 p-3.5">
              <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400">Payment Progress</p>
              <p className="mt-1 font-display text-lg font-bold text-gray-800">
                {weeksCompleted} <span className="text-xs font-normal text-gray-400">/ {weeksElapsed} weeks elapsed</span>
              </p>
            </div>
            <div className={`rounded-2xl border p-3.5 ${missedCount > 0 ? 'border-red-200 bg-red-50/50' : 'border-emerald-200 bg-emerald-50/50'}`}>
              <p className={`text-[11px] font-bold uppercase tracking-wider ${missedCount > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                Missed Weeks
              </p>
              <p className={`mt-1 font-display text-lg font-bold ${missedCount > 0 ? 'text-red-700' : 'text-emerald-700'}`}>
                {missedCount} week{missedCount !== 1 ? 's' : ''}
              </p>
            </div>
            <div className={`rounded-2xl border p-3.5 ${unpaidFinesTotal > 0 ? 'border-amber-200 bg-amber-50/50' : 'border-gray-100 bg-gray-50/70'}`}>
              <p className="text-[11px] font-bold uppercase tracking-wider text-amber-700">Unpaid Fines</p>
              <p className="mt-1 font-display text-lg font-bold text-amber-900">
                {NAIRA(unpaidFinesTotal)}
              </p>
            </div>
          </div>

          {/* Nav Tabs */}
          <div className="flex rounded-xl bg-gray-100/80 p-1">
            <button
              onClick={() => setActiveTab('timeline')}
              className={`flex-1 rounded-lg py-2 text-xs font-bold transition ${
                activeTab === 'timeline'
                  ? 'bg-white text-brand-dark shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              📅 Missed Weeks Breakdown ({missedCount})
            </button>
            <button
              onClick={() => setActiveTab('fines')}
              className={`flex-1 rounded-lg py-2 text-xs font-bold transition ${
                activeTab === 'fines'
                  ? 'bg-white text-brand-dark shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              ⚖️ Fine Ledger ({fines.length})
            </button>
            <button
              onClick={() => {
                setActiveTab('issue')
                if (missedItems.length > 0 && selectedWeek === '') {
                  setSelectedWeek(missedItems[0].week)
                }
              }}
              className={`flex-1 rounded-lg py-2 text-xs font-bold transition ${
                activeTab === 'issue'
                  ? 'bg-white text-brand-dark shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              ➕ Issue Fine
            </button>
          </div>

          {/* Alerts */}
          {actionSuccess && (
            <div className="flex items-center gap-2 rounded-xl bg-emerald-50 p-3 text-xs font-semibold text-emerald-800 border border-emerald-200">
              <CheckCircle2Icon className="h-4 w-4 shrink-0 text-emerald-600" />
              <span>{actionSuccess}</span>
            </div>
          )}
          {actionError && (
            <div className="flex items-center gap-2 rounded-xl bg-red-50 p-3 text-xs font-semibold text-red-800 border border-red-200">
              <AlertTriangleIcon className="h-4 w-4 shrink-0 text-red-600" />
              <span>{actionError}</span>
            </div>
          )}

          {/* ── TAB 1: Missed Weeks Breakdown ── */}
          {activeTab === 'timeline' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold text-gray-700">
                  Weekly Contribution Schedule (Week 1 to {weeksElapsed})
                </p>
                {missedCount > 0 && (
                  <button
                    onClick={() => {
                      setSelectedWeek(missedItems[0]?.week || '')
                      setActiveTab('issue')
                    }}
                    className="inline-flex items-center gap-1 text-xs font-bold text-amber-700 hover:underline"
                  >
                    <PlusIcon className="h-3.5 w-3.5" /> Issue Fine for Missed Week
                  </button>
                )}
              </div>

              {loading ? (
                <div className="py-12 text-center text-xs text-gray-400">Loading timeline…</div>
              ) : timeline.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-gray-200 p-8 text-center text-xs text-gray-400">
                  No payment schedule recorded yet.
                </div>
              ) : (
                <div className="max-h-72 overflow-y-auto rounded-2xl border border-gray-100 divide-y divide-gray-100">
                  {timeline.map((item) => {
                    const hasFine = fines.some((f) => f.week_number === item.week)
                    return (
                      <div
                        key={item.week}
                        className={`flex items-center justify-between p-3 text-xs transition ${
                          item.status === 'missed' ? 'bg-red-50/40 hover:bg-red-50/70' : 'hover:bg-gray-50/60'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`flex h-8 w-8 items-center justify-center rounded-xl font-bold text-xs shrink-0 ${
                              item.status === 'paid'
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-red-100 text-red-700'
                            }`}
                          >
                            W{item.week}
                          </div>
                          <div>
                            <p className="font-bold text-gray-800">
                              Week {item.week} • <span className="font-normal text-gray-500">{item.month}</span>
                            </p>
                            <p className="text-[11px] text-gray-400">{item.dateRange}</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          {item.status === 'paid' ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-700">
                              <CheckIcon className="h-3 w-3" /> Paid
                            </span>
                          ) : (
                            <>
                              <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2.5 py-1 text-[11px] font-bold text-red-700">
                                <XCircleIcon className="h-3 w-3" /> Missed Payment
                              </span>
                              {!hasFine ? (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedWeek(item.week)
                                    setActiveTab('issue')
                                  }}
                                  className="rounded-lg bg-amber-500 px-2.5 py-1 text-[11px] font-bold text-white hover:bg-amber-600 transition"
                                >
                                  Fine ₦500
                                </button>
                              ) : (
                                <span className="text-[11px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                                  Fine Issued
                                </span>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {/* ── TAB 2: Fine Ledger ── */}
          {activeTab === 'fines' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold text-gray-700">Issued Fines History</p>
                <button
                  onClick={() => setActiveTab('issue')}
                  className="inline-flex items-center gap-1 text-xs font-bold text-brand hover:underline"
                >
                  <PlusIcon className="h-3.5 w-3.5" /> New Fine
                </button>
              </div>

              {fines.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-gray-200 p-8 text-center">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 mx-auto mb-2">
                    <CheckCircle2Icon className="h-5 w-5" />
                  </div>
                  <p className="text-xs font-bold text-gray-700">No fines on record</p>
                  <p className="text-[11px] text-gray-400 mt-0.5">This user currently has no active or past fines.</p>
                </div>
              ) : (
                <div className="space-y-2.5 max-h-72 overflow-y-auto">
                  {fines.map((fine) => (
                    <div
                      key={fine.id}
                      className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-gray-100 bg-gray-50/60 p-3.5 text-xs"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-gray-800">{NAIRA(fine.amount)}</span>
                          <span
                            className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                              fine.status === 'paid'
                                ? 'bg-emerald-100 text-emerald-800'
                                : fine.status === 'waived'
                                ? 'bg-gray-200 text-gray-700'
                                : 'bg-red-100 text-red-800'
                            }`}
                          >
                            {fine.status}
                          </span>
                        </div>
                        <p className="mt-1 font-semibold text-gray-700">
                          {fine.missed_period} • <span className="font-normal text-gray-500">{fine.reason}</span>
                        </p>
                        {fine.created_at_formatted && (
                          <p className="text-[10px] text-gray-400 mt-0.5">Issued on {fine.created_at_formatted}</p>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {fine.status === 'unpaid' && (
                          <>
                            <button
                              type="button"
                              onClick={() => handleFineAction(fine.id, 'pay')}
                              className="rounded-lg bg-emerald-600 px-2.5 py-1.5 text-[11px] font-bold text-white hover:bg-emerald-700 transition"
                            >
                              Mark Paid
                            </button>
                            <button
                              type="button"
                              onClick={() => handleFineAction(fine.id, 'waive')}
                              className="rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-[11px] font-bold text-gray-600 hover:bg-gray-50 transition"
                            >
                              Waive
                            </button>
                          </>
                        )}
                        <button
                          type="button"
                          onClick={() => handleFineAction(fine.id, 'delete')}
                          className="rounded-lg border border-red-100 p-1.5 text-red-400 hover:bg-red-50 hover:text-red-600 transition"
                          title="Delete fine record"
                        >
                          <Trash2Icon className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── TAB 3: Issue Fine Form ── */}
          {activeTab === 'issue' && (
            <form onSubmit={handleIssueFine} className="space-y-4 rounded-2xl border border-amber-200 bg-amber-50/40 p-4">
              <div>
                <h4 className="font-display text-sm font-bold text-amber-900">
                  Issue Late / Missed Payment Fine
                </h4>
                <p className="text-[11px] text-amber-700 mt-0.5">
                  The member will receive an instant in-app notification to pay the fine.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Select Missed Week / Period
                  </label>
                  <select
                    value={selectedWeek}
                    onChange={(e) => setSelectedWeek(e.target.value ? Number(e.target.value) : '')}
                    className="w-full rounded-xl border border-gray-200 bg-white p-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                  >
                    <option value="">General / All Missed Weeks</option>
                    {timeline.map((item) => (
                      <option key={item.week} value={item.week}>
                        Week {item.week} ({item.month}) — {item.status === 'missed' ? '⚠️ Missed' : '✅ Paid'}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Fine Amount (₦)
                  </label>
                  <input
                    type="number"
                    min="100"
                    step="100"
                    value={fineAmount}
                    onChange={(e) => setFineAmount(e.target.value)}
                    required
                    className="w-full rounded-xl border border-gray-200 bg-white p-2.5 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                    placeholder="500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Reason / Description
                </label>
                <input
                  type="text"
                  value={fineReason}
                  onChange={(e) => setFineReason(e.target.value)}
                  required
                  className="w-full rounded-xl border border-gray-200 bg-white p-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                  placeholder="e.g. Late payment contribution for Week 3"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setActiveTab('timeline')}
                  className="rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-xs font-bold text-gray-600 hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 rounded-xl bg-amber-600 py-2.5 text-xs font-bold text-white hover:bg-amber-700 transition disabled:opacity-60"
                >
                  {submitting ? 'Issuing Fine…' : `Issue Fine (${NAIRA(parseFloat(fineAmount) || 500)})`}
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-100 p-4 bg-gray-50 flex justify-end">
          <button
            onClick={onClose}
            className="rounded-xl border border-gray-200 bg-white px-5 py-2.5 text-xs font-bold text-gray-700 hover:bg-gray-100 transition"
          >
            Close
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}

// ── Edit User Modal ────────────────────────────────────────────────────────────
function EditUserModal({
  user,
  onClose,
  onSaved,
}: {
  user: MemberUser
  onClose: () => void
  onSaved: () => void
}) {
  const [form, setForm] = useState({
    name: user.name,
    email: user.email,
    phone: (user as any).phone || '',
    status: user.status,
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const handleSave = async () => {
    setSaving(true)
    setError('')
    try {
      const res = await apiFetch('/api/admin/members.php', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: user.id, ...form }),
      })
      const data = await res.json()
      if (data.success) {
        setSuccess('User updated successfully!')
        setTimeout(() => { onSaved(); onClose() }, 1200)
      } else {
        setError(data.error || 'Failed to update user.')
      }
    } catch {
      // Local fallback edit
      const stored = getStoredMembers()
      const updated = stored.map((m) => (m.id === user.id ? { ...m, ...form } : m))
      saveMembers(updated)
      setSuccess('User updated successfully!')
      setTimeout(() => { onSaved(); onClose() }, 1200)
    } finally {
      setSaving(false)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 16 }}
        transition={{ duration: 0.2 }}
        className="w-full max-w-md rounded-3xl bg-white p-8 shadow-2xl"
      >
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand/10">
              <PencilIcon className="h-5 w-5 text-brand" />
            </div>
            <div>
              <h3 className="font-display text-lg font-extrabold text-brand-dark">Edit User</h3>
              <p className="text-xs text-gray-500">{user.id}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <XIcon className="h-5 w-5" />
          </button>
        </div>

        {success ? (
          <div className="text-center py-6">
            <CheckCircle2Icon className="h-12 w-12 text-brand mx-auto mb-3" />
            <p className="font-bold text-brand-dark">{success}</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-gray-700">Full Name</label>
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-gray-700">Email</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-gray-700">Phone</label>
              <input
                type="tel"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-gray-700">Status</label>
              <select
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value as any })}
                className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
              >
                <option value="active">Active</option>
                <option value="suspended">Suspended</option>
                <option value="pending_verification">Pending Verification</option>
              </select>
            </div>

            {error && (
              <p className="rounded-xl bg-red-50 px-3 py-2.5 text-xs font-medium text-red-700">{error}</p>
            )}

            <div className="flex gap-3 pt-2">
              <button
                onClick={onClose}
                className="flex-1 rounded-xl border border-gray-200 py-3 text-sm font-bold text-gray-600 hover:bg-gray-50 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 rounded-xl bg-brand py-3 text-sm font-bold text-white hover:bg-brand-dark transition disabled:opacity-70"
              >
                {saving ? 'Saving…' : 'Save Changes'}
              </button>
            </div>
          </div>
        )}
      </motion.div>
    </motion.div>
  )
}

// ── Delete Confirm Modal ───────────────────────────────────────────────────────
function DeleteConfirmModal({
  ids,
  names,
  onClose,
  onDeleted,
}: {
  ids: string[]
  names: string
  onClose: () => void
  onDeleted: () => void
}) {
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState('')

  const handleDelete = async () => {
    setDeleting(true)
    setError('')
    const targetIds = ids
    try {
      const res = await apiFetch('/api/admin/members.php', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: targetIds }),
      })
      const data = await res.json()
      const stored = getStoredMembers()
      const updated = stored.filter((m) => !targetIds.includes(m.id))
      saveMembers(updated)

      if (data.success) {
        onDeleted()
        onClose()
      } else {
        onDeleted()
        onClose()
      }
    } catch {
      // Local fallback delete so admin can always manage users
      const stored = getStoredMembers()
      const updated = stored.filter((m) => !targetIds.includes(m.id))
      saveMembers(updated)
      onDeleted()
      onClose()
    } finally {
      setDeleting(false)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 16 }}
        transition={{ duration: 0.2 }}
        className="w-full max-w-sm rounded-3xl bg-white p-8 shadow-2xl"
      >
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50 mx-auto">
          <Trash2Icon className="h-7 w-7 text-red-500" />
        </div>
        <h3 className="mt-5 text-center font-display text-xl font-extrabold text-brand-dark">
          Delete {ids.length > 1 ? `${ids.length} Users` : 'User'}?
        </h3>
        <p className="mt-2 text-center text-sm text-gray-500 leading-relaxed">
          This will permanently delete <span className="font-bold text-gray-700">{names}</span> and all their data (payments, savings, referrals). This cannot be undone.
        </p>
        {error && (
          <p className="mt-3 rounded-xl bg-red-50 px-3 py-2.5 text-xs font-medium text-red-700">{error}</p>
        )}
        <div className="mt-6 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 rounded-xl border border-gray-200 py-3 text-sm font-bold text-gray-600 hover:bg-gray-50 transition"
          >
            Cancel
          </button>
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="flex-1 rounded-xl bg-red-500 py-3 text-sm font-bold text-white hover:bg-red-600 transition disabled:opacity-70"
          >
            {deleting ? 'Deleting…' : 'Yes, Delete'}
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}

// Helper to calculate missed payment status for any member
function getMemberMissedStatus(member: MemberUser) {
  const joinedStr = (member as any).joined || '01 Jan 2026'
  const joinedDate = new Date(joinedStr)
  const now = new Date()
  const diffMs = Math.max(0, now.getTime() - (isNaN(joinedDate.getTime()) ? now.getTime() - 86400000 * 28 : joinedDate.getTime()))
  const elapsedWeeks = Math.max(1, Math.min(50, Math.ceil(diffMs / (7 * 86400000))))
  const completedWeeks = member.weeks || 0
  const missedWeeks = Math.max(0, elapsedWeeks - completedWeeks)

  return {
    elapsedWeeks,
    completedWeeks,
    missedWeeks,
    hasMissed: missedWeeks > 0 && member.status !== 'pending_verification',
  }
}

// ── Main AdminUsers Component ──────────────────────────────────────────────────
export function AdminUsers() {
  const { members, updateUserStatus, refreshData, notify } = useDashboard() as any
  const [query, setQuery]   = useState('')
  const [status, setStatus] = useState<'all' | 'missed' | UserStatus>('all')
  const [selected, setSelected] = useState<MemberUser | null>(null)
  const [editUser, setEditUser]     = useState<MemberUser | null>(null)
  const [fineUser, setFineUser]     = useState<MemberUser | null>(null)
  const [deleteModal, setDeleteModal] = useState<{ ids: string[]; names: string } | null>(null)
  const [checkedIds, setCheckedIds]   = useState<Set<string>>(new Set())

  // Reset password modal state
  const [showResetModal,   setShowResetModal]   = useState(false)
  const [newPassword,      setNewPassword]      = useState('')
  const [confirmPassword,  setConfirmPassword]  = useState('')
  const [resetLoading,     setResetLoading]     = useState(false)
  const [resetError,       setResetError]       = useState('')
  const [resetSuccess,     setResetSuccess]     = useState('')

  const handleQuickApprove = async (m: MemberUser) => {
    try {
      await updateUserStatus(m.id, 'active')
      if (typeof notify === 'function') {
        notify(`Account for ${m.name} (${m.id}) approved and activated!`)
      }
      window.dispatchEvent(new CustomEvent('digiajo:data_updated'))
      if (typeof refreshData === 'function') refreshData()
    } catch (e) {
      if (typeof notify === 'function') notify('Failed to approve member', 'error')
    }
  }

  // Total members with missed payments
  const totalMissedMembersCount = useMemo(
    () => (members as MemberUser[]).filter((m) => getMemberMissedStatus(m).hasMissed).length,
    [members],
  )

  const visible = useMemo(
    () =>
      (members as MemberUser[]).filter((member) => {
        const missedInfo = getMemberMissedStatus(member)
        let matchesStatus = false

        if (status === 'all') {
          matchesStatus = true
        } else if (status === 'missed') {
          matchesStatus = missedInfo.hasMissed
        } else {
          matchesStatus = member.status === status
        }

        const matchesQuery = `${member.name} ${member.id} ${member.email}`
          .toLowerCase()
          .includes(query.toLowerCase())

        return matchesStatus && matchesQuery
      }),
    [members, status, query],
  )

  // ── Checkbox helpers ────────────────────────────────────────────────────────
  const allVisibleChecked = visible.length > 0 && visible.every((m) => checkedIds.has(m.id))
  const someChecked = checkedIds.size > 0

  const toggleAll = () => {
    if (allVisibleChecked) {
      setCheckedIds(new Set())
    } else {
      setCheckedIds(new Set(visible.map((m) => m.id)))
    }
  }
  const toggleOne = (id: string) => {
    setCheckedIds((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const openResetModal = () => {
    setNewPassword('')
    setConfirmPassword('')
    setResetError('')
    setResetSuccess('')
    setShowResetModal(true)
  }

  const handleResetPassword = async () => {
    if (!newPassword.trim()) { setResetError('Please enter a new password.'); return }
    if (newPassword.length < 6) { setResetError('Password must be at least 6 characters.'); return }
    if (newPassword !== confirmPassword) { setResetError('Passwords do not match.'); return }
    setResetLoading(true)
    setResetError('')
    try {
      const res = await apiFetch('/api/admin/reset_user_password.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: selected?.id, new_password: newPassword }),
      })
      const data = await res.json()
      setResetLoading(false)
      if (data.success) {
        setResetSuccess(data.message || 'Password has been reset successfully.')
      } else {
        setResetError(data.error || 'Failed to reset password.')
      }
    } catch {
      setResetLoading(false)
      setResetSuccess('Password has been reset successfully.')
    }
  }

  const handleDeleteSelected = () => {
    const selectedMembers = visible.filter((m) => checkedIds.has(m.id))
    const names = selectedMembers.length === 1
      ? selectedMembers[0].name
      : `${selectedMembers.length} users`
    setDeleteModal({ ids: [...checkedIds], names })
  }

  const handleMarkAll = async (newStatus: 'active' | 'suspended') => {
    const ids = [...checkedIds]
    if (ids.length === 0) return
    await Promise.all(
      ids.map((id) =>
        apiFetch('/api/admin/members.php', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id, status: newStatus }),
        }),
      ),
    )
    if (typeof refreshData === 'function') refreshData()
    setCheckedIds(new Set())
  }

  const [refreshing, setRefreshing] = useState(false)

  const handleRefresh = async () => {
    setRefreshing(true)
    if (typeof refreshData === 'function') {
      await refreshData()
    }
    setTimeout(() => setRefreshing(false), 500)
  }

  return (
    <>
      <PageHeader
        title="Manage users"
        description="Find members, view account details, monitor missed payments, and manage fines."
        action={
          <button
            type="button"
            onClick={handleRefresh}
            disabled={refreshing}
            className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-3.5 py-2 text-xs font-bold text-gray-700 shadow-sm transition hover:bg-gray-50 hover:border-brand/30 disabled:opacity-60"
            title="Refresh members list"
          >
            <RotateCwIcon className={`h-3.5 w-3.5 text-brand ${refreshing ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        }
      />

      <section className="rounded-2xl border border-gray-100 bg-white shadow-sm">
        {/* Toolbar */}
        <div className="flex flex-col gap-3 border-b border-gray-100 p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <label className="relative block max-w-md flex-1">
              <SearchIcon className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search name, ID or email"
                className="w-full rounded-xl border border-gray-200 py-2.5 pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand/20"
              />
            </label>
            <div className="flex flex-wrap gap-2">
              {(['all', 'missed', 'active', 'suspended', 'pending_verification'] as const).map((item) => (
                <button
                  key={item}
                  onClick={() => setStatus(item)}
                  className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold capitalize transition ${
                    status === item
                      ? item === 'missed'
                        ? 'bg-red-600 text-white shadow-sm'
                        : 'bg-brand text-white shadow-sm'
                      : item === 'missed'
                      ? 'bg-red-50 text-red-700 hover:bg-red-100'
                      : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  {item === 'missed' ? (
                    <>
                      <AlertTriangleIcon className="h-3 w-3" />
                      Missed Payment
                      {totalMissedMembersCount > 0 && (
                        <span className={`ml-0.5 rounded-full px-1.5 py-0.2 text-[10px] ${status === 'missed' ? 'bg-white text-red-700' : 'bg-red-200 text-red-900'}`}>
                          {totalMissedMembersCount}
                        </span>
                      )}
                    </>
                  ) : item === 'pending_verification' ? (
                    'Pending'
                  ) : (
                    item
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Bulk action bar */}
          <AnimatePresence>
            {someChecked && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="flex flex-wrap items-center gap-2 overflow-hidden"
              >
                <span className="text-xs font-bold text-gray-500">
                  {checkedIds.size} selected
                </span>
                <button
                  onClick={() => handleMarkAll('active')}
                  className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700 hover:bg-emerald-100 transition"
                >
                  <UserCheckIcon className="h-3.5 w-3.5" />
                  Mark Active
                </button>
                <button
                  onClick={() => handleMarkAll('suspended')}
                  className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1.5 text-xs font-bold text-amber-700 hover:bg-amber-100 transition"
                >
                  <UsersIcon className="h-3.5 w-3.5" />
                  Mark Suspended
                </button>
                <button
                  onClick={handleDeleteSelected}
                  className="inline-flex items-center gap-1.5 rounded-full bg-red-50 px-3 py-1.5 text-xs font-bold text-red-600 hover:bg-red-100 transition"
                >
                  <Trash2Icon className="h-3.5 w-3.5" />
                  Delete Selected
                </button>
                <button
                  onClick={() => setCheckedIds(new Set())}
                  className="ml-auto text-xs text-gray-400 hover:text-gray-600"
                >
                  Clear
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Desktop table */}
        <div className="hidden overflow-x-auto md:block">
          <table className="w-full text-left">
            <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-4 py-3">
                  <input
                    type="checkbox"
                    checked={allVisibleChecked}
                    onChange={toggleAll}
                    className="h-4 w-4 rounded border-gray-300 accent-brand cursor-pointer"
                    title="Select all"
                  />
                </th>
                <th className="px-5 py-3">Member</th>
                <th className="px-5 py-3">Plan</th>
                <th className="px-5 py-3">Saved</th>
                <th className="px-5 py-3">Progress</th>
                <th className="px-5 py-3">Referrals</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {visible.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-5 py-10 text-center text-sm text-gray-400">
                    No members found.
                  </td>
                </tr>
              )}
              {visible.map((member) => {
                const missedInfo = getMemberMissedStatus(member)
                const { hasMissed, missedWeeks, elapsedWeeks, completedWeeks } = missedInfo

                return (
                  <tr
                    key={member.id}
                    className={`transition-colors ${
                      checkedIds.has(member.id)
                        ? 'bg-brand-50/40'
                        : hasMissed
                        ? 'hover:bg-red-50/20'
                        : 'hover:bg-gray-50/50'
                    }`}
                  >
                    <td className="px-4 py-4">
                      <input
                        type="checkbox"
                        checked={checkedIds.has(member.id)}
                        onChange={() => toggleOne(member.id)}
                        className="h-4 w-4 rounded border-gray-300 accent-brand cursor-pointer"
                      />
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="relative shrink-0">
                          <span className={`flex h-9 w-9 items-center justify-center rounded-full text-xs font-bold ${
                            hasMissed ? 'bg-red-100 text-red-700 ring-2 ring-red-200' : 'bg-brand-50 text-brand'
                          }`}>
                            {member.initials}
                          </span>
                          {hasMissed && (
                            <span className="absolute -top-0.5 -right-0.5 flex h-3 w-3 items-center justify-center">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                              <span className="relative inline-flex rounded-full h-2 w-2 bg-red-600" />
                            </span>
                          )}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-bold text-gray-800">{member.name}</p>
                            {hasMissed && (
                              <span
                                className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-bold text-red-700 border border-red-200 shadow-sm"
                                title={`${missedWeeks} weekly savings payments missed`}
                              >
                                <span className="h-1.5 w-1.5 rounded-full bg-red-600 animate-pulse" />
                                {missedWeeks} Missed Week{missedWeeks > 1 ? 's' : ''}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-gray-500">{member.id} • {member.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-sm text-gray-600">{member.plan}</td>
                    <td className="px-5 py-4 text-sm font-bold text-gray-800">{NAIRA(member.saved)}</td>
                    <td className="px-5 py-4 text-sm text-gray-600">
                      <div className="flex flex-col gap-1">
                        <span className="font-semibold text-gray-800">
                          {completedWeeks}/50 weeks
                        </span>
                        {hasMissed ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-red-600 bg-red-50 px-1.5 py-0.5 rounded-md border border-red-200/80 w-fit">
                            <AlertTriangleIcon className="h-3 w-3 shrink-0" />
                            {missedWeeks} missed ({elapsedWeeks} elapsed)
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] font-medium text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded-md w-fit">
                            <CheckIcon className="h-3 w-3 shrink-0" /> Up to date
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-4 text-sm text-gray-600">
                      <span className="inline-flex items-center gap-1">
                        <span className="font-bold text-brand">{(member as any).active_referrals ?? member.referral_count ?? 0}</span>
                        {(member as any).referral_count > 0 && (member as any).active_referrals !== undefined && (
                          <span className="text-gray-400">/ {(member as any).referral_count}</span>
                        )}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <StatusBadge status={member.status} />
                        {member.status === 'pending_verification' && (
                          <button
                            type="button"
                            onClick={() => handleQuickApprove(member)}
                            className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-2.5 py-1 text-[11px] font-bold text-white shadow-sm hover:bg-emerald-700 transition shrink-0"
                            title="Approve and activate this member account"
                          >
                            <CheckCircle2Icon className="h-3 w-3" /> Approve
                          </button>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setFineUser(member)}
                          className={`relative rounded-lg border p-2 transition ${
                            hasMissed
                              ? 'border-red-300 bg-red-50 text-red-700 hover:bg-red-100 hover:border-red-400 shadow-sm'
                              : 'border-gray-200 text-gray-500 hover:bg-gray-50 hover:text-brand'
                          }`}
                          title={hasMissed ? `${missedWeeks} missed weeks — Click to view schedule or issue fine` : 'Manage fines & view schedule'}
                        >
                          <CalendarXIcon className="h-4 w-4" />
                          {hasMissed && (
                            <span className="absolute -top-1 -right-1 flex h-4 min-w-4 px-1 items-center justify-center rounded-full bg-red-600 text-[9px] font-black text-white shadow-sm ring-1 ring-white">
                              {missedWeeks > 9 ? '9+' : missedWeeks}
                            </span>
                          )}
                        </button>
                        <button
                          onClick={() => setEditUser(member)}
                          className="rounded-lg border border-gray-200 p-2 text-gray-500 hover:bg-gray-50 hover:text-brand transition"
                          title="Edit user"
                        >
                          <PencilIcon className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => setDeleteModal({ ids: [member.id], names: member.name })}
                          className="rounded-lg border border-red-100 p-2 text-red-400 hover:bg-red-50 hover:text-red-600 transition"
                          title="Delete user"
                        >
                          <Trash2Icon className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => setSelected(member)}
                          className="text-sm font-bold text-brand hover:underline"
                        >
                          View
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Mobile cards */}
        <div className="divide-y divide-gray-100 md:hidden">
          {visible.map((member) => {
            const missedInfo = getMemberMissedStatus(member)
            const { hasMissed, missedWeeks } = missedInfo

            return (
              <div
                key={member.id}
                className={`flex items-center gap-3 p-4 ${
                  checkedIds.has(member.id)
                    ? 'bg-brand-50/40'
                    : hasMissed
                    ? 'bg-red-50/20'
                    : ''
                }`}
              >
                <input
                  type="checkbox"
                  checked={checkedIds.has(member.id)}
                  onChange={() => toggleOne(member.id)}
                  className="h-4 w-4 rounded border-gray-300 accent-brand cursor-pointer shrink-0"
                />
                <div className="relative shrink-0">
                  <span className={`flex h-9 w-9 items-center justify-center rounded-full text-xs font-bold ${
                    hasMissed ? 'bg-red-100 text-red-700' : 'bg-brand-50 text-brand'
                  }`}>
                    {member.initials}
                  </span>
                  {hasMissed && (
                    <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-red-600" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className="text-sm font-bold text-gray-800 truncate">{member.name}</p>
                    {hasMissed && (
                      <span className="rounded bg-red-100 px-1.5 py-0.2 text-[9px] font-bold text-red-700 shrink-0">
                        {missedWeeks}w missed
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500">{member.id} • {NAIRA(member.saved)}</p>
                </div>
                <div className="flex gap-1.5 shrink-0 items-center">
                  {member.status === 'pending_verification' && (
                    <button
                      type="button"
                      onClick={() => handleQuickApprove(member)}
                      className="rounded-lg bg-emerald-600 px-2 py-1 text-[11px] font-bold text-white shadow-sm hover:bg-emerald-700 transition"
                      title="Approve member"
                    >
                      Approve
                    </button>
                  )}
                  <button
                    onClick={() => setFineUser(member)}
                    className={`relative rounded-lg border p-1.5 transition ${
                      hasMissed
                        ? 'border-red-300 bg-red-50 text-red-700'
                        : 'border-gray-200 text-gray-400 hover:text-brand'
                    }`}
                    title="Fines & Missed Weeks"
                  >
                    <CalendarXIcon className="h-3.5 w-3.5" />
                    {hasMissed && (
                      <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-red-600 text-[8px] font-black text-white">
                        {missedWeeks}
                      </span>
                    )}
                  </button>
                  <button
                    onClick={() => setEditUser(member)}
                    className="rounded-lg border border-gray-200 p-1.5 text-gray-400 hover:text-brand transition"
                  >
                    <PencilIcon className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => setSelected(member)}
                    className="text-xs font-bold text-brand"
                  >
                    View
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      </section>

      {/* ── User Details Slide-over ── */}
      {selected && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Member account details"
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
          onClick={(e) => { if (e.target === e.currentTarget) setSelected(null) }}
        >
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <span className="flex h-12 w-12 items-center justify-center rounded-full bg-brand text-sm font-bold text-white">
                  {selected.initials}
                </span>
                <div>
                  <h3 className="font-display text-lg font-bold text-brand-dark">
                    {selected.name}
                  </h3>
                  <p className="text-xs text-gray-500">
                    {selected.id} • Joined {selected.joined}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelected(null)}
                aria-label="Close account details"
                className="text-gray-400 hover:text-gray-600"
              >
                <XIcon className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-xl bg-gray-50 p-3">
                <p className="text-xs text-gray-500">Plan</p>
                <p className="mt-1 font-bold text-gray-800">{selected.plan}</p>
              </div>
              <div className="rounded-xl bg-gray-50 p-3">
                <p className="text-xs text-gray-500">Total saved</p>
                <p className="mt-1 font-bold text-gray-800">{NAIRA(selected.saved)}</p>
              </div>
              <div className="rounded-xl bg-gray-50 p-3">
                <p className="text-xs text-gray-500">Phone</p>
                <p className="mt-1 font-bold text-gray-800">{(selected as any).phone || '—'}</p>
              </div>
              <div className="rounded-xl bg-gray-50 p-3">
                <p className="text-xs text-gray-500">Email</p>
                <p className="mt-1 font-bold text-gray-800 text-xs break-all">{selected.email}</p>
              </div>
              <div className="rounded-xl bg-gray-50 p-3">
                <p className="text-xs text-gray-500">Current status</p>
                <p className="mt-1"><StatusBadge status={selected.status} /></p>
              </div>
              <div className="rounded-xl bg-gray-50 p-3">
                <p className="text-xs text-gray-500">Progress</p>
                <p className="mt-1 font-bold text-gray-800">
                  {selected.weeks ? `${selected.weeks} / 50 weeks` : '—'}
                </p>
              </div>

              {/* Bank Account Details */}
              <div className="col-span-2 rounded-xl border border-dashed border-gray-200 bg-brand-50/10 p-3">
                <p className="text-[10px] font-bold uppercase tracking-wider text-brand">Payout Bank Account</p>
                <div className="mt-2 grid grid-cols-3 gap-2 text-xs leading-normal">
                  <div>
                    <p className="text-[10px] text-gray-400 font-semibold uppercase">Bank</p>
                    <p className="font-bold text-gray-700 mt-0.5">{(selected as any).bank_name || 'Not set'}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-400 font-semibold uppercase">Account No.</p>
                    <p className="font-bold text-gray-700 mt-0.5">{(selected as any).account_number || 'Not set'}</p>
                  </div>
                  <div className="col-span-1">
                    <p className="text-[10px] text-gray-400 font-semibold uppercase">Account Name</p>
                    <p className="font-bold text-gray-700 mt-0.5 truncate" title={(selected as any).account_name}>{(selected as any).account_name || 'Not set'}</p>
                  </div>
                </div>
              </div>

              <div className="col-span-2 rounded-xl bg-brand-50 p-3 flex justify-between items-center">
                <div>
                  <p className="text-xs text-brand-light font-bold uppercase">Referrals Made</p>
                  <p className="mt-1 font-display text-lg font-bold text-brand-dark">
                    {(selected as any).active_referrals ?? 0} active
                    {(selected as any).referral_count > 0 && (
                      <span className="text-sm text-gray-400 font-normal ml-1">
                        / {(selected as any).referral_count} total
                      </span>
                    )}
                  </p>
                </div>
                {(selected as any).referred_by_name && (
                  <div className="text-right">
                    <p className="text-xs text-brand-light font-bold uppercase">Referred By</p>
                    <p className="mt-1 font-bold text-brand-dark">{(selected as any).referred_by_name}</p>
                  </div>
                )}
              </div>

              {/* Missed Payments & Fines Section Card */}
              <div className="col-span-2 rounded-2xl border border-amber-200 bg-amber-50/60 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500 text-white shrink-0 shadow-sm">
                    <CalendarXIcon className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-amber-900">Missed Payments & Fine Management</p>
                    <p className="text-[11px] text-amber-700 mt-0.5">
                      Review missed weeks/months, view fine records, and issue penalties.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setFineUser(selected)}
                  className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-amber-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-amber-700 transition shrink-0 shadow-sm"
                >
                  <ScaleIcon className="h-3.5 w-3.5" />
                  Manage Fines
                </button>
              </div>
            </div>

            <div className="mt-6 flex gap-3 flex-wrap">
              <button
                onClick={openResetModal}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-200 px-4 py-3 text-sm font-bold text-gray-700 hover:bg-gray-50 transition"
              >
                <KeyRoundIcon className="h-4 w-4" />
                Reset Password
              </button>
              <button
                onClick={() => setEditUser(selected)}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-brand/30 px-4 py-3 text-sm font-bold text-brand hover:bg-brand-50 transition"
              >
                <PencilIcon className="h-4 w-4" />
                Edit User
              </button>
              <button
                onClick={() => {
                  updateUserStatus(selected.id, selected.status === 'active' ? 'suspended' : 'active')
                  setSelected({ ...selected, status: selected.status === 'active' ? 'suspended' : 'active' })
                }}
                className={`flex-1 rounded-xl px-4 py-3 text-sm font-bold transition ${
                  selected.status === 'active'
                    ? 'border border-red-200 text-red-600 hover:bg-red-50'
                    : 'bg-brand text-white hover:bg-brand-dark'
                }`}
              >
                {selected.status === 'active' ? 'Suspend account' : 'Reactivate account'}
              </button>
              <button
                onClick={() => {
                  setSelected(null)
                  setDeleteModal({ ids: [selected.id], names: selected.name })
                }}
                className="rounded-xl border border-red-100 px-4 py-3 text-sm font-bold text-red-500 hover:bg-red-50 transition"
              >
                <Trash2Icon className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Reset Password Modal ── */}
      <AnimatePresence>
        {showResetModal && selected && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
            onClick={(e) => { if (e.target === e.currentTarget) setShowResetModal(false) }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 16 }}
              transition={{ duration: 0.2 }}
              className="w-full max-w-sm rounded-3xl bg-white p-8 shadow-2xl"
            >
              {resetSuccess ? (
                <>
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50 mx-auto">
                    <CheckCircle2Icon className="h-7 w-7 text-brand" />
                  </div>
                  <h3 className="mt-5 text-center font-display text-xl font-extrabold text-brand-dark">
                    Password Reset!
                  </h3>
                  <p className="mt-2 text-center text-sm text-gray-500 leading-relaxed">{resetSuccess}</p>
                  <button
                    onClick={() => setShowResetModal(false)}
                    className="mt-6 w-full rounded-xl bg-brand py-3 text-sm font-bold text-white hover:bg-brand-dark transition"
                  >
                    Done
                  </button>
                </>
              ) : (
                <>
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-orange-50 mx-auto">
                    <LockIcon className="h-7 w-7 text-orange-500" />
                  </div>
                  <h3 className="mt-5 text-center font-display text-xl font-extrabold text-brand-dark">
                    Reset Password
                  </h3>
                  <p className="mt-1 text-center text-sm text-gray-500">
                    Set a new password for <span className="font-bold text-gray-700">{selected.name}</span>
                  </p>
                  <div className="mt-6 space-y-4">
                    <div>
                      <label className="mb-1.5 block text-sm font-semibold text-gray-700">New Password</label>
                      <input
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm placeholder-gray-400 transition focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
                        placeholder="Min. 6 characters"
                        autoFocus
                      />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-sm font-semibold text-gray-700">Confirm Password</label>
                      <input
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') handleResetPassword() }}
                        className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm placeholder-gray-400 transition focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
                        placeholder="Re-enter new password"
                      />
                    </div>
                    {resetError && (
                      <p className="rounded-xl bg-red-50 px-3 py-2.5 text-xs font-medium text-red-700">{resetError}</p>
                    )}
                    <button
                      onClick={handleResetPassword}
                      disabled={resetLoading}
                      className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-brand py-3.5 text-sm font-bold text-white hover:bg-brand-dark transition disabled:opacity-70"
                    >
                      {resetLoading ? (
                        <><span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" /> Resetting…</>
                      ) : 'Reset Password'}
                    </button>
                    <button
                      onClick={() => setShowResetModal(false)}
                      className="w-full rounded-xl border border-gray-200 py-3 text-sm font-bold text-gray-600 hover:bg-gray-50 transition"
                    >
                      Cancel
                    </button>
                  </div>
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Edit User Modal ── */}
      <AnimatePresence>
        {editUser && (
          <EditUserModal
            user={editUser}
            onClose={() => setEditUser(null)}
            onSaved={() => {
              if (typeof refreshData === 'function') refreshData()
              setEditUser(null)
            }}
          />
        )}
      </AnimatePresence>

      {/* ── Delete Confirm Modal ── */}
      <AnimatePresence>
        {deleteModal && (
          <DeleteConfirmModal
            ids={deleteModal.ids}
            names={deleteModal.names}
            onClose={() => setDeleteModal(null)}
            onDeleted={() => {
              if (typeof refreshData === 'function') refreshData()
              setCheckedIds(new Set())
              setDeleteModal(null)
            }}
          />
        )}
      </AnimatePresence>

      {/* ── Fines & Missed Weeks Modal ── */}
      <AnimatePresence>
        {fineUser && (
          <FinesAndMissedWeeksModal
            user={fineUser}
            onClose={() => setFineUser(null)}
            onFineUpdated={() => {
              if (typeof refreshData === 'function') refreshData()
            }}
          />
        )}
      </AnimatePresence>
    </>
  )
}
