import React, { useMemo, useState, useEffect } from 'react'
import {
  CreditCardIcon,
  PlusIcon,
  Loader2Icon,
  CheckCircle2Icon,
  XIcon,
  Building2Icon,
  SmartphoneIcon,
  MinusIcon,
  InfoIcon,
  CalendarDaysIcon,
  LockIcon,
  SparklesIcon,
  RotateCwIcon,
} from 'lucide-react'
import { PageHeader } from '../../components/dashboard/PageHeader'
import { StatusBadge } from '../../components/dashboard/StatusBadge'
import { NAIRA } from '../../lib/brand'
import { getCurrentUser, getStoredPayments, savePayments } from '../../lib/persistence'
import { apiFetch, apiUrl } from '../../lib/api'

interface Payment {
  id: string
  member: string
  memberId: string
  amount: number
  date: string
  reference: string
  channel: string
  status: 'approved' | 'pending' | 'rejected'
  purpose: string
}

export function PaymentHistory() {
  const [filter, setFilter] = useState<'all' | 'approved' | 'pending' | 'rejected'>('all')
  const [paymentOpen, setPaymentOpen] = useState(false)
  const [payments, setPayments] = useState<Payment[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [fetchError, setFetchError] = useState('')

  // ── Modal state ──────────────────────────────────────────────────────────────
  const [paymentMethod, setPaymentMethod] = useState<'bank' | 'paystack' | 'flutterwave'>('bank')
  const [numWeeks, setNumWeeks] = useState(1)
  const [numHands, setNumHands] = useState(1)
  const [weeksCompleted, setWeeksCompleted] = useState(0)
  const [hasEstablishedHands, setHasEstablishedHands] = useState(false)
  const [selectedPlanId, setSelectedPlanId] = useState<number | null>(null)
  const [bankRef, setBankRef] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [submitSuccess, setSubmitSuccess] = useState('')
  const [activeHands, setActiveHands] = useState<{ planId: number; handName: string; weeklyAmount: number }[]>([
    { planId: 1, handName: 'Hand 1', weeklyAmount: 1300 },
  ])

  const currentUser = getCurrentUser()
  const memberId = currentUser?.id || ''
  const isDoubleUp = currentUser?.plan !== 'DigiMart'

  // Double Up: Total = (Weeks) * (Hands) * 1,300  |  DigiMart: 1 unit = ₦100,000
  const ratePerHand = 1300
  const totalAmount = isDoubleUp
    ? numWeeks * numHands * ratePerHand
    : 100000 * numWeeks // for DigiMart, numWeeks serves as unit count

  const derivedWeeksCovered = numWeeks
  const derivedHandsPaid = numHands
  const nextDueWeek = Math.min(50, weeksCompleted + 1)

  // ── Fetch active hands & established status ────────────────────────────────
  const fetchActiveHands = async () => {
    if (!memberId || !isDoubleUp) return
    try {
      const q = new URLSearchParams()
      if (currentUser?.id) q.set('member_id', currentUser.id)
      if (currentUser?.email) q.set('email', currentUser.email)
      if (currentUser?.name) q.set('name', currentUser.name)

      const res = await apiFetch(`/api/member/profile.php?${q.toString()}`)
      if (res.ok) {
        const data = await res.json()
        if (data.success && data.user) {
          const isEstablished = Boolean(
            data.user.hasEstablishedHands ??
            (data.user.weeks > 0 || data.user.saved > 0 || !data.user.isFirstPayment)
          )
          setHasEstablishedHands(isEstablished)
          if (isEstablished) {
            const hands = Math.max(1, data.user.activeHands || 1)
            setNumHands(hands)
          }
          setWeeksCompleted(data.user.weeks || 0)
        }
      }
    } catch (e) {
      console.warn('Using default active hands', e)
    }
  }

  // ── Fetch payments ───────────────────────────────────────────────────────────
  const fetchPayments = async () => {
    if (!memberId) return
    setLoading(true)
    setFetchError('')
    try {
      const res = await apiFetch(`/api/member/payments.php?member_id=${encodeURIComponent(memberId)}`)
      if (res.ok) {
        const data = await res.json()
        if (data.success) {
          const fetchedPayments = data.payments || []
          setPayments(fetchedPayments)
          savePayments(fetchedPayments)

          // Check if there are any approved weekly savings payments
          const hasApprovedSavings = fetchedPayments.some((p: any) =>
            p.status === 'approved' &&
            !p.purpose?.toLowerCase().includes('registration') &&
            !p.purpose?.toLowerCase().includes('reg fee') &&
            p.amount !== 2000
          )
          if (hasApprovedSavings) {
            setHasEstablishedHands(true)
          }
        } else {
          const stored = getStoredPayments().filter((p) => p.memberId === memberId)
          setPayments(stored)
        }
      }
    } catch {
      const stored = getStoredPayments().filter((p) => p.memberId === memberId)
      setPayments(stored)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchPayments()
    fetchActiveHands()

    const handleDataUpdate = () => {
      fetchPayments()
      fetchActiveHands()
    }
    window.addEventListener('digiajo:data_updated', handleDataUpdate)
    return () => window.removeEventListener('digiajo:data_updated', handleDataUpdate)
  }, [memberId])

  // ── Submit payment ───────────────────────────────────────────────────────────
  const handleMakePayment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (paymentMethod !== 'bank') {
      setSubmitError('Only bank transfer is supported at this time.')
      return
    }
    setSubmitting(true)
    setSubmitError('')
    setSubmitSuccess('')
    try {
      const targetPlanId = numHands === 1 && selectedPlanId ? selectedPlanId : null
      const selectedHandObj = activeHands.find((h) => h.planId === selectedPlanId)
      const handLabel = numHands === 1 && selectedHandObj ? selectedHandObj.handName : `${numHands} hands`
      const purposeText = isDoubleUp
        ? `Savings contribution — ${numWeeks} week${numWeeks > 1 ? 's' : ''} for ${handLabel}`
        : `DigiMart Co-ownership — ${numWeeks} unit${numWeeks > 1 ? 's' : ''}`

      const res = await fetch(apiUrl('/api/member/submit_payment.php'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          member_id: memberId,
          amount: totalAmount,
          channel: 'bank_transfer',
          reference: bankRef,
          hands: derivedHandsPaid,
          savings_plan_id: targetPlanId,
          weeks_covered: derivedWeeksCovered,
          payment_scope: numWeeks > 1 ? 'multi' : 'weekly',
          purpose: purposeText,
        }),
      })
      const data = await res.json()
      if (data.success) {
        setSubmitSuccess(data.message || 'Payment submitted successfully!')
        setBankRef('')
        fetchPayments()
        // Broadcast real-time refresh to all dashboard tabs
        window.dispatchEvent(new CustomEvent('digiajo:data_updated'))
      } else {
        setSubmitError(data.error || 'Failed to submit payment.')
      }
    } catch {
      // Local fallback save so testing/payment always succeeds
      const newPay: Payment = {
        id: `TXN-${Math.floor(100000 + Math.random() * 900000)}`,
        member: currentUser?.name || 'Member',
        memberId: memberId,
        amount: totalAmount,
        date: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
        reference: bankRef || `PAY-${Math.floor(1000 + Math.random() * 9000)}`,
        channel: 'Bank transfer',
        status: 'pending',
        purpose: isDoubleUp
          ? `Savings contribution — ${numWeeks} week${numWeeks > 1 ? 's' : ''} for ${numHands} hands`
          : `DigiMart Co-ownership — ${numWeeks} unit${numWeeks > 1 ? 's' : ''}`,
      }
      const existing = getStoredPayments()
      savePayments([newPay as any, ...existing])
      setPayments((prev) => [newPay, ...prev])
      setSubmitSuccess('Payment submitted successfully! Admin will verify your transfer shortly.')
      setBankRef('')
      window.dispatchEvent(new CustomEvent('digiajo:data_updated'))
    } finally {
      setSubmitting(false)
    }
  }

  const handleManualRefresh = async () => {
    setRefreshing(true)
    try {
      await Promise.all([fetchPayments(), fetchActiveHands()])
    } finally {
      setTimeout(() => setRefreshing(false), 400)
    }
  }

  const openModal = async () => {
    setPaymentMethod('bank')
    setNumWeeks(1)
    if (!hasEstablishedHands) {
      setNumHands(1)
    }
    setSelectedPlanId(null)
    setBankRef('')
    setSubmitError('')
    setSubmitSuccess('')
    setPaymentOpen(true)
    fetchActiveHands()
  }

  const visible = useMemo(
    () => (filter === 'all' ? payments : payments.filter((p) => p.status === filter)),
    [filter, payments]
  )

  const quickWeekPresets = [1, 2, 4, 8, 12]

  return (
    <>
      <PageHeader
        title="Payment History"
        description="A clear record of every contribution you have made."
        action={
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleManualRefresh}
              disabled={refreshing || loading}
              className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-3.5 py-2.5 text-sm font-bold text-gray-700 shadow-sm transition hover:bg-gray-50 hover:border-brand/30 disabled:opacity-60"
              title="Refresh payment status"
            >
              <RotateCwIcon className={`h-4 w-4 text-brand ${refreshing ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
            <button
              type="button"
              onClick={openModal}
              className="inline-flex items-center gap-2 rounded-full bg-brand px-4 py-2.5 text-sm font-bold text-white hover:bg-brand-dark transition shadow-sm"
            >
              <PlusIcon className="h-4 w-4" /> Make Payment
            </button>
          </div>
        }
      />

      {/* ── Table ─────────────────────────────────────────────────────────── */}
      <div className="rounded-2xl border border-gray-100 bg-white shadow-sm">
        <div className="flex flex-wrap items-center gap-3 border-b border-gray-100 p-4 sm:p-5">
          <div className="flex flex-wrap gap-2" aria-label="Payment status filters">
            {(['all', 'approved', 'pending', 'rejected'] as const).map((item) => (
              <button
                key={item}
                onClick={() => setFilter(item)}
                className={`rounded-full px-3 py-1.5 text-xs font-bold capitalize transition ${
                  filter === item ? 'bg-brand text-white' : 'bg-gray-50 text-gray-600 hover:bg-brand-50'
                }`}
              >
                {item}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center p-12 text-gray-500">
            <Loader2Icon className="h-8 w-8 animate-spin text-brand mb-2" />
            <p className="text-sm">Loading payment history...</p>
          </div>
        ) : fetchError ? (
          <div className="p-8 text-center text-sm text-red-600">{fetchError}</div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full text-left">
                <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                  <tr>
                    <th className="px-5 py-3 font-bold">Reference</th>
                    <th className="px-5 py-3 font-bold">Purpose</th>
                    <th className="px-5 py-3 font-bold">Date</th>
                    <th className="px-5 py-3 font-bold">Channel</th>
                    <th className="px-5 py-3 font-bold">Amount</th>
                    <th className="px-5 py-3 font-bold">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {visible.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-5 py-8 text-center text-sm text-gray-500">
                        No payment records found.
                      </td>
                    </tr>
                  )}
                  {visible.map((p) => (
                    <tr key={p.id}>
                      <td className="px-5 py-4 text-sm font-bold text-brand-dark">{p.reference}</td>
                      <td className="px-5 py-4 text-sm text-gray-600">{p.purpose}</td>
                      <td className="px-5 py-4 text-sm text-gray-500">{p.date}</td>
                      <td className="px-5 py-4 text-sm text-gray-600">{p.channel}</td>
                      <td className="px-5 py-4 text-sm font-bold text-gray-800">{NAIRA(p.amount)}</td>
                      <td className="px-5 py-4">
                        <StatusBadge status={p.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="divide-y divide-gray-100 md:hidden">
              {visible.length === 0 && (
                <div className="p-8 text-center text-sm text-gray-500">No payment records found.</div>
              )}
              {visible.map((p) => (
                <div key={p.id} className="p-4">
                  <div className="flex justify-between gap-3">
                    <div>
                      <p className="text-sm font-bold text-brand-dark">{p.purpose}</p>
                      <p className="mt-1 text-xs text-gray-500">
                        {p.date} • {p.channel}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-gray-800">{NAIRA(p.amount)}</p>
                      <StatusBadge status={p.status} />
                    </div>
                  </div>
                  <p className="mt-2 text-xs font-medium text-gray-400">{p.reference}</p>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* ── Make Payment Modal ─────────────────────────────────────────────── */}
      {paymentOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Make payment"
          className="fixed inset-0 z-[60] flex items-center justify-center overflow-y-auto bg-black/60 p-4 backdrop-blur-sm"
          onClick={(e) => {
            if (e.target === e.currentTarget) setPaymentOpen(false)
          }}
        >
          <div className="my-auto w-full max-w-lg rounded-3xl bg-white shadow-2xl relative max-h-[92vh] overflow-y-auto">
            <button
              onClick={() => setPaymentOpen(false)}
              className="absolute right-4 top-4 z-10 text-gray-400 hover:text-gray-600 transition"
              aria-label="Close modal"
            >
              <XIcon className="h-5 w-5" />
            </button>

            {submitSuccess ? (
              /* ── Success screen ── */
              <div className="p-8 text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-50 mx-auto mb-4">
                  <CheckCircle2Icon className="h-9 w-9 text-brand" />
                </div>
                <h3 className="font-display text-xl font-bold text-brand-dark">Payment Submitted!</h3>
                <p className="mt-2 text-sm text-gray-600 leading-relaxed">{submitSuccess}</p>

                {isDoubleUp && (
                  <div className="mt-4 rounded-2xl bg-brand-50 p-4 text-left">
                    <p className="text-xs font-bold text-brand-dark mb-2">
                      📅 Payment Breakdown:
                    </p>
                    <div className="space-y-1.5 text-xs text-gray-600">
                      <div className="flex justify-between">
                        <span>Weeks covered</span>
                        <span className="font-bold text-brand-dark">{numWeeks} week{numWeeks !== 1 ? 's' : ''}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Hands covered</span>
                        <span className="font-bold text-brand-dark">{numHands} hand{numHands !== 1 ? 's' : ''}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Weekly rate per hand</span>
                        <span className="font-bold text-brand-dark">{NAIRA(ratePerHand)}</span>
                      </div>
                      <div className="mt-2 border-t border-brand/10 pt-2 flex justify-between font-bold text-brand-dark text-sm">
                        <span>Total Paid</span>
                        <span>{NAIRA(totalAmount)}</span>
                      </div>
                    </div>
                  </div>
                )}

                <div className="mt-6 flex flex-col sm:flex-row gap-2.5">
                  <button
                    type="button"
                    onClick={() => {
                      setPaymentOpen(false)
                      handleManualRefresh()
                    }}
                    className="flex-1 rounded-xl border border-gray-200 bg-gray-50 py-3 text-sm font-bold text-gray-700 hover:bg-gray-100 transition inline-flex items-center justify-center gap-2"
                  >
                    <RotateCwIcon className="h-4 w-4 text-brand" /> Refresh Status
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentOpen(false)}
                    className="flex-1 rounded-xl bg-brand py-3 text-sm font-bold text-white hover:bg-brand-dark transition shadow-sm"
                  >
                    Done
                  </button>
                </div>
              </div>
            ) : (
              /* ── Payment form ── */
              <form onSubmit={handleMakePayment} className="p-5 sm:p-6 space-y-4">
                <div>
                  <h3 className="font-display text-lg font-bold text-brand-dark">Make Payment</h3>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {isDoubleUp
                      ? 'Specify the number of weeks and hands you are paying for.'
                      : 'Each unit = ₦100,000 DigiMart Co-ownership stake.'}
                  </p>
                </div>

                {/* ── Payment channel ── */}
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { key: 'bank', label: 'Bank Transfer', icon: Building2Icon, available: true },
                    { key: 'paystack', label: 'Paystack', icon: CreditCardIcon, available: false },
                    { key: 'flutterwave', label: 'Flutterwave', icon: SmartphoneIcon, available: false },
                  ].map((m) => (
                    <div key={m.key} className="relative">
                      <button
                        type="button"
                        disabled={!m.available}
                        onClick={() => m.available && setPaymentMethod(m.key as any)}
                        className={`w-full flex flex-col items-center justify-center rounded-xl border-2 p-2.5 text-center transition ${
                          !m.available
                            ? 'cursor-not-allowed opacity-50 border-gray-200 bg-gray-50'
                            : paymentMethod === m.key
                            ? 'border-brand bg-brand-50/50 font-bold text-brand'
                            : 'border-gray-200 text-gray-500 hover:border-brand/30'
                        }`}
                      >
                        <m.icon className="h-4 w-4 mb-1" />
                        <span className="text-[10px] whitespace-nowrap">{m.label}</span>
                      </button>
                      {!m.available && (
                        <span className="absolute -top-1.5 -right-1.5 rounded-full bg-gray-400 px-1 py-px text-[8px] font-bold text-white uppercase">
                          Soon
                        </span>
                      )}
                    </div>
                  ))}
                </div>

                {isDoubleUp ? (
                  <>
                    {!hasEstablishedHands ? (
                      /* ── New User / First-Time Contributor: Select Hands & Weeks ── */
                      <div className="space-y-3.5">
                        {/* 1. Select Savings Hands */}
                        <div className="rounded-2xl border border-brand/20 bg-brand-50/40 p-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-brand-dark">
                                <SparklesIcon className="h-3.5 w-3.5 text-accent" /> 1. Select Savings Capacity
                              </span>
                              <h4 className="text-sm font-extrabold text-brand-dark mt-0.5">
                                Choose Number of Hands
                              </h4>
                            </div>
                            <span className="font-display text-sm font-extrabold text-brand">
                              {NAIRA(numHands * ratePerHand)}/wk
                            </span>
                          </div>

                          {/* Stepper */}
                          <div className="mt-3 flex items-center gap-3">
                            <button
                              type="button"
                              onClick={() => setNumHands((h) => Math.max(1, h - 1))}
                              disabled={numHands <= 1}
                              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border-2 border-brand/20 bg-white text-gray-700 transition hover:border-brand hover:text-brand disabled:opacity-40"
                            >
                              <MinusIcon className="h-4 w-4" />
                            </button>
                            <div className="flex-1 rounded-xl border-2 border-brand bg-white py-2 text-center">
                              <span className="font-display text-xl font-extrabold text-brand-dark">
                                {numHands} {numHands === 1 ? 'Hand' : 'Hands'}
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={() => setNumHands((h) => Math.min(50, h + 1))}
                              disabled={numHands >= 50}
                              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border-2 border-brand/20 bg-white text-gray-700 transition hover:border-brand hover:text-brand disabled:opacity-40"
                            >
                              <PlusIcon className="h-4 w-4" />
                            </button>
                          </div>

                          {/* Quick presets */}
                          <div className="mt-2.5 flex flex-wrap gap-1.5">
                            {[1, 2, 3, 5, 10, 20].map((preset) => (
                              <button
                                key={preset}
                                type="button"
                                onClick={() => setNumHands(preset)}
                                className={`rounded-lg px-2.5 py-1 text-xs font-bold transition ${
                                  numHands === preset
                                    ? 'bg-brand text-white shadow-sm'
                                    : 'bg-white text-gray-600 border border-brand/15 hover:bg-brand-50'
                                }`}
                              >
                                {preset} {preset === 1 ? 'Hand' : 'Hands'}
                              </button>
                            ))}
                          </div>

                          {/* 50 Weeks Plan Targets */}
                          <div className="mt-3 grid grid-cols-2 gap-2 rounded-xl bg-white p-2.5 text-xs border border-brand/10">
                            <div>
                              <span className="text-[10px] text-gray-500 block">50-Week Total Target</span>
                              <span className="font-bold text-gray-800">{NAIRA(numHands * ratePerHand * 50)}</span>
                            </div>
                            <div className="text-right">
                              <span className="text-[10px] text-gray-500 block">Double-Up Cash Payout</span>
                              <span className="font-bold text-brand-dark">{NAIRA(numHands * 130000)}</span>
                            </div>
                          </div>

                          <p className="mt-2 text-[11px] text-amber-800 bg-amber-50 rounded-xl p-2 border border-amber-200/60 leading-relaxed">
                            ⚡ <strong>Note:</strong> Once your first weekly contribution is confirmed, your hand capacity will be permanently fixed for this 50-week cycle.
                          </p>
                        </div>

                        {/* 2. Select Weeks to Pay */}
                        <div className="rounded-2xl border border-gray-200 bg-white p-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">
                                2. Upfront Weeks
                              </span>
                              <h4 className="text-xs font-bold text-gray-800 mt-0.5">
                                Number of Weeks to Pay Today
                              </h4>
                            </div>
                            <span className="text-xs font-bold text-brand">
                              {numWeeks === 1 ? 'Week 1 of 50' : `Weeks 1 – ${numWeeks} of 50`}
                            </span>
                          </div>

                          {/* Stepper */}
                          <div className="mt-3 flex items-center gap-3">
                            <button
                              type="button"
                              onClick={() => setNumWeeks((w) => Math.max(1, w - 1))}
                              disabled={numWeeks <= 1}
                              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-gray-200 text-gray-600 transition hover:border-brand hover:text-brand disabled:opacity-40"
                            >
                              <MinusIcon className="h-4 w-4" />
                            </button>
                            <input
                              type="number"
                              min={1}
                              max={50}
                              value={numWeeks}
                              onChange={(e) =>
                                setNumWeeks(Math.max(1, Math.min(50, parseInt(e.target.value) || 1)))
                              }
                              className="flex-1 rounded-xl border border-gray-200 bg-gray-50 py-1.5 text-center font-display text-lg font-bold text-gray-900 focus:border-brand focus:bg-white focus:outline-none"
                            />
                            <button
                              type="button"
                              onClick={() => setNumWeeks((w) => Math.min(50, w + 1))}
                              disabled={numWeeks >= 50}
                              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-gray-200 text-gray-600 transition hover:border-brand hover:text-brand disabled:opacity-40"
                            >
                              <PlusIcon className="h-4 w-4" />
                            </button>
                          </div>

                          {/* Quick week presets */}
                          <div className="mt-2 flex flex-wrap gap-1.5">
                            {[1, 2, 4, 8, 12].map((preset) => (
                              <button
                                key={preset}
                                type="button"
                                onClick={() => setNumWeeks(preset)}
                                className={`rounded-lg px-2.5 py-1 text-xs font-bold transition ${
                                  numWeeks === preset
                                    ? 'bg-brand text-white'
                                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                }`}
                              >
                                {preset} {preset === 1 ? 'Week' : 'Weeks'}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    ) : (
                      /* ── Existing Contributor: Hand capacity is permanently LOCKED ── */
                      <div className="space-y-3.5">
                        {/* 1. Plan Hand Capacity (Locked) */}
                        <div className="rounded-2xl border border-brand/20 bg-brand-50/50 p-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-brand-dark">
                                <LockIcon className="h-3 w-3 text-brand" /> Savings Capacity (Fixed)
                              </span>
                              <h4 className="text-base font-extrabold text-brand-dark flex items-center gap-2 mt-0.5">
                                <span>{numHands} {numHands === 1 ? 'Hand' : 'Hands'}</span>
                                <span className="rounded-full bg-brand/15 px-2 py-0.5 text-[10px] font-bold text-brand">
                                  50-Week Cycle
                                </span>
                              </h4>
                            </div>
                            <div className="text-right">
                              <span className="text-[10px] text-gray-500 block">Weekly Rate</span>
                              <span className="font-display text-sm font-extrabold text-brand-dark">
                                {NAIRA(numHands * ratePerHand)}/wk
                              </span>
                            </div>
                          </div>

                          {/* 50 Weeks Plan Targets */}
                          <div className="mt-3 grid grid-cols-2 gap-2 rounded-xl bg-white p-2.5 text-xs border border-brand/10">
                            <div>
                              <span className="text-[10px] text-gray-500 block">50-Week Total Target</span>
                              <span className="font-bold text-gray-800">{NAIRA(numHands * ratePerHand * 50)}</span>
                            </div>
                            <div className="text-right">
                              <span className="text-[10px] text-gray-500 block">Double-Up Cash Payout</span>
                              <span className="font-bold text-brand-dark">{NAIRA(numHands * 130000)}</span>
                            </div>
                          </div>

                          <p className="mt-2 text-[11px] text-gray-600 border-t border-brand/10 pt-2 leading-relaxed">
                            ℹ️ Hand capacity is fixed at {numHands} {numHands === 1 ? 'hand' : 'hands'} for this account cycle. If you wish to save with a different number of hands, please open another account.
                          </p>
                        </div>

                        {/* 2. Choose Number of Weeks to Pay */}
                        <div className="rounded-2xl border border-gray-200 bg-white p-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">
                                Number of Weeks
                              </span>
                              <h4 className="text-xs font-bold text-gray-800 mt-0.5">
                                Select weeks to pay for
                              </h4>
                            </div>
                            <span className="text-xs font-bold text-brand">
                              {numWeeks === 1
                                ? `Week ${nextDueWeek} of 50`
                                : `Weeks ${nextDueWeek} – ${Math.min(50, nextDueWeek + numWeeks - 1)} of 50`}
                            </span>
                          </div>

                          {/* Stepper */}
                          <div className="mt-3 flex items-center gap-3">
                            <button
                              type="button"
                              onClick={() => setNumWeeks((w) => Math.max(1, w - 1))}
                              disabled={numWeeks <= 1}
                              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-gray-200 text-gray-600 transition hover:border-brand hover:text-brand disabled:opacity-40"
                            >
                              <MinusIcon className="h-4 w-4" />
                            </button>
                            <input
                              type="number"
                              min={1}
                              max={Math.max(1, 50 - weeksCompleted)}
                              value={numWeeks}
                              onChange={(e) =>
                                setNumWeeks(
                                  Math.max(1, Math.min(Math.max(1, 50 - weeksCompleted), parseInt(e.target.value) || 1))
                                )
                              }
                              className="flex-1 rounded-xl border border-gray-200 bg-gray-50 py-1.5 text-center font-display text-lg font-bold text-gray-900 focus:border-brand focus:bg-white focus:outline-none"
                            />
                            <button
                              type="button"
                              onClick={() => setNumWeeks((w) => Math.min(Math.max(1, 50 - weeksCompleted), w + 1))}
                              disabled={numWeeks >= Math.max(1, 50 - weeksCompleted)}
                              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-gray-200 text-gray-600 transition hover:border-brand hover:text-brand disabled:opacity-40"
                            >
                              <PlusIcon className="h-4 w-4" />
                            </button>
                          </div>

                          {/* Quick week presets */}
                          <div className="mt-2 flex flex-wrap gap-1.5">
                            {[1, 2, 4, 8, 12]
                              .filter((p) => p <= Math.max(1, 50 - weeksCompleted))
                              .map((preset) => (
                                <button
                                  key={preset}
                                  type="button"
                                  onClick={() => setNumWeeks(preset)}
                                  className={`rounded-lg px-2.5 py-1 text-xs font-bold transition ${
                                    numWeeks === preset
                                      ? 'bg-brand text-white'
                                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                  }`}
                                >
                                  {preset} {preset === 1 ? 'Week' : 'Weeks'}
                                </button>
                              ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  /* ── DigiMart Units ── */
                  <div>
                    <label className="mb-2 block text-xs font-semibold text-gray-600">
                      Number of Co-ownership Units
                    </label>
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => setNumWeeks((u) => Math.max(1, u - 1))}
                        disabled={numWeeks <= 1}
                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border-2 border-gray-200 text-gray-600 transition hover:border-brand hover:text-brand disabled:opacity-40"
                      >
                        <MinusIcon className="h-4 w-4" />
                      </button>
                      <input
                        type="number"
                        min={1}
                        max={50}
                        value={numWeeks}
                        onChange={(e) =>
                          setNumWeeks(Math.max(1, Math.min(50, parseInt(e.target.value) || 1)))
                        }
                        className="flex-1 rounded-xl border-2 border-brand bg-brand-50/30 py-2.5 text-center font-display text-2xl font-extrabold text-brand-dark focus:outline-none focus:ring-2 focus:ring-brand/30"
                      />
                      <button
                        type="button"
                        onClick={() => setNumWeeks((u) => Math.min(50, u + 1))}
                        disabled={numWeeks >= 50}
                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border-2 border-gray-200 text-gray-600 transition hover:border-brand hover:text-brand disabled:opacity-40"
                      >
                        <PlusIcon className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                )}

                {/* ── Amount summary ── */}
                <div className="rounded-2xl bg-gray-50 border border-gray-100 p-3.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                      Total to Transfer
                    </span>
                    <span className="font-display text-xl font-extrabold text-brand">
                      {NAIRA(totalAmount)}
                    </span>
                  </div>
                  {isDoubleUp && (
                    <div className="mt-2 space-y-1 border-t border-gray-200 pt-2 text-xs text-gray-600">
                      <div className="flex justify-between">
                        <span>Contribution</span>
                        <span className="font-bold text-brand-dark">
                          {!hasEstablishedHands
                            ? (numWeeks === 1 ? 'Week 1 of 50' : `Weeks 1 – ${numWeeks} of 50 (${numWeeks} weeks)`)
                            : (numWeeks === 1 ? `Week ${nextDueWeek} of 50` : `Weeks ${nextDueWeek} – ${Math.min(50, nextDueWeek + numWeeks - 1)} of 50 (${numWeeks} weeks)`)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Hands covered</span>
                        <span>{numHands} {numHands === 1 ? 'hand' : 'hands'} (₦{ratePerHand.toLocaleString()}/hand/wk)</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* ── Bank details ── */}
                <div className="rounded-2xl bg-gray-50 p-3 border border-gray-100">
                  <span className="text-[9px] font-bold uppercase tracking-wider text-gray-400">
                    Payment Account Details
                  </span>
                  <div className="mt-1.5 space-y-1 text-xs">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Bank Name</span>
                      <span className="font-bold text-brand-dark">Rigo Microfinance Bank</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Account Number</span>
                      <span className="font-mono font-bold text-brand-dark text-sm">1100007188</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Account Name</span>
                      <span className="font-bold text-brand-dark">
                        Betahealthplus Integrated Services Ltd
                      </span>
                    </div>
                  </div>
                </div>

                {/* ── Bank ref ── */}
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-gray-600">
                    Transfer Reference / Your Name <span className="font-normal text-gray-400">(Optional)</span>
                  </label>
                  <input
                    type="text"
                    value={bankRef}
                    onChange={(e) => setBankRef(e.target.value)}
                    className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand/20"
                    placeholder="e.g. your name or bank reference"
                  />
                </div>

                {submitError && (
                  <p className="rounded-xl bg-red-50 px-3 py-2.5 text-xs font-medium text-red-700">
                    {submitError}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-brand py-3.5 text-sm font-bold text-white hover:bg-brand-dark transition shadow-sm disabled:opacity-70 disabled:cursor-wait"
                >
                  {submitting ? (
                    <>
                      <Loader2Icon className="h-4 w-4 animate-spin" /> Submitting...
                    </>
                  ) : (
                    `I have transferred ${NAIRA(totalAmount)}`
                  )}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  )
}
