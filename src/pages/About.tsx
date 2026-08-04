import React from 'react'
import {
  TargetIcon,
  EyeIcon,
  HeartHandshakeIcon,
  ShieldCheckIcon,
} from 'lucide-react'
import { Section, SectionHeading } from '../components/ui/Section'
import { Reveal } from '../components/ui/Reveal'
import { Button } from '../components/ui/Button'
import { BRAND } from '../lib/brand'
const HERO_IMG =
  'https://cdn.magicpatterns.com/patterns/generated-images/cf257d1d-4429-4e18-bc46-dd422ba9ed54.jpg'
const values = [
  {
    icon: ShieldCheckIcon,
    title: 'Trust',
    desc: 'Every naira is tracked, protected and paid out on time.',
  },
  {
    icon: HeartHandshakeIcon,
    title: 'Community',
    desc: 'We grow together — savers, referrers and investors alike.',
  },
  {
    icon: TargetIcon,
    title: 'Consistency',
    desc: 'Small, steady steps compound into life-changing rewards.',
  },
]
const stats = [
  {
    value: '10,000+',
    label: 'Active members',
  },
  {
    value: '₦500M+',
    label: 'Paid out to savers',
  },
  {
    value: '100%',
    label: 'Double-up match',
  },
  {
    value: '50%',
    label: 'Retail yield / year',
  },
]
export function About() {
  return (
    <>
      <section className="relative overflow-hidden bg-brand-dark text-white">
        <div className="relative mx-auto grid max-w-7xl items-center gap-12 px-5 py-16 lg:grid-cols-2 lg:px-8 lg:py-24">
          <div>
            <span className="inline-block rounded-full bg-white/10 px-3 py-1.5 text-xs font-semibold text-accent">
              About DigiAjo Global
            </span>
            <h1 className="mt-5 font-display text-4xl font-extrabold leading-tight tracking-tight sm:text-5xl">
              Redefining savings, empowering lives.
            </h1>
            <p className="mt-5 max-w-xl text-base leading-relaxed text-white/75 sm:text-lg">
              DigiAjo Global modernises the trusted Nigerian tradition of Ajo.
              We blend disciplined community savings with digital security and
              asset-backed retail investment — so your money grows with
              confidence.
            </p>
          </div>
          <Reveal>
            <img
              src={HERO_IMG}
              alt="The DigiAjo community"
              className="w-full rounded-3xl shadow-2xl"
            />
          </Reveal>
        </div>
      </section>

      <Section>
        <div className="grid gap-6 md:grid-cols-2">
          <Reveal>
            <div className="h-full rounded-2xl border border-gray-100 bg-white p-8 shadow-sm">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-50 text-brand">
                <TargetIcon className="h-6 w-6" />
              </div>
              <h2 className="mt-5 font-display text-2xl font-bold text-brand-dark">
                Our Mission
              </h2>
              <p className="mt-3 leading-relaxed text-gray-600">
                To make consistent saving rewarding and accessible for every
                Nigerian — turning everyday discipline into real financial
                freedom.
              </p>
            </div>
          </Reveal>
          <Reveal delay={0.08}>
            <div className="h-full rounded-2xl border border-gray-100 bg-white p-8 shadow-sm">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-50 text-brand">
                <EyeIcon className="h-6 w-6" />
              </div>
              <h2 className="mt-5 font-display text-2xl font-bold text-brand-dark">
                Our Vision
              </h2>
              <p className="mt-3 leading-relaxed text-gray-600">
                To be Africa's most trusted digital savings and co-ownership
                platform, empowering millions to build wealth together.
              </p>
            </div>
          </Reveal>
        </div>
      </Section>

      <Section className="bg-brand-dark py-14 text-white">
        <div className="grid grid-cols-2 gap-8 lg:grid-cols-4">
          {stats.map((s, i) => (
            <Reveal key={s.label} delay={i * 0.06} className="text-center">
              <p className="font-display text-4xl font-extrabold text-accent">
                {s.value}
              </p>
              <p className="mt-1 text-sm text-white/70">{s.label}</p>
            </Reveal>
          ))}
        </div>
      </Section>

      <Section>
        <SectionHeading eyebrow="Our values" title="What we stand for" />
        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {values.map((v, i) => (
            <Reveal key={v.title} delay={i * 0.07}>
              <div className="h-full rounded-2xl bg-brand-50/60 p-7">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand text-white">
                  <v.icon className="h-6 w-6" />
                </div>
                <h3 className="mt-5 font-display text-lg font-bold text-brand-dark">
                  {v.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-gray-600">
                  {v.desc}
                </p>
              </div>
            </Reveal>
          ))}
        </div>
      </Section>

      <Section className="pt-0">
        <Reveal>
          <div className="rounded-3xl bg-brand p-10 text-center text-white">
            <h2 className="font-display text-3xl font-extrabold">
              Join the DigiAjo family today
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-white/80">
              Visit us at {BRAND.address}
            </p>
            <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
              <Button to="/register" variant="accent" size="lg">
                Start Saving Now
              </Button>
              <Button to="/contact" variant="white" size="lg">
                Contact Us
              </Button>
            </div>
          </div>
        </Reveal>
      </Section>
    </>
  )
}
