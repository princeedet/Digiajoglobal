import React from 'react'
import { PiggyBankIcon } from 'lucide-react'
interface LogoProps {
  variant?: 'light' | 'dark'
  showTagline?: boolean
  className?: string
}
export function Logo({
  variant = 'dark',
  showTagline = false,
  className = '',
}: LogoProps) {
  const isLight = variant === 'light'
  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      <div
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${isLight ? 'bg-white/15' : 'bg-brand'}`}
      >
        <PiggyBankIcon
          className={`h-6 w-6 ${isLight ? 'text-white' : 'text-white'}`}
        />
      </div>
      <div className="leading-none">
        <span
          className={`font-display text-lg font-extrabold tracking-tight ${isLight ? 'text-white' : 'text-brand-dark'}`}
        >
          DigiAjo
          <span className={isLight ? 'text-accent' : 'text-brand-light'}>
            {' '}
            Global
          </span>
        </span>
        {showTagline && (
          <p
            className={`mt-0.5 text-[10px] ${isLight ? 'text-white/60' : 'text-gray-500'}`}
          >
            Redefining Savings, empowering lives
          </p>
        )}
      </div>
    </div>
  )
}
