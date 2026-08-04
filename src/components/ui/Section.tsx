import React from 'react'
import { twMerge } from 'tailwind-merge'
import { Reveal } from './Reveal'
interface SectionProps {
  id?: string
  className?: string
  children: React.ReactNode
}
export function Section({ id, className, children }: SectionProps) {
  return (
    <section id={id} className={twMerge('py-16 lg:py-24', className)}>
      <div className="mx-auto max-w-7xl px-5 lg:px-8">{children}</div>
    </section>
  )
}
interface SectionHeadingProps {
  eyebrow?: string
  title: React.ReactNode
  subtitle?: React.ReactNode
  align?: 'center' | 'left'
  invert?: boolean
  className?: string
}
export function SectionHeading({
  eyebrow,
  title,
  subtitle,
  align = 'center',
  invert = false,
  className,
}: SectionHeadingProps) {
  return (
    <Reveal
      className={twMerge(
        'max-w-3xl',
        align === 'center' ? 'mx-auto text-center' : 'text-left',
        className,
      )}
    >
      {eyebrow && (
        <span
          className={`mb-3 inline-block rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wider ${invert ? 'bg-white/10 text-accent' : 'bg-brand-50 text-brand'}`}
        >
          {eyebrow}
        </span>
      )}
      <h2
        className={`font-display text-3xl font-extrabold leading-tight tracking-tight sm:text-4xl ${invert ? 'text-white' : 'text-brand-dark'}`}
      >
        {title}
      </h2>
      {subtitle && (
        <p
          className={`mt-4 text-base leading-relaxed sm:text-lg ${invert ? 'text-white/70' : 'text-gray-600'}`}
        >
          {subtitle}
        </p>
      )}
    </Reveal>
  )
}
