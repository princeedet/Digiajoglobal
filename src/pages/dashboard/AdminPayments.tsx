import React, { useMemo, useState } from 'react'
import { CheckIcon, SearchIcon, XIcon } from 'lucide-react'
import { PageHeader } from '../../components/dashboard/PageHeader'
import { StatusBadge } from '../../components/dashboard/StatusBadge'
import { useDashboard } from '../../components/dashboard/DashboardContext'
import { NAIRA } from '../../lib/brand'

const TYPE_LABELS: Record<string, string> = {
  registration_fee:    'Registration',
  weekly_contribution: 'Weekly',
  digimart_unit:       'DigiMart',
  fine:                'Fine',
}

function TypeBadge({ type }: { type?: string }) {
  const label = TYPE_LABELS[type || ''] || (type ? type : 'Payment')
  const colours: Record<string, string> = {
    registration_fee:    'bg-purple-50 text-purple-700',
    weekly_contribution: 'bg-brand-50 text-brand',
    digimart_unit:       'bg-orange-50 text-orange-700',
    fine:                'bg-red-50 text-red-600',
  }
  const cls = colours[type || ''] || 'bg-gray-50 text-gray-600'
  return (
    <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${cls}`}>
      {label}
    </span>
  )
}

export function AdminPayments() {
  const { payments, approvePayment, rejectPayment } = useDashboard()
  const [filter, setFilter] = useState<
    'all' | 'pending' | 'approved' | 'rejected'
  >('all')
  const [typeFilter, setTypeFilter] = useState<'all' | string>('all')
  const [query, setQuery] = useState('')
  const visible = useMemo(
    () =>
      payments.filter((payment: any) => {
        const matchesStatus = filter === 'all' || payment.status === filter
        const matchesType =
          typeFilter === 'all' ||
          payment.payment_type === typeFilter ||
          (typeFilter === 'registration_fee' && (payment.payment_type === 'registration' || payment.payment_type === 'registration_fee' || (payment.purpose && payment.purpose.toLowerCase().includes('registration')))) ||
          (typeFilter === 'weekly_contribution' && (payment.payment_type === 'weekly' || payment.payment_type === 'weekly_contribution' || (payment.purpose && payment.purpose.toLowerCase().includes('weekly')))) ||
          (typeFilter === 'digimart_unit' && (payment.payment_type === 'digimart' || payment.payment_type === 'digimart_unit' || (payment.purpose && payment.purpose.toLowerCase().includes('digimart'))))

        const searchTarget = `${payment.member || ''} ${payment.reference || ''} ${payment.memberId || ''} ${payment.purpose || ''}`.toLowerCase()
        const matchesQuery = !query.trim() || searchTarget.includes(query.trim().toLowerCase())

        return matchesStatus && matchesType && matchesQuery
      }),
    [payments, filter, typeFilter, query],
  )
  const pending = payments.filter(
    (payment) => payment.status === 'pending',
  ).length
  return (
    <>
      <PageHeader
        title="Payments"
        description={`${pending} bank-transfer ${pending === 1 ? 'approval' : 'approvals'} currently awaiting review.`}
      />
      <section className="rounded-2xl border border-gray-100 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-gray-100 p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <label className="relative block max-w-md flex-1">
              <SearchIcon className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search member or reference"
                className="w-full rounded-xl border border-gray-200 py-2.5 pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand/20"
              />
            </label>
            <div className="flex flex-wrap gap-2">
              {(['all', 'pending', 'approved', 'rejected'] as const).map(
                (item) => (
                  <button
                    onClick={() => setFilter(item)}
                    key={item}
                    className={`rounded-full px-3 py-2 text-xs font-bold capitalize ${filter === item ? 'bg-brand text-white' : 'bg-gray-50 text-gray-600'}`}
                  >
                    {item}
                  </button>
                ),
              )}
            </div>
          </div>
          {/* Type filter row */}
          <div className="flex flex-wrap gap-2">
            {([  
              ['all', 'All types'],
              ['registration_fee', 'Registration Fee'],
              ['weekly_contribution', 'Weekly Savings'],
              ['digimart_unit', 'DigiMart'],
            ] as const).map(([val, label]) => (
              <button
                key={val}
                onClick={() => setTypeFilter(val)}
                className={`rounded-full px-3 py-1.5 text-xs font-bold transition ${
                  typeFilter === val
                    ? 'bg-brand-dark text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        <div className="hidden overflow-x-auto md:block">
          <table className="w-full text-left">
            <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-5 py-3">Member</th>
                <th className="px-5 py-3">Reference</th>
                <th className="px-5 py-3">Type</th>
                <th className="px-5 py-3">Purpose</th>
                <th className="px-5 py-3">Channel</th>
                <th className="px-5 py-3">Amount</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {visible.map((payment: any) => (
                <tr key={payment.id}>
                  <td className="px-5 py-4">
                    <p className="text-sm font-bold text-gray-800">
                      {payment.member}
                    </p>
                    <p className="text-xs text-gray-500">
                      {payment.memberId} • {payment.date}
                    </p>
                  </td>
                  <td className="px-5 py-4 text-sm font-bold text-brand-dark">
                    {payment.reference}
                  </td>
                  <td className="px-5 py-4">
                    <TypeBadge type={payment.payment_type} />
                  </td>
                  <td className="px-5 py-4 text-sm text-gray-600">
                    {payment.purpose}
                  </td>
                  <td className="px-5 py-4 text-sm text-gray-600">
                    {payment.channel}
                  </td>
                  <td className="px-5 py-4 text-sm font-bold text-gray-800">
                    {NAIRA(payment.amount)}
                  </td>
                  <td className="px-5 py-4">
                    <StatusBadge status={payment.status} />
                  </td>
                  <td className="px-5 py-4">
                    {payment.status === 'pending' && (
                      <div className="flex gap-2">
                        <button
                          onClick={() => rejectPayment(payment.id)}
                          className="rounded-lg border border-red-200 p-2 text-red-600 hover:bg-red-50"
                          aria-label={`Reject ${payment.reference}`}
                        >
                          <XIcon className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => approvePayment(payment.id)}
                          className="rounded-lg bg-brand p-2 text-white hover:bg-brand-dark"
                          aria-label={`Approve ${payment.reference}`}
                        >
                          <CheckIcon className="h-4 w-4" />
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="divide-y divide-gray-100 md:hidden">
          {visible.map((payment) => (
            <article key={payment.id} className="p-4">
              <div className="flex justify-between gap-3">
                <div>
                  <p className="text-sm font-bold text-gray-800">
                    {payment.member}
                  </p>
                  <p className="mt-1 text-xs text-gray-500">
                    {payment.reference} • {payment.date}
                  </p>
                </div>
                <StatusBadge status={payment.status} />
              </div>
              <div className="mt-3 flex items-center justify-between">
                <p className="text-sm text-gray-600">{payment.purpose}</p>
                <p className="font-bold text-gray-800">
                  {NAIRA(payment.amount)}
                </p>
              </div>
              {payment.status === 'pending' && (
                <div className="mt-4 flex gap-2">
                  <button
                    onClick={() => rejectPayment(payment.id)}
                    className="flex-1 rounded-lg border border-red-200 py-2 text-xs font-bold text-red-600"
                  >
                    Reject
                  </button>
                  <button
                    onClick={() => approvePayment(payment.id)}
                    className="flex-1 rounded-lg bg-brand py-2 text-xs font-bold text-white"
                  >
                    Approve
                  </button>
                </div>
              )}
            </article>
          ))}
        </div>
      </section>
    </>
  )
}
