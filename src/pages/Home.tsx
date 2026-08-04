import React from 'react'
import { motion } from 'framer-motion'
import {
  ArrowRightIcon,
  PiggyBankIcon,
  ShoppingBasketIcon,
  ShieldCheckIcon,
  UsersIcon,
  TrendingUpIcon,
  CheckCircle2Icon,
  MessageCircleIcon,
  TruckIcon,
} from 'lucide-react'
import { Button } from '../components/ui/Button'
import { Section, SectionHeading } from '../components/ui/Section'
import { Reveal } from '../components/ui/Reveal'
import { BRAND } from '../lib/brand'
const HERO_IMG =
  'https://cdn.magicpatterns.com/patterns/generated-images/6d6da8ce-cf48-4af6-b0c3-3b3c417691f6.jpg'
const MART_IMG =
  'https://cdn.magicpatterns.com/patterns/generated-images/2724df0d-21b7-4cf8-98cc-7f92b19ddb8d.jpg'
const EGG_IMG =
  'https://images.unsplash.com/photo-1582722872445-44dc5f7e3c8f?w=800&q=80'
const trust = [
  {
    icon: ShieldCheckIcon,
    label: 'Asset-backed & secure',
  },
  {
    icon: UsersIcon,
    label: '10,000+ savers & investors',
  },
  {
    icon: CheckCircle2Icon,
    label: 'Instant, reliable payouts',
  },
]

const SLIDER_IMAGES = [
  '/images/slider/food_slide1.jpg',
  '/images/slider/food_slide2.jpg',
  '/images/slider/food_slide3.jpg',
]

function HeroSlider() {
  const [index, setIndex] = React.useState(0)

  React.useEffect(() => {
    const timer = setInterval(() => {
      setIndex((prev) => (prev + 1) % SLIDER_IMAGES.length)
    }, 4000)
    return () => clearInterval(timer)
  }, [])

  return (
    <div className="relative w-full overflow-hidden rounded-3xl border border-white/10 shadow-2xl aspect-[4/3] bg-gray-50">
      {SLIDER_IMAGES.map((img, i) => (
        <motion.img
          key={img}
          src={img}
          alt={`DigiAjo Hero Slide ${i + 1}`}
          className="absolute inset-0 h-full w-full object-cover"
          initial={{ opacity: 0 }}
          animate={{ opacity: i === index ? 1 : 0 }}
          transition={{ duration: 0.8 }}
        />
      ))}
      {/* Dots */}
      <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-2 z-10">
        {SLIDER_IMAGES.map((_, i) => (
          <button
            key={i}
            className={`h-2 rounded-full transition-all ${i === index ? 'w-6 bg-white shadow' : 'w-2 bg-white/50 hover:bg-white/70'}`}
            onClick={() => setIndex(i)}
            aria-label={`Go to slide ${i + 1}`}
          />
        ))}
      </div>
    </div>
  )
}
export function Home() {
  return (
    <>
      {/* HERO */}
      <section className="relative overflow-hidden bg-brand-dark text-white">
        <div className="absolute inset-0 opacity-[0.06]" aria-hidden>
          <div className="h-full w-full bg-[radial-gradient(circle_at_1px_1px,white_1px,transparent_0)] [background-size:22px_22px]" />
        </div>
        <div className="relative mx-auto grid max-w-7xl items-center gap-12 px-5 py-16 lg:grid-cols-2 lg:px-8 lg:py-24">
          <div>
            <motion.span
              initial={{
                opacity: 0,
                y: 12,
              }}
              animate={{
                opacity: 1,
                y: 0,
              }}
              className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-semibold text-accent"
            >
              <span className="h-2 w-2 animate-pulse rounded-full bg-accent" />
              Trusted digital savings, powered by consistency
            </motion.span>

            <motion.h1
              initial={{
                opacity: 0,
                y: 20,
              }}
              animate={{
                opacity: 1,
                y: 0,
              }}
              transition={{
                delay: 0.05,
              }}
              className="mt-5 font-display text-4xl font-extrabold leading-[1.08] tracking-tight sm:text-5xl lg:text-[3.4rem]"
            >
              Turn <span className="text-accent">₦1,300</span> Weekly Into{' '}
              <span className="text-accent">₦130,000</span> Cash + Free Food
              Items!
            </motion.h1>

            <motion.p
              initial={{
                opacity: 0,
                y: 20,
              }}
              animate={{
                opacity: 1,
                y: 0,
              }}
              transition={{
                delay: 0.12,
              }}
              className="mt-5 max-w-xl text-base leading-relaxed text-white/75 sm:text-lg"
            >
              Welcome to DigiAjo Double Up — the secure digital savings platform
              built to reward your consistency. Save smart, unlock a 100% profit
              match, and secure your financial future today.
            </motion.p>

            <motion.div
              initial={{
                opacity: 0,
                y: 20,
              }}
              animate={{
                opacity: 1,
                y: 0,
              }}
              transition={{
                delay: 0.18,
              }}
              className="mt-8 flex flex-col gap-3 sm:flex-row"
            >
              <Button to="/register" variant="accent" size="lg">
                Register Now ({BRAND.registrationFee}){' '}
                <ArrowRightIcon className="h-5 w-5" />
              </Button>
              <Button href={BRAND.whatsappLink} variant="white" size="lg">
                <MessageCircleIcon className="h-5 w-5" /> Chat on WhatsApp
              </Button>
            </motion.div>

            <div className="mt-9 flex flex-wrap gap-x-6 gap-y-3">
              {trust.map((t) => (
                <div
                  key={t.label}
                  className="flex items-center gap-2 text-sm text-white/80"
                >
                  <t.icon className="h-5 w-5 text-accent" /> {t.label}
                </div>
              ))}
            </div>
          </div>

          <motion.div
            initial={{
              opacity: 0,
              scale: 0.96,
            }}
            animate={{
              opacity: 1,
              scale: 1,
            }}
            transition={{
              delay: 0.15,
              duration: 0.6,
            }}
            className="relative"
          >
            <HeroSlider />
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="absolute -bottom-5 -right-4 rounded-2xl bg-white p-4 shadow-xl sm:-right-6 border border-gray-100"
            >
              <p className="text-xs font-medium text-gray-500">
                100% Profit Match
              </p>
              <p className="font-display text-2xl font-extrabold text-brand">
                ₦130,000
              </p>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* TWO PRODUCTS */}
      <Section>
        <SectionHeading
          eyebrow="Three ways to grow"
          title="Choose the path that fits your goals"
          subtitle="Whether you want disciplined weekly savings, a hands-off retail investment, or fresh eggs at your door — DigiAjo has you covered."
        />
        <div className="mt-12 grid gap-6 lg:grid-cols-3">
          {[
            {
              icon: PiggyBankIcon,
              tag: 'Save weekly',
              title: 'DigiAjo Double Up Savings',
              desc: 'Save ₦1,300 every Saturday for 50 weeks and cash out ₦130,000 plus bonus food items — a guaranteed 100% match on your consistency.',
              points: [
                '100% profit match',
                'Bonus grocery rewards',
                'Referral commissions',
              ],
              to: '/double-up',
              cta: 'Explore Double Up',
              img: HERO_IMG,
            },
            {
              icon: ShoppingBasketIcon,
              tag: 'Invest once',
              title: 'DigiMart Co-ownership',
              desc: 'Buy retail co-ownership units at ₦100,000 each and earn up to 50% in 12 months — backed by physical, fast-moving consumer goods.',
              points: [
                'Asset-backed security',
                'Passive 12-month returns',
                'Legal certificate',
              ],
              to: '/digimart',
              cta: 'Explore DigiMart',
              img: MART_IMG,
            },
            {
              icon: TruckIcon,
              tag: 'Fresh delivery',
              title: 'DigiRide Fresh Egg Express',
              desc: 'Fresh farm eggs delivered to your home or business. A crate costs ₦4,000 — choose weekly or monthly supply. Free delivery on 5+ crates.',
              points: [
                'Trusted farm suppliers',
                'Reliable scheduled supply',
                'Subscription rewards',
              ],
              to: '/digiride',
              cta: 'Explore DigiRide',
              img: EGG_IMG,
            },
          ].map((p, i) => (
            <Reveal key={p.title} delay={i * 0.08}>
              <div className="group flex h-full flex-col overflow-hidden rounded-3xl border border-gray-100 bg-white shadow-sm transition-all hover:-translate-y-1 hover:shadow-xl">
                <div className="relative h-52 overflow-hidden">
                  <img
                    src={p.img}
                    alt=""
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  <span className="absolute left-4 top-4 rounded-full bg-white/90 px-3 py-1 text-xs font-bold text-brand-dark backdrop-blur">
                    {p.tag}
                  </span>
                </div>
                <div className="flex flex-1 flex-col p-7">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50">
                    <p.icon className="h-6 w-6 text-brand" />
                  </div>
                  <h3 className="mt-4 font-display text-xl font-bold text-brand-dark">
                    {p.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-gray-600">
                    {p.desc}
                  </p>
                  <ul className="mt-4 space-y-2">
                    {p.points.map((pt) => (
                      <li
                        key={pt}
                        className="flex items-center gap-2 text-sm text-gray-700"
                      >
                        <CheckCircle2Icon className="h-4 w-4 text-brand-light" />{' '}
                        {pt}
                      </li>
                    ))}
                  </ul>
                  <div className="mt-6 pt-2">
                    <Button to={p.to} variant="secondary">
                      {p.cta} <ArrowRightIcon className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </Section>

      {/* WHY TRUST */}
      <Section className="bg-brand-50/60">
        <SectionHeading
          eyebrow="Why DigiAjo Global"
          title="Built on trust, transparency & real rewards"
          subtitle="We combine the discipline of traditional Ajo with modern digital security and asset-backed returns."
        />
        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {[
            {
              icon: ShieldCheckIcon,
              title: 'Secure by design',
              desc: 'Your contributions are tracked, protected and reconciled digitally.',
            },
            {
              icon: TrendingUpIcon,
              title: 'Real returns',
              desc: '100% double-up on savings and up to 50% on retail co-ownership.',
            },
            {
              icon: UsersIcon,
              title: 'Community first',
              desc: 'Build your tribe, refer friends and earn weekly commissions.',
            },
            {
              icon: CheckCircle2Icon,
              title: 'Physical presence',
              desc: 'A verifiable Lagos head office and legally binding certificates.',
            },
          ].map((f, i) => (
            <Reveal key={f.title} delay={i * 0.06}>
              <div className="h-full rounded-2xl bg-white p-6 shadow-sm">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand text-white">
                  <f.icon className="h-6 w-6" />
                </div>
                <h3 className="mt-4 font-display text-lg font-bold text-brand-dark">
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

      {/* CTA */}
      <Section>
        <Reveal>
          <div className="relative overflow-hidden rounded-3xl bg-brand px-8 py-14 text-center text-white lg:px-16">
            <div className="absolute inset-0 opacity-10" aria-hidden>
              <div className="h-full w-full bg-[radial-gradient(circle_at_1px_1px,white_1px,transparent_0)] [background-size:20px_20px]" />
            </div>
            <div className="relative">
              <h2 className="font-display text-3xl font-extrabold sm:text-4xl">
                Ready to make your money work harder?
              </h2>
              <p className="mx-auto mt-4 max-w-2xl text-white/80">
                Join thousands of Nigerians building financial discipline and
                earning real rewards with DigiAjo Global.
              </p>
              <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
                <Button to="/register" variant="accent" size="lg">
                  Start Saving Now <ArrowRightIcon className="h-5 w-5" />
                </Button>
                <Button to="/digimart" variant="white" size="lg">
                  Invest with DigiMart
                </Button>
              </div>
            </div>
          </div>
        </Reveal>
      </Section>
    </>
  )
}
