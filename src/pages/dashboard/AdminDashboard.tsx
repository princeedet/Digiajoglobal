import React from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowRightIcon,
  BanknoteIcon,
  BellRingIcon,
  CheckCircle2Icon,
  Clock3Icon,
  CreditCardIcon,
  LandmarkIcon,
  SendIcon,
  UsersIcon,
  WalletCardsIcon,
} from 'lucide-react'
import { PageHeader } from '../../components/dashboard/PageHeader'
import { StatCard } from '../../components/dashboard/StatCard'
import { StatusBadge } from '../../components/dashboard/StatusBadge'
import { useDashboard } from '../../components/dashboard/DashboardContext'
import { NAIRA } from '../../lib/brand'
export function AdminDashboard() {
  const { stats, recentPayments, approvePayment, rejectPayment, isLoading } = useDashboard()
  
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
        title="Operations at a glance"
        description="A working view of the DigiAjo savings and payout operation."
        action={
          <Link
            to="/admin/payments"
            className="inline-flex items-center gap-2 rounded-full bg-brand px-4 py-2.5 text-sm font-bold text-white hover:bg-brand-dark"
          >
            Review approvals <ArrowRightIcon className="h-4 w-4" />
          </Link>
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
                Review transfers before the next reconciliation.
              </p>
            </div>
            <Link to="/admin/payments" className="text-sm font-bold text-brand">
              See all
            </Link>
          </div>
          <div className="divide-y divide-gray-100">
            {recentPayments.filter(p => p.status === 'pending').length ? (
              recentPayments.filter(p => p.status === 'pending').map((payment) => (
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
            {recentPayments.map((payment) => (
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
