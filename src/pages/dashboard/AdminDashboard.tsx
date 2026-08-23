import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowRightIcon,
  BanknoteIcon,
  BellRingIcon,
  CheckCircle2Icon,
  Clock3Icon,
  CreditCardIcon,
  LandmarkIcon,
  RotateCwIcon,
  SendIcon,
  UsersIcon,
  WalletCardsIcon,
} from 'lucide-react'
import { PageHeader } from '../../components/dashboard/PageHeader'
import { StatCard } from '../../components/dashboard/StatCard'
import { StatusBadge } from '../../components/dashboard/StatusBadge'
import { useDashboard } from '../../components/dashboard/DashboardContext'
import { NAIRA } from '../../lib/brand'
import { getCurrentUser } from '../../lib/persistence'

function StaffDashboard() {
  const currentUser = getCurrentUser()
  const perms = currentUser?.permissions || []
  const { stats, recentPayments, isLoading } = useDashboard()

  const allActions = [
    { id: 'members', to: '/admin/users', label: 'Manage members', icon: UsersIcon, desc: 'View and edit member accounts' },
    { id: 'payments', to: '/admin/payments', label: 'Approve transfers', icon: LandmarkIcon, desc: 'Review incoming bank transfers' },
    { id: 'payouts', to: '/admin/payouts', label: 'Process payouts', icon: BanknoteIcon, desc: 'Manage member withdrawals' },
    { id: 'referrals', to: '/admin/referrals', label: 'View referrals', icon: UsersIcon, desc: 'Check member referrals and bonuses' },
    { id: 'notifications', to: '/admin/notifications', label: 'Send announcements', icon: SendIcon, desc: 'Broadcast messages to members' },
  ]

  const myActions = allActions.filter(a => perms.includes(a.id))

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-200 border-t-brand"></div>
      </div>
    )
  }

  return (
    <>
      <PageHeader
        title={`Welcome, ${currentUser?.name?.split(' ')[0] || 'Staff'}`}
        description="Here is your staff overview and assigned quick links."
      />

      <div className="mb-8 grid gap-4 sm:grid-cols-2">
         {perms.includes('payments') && (
            <StatCard
              label="Pending transfers"
              value={stats.pendingTransfers.toLocaleString()}
              note="Awaiting your review"
              icon={Clock3Icon}
              tone="gold"
            />
         )}
         {perms.includes('members') && (
            <StatCard
              label="Active members"
              value={stats.activeMembers.toLocaleString()}
              note="Total registered users"
              icon={UsersIcon}
              tone="blue"
            />
         )}
      </div>

      <h3 className="font-display font-bold text-gray-900 mb-4">Your Assigned Areas</h3>
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {myActions.length === 0 ? (
          <div className="col-span-full rounded-2xl border border-gray-100 bg-gray-50 p-8 text-center">
             <p className="text-gray-500">You have not been assigned any pages yet. Please contact the Super Admin.</p>
          </div>
        ) : myActions.map((action) => (
          <Link key={action.id} to={action.to} className="flex flex-col gap-3 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm transition-all hover:-translate-y-1 hover:border-brand-100 hover:shadow-md">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-50 text-brand">
              <action.icon className="h-6 w-6" />
            </div>
            <div>
              <h3 className="font-bold text-gray-900">{action.label}</h3>
              <p className="mt-1 text-sm text-gray-500">{action.desc}</p>
            </div>
          </Link>
        ))}
      </div>

      {perms.includes('payments') && (
        <section className="mt-8 rounded-2xl border border-gray-100 bg-white shadow-sm">
          <div className="flex items-center justify-between p-5 border-b border-gray-50">
            <div>
              <h3 className="font-display font-bold text-brand-dark">Urgent transfers</h3>
              <p className="mt-1 text-xs text-gray-500">Review pending payments assigned to you.</p>
            </div>
            <Link to="/admin/payments" className="text-sm font-bold text-brand hover:underline">See all</Link>
          </div>
          <div className="divide-y divide-gray-100">
            {recentPayments.filter(p => p.status === 'pending').slice(0, 5).map((payment) => (
               <div key={payment.id} className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm font-bold text-gray-800">{payment.member}</p>
                    <p className="text-xs text-gray-500">{payment.purpose} • {payment.channel}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-gray-800">{NAIRA(payment.amount)}</p>
                    <StatusBadge status={payment.status} />
                  </div>
               </div>
            ))}
            {recentPayments.filter(p => p.status === 'pending').length === 0 && (
               <p className="p-5 text-sm text-gray-500 text-center">No pending transfers.</p>
            )}
          </div>
        </section>
      )}
    </>
  )
}

export function AdminDashboard() {
  const currentUser = getCurrentUser()
  if (currentUser?.adminRole === 'support') return <StaffDashboard />

  const { payments, stats, recentPayments, approvePayment, rejectPayment, refreshData, isLoading } = useDashboard() as any
  const [refreshing, setRefreshing] = useState(false)
  const [latestPaymentsPage, setLatestPaymentsPage] = useState(1)
  const itemsPerPage = 5

  const handleRefresh = async () => {
    setRefreshing(true)
    if (typeof refreshData === 'function') {
      await refreshData(false)
    }
    setTimeout(() => setRefreshing(false), 500)
  }
  
  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-200 border-t-brand"></div>
      </div>
    )
  }

  const pendingPayments = React.useMemo(() => {
    const pool = [...payments, ...recentPayments]
    const seen = new Set<string>()
    return pool.filter((p: any) => {
      if (p.status !== 'pending') return false
      const key = p.reference || p.id
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
  }, [payments, recentPayments])

  const totalLatestPages = Math.ceil(recentPayments.length / itemsPerPage) || 1
  const paginatedRecentPayments = React.useMemo(() => {
    const start = (latestPaymentsPage - 1) * itemsPerPage
    return recentPayments.slice(start, start + itemsPerPage)
  }, [recentPayments, latestPaymentsPage])

  return (
    <>
      <PageHeader
        title="Admin overview"
        description="Monitor system-wide savings, weekly payouts, and pending approvals."
        action={
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleRefresh}
              disabled={refreshing}
              className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-xs font-bold text-gray-700 shadow-sm transition hover:bg-gray-50 hover:border-brand/30 disabled:opacity-60"
              title="Refresh overview statistics"
            >
              <RotateCwIcon className={`h-3.5 w-3.5 text-brand ${refreshing ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
            <Link
              to="/admin/payments"
              className="rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-xs font-bold text-gray-700 shadow-sm transition hover:bg-gray-50"
            >
              Review payments
            </Link>
          </div>
        }
      />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Active members"
          value={stats.activeMembers.toLocaleString()}
          note="Across savings and DigiMart plans"
          icon={UsersIcon}
        />
        <StatCard
          label="Savings collected"
          value={NAIRA(stats.totalSavings)}
          note="Confirmed this current cycle"
          icon={LandmarkIcon}
          tone="blue"
        />
        <StatCard
          label="Transfer approvals"
          value={stats.pendingTransfers.toLocaleString()}
          note="Awaiting bank-transfer review"
          icon={Clock3Icon}
          tone="gold"
        />
        <StatCard
          label="Outgoing payouts"
          value={NAIRA(stats.outgoingPayouts)}
          note="Queued for payout"
          icon={WalletCardsIcon}
          tone="red"
        />
      </div>
      <div className="mt-6 grid gap-6 xl:grid-cols-[1.55fr_1fr]">
        <section className="rounded-2xl border border-gray-100 bg-white shadow-sm">
          <div className="flex items-center justify-between p-5">
            <div>
              <h3 className="font-display font-bold text-brand-dark">
                Urgent transfer approvals
              </h3>
              <p className="mt-1 text-xs text-gray-500">
                {pendingPayments.length > 0
                  ? `Review ${pendingPayments.length} pending transfer${pendingPayments.length === 1 ? '' : 's'} awaiting confirmation.`
                  : 'Review transfers before the next reconciliation.'}
              </p>
            </div>
            <Link to="/admin/payments" className="text-sm font-bold text-brand">
              See all
            </Link>
          </div>
          <div className="divide-y divide-gray-100">
            {pendingPayments.length ? (
              pendingPayments.slice(0, 10).map((payment) => (
                <div
                  key={payment.id}
                  className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-bold text-gray-800">
                        {payment.member}
                      </p>
                      <StatusBadge status="pending" />
                    </div>
                    <p className="mt-1 text-xs text-gray-500">
                      {payment.reference} • {payment.purpose} • {payment.date}
                    </p>
                    <p className="mt-1 text-sm font-bold text-brand-dark">
                      {NAIRA(payment.amount)}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => rejectPayment(payment.id)}
                      className="rounded-lg border border-red-200 px-3 py-2 text-xs font-bold text-red-600 hover:bg-red-50"
                    >
                      Reject
                    </button>
                    <button
                      onClick={() => approvePayment(payment.id)}
                      className="rounded-lg bg-brand px-3 py-2 text-xs font-bold text-white hover:bg-brand-dark"
                    >
                      Approve
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-8 text-center">
                <CheckCircle2Icon className="mx-auto h-8 w-8 text-brand" />
                <p className="mt-3 text-sm font-bold text-brand-dark">
                  Approval queue is clear
                </p>
              </div>
            )}
          </div>
        </section>
        <section className="rounded-2xl bg-brand-dark p-6 text-white">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 text-accent">
            <BellRingIcon className="h-5 w-5" />
          </span>
          <h3 className="mt-5 font-display text-xl font-extrabold">
            Today’s operations
          </h3>
          <div className="mt-5 space-y-4 border-t border-white/10 pt-5">
            <div>
              <p className="text-sm font-bold">Contribution reminder sent</p>
              <p className="mt-1 text-xs text-white/60">
                2,418 active members • 9:00 AM
              </p>
            </div>
            <div>
              <p className="text-sm font-bold">Cash-out batch prepared</p>
              <p className="mt-1 text-xs text-white/60">
                7 members • ₦842,000 total
              </p>
            </div>
            <div>
              <p className="text-sm font-bold">Weekly reconciliation starts</p>
              <p className="mt-1 text-xs text-white/60">Saturday at 11:59 PM</p>
            </div>
          </div>
          <Link
            to="/admin/notifications"
            className="mt-6 inline-flex items-center gap-2 text-sm font-bold text-accent"
          >
            Send an update <SendIcon className="h-4 w-4" />
          </Link>
        </section>
      </div>
      <div className="mt-6 grid gap-6 xl:grid-cols-[1.55fr_1fr]">
        <section className="rounded-2xl border border-gray-100 bg-white shadow-sm">
          <div className="flex items-center justify-between p-5">
            <div>
              <h3 className="font-display font-bold text-brand-dark">
                Latest payments
              </h3>
              <p className="mt-1 text-xs text-gray-500">
                Most recent activity across all plans.
              </p>
            </div>
            <Link to="/admin/payments" className="text-sm font-bold text-brand">
              View ledger
            </Link>
          </div>
          <div className="divide-y divide-gray-100">
            {recentPayments.length === 0 ? (
              <div className="px-5 py-8 text-center text-sm text-gray-500">
                No recent payments found.
              </div>
            ) : null}
            {paginatedRecentPayments.map((payment) => (
              <div
                key={payment.id}
                className="flex items-center justify-between gap-3 px-5 py-4"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand">
                    <CreditCardIcon className="h-4 w-4" />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-gray-800">
                      {payment.member}
                    </p>
                    <p className="truncate text-xs text-gray-500">
                      {payment.purpose} • {payment.channel}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-gray-800">
                    {NAIRA(payment.amount)}
                  </p>
                  <StatusBadge status={payment.status} />
                </div>
              </div>
            ))}
          </div>

          {recentPayments.length > itemsPerPage && (
            <div className="flex items-center justify-between border-t border-gray-100 px-5 py-3.5 bg-gray-50/50 rounded-b-2xl">
              <span className="text-xs text-gray-500">
                Showing {((latestPaymentsPage - 1) * itemsPerPage) + 1}–{Math.min(latestPaymentsPage * itemsPerPage, recentPayments.length)} of {recentPayments.length} payments
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setLatestPaymentsPage(p => Math.max(1, p - 1))}
                  disabled={latestPaymentsPage <= 1}
                  className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
                >
                  Back
                </button>
                <span className="text-xs font-medium text-gray-600">
                  Page {latestPaymentsPage} of {totalLatestPages}
                </span>
                <button
                  type="button"
                  onClick={() => setLatestPaymentsPage(p => Math.min(totalLatestPages, p + 1))}
                  disabled={latestPaymentsPage >= totalLatestPages}
                  className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </section>
        <section className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <h3 className="font-display font-bold text-brand-dark">
            Quick actions
          </h3>
          <div className="mt-4 space-y-2">
            {[
              {
                to: '/admin/users',
                label: 'Manage member accounts',
                icon: UsersIcon,
              },
              {
                to: '/admin/payments',
                label: 'Approve bank transfers',
                icon: LandmarkIcon,
              },
              {
                to: '/admin/payouts',
                label: 'Pay a member',
                icon: BanknoteIcon,
              },
              {
                to: '/admin/notifications',
                label: 'Send announcement',
                icon: SendIcon,
              },
            ].map((action) => (
              <Link
                key={action.to}
                to={action.to}
                className="flex items-center justify-between rounded-xl border border-gray-100 p-3 text-sm font-bold text-gray-700 hover:border-brand-100 hover:bg-brand-50"
              >
                <span className="flex items-center gap-3">
                  <action.icon className="h-4 w-4 text-brand" />
                  {action.label}
                </span>
                <ArrowRightIcon className="h-4 w-4 text-gray-400" />
              </Link>
            ))}
          </div>
        </section>
      </div>
    </>
  )
}
