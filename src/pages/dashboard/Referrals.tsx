import React, { useState } from 'react'
import {
  CheckCircle2Icon,
  CopyIcon,
  GiftIcon,
  Share2Icon,
  UsersIcon,
} from 'lucide-react'
import { PageHeader } from '../../components/dashboard/PageHeader'
import { StatusBadge } from '../../components/dashboard/StatusBadge'
import { getCurrentUser } from '../../lib/persistence'
import type { Referral } from '../../lib/dashboard-data'
import { NAIRA } from '../../lib/brand'

export function Referrals() {
  const user = getCurrentUser()
  const [copied, setCopied] = useState(false)
  const [referrals, setReferrals] = useState<Referral[]>([])
  const [referralCode, setReferralCode] = useState('')
  const [stats, setStats] = useState({ count: 0, activeCount: 0, earned: 0 })
  const [loading, setLoading] = useState(true)

  React.useEffect(() => {
    if (!user) return
    fetch(`/Digiajoglobal/api/member/referrals.php?member_id=${user.id}`)
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setReferrals(data.list || [])
          setReferralCode(data.referralCode || '')
          setStats({
            count: data.count || 0,
            activeCount: data.activeCount || 0,
            earned: data.earned || 0
          })
        }
      })
      .finally(() => setLoading(false))
  }, [user])

  const copy = async () => {
    const code = referralCode || (user ? `DGA-${user.name.split(' ')[1]?.toUpperCase() || 'USER'}-${user.id.slice(-3)}` : 'DGA-ADEYEMI-824')
    const link = `https://digiajoglobal.com/register?ref=${code}`
    await navigator.clipboard?.writeText(link)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1800)
  }
  return (
    <>
      <PageHeader
        title="Referrals"
        description="Invite your circle and earn ₦1,000 for every activated referral."
      />
      <div className="grid gap-5 lg:grid-cols-[1.15fr_.85fr]">
        <section className="rounded-2xl bg-brand-dark p-6 text-white">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/10 text-accent">
            <Share2Icon className="h-5 w-5" />
          </span>
          <h3 className="mt-5 font-display text-2xl font-extrabold">
            Grow your financial tribe
          </h3>
          <p className="mt-2 max-w-md text-sm leading-relaxed text-white/70">
            Share your unique link. Each person who activates an account earns
            you ₦1,000, paid every Friday.
          </p>
          <div className="mt-6 flex flex-col gap-2 rounded-xl bg-white/10 p-3 sm:flex-row sm:items-center">
            <code className="flex-1 truncate text-sm font-semibold text-white">
              {referralCode || (user ? `DGA-${user.name.split(' ')[1]?.toUpperCase() || 'USER'}-${user.id.slice(-3)}` : 'DGA-ADEYEMI-824')}
            </code>
            <button
              onClick={copy}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-white px-3 py-2 text-xs font-bold text-brand-dark"
            >
              <CopyIcon className="h-3.5 w-3.5" />
              {copied ? 'Copied!' : 'Copy link'}
            </button>
          </div>
        </section>
        <section className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-50 text-amber-700">
            <GiftIcon className="h-5 w-5" />
          </span>
          <p className="mt-5 text-sm font-semibold text-gray-500">
            Food bonus progress
          </p>
          <p className="mt-1 font-display text-3xl font-extrabold text-brand-dark">
            {stats.activeCount} <span className="text-lg text-gray-400">/ 10 referrals</span>
          </p>
          <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-gray-100">
            <div className="h-full rounded-full bg-accent" style={{ width: `${Math.min((stats.activeCount / 10) * 100, 100)}%` }} />
          </div>
          <p className="mt-3 text-xs leading-relaxed text-gray-500">
            {Math.max(10 - stats.activeCount, 0)} more active referrals unlock ₦10,000 worth of grocery food items.
          </p>
        </section>
      </div>
      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <UsersIcon className="h-5 w-5 text-brand" />
          <p className="mt-3 text-xs font-bold uppercase tracking-wide text-gray-500">
            Total referred
          </p>
          <p className="mt-1 font-display text-2xl font-extrabold text-brand-dark">
            {stats.count}
          </p>
        </div>
        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <CheckCircle2Icon className="h-5 w-5 text-brand" />
          <p className="mt-3 text-xs font-bold uppercase tracking-wide text-gray-500">
            Activated
          </p>
          <p className="mt-1 font-display text-2xl font-extrabold text-brand-dark">
            {stats.activeCount}
          </p>
        </div>
        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <GiftIcon className="h-5 w-5 text-brand" />
          <p className="mt-3 text-xs font-bold uppercase tracking-wide text-gray-500">
            Cash earned
          </p>
          <p className="mt-1 font-display text-2xl font-extrabold text-brand-dark">
            {NAIRA(stats.earned)}
          </p>
        </div>
      </div>
      <section className="mt-6 rounded-2xl border border-gray-100 bg-white shadow-sm">
        <div className="p-5">
          <h3 className="font-display font-bold text-brand-dark">
            Your referred friends
          </h3>
        </div>
        <div className="divide-y divide-gray-100">
          {loading ? (
            <div className="p-8 text-center text-sm text-gray-500">Loading referrals...</div>
          ) : referrals.length === 0 ? (
            <div className="p-8 text-center text-sm text-gray-500">You haven't referred anyone yet. Share your link to get started!</div>
          ) : (
            referrals.map((person) => (
              <div
                key={person.phone}
              className="flex items-center justify-between gap-4 px-5 py-4"
            >
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-50 text-xs font-bold text-brand">
                  {person.name
                    .split(' ')
                    .map((part) => part[0])
                    .join('')}
                </span>
                <div>
                  <p className="text-sm font-bold text-gray-800">
                    {person.name}
                  </p>
                  <p className="text-xs text-gray-500">
                    Joined {person.joined} • {person.phone}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <StatusBadge
                  status={person.status === 'active' ? 'active' : 'pending'}
                />
                <p className="mt-1 text-xs font-bold text-brand-dark">
                  {person.earnings ? NAIRA(person.earnings) : 'Pending'}
                </p>
              </div>
            </div>
          )))}
        </div>
      </section>
    </>
  )
}
