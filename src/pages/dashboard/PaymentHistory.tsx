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
  LayersIcon,
  InfoIcon,
} from 'lucide-react'
import { PageHeader } from '../../components/dashboard/PageHeader'
import { StatusBadge } from '../../components/dashboard/StatusBadge'
import { NAIRA } from '../../lib/brand'
import { getCurrentUser } from '../../lib/persistence'

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

// ── Business rule: 1 hand = 1 week = ₦1,300 ─────────────────────────────────
const RATE_PER_HAND = 1300  // ₦ per hand (= per week)

export function PaymentHistory() {
  const [filter, setFilter] = useState<'all' | 'approved' | 'pending' | 'rejected'>('all')
  const [paymentOpen, setPaymentOpen] = useState(false)
  const [payments, setPayments] = useState<Payment[]>([])
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState('')

  // ── Modal state ──────────────────────────────────────────────────────────────
  const [paymentMethod, setPaymentMethod] = useState<'bank' | 'paystack' | 'flutterwave'>('bank')
  const [hands, setHands] = useState(1)
  const [bankRef, setBankRef] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [submitSuccess, setSubmitSuccess] = useState('')

  const currentUser = getCurrentUser()
  const memberId = currentUser?.id || ''
  const isDoubleUp = currentUser?.plan !== 'DigiMart'

  // 1 hand = 1 week = ₦1,300  |  DigiMart: 1 unit = ₦100,000
  const totalAmount = isDoubleUp ? RATE_PER_HAND * hands : 100000 * hands

  // ── Fetch payments ───────────────────────────────────────────────────────────
  const fetchPayments = async () => {
    if (!memberId) return
    setLoading(true)
    setFetchError('')
    try {
      const res = await fetch(`/Digiajoglobal/api/member/payments.php?member_id=${encodeURIComponent(memberId)}`)
      const data = await res.json()
      if (data.success) {
        setPayments(data.payments)
      } else {
        setFetchError(data.error || 'Failed to load payment history.')
      }
    } catch {
      setFetchError('Unable to connect to the server.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchPayments() }, [memberId])

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
      const res = await fetch('/Digiajoglobal/api/member/submit_payment.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          member_id: memberId,
          amount: totalAmount,
          channel: 'bank_transfer',
          reference: bankRef,
          hands,
          // weeks_covered = hands (1 hand = 1 week)
          weeks_covered: isDoubleUp ? hands : 1,
          payment_scope: isDoubleUp ? (hands > 1 ? 'multi' : 'weekly') : 'unit',
          purpose: isDoubleUp
            ? `Savings contribution — ${hands} hand${hands > 1 ? 's' : ''} (${hands} week${hands > 1 ? 's' : ''})`
            : `DigiMart Co-ownership — ${hands} unit${hands > 1 ? 's' : ''}`,
        }),
      })
      const data = await res.json()
      if (data.success) {
        setSubmitSuccess(data.message || 'Payment submitted successfully!')
        setBankRef('')
        fetchPayments()
      } else {
        setSubmitError(data.error || 'Failed to submit payment.')
      }
    } catch {
      setSubmitError('Failed to connect. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const openModal = () => {
    setPaymentMethod('bank')
    setHands(1)
    setBankRef('')
    setSubmitError('')
    setSubmitSuccess('')
    setPaymentOpen(true)
  }

  const visible = useMemo(
    () => filter === 'all' ? payments : payments.filter((p) => p.status === filter),
    [filter, payments],
  )

  return (
    <>
      <PageHeader
        title="Payment History"
        description="A clear record of every contribution you have made."
        action={
          <button
            onClick={openModal}
            className="inline-flex items-center gap-2 rounded-full bg-brand px-4 py-2.5 text-sm font-bold text-white hover:bg-brand-dark transition"
          >
            <PlusIcon className="h-4 w-4" /> Make Payment
          </button>
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
                className={`rounded-full px-3 py-1.5 text-xs font-bold capitalize transition ${filter === item ? 'bg-brand text-white' : 'bg-gray-50 text-gray-600 hover:bg-brand-50'}`}
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
                      <td className="px-5 py-4"><StatusBadge status={p.status} /></td>
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
                      <p className="mt-1 text-xs text-gray-500">{p.date} • {p.channel}</p>
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
          className="fixed inset-0 z-[60] flex items-start justify-center overflow-y-auto bg-black/50 p-4 backdrop-blur-sm"
          onClick={(e) => { if (e.target === e.currentTarget) setPaymentOpen(false) }}
        >
          <div className="my-8 w-full max-w-lg rounded-3xl bg-white shadow-2xl relative">
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

                {isDoubleUp && hands > 1 && (
                  <div className="mt-4 rounded-2xl bg-brand-50 p-4 text-left">
                    <p className="text-xs font-bold text-brand-dark mb-2">
                      📅 How your {NAIRA(totalAmount)} will be spread:
                    </p>
                    <div className="space-y-1">
                      {Array.from({ length: hands }).map((_, i) => (
                        <div key={i} className="flex items-center justify-between text-xs text-gray-600">
                          <span>Week slot {i + 1}</span>
                          <span className="font-bold text-brand">{NAIRA(RATE_PER_HAND)}</span>
                        </div>
                      ))}
                      <div className="mt-2 border-t border-brand/10 pt-2 flex justify-between text-xs font-bold text-brand-dark">
                        <span>Total</span>
                        <span>{NAIRA(totalAmount)}</span>
                      </div>
                    </div>
                  </div>
                )}

                <button
                  onClick={() => setPaymentOpen(false)}
                  className="mt-6 w-full rounded-xl bg-brand py-3 text-sm font-bold text-white hover:bg-brand-dark transition"
                >
                  Done
                </button>
              </div>
            ) : (
              /* ── Payment form ── */
              <form onSubmit={handleMakePayment} className="p-6 space-y-5">
                <div>
                  <h3 className="font-display text-xl font-bold text-brand-dark">Make Payment</h3>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {isDoubleUp
                      ? 'Each hand = 1 week of savings at ₦1,300. Paying multiple hands covers multiple weeks.'
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
                        className={`w-full flex flex-col items-center justify-center rounded-xl border-2 p-2.5 text-center transition
                          ${!m.available ? 'cursor-not-allowed opacity-50 border-gray-200 bg-gray-50' :
                            paymentMethod === m.key ? 'border-brand bg-brand-50/50 font-bold text-brand' : 'border-gray-200 text-gray-500 hover:border-brand/30'}`}
                      >
                        <m.icon className="h-4 w-4 mb-1" />
                        <span className="text-[10px] whitespace-nowrap">{m.label}</span>
                      </button>
                      {!m.available && (
                        <span className="absolute -top-1.5 -right-1.5 rounded-full bg-gray-400 px-1 py-px text-[8px] font-bold text-white uppercase">Soon</span>
                      )}
                    </div>
                  ))}
                </div>

                {/* ── Number of Hands (= weeks) ── */}
                <div>
                  <label className="mb-2 block text-xs font-semibold text-gray-600">
                    {isDoubleUp ? 'Number of Hands (= Weeks to cover)' : 'Number of Units'}
                  </label>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setHands((h) => Math.max(1, h - 1))}
                      disabled={hands <= 1}
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border-2 border-gray-200 text-gray-600 transition hover:border-brand hover:text-brand disabled:opacity-40"
                    >
                      <MinusIcon className="h-4 w-4" />
                    </button>
                    <input
                      type="number"
                      min={1}
                      max={100}
                      value={hands}
                      onChange={(e) => setHands(Math.max(1, Math.min(100, parseInt(e.target.value) || 1)))}
                      className="flex-1 rounded-xl border-2 border-brand bg-brand-50/30 py-2.5 text-center font-display text-2xl font-extrabold text-brand-dark focus:outline-none focus:ring-2 focus:ring-brand/30"
                    />
                    <button
                      type="button"
                      onClick={() => setHands((h) => Math.min(100, h + 1))}
                      disabled={hands >= 100}
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border-2 border-gray-200 text-gray-600 transition hover:border-brand hover:text-brand disabled:opacity-40"
                    >
                      <PlusIcon className="h-4 w-4" />
                    </button>
                  </div>

                  {/* Hands explanation */}
                  {isDoubleUp && (
                    <div className="mt-2 flex items-start gap-2 rounded-xl bg-brand-50 px-3 py-2.5">
                      <InfoIcon className="h-3.5 w-3.5 mt-0.5 shrink-0 text-brand" />
                      <p className="text-[11px] text-brand-dark leading-snug">
                        <strong>{hands} hand{hands > 1 ? 's' : ''}</strong> = <strong>{hands} week{hands > 1 ? 's' : ''}</strong> of savings.
                        {hands > 1
                          ? ` Your ${NAIRA(totalAmount)} will be spread as ${NAIRA(RATE_PER_HAND)} per week across ${hands} weekly slots once approved.`
                          : ' Covers 1 weekly slot.'}
                      </p>
                    </div>
                  )}
                </div>

                {/* ── Amount summary ── */}
                <div className="rounded-2xl bg-gray-50 border border-gray-100 p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Total to Transfer</span>
                    <span className="font-display text-2xl font-extrabold text-brand">{NAIRA(totalAmount)}</span>
                  </div>
                  {isDoubleUp && (
                    <div className="mt-2 space-y-1 border-t border-gray-200 pt-2 text-xs text-gray-500">
                      <div className="flex justify-between">
                        <span>Rate per hand (per week)</span>
                        <span>{NAIRA(RATE_PER_HAND)}</span>
                      </div>
                      <div className="flex justify-between font-medium text-gray-700">
                        <span>× {hands} hand{hands > 1 ? 's' : ''} ({hands} week{hands > 1 ? 's' : ''})</span>
                        <span>= {NAIRA(totalAmount)}</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* ── Bank details ── */}
                <div className="rounded-2xl bg-gray-50 p-4 border border-gray-100">
                  <span className="text-[9px] font-bold uppercase tracking-wider text-gray-400">Payment Account Details</span>
                  <div className="mt-2 space-y-1.5 text-xs">
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
                      <span className="font-bold text-brand-dark">Betahealthplus Integrated Services Ltd</span>
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
                  <p className="rounded-xl bg-red-50 px-3 py-2.5 text-xs font-medium text-red-700">{submitError}</p>
                )}

                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-brand py-3.5 text-sm font-bold text-white hover:bg-brand-dark transition disabled:opacity-70 disabled:cursor-wait"
                >
                  {submitting
                    ? <><Loader2Icon className="h-4 w-4 animate-spin" /> Submitting...</>
                    : `I have transferred ${NAIRA(totalAmount)}`}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  )
}
