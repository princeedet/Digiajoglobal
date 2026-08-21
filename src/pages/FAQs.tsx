import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDownIcon } from 'lucide-react'
import { Section, SectionHeading } from '../components/ui/Section'
import { Reveal } from '../components/ui/Reveal'
import { Button } from '../components/ui/Button'
import { BRAND } from '../lib/brand'
const faqs = [
  {
    q: 'How much do I need to start with the DigiAjo Double Up Plan?',
    a: 'Every member begins by paying a one-time registration fee of ₦2,000. After registration, you choose your savings capacity: Single Hand (₦1,300 every Saturday) or Multiple Hands (e.g., 10 hands = ₦13,000 every Saturday).',
  },
  {
    q: 'What is the savings period and Double-Up Reward calculation?',
    a: 'The saving period is 50 weeks. For a Single Hand: ₦1,300 × 50 weeks = ₦65,000 saved, which becomes ₦130,000 through the DigiAjo Double-Up Reward. For 10 Hands: ₦13,000 × 50 weeks = ₦650,000, which becomes ₦1,300,000 upon successful completion.',
  },
  {
    q: 'What is the weekly payment deadline?',
    a: 'All weekly contributions must be completed on or before 11:59 p.m. every Saturday. Once the deadline passes and it becomes 12:00 a.m. Sunday, any unpaid contribution is considered a default.',
  },
  {
    q: 'What is the Default Penalty for missing a Saturday contribution?',
    a: 'Any missed weekly contribution attracts a 100% Default Penalty (the missed contribution amount is doubled). For Single Hand: ₦1,300 contribution + ₦1,300 default penalty = ₦2,600 total required to clear default. For 10 Hands: ₦13,000 contribution + ₦13,000 default penalty = ₦26,000 total required to clear default.',
  },
  {
    q: 'What is the Account Suspension Policy?',
    a: 'If a member defaults for up to 4 consecutive weeks, the account will automatically be suspended. The account becomes inactive and the member cannot continue normal savings activities until reviewed.',
  },
  {
    q: 'What happens to a Suspended Account at the end of the 50-week cycle?',
    a: 'A suspended account remains inactive until the end of the cycle. Where a member fails to resolve defaults, at the end of the cycle period only the member’s actual savings contributions will be paid. The Double-Up Reward will not apply, and no additional reward or bonus will be attached.',
  },
  {
    q: 'How does the DigiAjo referral program work?',
    a: 'You earn ₦1,000 cash for every successful referral, paid directly every Friday. Hit every accumulative 10 referrals and receive ₦10,000 worth of grocery food items, distributed on the last Friday of the month.',
  },
  {
    q: 'How does DigiMart Co-ownership work?',
    a: 'Buy co-ownership units at ₦100,000 each backed by retail distribution & supermarkets. Earn up to 50% ROI over 12 months with a legally binding Investment Certificate.',
  },
]
function FaqItem({ q, a, index }: { q: string; a: string; index: number }) {
  const [open, setOpen] = useState(index === 0)
  return (
    <Reveal delay={index * 0.04}>
      <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
        <button
          onClick={() => setOpen((v) => !v)}
          className="flex w-full items-center justify-between gap-4 px-6 py-5 text-left"
          aria-expanded={open}
        >
          <span className="font-display text-base font-bold text-brand-dark">
            {q}
          </span>
          <ChevronDownIcon
            className={`h-5 w-5 shrink-0 text-brand transition-transform ${open ? 'rotate-180' : ''}`}
          />
        </button>
        <AnimatePresence initial={false}>
          {open && (
            <motion.div
              initial={{
                height: 0,
                opacity: 0,
              }}
              animate={{
                height: 'auto',
                opacity: 1,
              }}
              exit={{
                height: 0,
                opacity: 0,
              }}
              transition={{
                duration: 0.25,
              }}
            >
              <p className="px-6 pb-5 text-sm leading-relaxed text-gray-600">
                {a}
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </Reveal>
  )
}
export function FAQs() {
  return (
    <>
      <section className="bg-brand-dark py-16 text-white lg:py-20">
        <div className="mx-auto max-w-3xl px-5 text-center lg:px-8">
          <span className="inline-block rounded-full bg-white/10 px-3 py-1.5 text-xs font-semibold text-accent">
            Frequently asked questions
          </span>
          <h1 className="mt-5 font-display text-4xl font-extrabold tracking-tight sm:text-5xl">
            Everything you need to know
          </h1>
          <p className="mt-4 text-white/75">
            Clear answers about saving, earning and investing with DigiAjo
            Global.
          </p>
        </div>
      </section>

      <Section>
        <div className="mx-auto max-w-3xl space-y-4">
          {faqs.map((f, i) => (
            <FaqItem key={f.q} q={f.q} a={f.a} index={i} />
          ))}
        </div>
        <Reveal className="mx-auto mt-12 max-w-3xl">
          <div className="rounded-3xl bg-brand-50/70 p-8 text-center">
            <h2 className="font-display text-xl font-bold text-brand-dark">
              Still have questions?
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              Our agents are ready to help you on WhatsApp.
            </p>
            <div className="mt-5 flex flex-col justify-center gap-3 sm:flex-row">
              <Button href={BRAND.whatsappLink} variant="primary">
                Chat with an Agent
              </Button>
              <Button to="/contact" variant="outline">
                Contact Us
              </Button>
            </div>
          </div>
        </Reveal>
      </Section>
    </>
  )
}
