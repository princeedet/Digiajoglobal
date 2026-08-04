import React, { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import {
  ArrowRightIcon,
  ShoppingCartIcon,
  PackageIcon,
  TrendingUpIcon,
  UserPlusIcon,
  UtensilsCrossedIcon,
  ShieldCheckIcon,
  FileCheckIcon,
  ClockIcon,
  AlertCircleIcon,
} from 'lucide-react'
import { Button } from '../components/ui/Button'
import { Section, SectionHeading } from '../components/ui/Section'
import { Reveal } from '../components/ui/Reveal'
import { NAIRA } from '../lib/brand'
const MART_IMG =
  'https://cdn.magicpatterns.com/patterns/generated-images/2724df0d-21b7-4cf8-98cc-7f92b19ddb8d.jpg'
const steps = [
  {
    icon: ShoppingCartIcon,
    step: 'Step 1',
    title: 'Purchase Your Units',
    desc: 'Buy your co-ownership slots at a fixed rate of ₦100,000 per unit. You can buy multiple units.',
  },
  {
    icon: PackageIcon,
    step: 'Step 2',
    title: 'We Deploy the Capital',
    desc: 'DigiMart pools funds to purchase fast-moving consumer goods in massive bulk, distributing through our high-turnover retail network.',
  },
  {
    icon: TrendingUpIcon,
    step: 'Step 3',
    title: 'Earn & Cash Out',
    desc: 'Watch your money grow passively over 12 months with zero operational stress or market headaches.',
  },
  {
    icon: UserPlusIcon,
    step: 'Step 4',
    title: 'Refer & Earn',
    desc: 'Earn 5% commission paid within 24 hours from every unit purchased by your referral.',
  },
]
const safety = [
  {
    icon: UtensilsCrossedIcon,
    title: 'Recession-Proof Retail',
    desc: 'People must eat every day. Your investment funds essential food items and household provisions that enjoy high daily turnover.',
  },
  {
    icon: ShieldCheckIcon,
    title: 'Zero Stress',
    desc: 'No dealing with store managers, logistics, spoilage or customers. We handle 100% of operations while you reap the rewards.',
  },
  {
    icon: FileCheckIcon,
    title: 'Legal Peace of Mind',
    desc: 'Every co-ownership unit comes with a signed, legally binding Investment Certificate issued directly by DigiAjo Global.',
  },
]
function UnitCalculator() {
  const [units, setUnits] = useState(1)
  const invested = units * 100000
  const projected = Math.round(invested * 1.5)
  return (
    <Reveal>
      <div className="rounded-3xl border border-brand-100 bg-white p-8 shadow-lg lg:p-10">
        <div className="grid gap-8 lg:grid-cols-2">
          <div>
            <span className="inline-block rounded-full bg-brand-50 px-3 py-1 text-xs font-bold uppercase tracking-wider text-brand">
              Unit Estimator
            </span>
            <h3 className="mt-4 font-display text-2xl font-extrabold text-brand-dark">
              Project your 12-month return
            </h3>
            <label className="mt-8 block text-sm font-semibold text-gray-700">
              Units to purchase: <span className="text-brand">{units}</span>
            </label>
            <input
              type="range"
              min={1}
              max={20}
              value={units}
              onChange={(e) => setUnits(Number(e.target.value))}
              className="mt-3 w-full accent-brand"
              aria-label="Number of units"
            />
            <div className="mt-3 flex justify-between text-xs text-gray-400">
              <span>1 unit</span>
              <span>20 units</span>
            </div>
            <p className="mt-6 text-sm text-gray-600">
              At <span className="font-semibold text-brand-dark">₦100,000</span>{' '}
              per unit, your capital is deployed into high-turnover retail
              goods.
            </p>
          </div>
          <div className="flex flex-col justify-center rounded-2xl bg-brand-dark p-8 text-white">
            <p className="text-sm text-white/70">Total invested</p>
            <p className="font-display text-2xl font-bold">{NAIRA(invested)}</p>
            <div className="my-4 h-px bg-white/10" />
            <p className="text-sm text-white/70">
              Projected value in 12 months (up to 50%)
            </p>
            <motion.p
              key={projected}
              initial={{
                opacity: 0,
                y: 8,
              }}
              animate={{
                opacity: 1,
                y: 0,
              }}
              className="font-display text-4xl font-extrabold text-accent"
            >
              {NAIRA(projected)}
            </motion.p>
            <Button to="/register" variant="accent" className="mt-6 w-full">
              Purchase Units Now
            </Button>
          </div>
        </div>
      </div>
    </Reveal>
  )
}
export function DigiMart() {
  const [filled, setFilled] = useState(70)
  useEffect(() => {
    const t = setTimeout(() => setFilled(82), 400)
    return () => clearTimeout(t)
  }, [])
  return (
    <>
      {/* ANNOUNCEMENT BAR */}
      <div className="bg-accent text-brand-dark">
        <div className="mx-auto flex max-w-7xl items-center justify-center gap-2 px-5 py-2.5 text-center text-xs font-bold sm:text-sm lg:px-8">
          <AlertCircleIcon className="h-4 w-4 shrink-0" />
          <span>
            Warning: Round 1 Units are 82% filled. Secure your slots before
            entries close!
          </span>
        </div>
      </div>

      {/* HERO */}
      <section className="relative overflow-hidden bg-brand-dark text-white">
        <div className="relative mx-auto grid max-w-7xl items-center gap-12 px-5 py-16 lg:grid-cols-[1.1fr_1fr] lg:px-8 lg:py-24">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-semibold text-accent">
              DigiMart Co-ownership Plan
            </span>
            <h1 className="mt-5 font-display text-3xl font-extrabold leading-[1.12] tracking-tight sm:text-[2.9rem]">
              Why let your money sleep in a bank earning less than 5% when it
              could earn{' '}
              <span className="text-accent">50% in just one year?</span>
            </h1>
            <p className="mt-5 max-w-xl text-base leading-relaxed text-white/75 sm:text-lg">
              Introducing the DigiMart Co-ownership Plan — your gateway to
              stress-free, high-yield retail investment.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button to="/register" variant="accent" size="lg">
                Purchase Investment Units Now{' '}
                <ArrowRightIcon className="h-5 w-5" />
              </Button>
            </div>

            {/* Urgency meter */}
            <div className="mt-9 max-w-md rounded-2xl bg-white/5 p-5">
              <div className="flex items-center justify-between text-sm">
                <span className="font-semibold text-white">
                  Round 1 slots filling fast
                </span>
                <span className="font-bold text-accent">{filled}%</span>
              </div>
              <div className="mt-3 h-2.5 w-full overflow-hidden rounded-full bg-white/10">
                <motion.div
                  className="h-full rounded-full bg-accent"
                  initial={{
                    width: '0%',
                  }}
                  animate={{
                    width: `${filled}%`,
                  }}
                  transition={{
                    duration: 1.1,
                    ease: 'easeOut',
                  }}
                />
              </div>
              <p className="mt-2 text-xs text-white/60">
                Units are strictly limited per round.
              </p>
            </div>
          </div>
          <motion.img
            initial={{
              opacity: 0,
              scale: 0.96,
            }}
            animate={{
              opacity: 1,
              scale: 1,
            }}
            transition={{
              duration: 0.6,
            }}
            src={MART_IMG}
            alt="Bulk retail commodities powering DigiMart co-ownership returns"
            className="w-full rounded-3xl border border-white/10 shadow-2xl"
          />
        </div>
      </section>

      {/* HOW IT WORKS */}
      <Section id="how">
        <SectionHeading
          eyebrow="How it works"
          title="We've eliminated the complexity of retail business"
          subtitle="You provide the capital; we do the heavy lifting."
        />
        <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {steps.map((s, i) => (
            <Reveal key={s.title} delay={i * 0.06}>
              <div className="relative h-full rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
                <span className="text-xs font-bold uppercase tracking-wider text-brand-light">
                  {s.step}
                </span>
                <div className="mt-3 flex h-12 w-12 items-center justify-center rounded-xl bg-brand-50 text-brand">
                  <s.icon className="h-6 w-6" />
                </div>
                <h3 className="mt-4 font-display text-lg font-bold text-brand-dark">
                  {s.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-gray-600">
                  {s.desc}
                </p>
              </div>
            </Reveal>
          ))}
        </div>
        <div className="mt-12">
          <UnitCalculator />
        </div>
      </Section>

      {/* SAFETY */}
      <Section className="bg-brand-50/60">
        <SectionHeading
          eyebrow="Why DigiMart is a safer bet"
          title="Secure, asset-backed passive income"
          subtitle="Unlike volatile crypto, unpredictable tech startups, or falling currency values, DigiMart is backed by physical, real-world commodities."
        />
        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {safety.map((s, i) => (
            <Reveal key={s.title} delay={i * 0.07}>
              <div className="h-full rounded-2xl bg-white p-7 shadow-sm">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand text-white">
                  <s.icon className="h-6 w-6" />
                </div>
                <h3 className="mt-5 font-display text-lg font-bold text-brand-dark">
                  {s.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-gray-600">
                  {s.desc}
                </p>
              </div>
            </Reveal>
          ))}
        </div>
      </Section>

      {/* FINAL CTA */}
      <Section>
        <Reveal>
          <div className="relative overflow-hidden rounded-3xl bg-brand-dark px-8 py-14 text-center text-white lg:px-16">
            <div className="mx-auto flex max-w-2xl flex-col items-center">
              <div className="flex items-center gap-2 text-accent">
                <ClockIcon className="h-5 w-5" />
                <span className="text-sm font-bold uppercase tracking-wider">
                  Units are strictly limited
                </span>
              </div>
              <h2 className="mt-4 font-display text-3xl font-extrabold sm:text-4xl">
                Don't let inflation eat up your savings.
              </h2>
              <p className="mt-4 text-white/80">
                Put your money to work in a market sector that never sleeps.
              </p>
              <div className="mt-8">
                <Button to="/register" variant="accent" size="lg">
                  Secure Your DigiMart Units Today{' '}
                  <ArrowRightIcon className="h-5 w-5" />
                </Button>
              </div>
            </div>
          </div>
        </Reveal>
      </Section>
    </>
  )
}
