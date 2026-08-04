import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDownIcon } from 'lucide-react'
import { Section, SectionHeading } from '../components/ui/Section'
import { Reveal } from '../components/ui/Reveal'
import { Button } from '../components/ui/Button'
import { BRAND } from '../lib/brand'
const faqs = [
  {
    q: 'How much do I need to start with Double Up?',
    a: 'A one-time, non-refundable registration fee of ₦2,000, then ₦1,300 saved every Saturday for 50 weeks per account.',
  },
  {
    q: 'What do I receive at the end of 50 weeks?',
    a: 'You cash out ₦130,000 (a 100% match on your ₦65,000 saved) plus bonus grocery food items.',
  },
  {
    q: 'Can I open more than one savings account?',
    a: 'Yes. Pay the ₦2,000 registration fee once and open multiple accounts to multiply your payouts.',
  },
  {
    q: 'What happens if I miss a week?',
    a: 'Missing a week attracts a 100% fine (₦1,300 per missed week). Accounts with 4 or more missed weeks are suspended, and if outstanding savings and fines are not cleared by week 50, you are cashed out only what you saved — forfeiting the double-up match and food rewards.',
  },
  {
    q: 'How does the referral program pay?',
    a: 'You earn ₦1,000 cash for every successful referral, paid every Friday. Hit every accumulative 10 referrals and receive ₦10,000 worth of grocery items, distributed on the last Friday of the month.',
  },
  {
    q: 'How does DigiMart Co-ownership work?',
    a: 'Buy units at ₦100,000 each. We pool the capital into fast-moving consumer goods and retail distribution, and you earn up to 50% over 12 months. Every unit comes with a legally binding Investment Certificate.',
  },
  {
    q: 'Is DigiMart safe?',
    a: 'Your investment is backed by physical, real-world commodities — essential food and household provisions with high daily turnover. We handle all operations, so there is zero stress on your end.',
  },
  {
    q: 'Is DigiAjo Global a real, verifiable company?',
    a: `Yes. Our head office is located at ${BRAND.address} You can reach our WhatsApp customer care on ${BRAND.whatsappNumbers.join(' or ')}.`,
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
