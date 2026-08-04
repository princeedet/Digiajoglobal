import React from 'react'
import { Section } from '../components/ui/Section'
import { BRAND } from '../lib/brand'
interface LegalProps {
  type: 'terms' | 'privacy'
}
const content = {
  terms: {
    title: 'Terms & Conditions',
    intro:
      'These terms govern your use of DigiAjo Global savings and DigiMart co-ownership products. By registering, you agree to the following.',
    sections: [
      {
        h: '1. Registration',
        p: 'A one-time, non-refundable registration fee of ₦2,000 applies to open Double Up savings accounts. This fee permits opening of multiple savings accounts under one member profile.',
      },
      {
        h: '2. Double Up Savings Obligations',
        p: 'Members commit to depositing ₦1,300 per account every Saturday for 50 weeks. All contributions must be received by 11:59 p.m. each Saturday.',
      },
      {
        h: '3. Fines & Suspension',
        p: 'Missing a week attracts a 100% fine (₦1,300 per missed week). Accounts with 4 or more missed weeks will be suspended. If outstanding savings and fines are not cleared by the 50th week, the member is cashed out only the exact amount saved, forfeiting the 100% double-up match and food rewards.',
      },
      {
        h: '4. DigiMart Co-ownership',
        p: 'Units are sold at a fixed ₦100,000 each. Returns of up to 50% are projected over a 12-month period and are subject to retail performance. Each unit is issued with a legally binding Investment Certificate.',
      },
      {
        h: '5. Referrals',
        p: 'Referral commissions (₦1,000 per Double Up referral, 5% per DigiMart unit referral) are paid according to the published schedule and require successful, verified referrals.',
      },
    ],
  },
  privacy: {
    title: 'Privacy Policy',
    intro:
      'DigiAjo Global respects your privacy. This policy explains how we collect, use and protect your information.',
    sections: [
      {
        h: '1. Information We Collect',
        p: 'We collect your name, phone number, email, and transaction records necessary to operate your savings or investment account.',
      },
      {
        h: '2. How We Use Your Data',
        p: 'Your data is used to manage contributions, process payouts, communicate account updates, and comply with legal obligations.',
      },
      {
        h: '3. Data Protection',
        p: 'We apply industry-standard security measures to safeguard your information. We never sell your personal data to third parties.',
      },
      {
        h: '4. Communications',
        p: 'We may contact you via WhatsApp, SMS or email regarding your account, savings reminders, and reward notifications.',
      },
      {
        h: '5. Your Rights',
        p: `You may request access to, correction of, or deletion of your data by contacting our customer care on ${BRAND.whatsappNumbers.join(' or ')}.`,
      },
    ],
  },
}
export function Legal({ type }: LegalProps) {
  const c = content[type]
  return (
    <>
      <section className="bg-brand-dark py-14 text-white lg:py-16">
        <div className="mx-auto max-w-3xl px-5 lg:px-8">
          <h1 className="font-display text-4xl font-extrabold tracking-tight sm:text-5xl">
            {c.title}
          </h1>
          <p className="mt-4 max-w-2xl text-white/75">{c.intro}</p>
        </div>
      </section>
      <Section>
        <div className="mx-auto max-w-3xl space-y-8">
          {c.sections.map((s) => (
            <div key={s.h}>
              <h2 className="font-display text-lg font-bold text-brand-dark">
                {s.h}
              </h2>
              <p className="mt-2 leading-relaxed text-gray-600">{s.p}</p>
            </div>
          ))}
          <p className="border-t border-gray-100 pt-6 text-sm text-gray-400">
            Last updated{' '}
            {new Date().toLocaleDateString('en-NG', {
              year: 'numeric',
              month: 'long',
            })}
            . For questions, visit us at {BRAND.address}
          </p>
        </div>
      </Section>
    </>
  )
}
