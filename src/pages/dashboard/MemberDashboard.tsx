import React, { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowRightIcon,
  BellRingIcon,
  CalendarDaysIcon,
  CheckCircle2Icon,
  CopyIcon,
  CreditCardIcon,
  GiftIcon,
  LandmarkIcon,
  PiggyBankIcon,
  UsersIcon,
  WalletCardsIcon,
  AlertTriangleIcon,
  LockKeyholeIcon,
  Loader2Icon,
  SparklesIcon,
  XIcon,
} from 'lucide-react'
import { motion } from 'framer-motion'
import { StatCard } from '../../components/dashboard/StatCard'
import { StatusBadge } from '../../components/dashboard/StatusBadge'
import { PageHeader } from '../../components/dashboard/PageHeader'
import { NAIRA } from '../../lib/brand'
import { getCurrentUser, setCurrentUser, clearCurrentUser } from '../../lib/persistence'
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

interface ActivityItem {
  title: string
  body: string
  time: string
  kind: string
}

export function MemberDashboard() {
  const cachedUser = getCurrentUser()
  const [user, setUser] = useState(cachedUser)
  const [payments, setPayments] = useState<Payment[]>([])
  const [loadingProfile, setLoadingProfile] = useState(true)
  const [loadingPayments, setLoadingPayments] = useState(true)

  // Referrals check
  const [referralCount, setReferralCount] = useState(0)
  const [referralEarnings, setReferralEarnings] = useState(0)
  const [activeReferrals, setActiveReferrals] = useState(0)
  const [referralCode, setReferralCode] = useState('')

  const [copied, setCopied] = useState(false)
  const [withdrawModalOpen, setWithdrawModalOpen] = useState(false)
  const [requestingPayout, setRequestingPayout] = useState(false)
  const [payoutSuccessMsg, setPayoutSuccessMsg] = useState('')
  const [payoutErrorMsg, setPayoutErrorMsg] = useState('')

  const userName = user ? user.name.split(' ')[0] : 'Member'
  const plan = user ? user.plan : 'Double Up'
  const savedAmount = user ? user.saved : 0
  const weeksCompleted = user ? user.weeks : 0
  const nextDueDate = (user as any)?.nextDueDate || 'Saturday, 18 Jul'
  const showSecurityAlert = user ? user.needsSecurityUpdate : false

  // 1. Load user profile dynamically to get real-time savings info
  const fetchProfile = async () => {
    const identifier = cachedUser?.id || cachedUser?.email || ''
    if (!identifier) return
    try {
      const q = new URLSearchParams()
      if (cachedUser?.id) q.set('member_id', cachedUser.id)
      if (cachedUser?.email) q.set('email', cachedUser.email)
      if (cachedUser?.name) q.set('name', cachedUser.name)
      const res = await fetch(apiUrl(`/api/member/profile.php?${q.toString()}`))
      if (res.status === 404 || res.status === 403 || res.status === 401) {
        clearCurrentUser()
        window.location.href = '/login'
        return
      }
      const data = await res.json()
      if (data.success && data.user) {
        if (data.user.status === 'suspended') {
          clearCurrentUser()
          window.location.href = '/login'
          return
        }
        setUser(data.user)
        // Keep persistent session in sync
        setCurrentUser({ ...data.user, role: 'member' })
      } else if (!data.success && (data.account_deleted || data.account_suspended)) {
        clearCurrentUser()
        window.location.href = '/login'
        return
      }
    } catch (e) {
      console.error('Failed to load user profile in real-time', e)
    } finally {
      setLoadingProfile(false)
    }
  }

  // 2. Load payments dynamically
  const fetchPayments = async () => {
    const identifier = cachedUser?.id || cachedUser?.email || ''
    if (!identifier) return
    try {
      const res = await fetch(apiUrl(`/api/member/payments.php?member_id=${encodeURIComponent(identifier)}`))
      const data = await res.json()
      if (data.success) {
        setPayments(data.payments)
      }
    } catch (e) {
      console.error('Failed to load user payments in real-time', e)
    } finally {
      setLoadingPayments(false)
    }
  }

  // 3. Load referrals dynamically
  const fetchReferrals = async () => {
    const identifier = cachedUser?.id || cachedUser?.email || ''
    if (!identifier) return
    try {
      const res = await fetch(apiUrl(`/api/member/referrals.php?member_id=${encodeURIComponent(identifier)}`))
      const data = await res.json()
      if (data.success) {
        setReferralCount(data.count || 0)
        setReferralEarnings(data.earned || 0)
        setActiveReferrals(data.activeCount || 0)
        setReferralCode(data.referralCode || '')
      }
    } catch (e) {
      console.error('Failed to load referrals in real-time', e)
    }
  }

  useEffect(() => {
    fetchProfile()
    fetchPayments()
    fetchReferrals()

    const handleDataUpdate = () => {
      fetchProfile()
      fetchPayments()
      fetchReferrals()
    }

    window.addEventListener('digiajo:data_updated', handleDataUpdate)

    // Poll for changes every 5 seconds to keep dashboard fully live
    const interval = setInterval(() => {
      fetchProfile()
      fetchPayments()
      fetchReferrals()
    }, 5000)

    return () => {
      clearInterval(interval)
      window.removeEventListener('digiajo:data_updated', handleDataUpdate)
    }
  }, [cachedUser?.id, cachedUser?.email])

  // Derive dynamic activity logs from user history & payment submissions
  const derivedActivity = useMemo<ActivityItem[]>(() => {
    const list: ActivityItem[] = []

    // Add payments activity
    payments.forEach((p) => {
      if (p.status === 'approved') {
        list.push({
          title: 'Payment Confirmed',
          body: `Your contribution of ${NAIRA(p.amount)} for "${p.purpose}" was approved by admin.`,
          time: p.date,
          kind: 'approved'
        })
      } else if (p.status === 'pending') {
        list.push({
          title: 'Payment Pending',
          body: `Your bank transfer proof of ${NAIRA(p.amount)} is currently being verified.`,
          time: p.date,
          kind: 'pending'
        })
      } else if (p.status === 'rejected') {
        list.push({
          title: 'Payment Rejected',
          body: `The payment reference ${p.reference} of ${NAIRA(p.amount)} was rejected. Please contact support.`,
          time: p.date,
          kind: 'rejected'
        })
      }
    })

    // Add registration event
    if (user?.joined) {
      list.push({
        title: 'Account Registered',
        body: 'Welcome to DigiAjo Global! Your account was registered successfully.',
        time: user.joined,
        kind: 'system'
      })
    }

    return list.slice(0, 5) // Limit to top 5 recent updates
  }, [payments, user])

  // Plan specifics (50-week cycle for fixed active hands)
  const activeHands = (user as any)?.activeHands || Math.max(1, Math.round((savedAmount || 1300) / 1300 / Math.max(1, weeksCompleted || 1))) || 1
  const isDigiMart = plan.toLowerCase().includes('mart')
  const totalWeeksPossible = 50
  const weeksRemaining = Math.max(0, totalWeeksPossible - weeksCompleted)
  const weeklyRate = isDigiMart ? 0 : (1300 * activeHands)
  const completion = isDigiMart ? 100 : Math.min(100, Math.round((weeksCompleted / totalWeeksPossible) * 100))
  
  // 50-Week Cycle: Fixed hands * ₦1,300 * 50 weeks -> 100% Double-Up Reward
  const hasSavingsStarted = (savedAmount > 0 || weeksCompleted > 0)
  const isSuspended = hasSavingsStarted && (user?.status === 'suspended' || (user as any)?.isSuspended || ((user as any)?.missedWeeks >= 4))
  const targetAmount = isDigiMart ? 100000 : (activeHands * 1300 * 50)
  
  // When suspended due to 4 weeks default, user forfeits bonus and receives strictly their principal savings
  const projectedPayout = isSuspended
    ? savedAmount
    : (isDigiMart ? 150000 : (activeHands * 130000))

  // 50-Week Cycle Calendar Timeline (strictly 50 calendar weeks from registration)
  const registrationDate = useMemo(() => {
    const raw = (user as any)?.joined || (user as any)?.created_at
    if (raw) {
      const d = new Date(raw)
      if (!isNaN(d.getTime())) return d
    }
    return new Date()
  }, [user])

  const maturityDate = useMemo(() => {
    return new Date(registrationDate.getTime() + 50 * 7 * 24 * 60 * 60 * 1000)
  }, [registrationDate])

  const calendarDaysRemaining = useMemo(() => {
    const diff = maturityDate.getTime() - Date.now()
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)))
  }, [maturityDate])

  const calendarWeeksRemaining = Math.max(0, Math.ceil(calendarDaysRemaining / 7))
  const isMaturityReached = Date.now() >= maturityDate.getTime()
  const isFullyEligibleForWithdrawal = weeksCompleted >= 50 && isMaturityReached

  const copy = async () => {
    const code = referralCode || (user ? `DGA-${user.name.split(' ')[1]?.toUpperCase() || 'USER'}-${user.id.slice(-3)}` : 'DGA-ADEYEMI-824')
    await navigator.clipboard?.writeText(code)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1800)
  }

  return (
    <>
      {showSecurityAlert && (
        <motion.div
          initial={{ opacity: 0, y: -15 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 rounded-2xl border border-amber-200 bg-amber-50/70 p-4 shadow-sm backdrop-blur flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
        >
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-800">
              <AlertTriangleIcon className="h-5 w-5" />
            </span>
            <div>
              <h4 className="font-display font-bold text-amber-900 text-sm">
                Security Action Required
              </h4>
              <p className="text-xs text-amber-700 mt-0.5">
                You are currently using your default temporary password. For security, please update your password and complete your profile.
              </p>
            </div>
          </div>
          <Link
            to="/user/settings"
            className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-3.5 py-2 text-xs font-bold text-white hover:bg-brand-dark transition shrink-0"
          >
            <LockKeyholeIcon className="h-3.5 w-3.5" /> Update Profile
          </Link>
        </motion.div>
      )}

      {isSuspended && (
        <motion.div
          initial={{ opacity: 0, y: -15 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 rounded-2xl border border-red-200 bg-red-50/95 p-4 shadow-sm backdrop-blur flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
        >
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-100 text-red-700">
              <AlertTriangleIcon className="h-5 w-5" />
            </span>
            <div>
              <h4 className="font-display font-bold text-red-900 text-sm">
                Account Suspended (4 Weeks Defaulted)
              </h4>
              <p className="text-xs text-red-700 mt-0.5 leading-relaxed">
                Due to 4 missed contributions, your Double-Up cash bonus has been forfeited. Your saved principal of <strong>{NAIRA(savedAmount)}</strong> is preserved and will be eligible for withdrawal upon your 50-week cycle maturity ({maturityDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}).
              </p>
            </div>
          </div>
        </motion.div>
      )}

      <PageHeader
        title={`Good morning, ${userName}`}
        description={`Here is a clear view of your ${plan} journey.`}
        action={
          <Link
            to="/user/payments"
            className="inline-flex items-center gap-2 rounded-full bg-brand px-4 py-2.5 text-sm font-bold text-white hover:bg-brand-dark transition"
          >
            Make payment <ArrowRightIcon className="h-4 w-4" />
          </Link>
        }
      />

      {loadingProfile ? (
        <div className="flex flex-col items-center justify-center p-20 text-gray-500 bg-white rounded-2xl border border-gray-100 shadow-sm">
          <Loader2Icon className="h-8 w-8 animate-spin text-brand mb-2" />
          <p className="text-sm">Loading your journey details...</p>
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              label={isDigiMart ? "Total invested" : "Total saved"}
              value={NAIRA(savedAmount)}
              note={isDigiMart ? "1 unit co-ownership" : `Across ${weeksCompleted} confirmed week${weeksCompleted !== 1 ? 's' : ''}`}
              icon={PiggyBankIcon}
            />
            <StatCard
              label="Projected payout"
              value={NAIRA(projectedPayout)}
              note={isDigiMart ? "On maturity (12 months)" : "On completion of 50 weeks"}
              icon={WalletCardsIcon}
              tone="gold"
            />
            <StatCard
              label="Referral earnings"
              value={NAIRA(referralEarnings)}
              note={`${activeReferrals} active referrals`}
              icon={UsersIcon}
              tone="blue"
            />
            <StatCard
              label={isDigiMart ? "Maturity status" : "Contribution status"}
              value={isDigiMart ? "Active" : "On track"}
              note={isDigiMart ? "Maturity: May 2027" : "No open fines this week"}
              icon={CheckCircle2Icon}
            />
          </div>

          <div className="mt-6 grid gap-6 xl:grid-cols-[1.55fr_1fr]">
            <section className="overflow-hidden rounded-2xl bg-brand-dark p-6 text-white shadow-sm sm:p-7">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-white/65">
                    {plan} Plan {activeHands > 1 && `(${activeHands} Hands)`}
                  </p>
                  <h3 className="mt-1 font-display text-2xl font-extrabold">
                    {isDigiMart ? "Co-ownership Units" : `Week ${weeksCompleted} of 50`}
                  </h3>
                </div>
                <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-bold text-accent">
                  {completion}% complete
                </span>
              </div>
              <div className="mt-7">
                <div className="mb-2 flex justify-between text-sm text-white/70">
                  <span>{NAIRA(savedAmount)} saved</span>
                  <span>Target: {NAIRA(targetAmount)}</span>
                </div>
                <div className="h-3 overflow-hidden rounded-full bg-white/15">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${completion}%` }}
                    transition={{ duration: 0.8 }}
                    className="h-full rounded-full bg-accent"
                  />
                </div>
              </div>
              <div className="mt-7 flex flex-wrap items-center justify-between gap-4 border-t border-white/10 pt-5">
                <div className="flex flex-wrap gap-6 text-sm">
                  <div>
                    <p className="text-white/55">Your cash reward</p>
                    <p className="mt-1 font-display text-xl font-bold text-accent">
                      {NAIRA(projectedPayout)}
                    </p>
                  </div>
                  <div>
                    <p className="text-white/55">{isDigiMart ? "Maturity Date" : "50-Week Maturity Date"}</p>
                    <p className="mt-1 font-display text-xl font-bold">
                      {isDigiMart ? "18 May 2027" : maturityDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </p>
                  </div>
                </div>

                <div>
                  {isFullyEligibleForWithdrawal ? (
                    <button
                      type="button"
                      onClick={() => setWithdrawModalOpen(true)}
                      className="inline-flex items-center gap-2 rounded-xl bg-accent px-4 py-2.5 text-xs font-extrabold text-brand-dark hover:bg-yellow-400 shadow-lg shadow-accent/20 transition animate-pulse"
                    >
                      <SparklesIcon className="h-4 w-4" /> Request Cashout
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setWithdrawModalOpen(true)}
                      className="inline-flex items-center gap-2 rounded-xl bg-white/10 px-4 py-2.5 text-xs font-bold text-white/80 hover:bg-white/20 border border-white/15 transition shadow-sm"
                    >
                      <LockKeyholeIcon className="h-3.5 w-3.5 text-accent" /> Withdraw Payout
                    </button>
                  )}
                </div>
              </div>
            </section>

            <section className="rounded-2xl border border-amber-100 bg-amber-50/60 p-6 shadow-sm">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent text-brand-dark">
                  <CalendarDaysIcon className="h-5 w-5" />
                </span>
                <div>
                  <p className="text-sm font-bold text-brand-dark">
                    {isDigiMart ? "DigiMart Returns" : "Next contribution"}
                  </p>
                  <p className="text-xs text-gray-600">
                    {isDigiMart ? "Legal Investment Cert" : `Week ${weeksCompleted + 1} • ${nextDueDate}`}
                  </p>
                </div>
              </div>
              <p className="mt-5 font-display text-3xl font-extrabold text-brand-dark">
                {isDigiMart ? "+50% ROI" : NAIRA(weeklyRate)}
              </p>
              <p className="mt-1 text-sm leading-relaxed text-gray-600">
                {isDigiMart ? "Asset-backed retail returns from logistics & supermarkets." : "Due before 11:59 PM. Paying early keeps your savings smooth."}
              </p>
              <Link
                to="/user/payments"
                className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-brand px-4 py-3 text-sm font-bold text-white hover:bg-brand-dark transition"
              >
                <CreditCardIcon className="h-4 w-4" /> {isDigiMart ? "Buy more units" : "Make payment"}
              </Link>
            </section>
          </div>

          <div className="mt-6 grid gap-6 xl:grid-cols-[1.55fr_1fr]">
            <section className="rounded-2xl border border-gray-100 bg-white shadow-sm">
              <div className="flex items-center justify-between p-5">
                <div>
                  <h3 className="font-display font-bold text-brand-dark">
                    Recent payments
                  </h3>
                  <p className="mt-1 text-xs text-gray-500">
                    Your latest contribution records
                  </p>
                </div>
                <Link
                  to="/user/payments"
                  className="text-sm font-bold text-brand hover:text-brand-dark transition"
                >
                  View all
                </Link>
              </div>

              {loadingPayments ? (
                <div className="flex justify-center p-8">
                  <Loader2Icon className="h-6 w-6 animate-spin text-brand" />
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {payments.length === 0 && (
                    <div className="px-5 py-8 text-center text-sm text-gray-500">
                      No payment records found.
                    </div>
                  )}
                  {payments.slice(0, 4).map((payment) => (
                    <div
                      key={payment.id}
                      className="flex items-center justify-between gap-3 px-5 py-4 animate-fadeIn"
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand">
                          <LandmarkIcon className="h-4 w-4" />
                        </span>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-bold text-gray-800">
                            {payment.purpose}
                          </p>
                          <p className="text-xs text-gray-500">
                            {payment.date} • {payment.channel}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-brand-dark">
                          {NAIRA(payment.amount)}
                        </p>
                        <StatusBadge status={payment.status} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand">
                    <GiftIcon className="h-5 w-5" />
                  </span>
                  <div>
                    <h3 className="font-display font-bold text-brand-dark">
                      Your referrals
                    </h3>
                    <p className="text-xs text-gray-500">Invite, earn, repeat.</p>
                  </div>
                </div>
                <div className="mt-5 rounded-xl bg-brand-50 p-4">
                  <p className="text-xs font-bold uppercase tracking-wider text-brand-light">
                    Your referral code
                  </p>
                  <div className="mt-2 flex items-center justify-between gap-2">
                    <span className="font-display text-sm font-bold text-brand-dark select-all">
                      {referralCode || (user ? `DGA-${user.name.split(' ')[1]?.toUpperCase() || 'USER'}-${user.id.slice(-3)}` : 'DGA-ADEYEMI-824')}
                    </span>
                    <button
                      onClick={copy}
                      className="inline-flex items-center gap-1 rounded-lg bg-white px-2.5 py-1.5 text-xs font-bold text-brand shadow-sm hover:bg-brand-100 transition"
                    >
                      <CopyIcon className="h-3.5 w-3.5" />
                      {copied ? 'Copied' : 'Copy'}
                    </button>
                  </div>
                </div>
              </div>
              <div className="mt-5 flex items-center justify-between pt-4 border-t border-gray-50">
                <div>
                  <p className="font-display text-2xl font-extrabold text-brand-dark">
                    {referralCount} / 10
                  </p>
                  <p className="text-xs text-gray-500">
                    towards your next food bonus
                  </p>
                </div>
                <Link
                  to="/user/referrals"
                  className="text-sm font-bold text-brand hover:text-brand-dark transition"
                >
                  Details
                </Link>
              </div>
            </section>
          </div>

          <section className="mt-6 rounded-2xl border border-gray-100 bg-white shadow-sm">
            <div className="p-5 border-b border-gray-50">
              <h3 className="font-display font-bold text-brand-dark">
                Recent updates
              </h3>
            </div>
            <div className="divide-y divide-gray-100">
              {derivedActivity.length === 0 && (
                <div className="p-8 text-center text-sm text-gray-500">
                  No updates found.
                </div>
              )}
              {derivedActivity.map((item, idx) => (
                <div key={`${item.title}-${item.time}-${idx}`} className="flex gap-3 px-5 py-4 animate-fadeIn">
                  <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand">
                    <BellRingIcon className="h-4 w-4" />
                  </span>
                  <div>
                    <p className="text-sm font-bold text-gray-800">{item.title}</p>
                    <p className="mt-0.5 text-sm text-gray-500 leading-relaxed">{item.body}</p>
                    <p className="mt-1.5 text-xs text-gray-400 font-medium">{item.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </>
      )}

      {/* ── Withdrawal / Payout Modal ── */}
      {withdrawModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-[60] flex items-center justify-center overflow-y-auto bg-black/60 p-4 backdrop-blur-sm"
          onClick={(e) => {
            if (e.target === e.currentTarget) setWithdrawModalOpen(false)
          }}
        >
          <div className="my-auto w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl relative text-center">
            <button
              onClick={() => setWithdrawModalOpen(false)}
              className="absolute right-4 top-4 text-gray-400 hover:text-gray-600 transition"
            >
              <XIcon className="h-5 w-5" />
            </button>

            {!isFullyEligibleForWithdrawal ? (
              /* ── Locked state: Either weeks < 50 or calendar weeks from registration < 50 ── */
              <div>
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-50 mx-auto mb-4 border border-amber-100 text-amber-600">
                  <LockKeyholeIcon className="h-8 w-8" />
                </div>
                <h3 className="font-display text-xl font-bold text-brand-dark">
                  {weeksCompleted >= 50 ? 'Awaiting 50-Week Maturity' : 'Withdrawal Locked'}
                </h3>
                <p className="mt-2 text-xs text-gray-600 leading-relaxed">
                  {weeksCompleted >= 50 ? (
                    <>
                      You have completed all 50 weekly contributions in advance! Under the Double-Up rules, payouts mature strictly{' '}
                      <strong className="text-brand-dark font-bold">50 weeks from your registration date</strong> ({maturityDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}).
                    </>
                  ) : (
                    <>
                      The 50-week Double-Up cycle runs for 50 weeks from your registration date ({registrationDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}). Your cash reward of{' '}
                      <strong className="text-brand-dark font-bold">{NAIRA(projectedPayout)}</strong> unlocks once all 50 contributions are completed and the 50-week timeline is reached.
                    </>
                  )}
                </p>

                {/* Progress breakdown in modal */}
                <div className="mt-4 rounded-2xl bg-gray-50 p-4 text-left border border-gray-100 space-y-2.5">
                  <div>
                    <div className="flex justify-between text-xs font-bold text-gray-700 mb-1">
                      <span>Weekly Contributions</span>
                      <span className="text-brand">Week {weeksCompleted} of 50</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-gray-200">
                      <div
                        className="h-full rounded-full bg-brand"
                        style={{ width: `${Math.min(100, (weeksCompleted / 50) * 100)}%` }}
                      />
                    </div>
                  </div>

                  <div className="border-t border-gray-200/60 pt-2 space-y-1.5 text-[11px] text-gray-600">
                    <div className="flex justify-between">
                      <span>Registration Date</span>
                      <span className="font-semibold text-gray-800">
                        {registrationDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>50-Week Payout Release Date</span>
                      <span className="font-bold text-brand">
                        {maturityDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Calendar Time Remaining</span>
                      <span className="font-bold text-amber-700">
                        {calendarWeeksRemaining} weeks ({calendarDaysRemaining} days)
                      </span>
                    </div>
                    <div className="flex justify-between font-bold text-brand-dark pt-1 border-t border-gray-200/60 text-xs">
                      <span>Cash Payout Reward</span>
                      <span>{NAIRA(projectedPayout)}</span>
                    </div>
                  </div>
                </div>

                <p className="mt-3 text-[11px] text-gray-500">
                  💡 Payouts are automatically unlocked on your 50-week registration maturity date.
                </p>

                <div className="mt-5 flex gap-2.5">
                  <button
                    onClick={() => setWithdrawModalOpen(false)}
                    className="flex-1 rounded-xl border border-gray-200 bg-gray-50 py-3 text-xs font-bold text-gray-700 hover:bg-gray-100 transition"
                  >
                    Close
                  </button>
                  {weeksCompleted < 50 && (
                    <Link
                      to="/user/payments"
                      onClick={() => setWithdrawModalOpen(false)}
                      className="flex-1 rounded-xl bg-brand py-3 text-xs font-bold text-white hover:bg-brand-dark transition shadow-sm text-center"
                    >
                      Make Payment
                    </Link>
                  )}
                </div>
              </div>
            ) : (
              /* ── Unlocked: 50 Weeks completed ── */
              <div>
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-50 mx-auto mb-4 border border-emerald-100 text-emerald-600">
                  <SparklesIcon className="h-8 w-8" />
                </div>
                <h3 className="font-display text-xl font-bold text-brand-dark">
                  50-Week Cycle Complete!
                </h3>
                <p className="mt-1.5 text-xs text-gray-600">
                  Congratulations! You are eligible to withdraw your full Double-Up cash payout.
                </p>

                <div className="mt-4 rounded-2xl bg-brand-50 p-4 border border-brand/20 text-center">
                  <span className="text-[10px] uppercase font-bold text-brand tracking-wider">
                    Total Cash Reward
                  </span>
                  <p className="font-display text-2xl font-extrabold text-brand-dark mt-0.5">
                    {NAIRA(projectedPayout)}
                  </p>
                </div>

                {payoutSuccessMsg ? (
                  <div className="mt-4 rounded-xl bg-emerald-50 p-3 text-xs text-emerald-800 border border-emerald-200">
                    ✅ {payoutSuccessMsg}
                  </div>
                ) : (
                  <>
                    {payoutErrorMsg && (
                      <div className="mt-3 rounded-xl bg-red-50 p-2.5 text-xs text-red-700 border border-red-200">
                        {payoutErrorMsg}
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={async () => {
                        setRequestingPayout(true)
                        setPayoutErrorMsg('')
                        try {
                          const res = await apiFetch('/api/admin/payouts.php', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                              member_id: user?.id || (user as any)?.member_id || '',
                              amount: projectedPayout,
                              reason: '50-Week Double Up Payout Completed'
                            })
                          })
                          const data = await res.json()
                          if (data.success) {
                            setPayoutSuccessMsg('Payout request submitted successfully! Admin will disburse your funds to your registered bank account.')
                          } else {
                            setPayoutErrorMsg(data.error || 'Failed to submit payout request.')
                          }
                        } catch {
                          setPayoutSuccessMsg('Payout request submitted successfully! Admin will disburse your funds to your registered bank account.')
                        } finally {
                          setRequestingPayout(false)
                        }
                      }}
                      disabled={requestingPayout}
                      className="mt-5 w-full rounded-xl bg-brand py-3 text-sm font-bold text-white hover:bg-brand-dark transition shadow-sm disabled:opacity-50"
                    >
                      {requestingPayout ? 'Submitting Request...' : `Withdraw ${NAIRA(projectedPayout)}`}
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}
