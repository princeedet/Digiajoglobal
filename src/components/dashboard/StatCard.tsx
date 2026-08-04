import React from 'react'
import { type LucideIcon } from 'lucide-react'
interface StatCardProps {
  label: string
  value: string
  note: string
  icon: LucideIcon
  tone?: 'green' | 'gold' | 'blue' | 'red'
}
const tones = {
  green: 'bg-brand-50 text-brand',
  gold: 'bg-amber-50 text-amber-700',
  blue: 'bg-sky-50 text-sky-700',
  red: 'bg-red-50 text-red-700',
}
export function StatCard({
  label,
  value,
  note,
  icon: Icon,
  tone = 'green',
}: StatCardProps) {
  return (
    <article className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-medium text-gray-500">{label}</p>
        <span
          className={`flex h-10 w-10 items-center justify-center rounded-xl ${tones[tone]}`}
        >
          <Icon className="h-5 w-5" />
        </span>
      </div>
      <p className="mt-4 font-display text-2xl font-extrabold tracking-tight text-brand-dark">
        {value}
      </p>
      <p className="mt-1 text-xs text-gray-500">{note}</p>
    </article>
  )
}
