import React from 'react'
import { motion } from 'framer-motion'
import {
  ArrowRightIcon,
  MessageCircleIcon,
  LayersIcon,
  CalendarClockIcon,
  UsersIcon,
  GiftIcon,
  CoinsIcon,
  AlertTriangleIcon,
  ClockIcon,
  BanIcon,
  UserPlusIcon,
  WalletIcon,
  TrophyIcon,
} from 'lucide-react'
import { Button } from '../components/ui/Button'
import { Section, SectionHeading } from '../components/ui/Section'
import { Reveal } from '../components/ui/Reveal'
import { DoubleUpCalculator } from '../components/features/DoubleUpCalculator'
import { BRAND } from '../lib/brand'
const HERO_IMG =
  'https://cdn.magicpatterns.com/patterns/generated-images/6d6da8ce-cf48-4af6-b0c3-3b3c417691f6.jpg'
const COMMUNITY_IMG =
  'https://cdn.magicpatterns.com/patterns/generated-images/cf257d1d-4429-4e18-bc46-dd422ba9ed54.jpg'
const FOOD_IMG =
  'https://cdn.magicpatterns.com/patterns/generated-images/a4cf9ef9-6947-451d-9573-cda9a420df73.jpg'
const features = [
  {
    icon: LayersIcon,
    title: 'Multiple Accounts, One Fee',
    desc: 'Pay your ₦2,000 registration fee once and open multiple savings accounts to multiply your payouts.',
  },
  {
    icon: CalendarClockIcon,
    title: 'Perfect for Busy Earners',
    desc: 'Salary earner or busy entrepreneur? Pay for multiple weeks or months in advance to stay on track effortlessly.',
  },
  {
    icon: UsersIcon,
    title: 'Build Your Own Tribe',
    desc: 'Create your own DigiAjo WhatsApp community right from our platform, invite friends, and grow your network together.',
  },
]
const rules = [
  {
    icon: ClockIcon,
    title: 'The Saturday Deadline',
    desc: 'All weekly ₦1,300 contributions must be deposited by 11:59 p.m. every Saturday.',
  },
  {
    icon: AlertTriangleIcon,
    title: 'Missed Weeks & Fines',
    desc: 'Missing a week attracts a 100% fine — a ₦1,300 fine per missed week.',
  },
  {
    icon: BanIcon,
    title: 'Suspension Clause',
    desc: 'Accounts with 4+ missed weeks are suspended. If outstanding savings and fines are not cleared by week 50, you are cashed out only what you saved — forfeiting the double-up match and food rewards.',
  },
]
const steps = [
  {
    icon: UserPlusIcon,
    step: '01',
    title: 'Register',
    desc: 'Click any "Register Now" button and pay the one-time, non-refundable fee of ₦2,000.',
  },
  {
    icon: WalletIcon,
    step: '02',
    title: 'Save',
    desc: 'Securely automate or manually deposit your ₦1,300 every Saturday.',
  },
  {
    icon: TrophyIcon,
    step: '03',
    title: 'Double Up',
    desc: 'Complete your 50 weeks and cash out your ₦130,000 plus food rewards!',
  },
]
export function DoubleUp() {
  return (
    <>
      {/* HERO */}
      <section className="relative overflow-hidden bg-brand-dark text-white">
        <div className="relative mx-auto grid max-w-7xl items-center gap-12 px-5 py-16 lg:grid-cols-[1.1fr_1fr] lg:px-8 lg:py-24">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-semibold text-accent">
              DigiAjo Double Up Savings
            </span>
            <h1 className="mt-5 font-display text-4xl font-extrabold leading-[1.08] tracking-tight sm:text-5xl">
              Turn <span className="text-accent">₦1,300</span> Weekly Into{' '}
              <span className="text-accent">₦130,000</span> Cash + Free Food
              Items!
            </h1>
            <p className="mt-5 max-w-xl text-base leading-relaxed text-white/75 sm:text-lg">
              The secure digital savings platform built to reward your
              consistency. Save smart, unlock a 100% profit match, and secure
              your financial future today.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button to="/register" variant="accent" size="lg">
                Register Now ({BRAND.registrationFee}){' '}
                <ArrowRightIcon className="h-5 w-5" />
              </Button>
              <Button href={BRAND.whatsappLink} variant="white" size="lg">
                <MessageCircleIcon className="h-5 w-5" /> Chat with an Agent
              </Button>
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
            src={HERO_IMG}
            alt="A DigiAjo saver celebrating with naira cash and grocery rewards"
            className="w-full rounded-3xl border border-white/10 shadow-2xl"
          />
        </div>
      </section>

      {/* CALCULATOR */}
      <Section id="calculator">
        <SectionHeading
          eyebrow="How the Double Up plan works"
          title="The exact math behind your payout"
          subtitle="No hidden fine print. Here's precisely what you save and what you get back."
        />
        <div className="mt-12">
          <DoubleUpCalculator />
        </div>
      </Section>

      {/* FEATURES */}
      <Section id="how" className="bg-brand-50/60">
        <SectionHeading
          eyebrow="Features & flexibility"
          title="Why choose DigiAjo Global?"
        />
        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {features.map((f, i) => (
            <Reveal key={f.title} delay={i * 0.07}>
              <div className="h-full rounded-2xl bg-white p-7 shadow-sm">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand text-white">
                  <f.icon className="h-6 w-6" />
                </div>
                <h3 className="mt-5 font-display text-lg font-bold text-brand-dark">
                  {f.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-gray-600">
                  {f.desc}
                </p>
              </div>
            </Reveal>
          ))}
        </div>
      </Section>

      {/* REFERRAL */}
      <Section id="referral">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <Reveal>
            <img
              src={COMMUNITY_IMG}
              alt="A DigiAjo referral community sharing financial growth"
              className="w-full rounded-3xl shadow-lg"
            />
          </Reveal>
          <div>
            <SectionHeading
              align="left"
              eyebrow="Referral & rewards"
              title="Share the financial growth & get paid instantly!"
              subtitle="You don't just save with DigiAjo — you can earn weekly bonuses by inviting others."
            />
            <div className="mt-8 space-y-4">
              <Reveal>
                <div className="flex items-start gap-4 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-accent/15 text-accent-dark">
                    <CoinsIcon className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="font-display text-lg font-bold text-brand-dark">
                      Instant Commission
                    </h3>
                    <p className="mt-1 text-sm text-gray-600">
                      Earn{' '}
                      <span className="font-semibold text-brand-dark">
                        ₦1,000 cash
                      </span>{' '}
                      for every successful referral — paid directly to you every
                      single Friday.
                    </p>
                  </div>
                </div>
              </Reveal>
              <Reveal delay={0.08}>
                <div className="flex items-start gap-4 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand">
                    <GiftIcon className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="font-display text-lg font-bold text-brand-dark">
                      Milestone Bonuses
                    </h3>
                    <p className="mt-1 text-sm text-gray-600">
                      Hit every accumulative{' '}
                      <span className="font-semibold text-brand-dark">
                        10 referrals
                      </span>{' '}
                      and get ₦10,000 worth of grocery food items — keep hitting
                      10s and keep getting abundant food (distributed every last
                      Friday of the month).
                    </p>
                  </div>
                </div>
              </Reveal>
            </div>
          </div>
        </div>
      </Section>

      {/* RULES & POLICY */}
      <Section className="bg-brand-dark text-white">
        <SectionHeading
          invert
          eyebrow="Savings Structure, Double-Up Reward & Default Policy"
          title="DigiAjo Double Up Savings Rules"
          subtitle="Designed to help members build a consistent savings habit while rewarding commitment and discipline."
        />
        
        <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <Reveal delay={0.05}>
            <div className="flex h-full flex-col rounded-2xl border border-white/10 bg-white/5 p-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent/20 text-accent">
                <ClockIcon className="h-6 w-6" />
              </div>
              <h3 className="mt-4 font-display text-lg font-bold text-white">
                Payment Deadline
              </h3>
              <p className="mt-2 text-xs font-semibold uppercase tracking-wider text-accent">
                11:59 PM Every Saturday
              </p>
              <p className="mt-2 text-sm leading-relaxed text-white/75">
                All weekly contributions must be completed on or before 11:59 p.m. every Saturday. Once 12:00 a.m. Sunday arrives, any unpaid contribution is considered a default.
              </p>
            </div>
          </Reveal>

          <Reveal delay={0.1}>
            <div className="flex h-full flex-col rounded-2xl border border-white/10 bg-white/5 p-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-orange-400/20 text-orange-400">
                <AlertTriangleIcon className="h-6 w-6" />
              </div>
              <h3 className="mt-4 font-display text-lg font-bold text-white">
                100% Default Penalty
              </h3>
              <p className="mt-2 text-xs font-semibold uppercase tracking-wider text-orange-400">
                Contribution Is Doubled
              </p>
              <p className="mt-2 text-sm leading-relaxed text-white/75">
                Any missed weekly contribution attracts a 100% penalty. Single Hand (₦1,300 + ₦1,300 = ₦2,600 to clear). 10 Hands (₦13,000 + ₦13,000 = ₦26,000 to clear).
              </p>
            </div>
          </Reveal>

          <Reveal delay={0.15}>
            <div className="flex h-full flex-col rounded-2xl border border-white/10 bg-white/5 p-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-red-400/20 text-red-400">
                <BanIcon className="h-6 w-6" />
              </div>
              <h3 className="mt-4 font-display text-lg font-bold text-white">
                Account Suspension
              </h3>
              <p className="mt-2 text-xs font-semibold uppercase tracking-wider text-red-400">
                4 Consecutive Weeks
              </p>
              <p className="mt-2 text-sm leading-relaxed text-white/75">
                If a member defaults for up to 4 consecutive weeks, the account is automatically suspended and becomes inactive until reviewed.
              </p>
            </div>
          </Reveal>

          <Reveal delay={0.2}>
            <div className="flex h-full flex-col rounded-2xl border border-white/10 bg-white/5 p-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent/20 text-accent">
                <TrophyIcon className="h-6 w-6" />
              </div>
              <h3 className="mt-4 font-display text-lg font-bold text-white">
                Double-Up Principle
              </h3>
              <p className="mt-2 text-xs font-semibold uppercase tracking-wider text-accent">
                Commitment & Discipline
              </p>
              <p className="mt-2 text-sm leading-relaxed text-white/75">
                At the end of the 50-week cycle, completed accounts receive 100% Double-Up matching. Suspended accounts forfeit bonuses and receive principal refunds only.
              </p>
            </div>
          </Reveal>
        </div>

        <Reveal className="mt-10 rounded-2xl border border-accent/20 bg-accent/10 p-6 text-center">
          <h4 className="font-display text-xl font-bold text-accent">
            Save Consistently. Complete Your Journey. Enjoy Your Reward.
          </h4>
          <p className="mt-1 text-sm text-white/80">
            DIGIAJO — Redefining Savings. Empowering Lives.
          </p>
        </Reveal>
      </Section>

      {/* ONBOARDING */}
      <Section id="onboarding">
        <SectionHeading
          eyebrow="Simple 3-step onboarding"
          title="Get started in less than 3 minutes"
        />
        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {steps.map((s, i) => (
            <Reveal key={s.step} delay={i * 0.08}>
              <div className="relative h-full rounded-2xl border border-gray-100 bg-white p-7 shadow-sm">
                <span className="font-display text-5xl font-extrabold text-brand-50">
                  {s.step}
                </span>
                <div className="-mt-6 flex h-12 w-12 items-center justify-center rounded-xl bg-brand text-white">
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
      </Section>

      {/* FINAL CTA */}
      <Section className="pt-0">
        <Reveal>
          <div className="grid items-center gap-8 overflow-hidden rounded-3xl bg-brand p-8 text-white lg:grid-cols-[1.4fr_1fr] lg:p-12">
            <div>
              <h2 className="font-display text-3xl font-extrabold sm:text-4xl">
                Your ₦130,000 payout starts with one Saturday.
              </h2>
              <p className="mt-4 max-w-xl text-white/80">
                Register today, save consistently, and let DigiAjo double up
                your discipline.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Button to="/register" variant="accent" size="lg">
                  Register Now ({BRAND.registrationFee})
                </Button>
                <Button href={BRAND.whatsappLink} variant="white" size="lg">
                  <MessageCircleIcon className="h-5 w-5" /> Chat with an Agent
                </Button>
              </div>
            </div>
            <img
              src={FOOD_IMG}
              alt="Bonus grocery food reward bundle"
              className="mx-auto w-56 drop-shadow-xl"
            />
          </div>
        </Reveal>
      </Section>
    </>
  )
}
