import React, { useState } from 'react'
import { motion } from 'framer-motion'
import {
  MinusIcon,
  PlusIcon,
  TrendingUpIcon,
  ShoppingBasketIcon,
} from 'lucide-react'
import { Button } from '../ui/Button'
import { Reveal } from '../ui/Reveal'
import { NAIRA } from '../../lib/brand'
const WEEKLY = 1300
const WEEKS = 50
export function DoubleUpCalculator() {
  const [accounts, setAccounts] = useState(1)
  const weeklyTotal = WEEKLY * accounts
  const totalSaved = weeklyTotal * WEEKS
  const payout = totalSaved * 2
  const set = (n: number) => setAccounts(Math.min(10, Math.max(1, n)))
  const rows = [
    {
      label: 'Your weekly commitment',
      value: `${NAIRA(weeklyTotal)} / Saturday`,
      muted: true,
    },
    {
      label: 'Total saved over 50 weeks',
      value: NAIRA(totalSaved),
      muted: true,
    },
  ]
  return (
    <Reveal>
      <div className="grid overflow-hidden rounded-3xl border border-brand-100 bg-white shadow-lg lg:grid-cols-2">
        {/* Controls */}
        <div className="p-8 lg:p-10">
          <span className="inline-block rounded-full bg-brand-50 px-3 py-1 text-xs font-bold uppercase tracking-wider text-brand">
            Double Up Calculator
          </span>
          <h3 className="mt-4 font-display text-2xl font-extrabold text-brand-dark">
            See exactly how much you'll earn
          </h3>
          <p className="mt-2 text-sm text-gray-600">
            Save {NAIRA(WEEKLY)} every Saturday for {WEEKS} weeks per account.
            Open multiple accounts on one {''}
            <span className="font-semibold text-brand-dark">₦2,000</span>{' '}
            registration fee to multiply your payout.
          </p>

          <div className="mt-8">
            <label className="text-sm font-semibold text-gray-700">
              Number of savings accounts
            </label>
            <div className="mt-3 flex items-center gap-4">
              <button
                onClick={() => set(accounts - 1)}
                className="flex h-11 w-11 items-center justify-center rounded-xl border-2 border-brand-100 text-brand transition hover:bg-brand-50 disabled:opacity-40"
                disabled={accounts <= 1}
                aria-label="Decrease accounts"
              >
                <MinusIcon className="h-5 w-5" />
              </button>
              <motion.span
                key={accounts}
                initial={{
                  scale: 0.8,
                  opacity: 0,
                }}
                animate={{
                  scale: 1,
                  opacity: 1,
                }}
                className="w-16 text-center font-display text-4xl font-extrabold text-brand-dark"
              >
                {accounts}
              </motion.span>
              <button
                onClick={() => set(accounts + 1)}
                className="flex h-11 w-11 items-center justify-center rounded-xl border-2 border-brand-100 text-brand transition hover:bg-brand-50 disabled:opacity-40"
                disabled={accounts >= 10}
                aria-label="Increase accounts"
              >
                <PlusIcon className="h-5 w-5" />
              </button>
            </div>
          </div>

          <dl className="mt-8 space-y-3">
            {rows.map((r) => (
              <div
                key={r.label}
                className="flex items-center justify-between border-b border-gray-100 pb-3"
              >
                <dt className="text-sm text-gray-600">{r.label}</dt>
                <dd className="font-display text-base font-bold text-brand-dark">
                  {r.value}
                </dd>
              </div>
            ))}
          </dl>
        </div>

        {/* Reward panel */}
        <div className="relative flex flex-col justify-center bg-brand-dark p-8 text-white lg:p-10">
          <div className="absolute inset-0 opacity-[0.07]" aria-hidden>
            <div className="h-full w-full bg-[radial-gradient(circle_at_1px_1px,white_1px,transparent_0)] [background-size:20px_20px]" />
          </div>
          <div className="relative">
            <div className="flex items-center gap-2 text-accent">
              <TrendingUpIcon className="h-5 w-5" />
              <span className="text-sm font-bold uppercase tracking-wider">
                Your reward
              </span>
            </div>
            <p className="mt-3 text-sm text-white/70">
              Cash paid instantly at week 50
            </p>
            <motion.p
              key={payout}
              initial={{
                opacity: 0,
                y: 10,
              }}
              animate={{
                opacity: 1,
                y: 0,
              }}
              className="mt-1 font-display text-5xl font-extrabold text-accent"
            >
              {NAIRA(payout)}
            </motion.p>

            <div className="mt-6 flex items-start gap-3 rounded-2xl bg-white/10 p-4">
              <ShoppingBasketIcon className="mt-0.5 h-6 w-6 shrink-0 text-accent" />
              <div>
                <p className="font-semibold">+ Bonus Food Items</p>
                <p className="text-sm text-white/70">
                  Grocery rewards delivered on top of your cash payout.
                </p>
              </div>
            </div>

            <div className="mt-6">
              <Button
                to="/register"
                variant="accent"
                size="lg"
                className="w-full"
              >
                Secure Your Slot Today
              </Button>
              <p className="mt-3 text-center text-xs text-white/50">
                One-time ₦2,000 registration • Non-refundable
              </p>
            </div>
          </div>
        </div>
      </div>
    </Reveal>
  )
}
