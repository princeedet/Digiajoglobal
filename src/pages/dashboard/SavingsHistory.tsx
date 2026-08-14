import React, { useState, useEffect, useMemo } from 'react'
import {
  AlertTriangleIcon,
  CalendarDaysIcon,
  Loader2Icon,
  PiggyBankIcon,
  TrendingUpIcon,
  CalendarIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  FilterIcon,
  PlusIcon,
} from 'lucide-react'
import { PageHeader } from '../../components/dashboard/PageHeader'
import { StatusBadge } from '../../components/dashboard/StatusBadge'
import { NAIRA } from '../../lib/brand'
import { getCurrentUser } from '../../lib/persistence'
import { type SavingsHand, type SavingsRecord } from '../../lib/dashboard-data'

type FilterOption = 'all' | 'this_month' | 'this_week' | 'approved' | 'pending' | 'missed'

const ITEMS_PER_PAGE = 10

export function SavingsHistory() {
  const currentUser = getCurrentUser()
  const memberId = currentUser?.id || ''

  const [hands, setHands] = useState<SavingsHand[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [creating, setCreating] = useState(false)

  // Track active tab (planId)
  const [activePlanId, setActivePlanId] = useState<number | null>(null)

  // ── Filters & Pagination ───────────────────────────────────────────────────
  const [periodFilter, setPeriodFilter] = useState<FilterOption>('all')
  const [currentPage, setCurrentPage] = useState(1)

  const fetchHistory = async () => {
    if (!memberId) return
    try {
      const res = await fetch(
        `/api/member/savings_history.php?member_id=${encodeURIComponent(memberId)}`
      )
      const data = await res.json()
      if (data.success) {
        setHands(data.hands || [])
        if (!activePlanId && data.hands?.length > 0) {
          setActivePlanId(data.hands[0].summary.planId)
        }
      } else {
        setError(data.error || 'Failed to load savings history.')
      }
    } catch {
      setError('Unable to connect. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchHistory()
    const interval = setInterval(fetchHistory, 10000)
    return () => clearInterval(interval)
  }, [memberId])

  // Reset pagination on filter change or tab change
  useEffect(() => {
    setCurrentPage(1)
  }, [periodFilter, activePlanId])

  const handleCreateHand = async () => {
    if (!confirm('Are you sure you want to open an additional 50-week Hand?')) return
    setCreating(true)
    try {
      const res = await fetch('/api/member/create_hand.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ member_id: memberId })
      })
      const data = await res.json()
      if (data.success) {
        alert('New Hand opened successfully!')
        fetchHistory()
      } else {
        alert(data.error || 'Failed to open hand.')
      }
    } catch (e) {
      alert('Network error')
    } finally {
      setCreating(false)
    }
  }

  const activeHand = hands.find(h => h.summary.planId === activePlanId) || hands[0]
  const weeks = activeHand?.weeks || []
  const summary = activeHand?.summary

  // ── Filtered & Paginated weeks ─────────────────────────────────────────────
  const filteredWeeks = useMemo(() => {
    const now = new Date()
    const currentMonth = now.getMonth()
    const currentYear = now.getFullYear()

    return weeks.filter((w) => {
      if (periodFilter === 'approved') return w.status === 'approved'
      if (periodFilter === 'pending') return w.status === 'pending'
      if (periodFilter === 'missed') return w.status === 'missed'

      if (periodFilter === 'this_month') {
        const d = new Date(w.dueDate)
        return !isNaN(d.getTime()) && d.getMonth() === currentMonth && d.getFullYear() === currentYear
      }

      if (periodFilter === 'this_week') {
        const d = new Date(w.dueDate)
        if (isNaN(d.getTime())) return false
        const diffDays = (d.getTime() - now.getTime()) / (1000 * 3600 * 24)
        return diffDays >= -7 && diffDays <= 7
      }

      return true
    })
  }, [weeks, periodFilter])

  const totalPages = Math.ceil(filteredWeeks.length / ITEMS_PER_PAGE) || 1

  const paginatedWeeks = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE
    return filteredWeeks.slice(start, start + ITEMS_PER_PAGE)
  }, [filteredWeeks, currentPage])

  const completion = summary
    ? Math.round((summary.weeksCompleted / summary.totalWeeks) * 100)
    : 0

  const filterButtons: { key: FilterOption; label: string }[] = [
    { key: 'all', label: 'All Weeks' },
    { key: 'this_month', label: 'This Month' },
    { key: 'this_week', label: 'This Week' },
    { key: 'approved', label: 'Approved' },
    { key: 'pending', label: 'Pending' },
    { key: 'missed', label: 'Missed' },
  ]

  return (
    <>
      <PageHeader
        title="Savings History"
        description="Track each week of your 50-week Double Up plan. Multi-week payments are spread across weekly slots."
        action={
          <button
            onClick={handleCreateHand}
            disabled={creating}
            className="inline-flex items-center gap-2 rounded-full bg-brand px-4 py-2.5 text-sm font-bold text-white hover:bg-brand-dark transition disabled:opacity-50"
          >
            {creating ? <Loader2Icon className="h-4 w-4 animate-spin" /> : <PlusIcon className="h-4 w-4" />}
            Open New Hand
          </button>
        }
      />

      {loading ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-gray-100 bg-white p-16 shadow-sm">
          <Loader2Icon className="h-8 w-8 animate-spin text-brand mb-3" />
          <p className="text-sm text-gray-500">Loading your savings history...</p>
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-red-100 bg-red-50 p-8 text-center text-sm text-red-600">
          {error}
        </div>
      ) : (
        <>
          {/* Hands Tabs */}
          {hands.length > 1 && (
            <div className="mb-6 flex gap-2 overflow-x-auto pb-2">
              {hands.map((hand) => (
                <button
                  key={hand.summary.planId}
                  onClick={() => setActivePlanId(hand.summary.planId)}
                  className={`shrink-0 rounded-xl px-5 py-2.5 text-sm font-bold transition ${
                    activePlanId === hand.summary.planId
                      ? 'bg-brand text-white shadow-sm'
                      : 'bg-white border border-gray-200 text-gray-600 hover:bg-brand-50 hover:text-brand'
                  }`}
                >
                  {hand.summary.handName}
                </button>
              ))}
            </div>
          )}

          {/* Summary cards */}
          {summary && (
            <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-gray-400">
                  <PiggyBankIcon className="h-4 w-4 text-brand" /> Total Saved
                </div>
                <p className="mt-2 font-display text-2xl font-extrabold text-brand-dark">
                  {NAIRA(summary.totalSaved)}
                </p>
                <p className="mt-1 text-xs text-gray-500">
                  Across {summary.weeksCompleted} confirmed week{summary.weeksCompleted !== 1 ? 's' : ''}
                </p>
              </div>

              <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-gray-400">
                  <CalendarDaysIcon className="h-4 w-4 text-brand" /> Progress
                </div>
                <p className="mt-2 font-display text-2xl font-extrabold text-brand-dark">
                  Week {summary.weeksCompleted} / {summary.totalWeeks}
                </p>
                <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-gray-100">
                  <div
                    className="h-full rounded-full bg-brand transition-all duration-700"
                    style={{ width: `${completion}%` }}
                  />
                </div>
                <p className="mt-1 text-xs text-gray-500">{completion}% complete</p>
              </div>

              <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-gray-400">
                  <TrendingUpIcon className="h-4 w-4 text-brand" /> Weekly Rate
                </div>
                <p className="mt-2 font-display text-2xl font-extrabold text-brand-dark">
                  {NAIRA(summary.weeklyAmount)}
                </p>
                <p className="mt-1 text-xs text-gray-500">
                  {summary.totalWeeks - summary.weeksCompleted} weeks remaining
                </p>
              </div>

              <div className={`rounded-2xl border p-5 shadow-sm ${
                summary.totalFines > 0 ? 'border-orange-100 bg-orange-50' : 'border-gray-100 bg-white'
              }`}>
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-gray-400">
                  <AlertTriangleIcon className={`h-4 w-4 ${summary.totalFines > 0 ? 'text-orange-500' : 'text-gray-400'}`} />
                  Total Fines
                </div>
                <p className={`mt-2 font-display text-2xl font-extrabold ${
                  summary.totalFines > 0 ? 'text-orange-600' : 'text-gray-400'
                 }`}>
                  {NAIRA(summary.totalFines)}
                </p>
                <p className="mt-1 text-xs text-gray-500">
                  {summary.totalFines > 0 ? 'Late payment penalties' : 'No fines yet — great job!'}
                </p>
              </div>
            </div>
          )}

          {/* ── Filters & Legend Bar ────────────────────────────────────────────── */}
          <div className="mb-4 space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-gray-400 uppercase tracking-wider mr-1">
                <FilterIcon className="h-3.5 w-3.5" /> Filter:
              </div>
              {filterButtons.map((f) => (
                <button
                  key={f.key}
                  onClick={() => setPeriodFilter(f.key)}
                  className={`rounded-full px-3 py-1.5 text-xs font-bold transition ${
                    periodFilter === f.key
                      ? 'bg-brand text-white shadow-sm'
                      : 'bg-white border border-gray-200 text-gray-600 hover:bg-brand-50 hover:text-brand-dark'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-3 pt-1">
              <div className="flex items-center gap-1.5 text-xs text-gray-500">
                <CalendarIcon className="h-3.5 w-3.5 text-brand" />
                <span>Single week payment</span>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-gray-500">
                <CalendarDaysIcon className="h-3.5 w-3.5 text-accent-dark" />
                <span className="rounded-full bg-accent/20 px-2 py-0.5 text-[10px] font-bold text-brand-dark">Multi-week spread</span>
                <span>— advance payment allocated per week</span>
              </div>
            </div>
          </div>

          {/* ── Table Card ──────────────────────────────────────────────────────── */}
          <div className="rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden">
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full text-left">
                <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                  <tr>
                    <th className="px-5 py-3 font-bold">Week</th>
                    <th className="px-5 py-3 font-bold">Due Date</th>
                    <th className="px-5 py-3 font-bold">Paid Date</th>
                    <th className="px-5 py-3 font-bold">Contribution</th>
                    <th className="px-5 py-3 font-bold">Fine</th>
                    <th className="px-5 py-3 font-bold">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {paginatedWeeks.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-5 py-10 text-center text-sm text-gray-500">
                        No savings records found matching the selected filter.
                      </td>
                    </tr>
                  )}
                  {paginatedWeeks.map((item) => (
                    <tr
                      key={`${item.week}-${item.reference}`}
                      className={`hover:bg-gray-50/50 transition-colors ${item.isMonthly ? 'bg-brand-50/20' : ''}`}
                    >
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          <span className="font-display text-sm font-bold text-brand-dark">
                            Week {item.week}
                          </span>
                          {item.isMonthly && (
                            <span className="rounded-full bg-accent/25 px-2 py-0.5 text-[10px] font-bold text-brand-dark whitespace-nowrap">
                              Week {item.weekInBatch} of {item.totalInBatch}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-4 text-sm text-gray-600">{item.dueDate}</td>
                      <td className="px-5 py-4 text-sm text-gray-600">{item.paidDate ?? '—'}</td>
                      <td className="px-5 py-4 text-sm font-bold text-gray-800">
                        {item.amount > 0 ? NAIRA(item.amount) : '—'}
                      </td>
                      <td className="px-5 py-4 text-sm font-bold text-orange-600">
                        {item.fine ? NAIRA(item.fine) : '—'}
                      </td>
                      <td className="px-5 py-4">
                        {item.status === 'missed' ? (
                          <span className="inline-block rounded-full bg-orange-50 px-2.5 py-1 text-xs font-bold text-orange-600">
                            Missed + Fined
                          </span>
                        ) : (
                          <StatusBadge status={item.status} />
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="divide-y divide-gray-100 md:hidden">
              {paginatedWeeks.length === 0 && (
                <div className="p-8 text-center text-sm text-gray-500">
                  No savings records found matching the selected filter.
                </div>
              )}
              {paginatedWeeks.map((item) => (
                <article
                  key={`${item.week}-${item.reference}`}
                  className={`p-4 ${item.isMonthly ? 'bg-brand-50/20' : ''}`}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-display font-bold text-brand-dark">Week {item.week}</p>
                        {item.isMonthly && (
                          <span className="rounded-full bg-accent/25 px-2 py-0.5 text-[10px] font-bold text-brand-dark">
                            Week {item.weekInBatch} of {item.totalInBatch}
                          </span>
                        )}
                      </div>
                      <p className="mt-0.5 text-xs text-gray-500">Due {item.dueDate}</p>
                    </div>
                    <StatusBadge status={item.status as any} />
                  </div>
                  <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
                    <span className="rounded-lg bg-gray-50 p-2 text-gray-500">
                      Paid<br />
                      <b className="text-gray-800">{item.paidDate ?? '—'}</b>
                    </span>
                    <span className="rounded-lg bg-gray-50 p-2 text-gray-500">
                      Amount<br />
                      <b className="text-gray-800">{NAIRA(item.amount)}</b>
                    </span>
                    <span className="rounded-lg bg-orange-50 p-2 text-orange-600">
                      Fine<br />
                      <b>{item.fine ? NAIRA(item.fine) : '—'}</b>
                    </span>
                  </div>
                </article>
              ))}
            </div>

            {filteredWeeks.length > 0 && (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-gray-100 px-5 py-4 bg-gray-50/50 text-xs text-gray-600">
                <div>
                  Showing <span className="font-bold text-brand-dark">{(currentPage - 1) * ITEMS_PER_PAGE + 1}</span> to{' '}
                  <span className="font-bold text-brand-dark">{Math.min(currentPage * ITEMS_PER_PAGE, filteredWeeks.length)}</span> of{' '}
                  <span className="font-bold text-brand-dark">{filteredWeeks.length}</span> weeks
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="inline-flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
                  >
                    <ChevronLeftIcon className="h-4 w-4" /> Previous
                  </button>
                  <span className="font-bold text-brand-dark px-2">Page {currentPage} of {totalPages}</span>
                  <button
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="inline-flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
                  >
                    Next <ChevronRightIcon className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}
          </div>

          {summary && summary.weeksCompleted < summary.totalWeeks && (
            <div className="mt-6 rounded-2xl bg-brand-dark p-5 text-white">
              <div className="flex items-center gap-3">
                <CalendarDaysIcon className="h-5 w-5 text-accent shrink-0" />
                <div>
                  <p className="font-bold">Week {summary.weeksCompleted + 1} coming up for {summary.handName}</p>
                  <p className="mt-0.5 text-sm text-white/70">
                    Your next contribution of {NAIRA(summary.weeklyAmount)} is due.
                  </p>
                </div>
              </div>
            </div>
          )}

          {summary && summary.weeksCompleted >= summary.totalWeeks && (
            <div className="mt-6 rounded-2xl bg-brand p-5 text-white text-center">
              <p className="font-display text-xl font-extrabold">🎉 50 Weeks Complete for {summary.handName}!</p>
              <p className="mt-1 text-sm text-white/80">
                Congratulations! You have completed your Double Up plan. Contact admin to process your payout.
              </p>
            </div>
          )}
        </>
      )}
    </>
  )
}
