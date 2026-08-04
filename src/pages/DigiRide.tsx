import React from 'react'
import { motion } from 'framer-motion'
import {
  ArrowRightIcon,
  CheckCircle2Icon,
  TruckIcon,
  StarIcon,
  UsersIcon,
  GiftIcon,
  PhoneIcon,
  ClockIcon,
  BadgeDollarSignIcon,
  ShieldCheckIcon,
  CalendarIcon,
  MapPinIcon,
} from 'lucide-react'
import { Button } from '../components/ui/Button'
import { Section, SectionHeading } from '../components/ui/Section'
import { Reveal } from '../components/ui/Reveal'
import { BRAND } from '../lib/brand'

const features = [
  { icon: CheckCircle2Icon, text: 'Fresh eggs from trusted suppliers' },
  { icon: CalendarIcon,     text: 'Reliable scheduled supply' },
  { icon: TruckIcon,        text: 'Free delivery on orders of five crates and above' },
  { icon: MapPinIcon,       text: 'Convenient collection options for smaller orders' },
  { icon: GiftIcon,         text: 'Subscription rewards and priority service' },
]

const plans = [
  {
    name: 'Family Plan',
    tag: '6+1',
    tagline: 'Pay for 6 months, get 7th free',
    color: 'bg-brand',
    textColor: 'text-white',
    desc: 'Subscribe and pay for 6 months, and receive your 7th month free.',
  },
  {
    name: 'Premium Plan',
    tag: '11+2',
    tagline: 'Pay for 11 months, get 2 free',
    color: 'bg-accent',
    textColor: 'text-brand-dark',
    desc: 'Subscribe and pay for 11 months, and receive 2 additional months free.',
  },
]

const clubBenefits = [
  'Guaranteed scheduled egg supply',
  'Free bonus month rewards',
  'Priority service',
  'Easier household or business budgeting',
  'Eligibility for selected DigiRide promotions and monthly raffle draws',
]

const partnerPerks = [
  { value: '₦100', label: 'Commission per qualifying crate' },
  { value: 'Weekly', label: 'Commission payments every Friday' },
  { value: 'Smartphone', label: 'Reward after 2,000 accumulated crates' },
  { value: '₦500,000', label: 'Reward cheque after 15,000 crates*' },
]

const howToOrder = [
  { step: '01', text: 'Choose your required number of crates.' },
  { step: '02', text: 'Select weekly or monthly supply.' },
  { step: '03', text: 'Choose delivery or an approved collection point.' },
  { step: '04', text: 'Complete payment and receive confirmation.' },
]

const investPlans = [
  {
    duration: '6 Months',
    profit: '20% profit',
    desc: 'Receive your capital + 20% profit at the end of 6 months.',
    accent: false,
  },
  {
    duration: '12 Months',
    profit: '50% profit',
    desc: 'Receive your capital + 50% profit at the end of 12 months.',
    accent: true,
  },
]

export function DigiRide() {
  return (
    <>
      {/* HERO */}
      <section className="relative overflow-hidden bg-brand-dark text-white">
        <div className="absolute inset-0 opacity-[0.06]" aria-hidden>
          <div className="h-full w-full bg-[radial-gradient(circle_at_1px_1px,white_1px,transparent_0)] [background-size:22px_22px]" />
        </div>
        <div className="relative mx-auto max-w-7xl px-5 py-16 lg:px-8 lg:py-24">
          <motion.span
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-semibold text-accent"
          >
            <span className="h-2 w-2 animate-pulse rounded-full bg-accent" />
            DigiRide Fresh Egg Express
          </motion.span>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.06 }}
            className="mt-5 font-display text-4xl font-extrabold leading-tight tracking-tight sm:text-5xl lg:text-[3.2rem]"
          >
            Fresh farm eggs at{' '}
            <span className="text-accent">affordable prices</span>
            {' '}— delivered conveniently
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.12 }}
            className="mt-5 max-w-2xl text-base leading-relaxed text-white/75 sm:text-lg"
          >
            DigiRide Fresh Egg Express supplies fresh eggs to homes, restaurants, bakeries, hotels,
            retailers and other food businesses. A crate costs{' '}
            <span className="font-bold text-accent">₦4,000</span>, and customers can choose a
            weekly or monthly supply schedule that suits their needs.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.18 }}
            className="mt-8 flex flex-col gap-3 sm:flex-row"
          >
            <Button href={BRAND.whatsappLink} variant="accent" size="lg">
              Order Now <ArrowRightIcon className="h-5 w-5" />
            </Button>
            <Button href={`tel:08078926739`} variant="white" size="lg">
              <PhoneIcon className="h-5 w-5" /> Call to Order
            </Button>
          </motion.div>

          {/* Feature pills */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="mt-10 flex flex-wrap gap-3"
          >
            {features.map((f) => (
              <div
                key={f.text}
                className="flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm text-white/90"
              >
                <f.icon className="h-4 w-4 text-accent shrink-0" />
                {f.text}
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* EGG CLUB */}
      <Section>
        <SectionHeading
          eyebrow="Join the DigiRide Egg Club"
          title="Secure your regular supply & save more"
          subtitle="The DigiRide Egg Club helps families and businesses secure a regular supply of fresh eggs, budget more effectively and enjoy free bonus months."
        />

        <div className="mt-12 grid gap-6 lg:grid-cols-2">
          {plans.map((plan, i) => (
            <Reveal key={plan.name} delay={i * 0.08}>
              <div className={`rounded-3xl p-8 ${plan.color} relative overflow-hidden`}>
                <div className="absolute -right-6 -top-6 h-32 w-32 rounded-full bg-white/10" />
                <div className="absolute -bottom-8 -left-4 h-24 w-24 rounded-full bg-white/5" />
                <div className="relative">
                  <span className={`inline-block rounded-full bg-white/20 px-4 py-1 text-xs font-bold ${plan.textColor}`}>
                    {plan.tag}
                  </span>
                  <h3 className={`mt-4 font-display text-2xl font-extrabold ${plan.textColor}`}>
                    {plan.name}
                  </h3>
                  <p className={`mt-1 text-sm font-semibold ${plan.textColor} opacity-80`}>
                    {plan.tagline}
                  </p>
                  <p className={`mt-3 text-sm leading-relaxed ${plan.textColor} opacity-75`}>
                    {plan.desc}
                  </p>
                  <p className={`mt-4 text-xs ${plan.textColor} opacity-70`}>
                    Subscribers may choose an agreed weekly or monthly quantity based on their household or business needs.
                  </p>
                </div>
              </div>
            </Reveal>
          ))}
        </div>

        {/* Club benefits */}
        <Reveal delay={0.1}>
          <div className="mt-10 rounded-3xl border border-brand/10 bg-brand-50/60 p-8">
            <h3 className="font-display text-lg font-bold text-brand-dark">Subscriber Benefits</h3>
            <ul className="mt-5 grid gap-3 sm:grid-cols-2">
              {clubBenefits.map((b) => (
                <li key={b} className="flex items-start gap-2 text-sm text-gray-700">
                  <CheckCircle2Icon className="mt-0.5 h-4 w-4 shrink-0 text-brand" />
                  {b}
                </li>
              ))}
            </ul>
          </div>
        </Reveal>
      </Section>

      {/* SUBSCRIPTION ADVANCE */}
      <Section className="bg-brand-dark text-white">
        <div className="mx-auto max-w-3xl text-center">
          <Reveal>
            <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-semibold text-accent">
              <BadgeDollarSignIcon className="h-4 w-4" /> Interest-Free Option
            </span>
            <h2 className="mt-5 font-display text-3xl font-extrabold sm:text-4xl">
              Need Help Paying Upfront?
            </h2>
            <p className="mt-4 text-white/75 leading-relaxed">
              Eligible applicants may use the{' '}
              <span className="font-semibold text-accent">DigiAjo Interest-Free Subscription Advance</span>{' '}
              to activate their egg subscription. Approved customers can repay the advance through daily
              or weekly savings within one month, according to the agreed repayment schedule.
            </p>
            <p className="mt-3 text-sm text-white/50">
              Approval is subject to verification and programme terms.
            </p>
            <div className="mt-8">
              <Button href={BRAND.whatsappLink} variant="accent" size="lg">
                Apply via WhatsApp <ArrowRightIcon className="h-5 w-5" />
              </Button>
            </div>
          </Reveal>
        </div>
      </Section>

      {/* COMMUNITY PARTNER */}
      <Section>
        <SectionHeading
          eyebrow="Become a Community Partner"
          title="Earn while you spread the word"
          subtitle="Introduce homes and businesses to DigiRide Fresh Egg Express and earn real rewards."
        />
        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {partnerPerks.map((p, i) => (
            <Reveal key={p.label} delay={i * 0.07}>
              <div className="rounded-2xl border border-gray-100 bg-white p-6 text-center shadow-sm">
                <p className="font-display text-2xl font-extrabold text-brand">{p.value}</p>
                <p className="mt-2 text-sm text-gray-600">{p.label}</p>
              </div>
            </Reveal>
          ))}
        </div>
        <p className="mt-4 text-center text-xs text-gray-400">
          * ₦500,000 reward cheque subject to programme terms.
        </p>
      </Section>

      {/* HOW TO ORDER */}
      <Section className="bg-brand-50/60">
        <SectionHeading
          eyebrow="How to Order"
          title="Four simple steps to fresh eggs"
          subtitle="Orders placed before 8:00 PM are processed for next-day delivery or collection, subject to availability."
        />
        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {howToOrder.map((h, i) => (
            <Reveal key={h.step} delay={i * 0.07}>
              <div className="flex flex-col items-center rounded-2xl bg-white p-6 text-center shadow-sm">
                <span className="font-display text-4xl font-extrabold text-brand/20">{h.step}</span>
                <p className="mt-3 text-sm text-gray-700 leading-relaxed">{h.text}</p>
              </div>
            </Reveal>
          ))}
        </div>

        <Reveal delay={0.2}>
          <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <Button href={BRAND.whatsappLink} variant="accent" size="lg">
              Order on WhatsApp <ArrowRightIcon className="h-5 w-5" />
            </Button>
            <Button href="tel:08078926739" variant="secondary" size="lg">
              <PhoneIcon className="h-5 w-5" /> 08078926739
            </Button>
          </div>
          <p className="mt-4 text-center font-display text-sm font-semibold text-brand-dark">
            🥚 Fresh Eggs. Better Prices. Reliable Supply.
          </p>
        </Reveal>
      </Section>

      {/* OWN A UNIT */}
      <Section>
        <SectionHeading
          eyebrow="Investment Opportunity"
          title="Own a Unit of DigiRide Fresh Egg Express"
          subtitle="Become a partner by owning a DigiRide Fresh Egg Express Unit for ₦100,000 and share in the growth of our expanding egg distribution network."
        />

        <div className="mt-12 grid gap-6 lg:grid-cols-2">
          {investPlans.map((p, i) => (
            <Reveal key={p.duration} delay={i * 0.08}>
              <div className={`relative overflow-hidden rounded-3xl p-8 ${p.accent ? 'bg-brand text-white' : 'border border-gray-100 bg-white shadow-sm'}`}>
                {p.accent && (
                  <>
                    <div className="absolute -right-6 -top-6 h-32 w-32 rounded-full bg-white/10" />
                    <div className="absolute -bottom-8 -left-4 h-24 w-24 rounded-full bg-white/5" />
                  </>
                )}
                <div className="relative">
                  {p.accent && (
                    <span className="mb-4 inline-block rounded-full bg-accent px-3 py-1 text-xs font-bold text-brand-dark">
                      Best Returns
                    </span>
                  )}
                  <h3 className={`font-display text-2xl font-extrabold ${p.accent ? 'text-white' : 'text-brand-dark'}`}>
                    {p.duration}
                  </h3>
                  <p className={`mt-1 text-3xl font-extrabold ${p.accent ? 'text-accent' : 'text-brand'}`}>
                    {p.profit}
                  </p>
                  <p className={`mt-3 text-sm leading-relaxed ${p.accent ? 'text-white/75' : 'text-gray-600'}`}>
                    {p.desc}
                  </p>
                </div>
              </div>
            </Reveal>
          ))}
        </div>

        {/* Referral reward */}
        <Reveal delay={0.15}>
          <div className="mt-8 rounded-3xl bg-accent/10 border border-accent/20 p-8">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-accent">
                <UsersIcon className="h-6 w-6 text-brand-dark" />
              </div>
              <div>
                <h3 className="font-display text-lg font-bold text-brand-dark">Referral Reward</h3>
                <p className="mt-1 text-sm text-gray-600">
                  Refer a new Unit Partner and earn an instant{' '}
                  <span className="font-bold text-brand">5% referral commission</span>, paid within
                  24 hours of successful payment.
                </p>
              </div>
            </div>
          </div>
        </Reveal>
      </Section>

      {/* FINAL CTA */}
      <Section>
        <Reveal>
          <div className="relative overflow-hidden rounded-3xl bg-brand px-8 py-14 text-center text-white lg:px-16">
            <div className="absolute inset-0 opacity-10" aria-hidden>
              <div className="h-full w-full bg-[radial-gradient(circle_at_1px_1px,white_1px,transparent_0)] [background-size:20px_20px]" />
            </div>
            <div className="relative">
              <h2 className="font-display text-3xl font-extrabold sm:text-4xl">
                Start with just ₦100,000 today
              </h2>
              <p className="mx-auto mt-4 max-w-2xl text-white/80">
                Become part of the DigiRide Fresh Egg Express success story.
              </p>
              <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
                <Button href={BRAND.whatsappLink} variant="accent" size="lg">
                  WhatsApp: 08078926739 <ArrowRightIcon className="h-5 w-5" />
                </Button>
              </div>
              <div className="mt-6 flex flex-col items-center gap-1 text-sm text-white/60">
                <p>📸 Instagram: @Digiajoglobal</p>
                <p>📍 {BRAND.address}</p>
              </div>
            </div>
          </div>
        </Reveal>
      </Section>
    </>
  )
}
