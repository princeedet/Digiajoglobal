import React from 'react'
type Status =
  | 'approved'
  | 'pending'
  | 'rejected'
  | 'paid'
  | 'late'
  | 'upcoming'
  | 'active'
  | 'suspended'
  | 'pending_verification'
  | 'missed'
const styles: Record<Status, string> = {
  approved: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
  paid: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
  active: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
  pending: 'bg-amber-50 text-amber-700 ring-amber-600/20',
  pending_verification: 'bg-amber-50 text-amber-700 ring-amber-600/20',
  upcoming: 'bg-sky-50 text-sky-700 ring-sky-600/20',
  late: 'bg-orange-50 text-orange-700 ring-orange-600/20',
  rejected: 'bg-red-50 text-red-700 ring-red-600/20',
  suspended: 'bg-red-50 text-red-700 ring-red-600/20',
  missed: 'bg-orange-50 text-orange-700 ring-orange-600/20',
}
export function StatusBadge({ status }: { status: Status }) {
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold capitalize ring-1 ring-inset ${styles[status]}`}
    >
      {status}
    </span>
  )
}
