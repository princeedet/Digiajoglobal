import React from 'react'
import { Section } from '../components/ui/Section'
import { BRAND } from '../lib/brand'
interface LegalProps {
  type: 'terms' | 'privacy'
}
const content = {
  terms: {
    title: 'Terms & Conditions — DigiAjo Double Up Plan',
    intro:
      'Savings Structure, Double-Up Reward & Default Policy. These terms govern your use of DigiAjo Global savings and investment accounts. By registering, you agree to the following.',
    sections: [
      {
        h: '1. How DigiAjo Double Up Plan Works',
        p: 'DigiAjo Double Up Plan is designed to help members build a consistent savings habit while rewarding commitment and discipline. Every member begins by paying a one-time registration fee of ₦2,000. After registration, members choose their savings capacity based on the number of hands they want to operate.',
      },
      {
        h: '2. Single Hand & Multiple Hand Savings Plans',
        p: 'A single hand means ₦1,300 every Saturday for 50 weeks (₦1,300 × 50 = ₦65,000). Upon successful completion of the 50-week savings cycle, ₦65,000 savings becomes ₦130,000 through the DigiAjo Double-Up Reward. Members who have higher savings capacity can operate multiple hands (e.g. 10 hands: ₦13,000 weekly × 50 weeks = ₦650,000, which becomes ₦1,300,000 upon successful completion).',
      },
      {
        h: '3. Payment Deadline & Default Policy',
        p: 'All weekly contributions must be completed on or before 11:59 p.m. every Saturday. Once the payment deadline passes and it becomes 12:00 a.m. Sunday, the contribution is considered a default. Any missed weekly contribution attracts a 100% Default Penalty (the missed contribution amount is doubled). For 1 Hand: ₦1,300 contribution + ₦1,300 penalty = ₦2,600 to clear default. For 10 Hands: ₦13,000 contribution + ₦13,000 penalty = ₦26,000 to clear default.',
      },
      {
        h: '4. Account Suspension Policy & Outcomes',
        p: 'If a member defaults for up to 4 consecutive weeks, the account will automatically be suspended and become inactive until reviewed. A suspended account remains inactive until the end of the applicable cycle. Where a member fails to resolve defaults: at the end of the cycle period, only the member’s actual savings contributions will be paid back. The Double-Up Reward will not apply, and no additional reward or bonus will be attached.',
      },
      {
        h: '5. DigiAjo Double-Up Principle',
        p: 'The Double-Up Reward is designed to recognize: Consistency, Commitment, Financial discipline, and Completion of the savings journey. Members who stay committed throughout the 50-week cycle enjoy the full benefits of the DigiAjo Double Up Plan.',
      },
      {
        h: '6. Referral Commissions & Co-ownership',
        p: 'Referral commissions (₦1,000 per Double Up referral, 5% per DigiMart unit referral) are paid according to the published schedule and require successful, verified referrals. DigiMart units are sold at ₦100,000 each with up to 50% ROI over 12 months, backed by an Investment Certificate.',
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
