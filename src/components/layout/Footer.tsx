import React from 'react'
import { Link } from 'react-router-dom'
import {
  MapPinIcon,
  PhoneIcon,
  ShieldCheckIcon,
  BadgeCheckIcon,
} from 'lucide-react'
import { Logo } from '../ui/Logo'
import { BRAND } from '../../lib/brand'
const columns = [
  {
    title: 'Products',
    links: [
      {
        label: 'Double Up Savings',
        to: '/double-up',
      },
      {
        label: 'DigiMart Co-ownership',
        to: '/digimart',
      },
      {
        label: 'Referral Program',
        to: '/double-up#referral',
      },
    ],
  },
  {
    title: 'Company',
    links: [
      {
        label: 'About Us',
        to: '/about',
      },
      {
        label: 'How It Works',
        to: '/double-up#how',
      },
      {
        label: 'FAQs',
        to: '/faqs',
      },
      {
        label: 'Contact Us',
        to: '/contact',
      },
    ],
  },
  {
    title: 'Legal',
    links: [
      {
        label: 'Terms & Conditions',
        to: '/legal/terms',
      },
      {
        label: 'Privacy Policy',
        to: '/legal/privacy',
      },
      {
        label: 'Member Login',
        to: '/login',
      },
      {
        label: 'Verify Agent',
        to: '/verify',
      },
    ],
  },
]
export function Footer() {
  return (
    <footer className="bg-brand-dark text-white">
      <div className="mx-auto max-w-7xl px-5 py-14 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-[1.4fr_repeat(3,1fr)]">
          <div>
            <Logo variant="light" />
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-white/70">
              A secure digital savings and retail co-ownership platform built to
              reward your consistency and grow your money.
            </p>
            <div className="mt-6 space-y-3 text-sm text-white/80">
              <div className="flex items-start gap-3">
                <MapPinIcon className="mt-0.5 h-5 w-5 shrink-0 text-accent" />
                <span>{BRAND.address}</span>
              </div>
              <div className="flex items-start gap-3">
                <PhoneIcon className="mt-0.5 h-5 w-5 shrink-0 text-accent" />
                <span>WhatsApp Care: {BRAND.whatsappNumbers.join(' | ')}</span>
              </div>
            </div>
          </div>

          {columns.map((col) => (
            <div key={col.title}>
              <h4 className="font-display text-sm font-bold uppercase tracking-wider text-white/50">
                {col.title}
              </h4>
              <ul className="mt-4 space-y-2.5">
                {col.links.map((l) => (
                  <li key={l.label}>
                    <Link
                      to={l.to}
                      className="text-sm text-white/80 transition-colors hover:text-accent"
                    >
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 flex flex-wrap items-center gap-4 rounded-2xl bg-white/5 px-6 py-4">
          <div className="flex items-center gap-2 text-sm text-white/80">
            <ShieldCheckIcon className="h-5 w-5 text-accent" /> Bank-grade
            security
          </div>
          <div className="flex items-center gap-2 text-sm text-white/80">
            <BadgeCheckIcon className="h-5 w-5 text-accent" /> Legally binding
            certificates
          </div>
          <div className="flex items-center gap-2 text-sm text-white/80">
            <MapPinIcon className="h-5 w-5 text-accent" /> Verifiable physical
            office
          </div>
        </div>

        <div className="mt-8 flex flex-col items-center justify-between gap-3 border-t border-white/10 pt-6 text-xs text-white/50 sm:flex-row">
          <p>
            © {new Date().getFullYear()} DigiAjo Global. All rights reserved.
          </p>
          <p>Save smart. Grow together.</p>
        </div>
      </div>
    </footer>
  )
}
