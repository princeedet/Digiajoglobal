import React, { useState } from 'react'
import { BadgeCheckIcon, SearchIcon, XCircleIcon } from 'lucide-react'
import { Section } from '../components/ui/Section'
import { Reveal } from '../components/ui/Reveal'
import { Button } from '../components/ui/Button'
import { BRAND } from '../lib/brand'
type Result = null | 'verified' | 'not-found'
export function Verify() {
  const [code, setCode] = useState('')
  const [result, setResult] = useState<Result>(null)
  const check = (e: React.FormEvent) => {
    e.preventDefault()
    if (code.trim().toUpperCase().startsWith('DA')) setResult('verified')
    else setResult('not-found')
  }
  return (
    <>
      <section className="bg-brand-dark py-16 text-white lg:py-20">
        <div className="mx-auto max-w-2xl px-5 text-center lg:px-8">
          <span className="inline-block rounded-full bg-white/10 px-3 py-1.5 text-xs font-semibold text-accent">
            Agent verification
          </span>
          <h1 className="mt-5 font-display text-4xl font-extrabold tracking-tight sm:text-5xl">
            Verify a DigiAjo Agent
          </h1>
          <p className="mt-4 text-white/75">
            Only deal with verified agents. Enter an agent ID (e.g. DA-1024) to
            confirm.
          </p>
        </div>
      </section>

      <Section>
        <Reveal className="mx-auto max-w-lg">
          <form onSubmit={check} className="flex gap-3">
            <input
              value={code}
              onChange={(e) => {
                setCode(e.target.value)
                setResult(null)
              }}
              placeholder="Enter agent ID"
              aria-label="Agent ID"
              className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
            />
            <Button type="submit" variant="primary">
              <SearchIcon className="h-5 w-5" /> Verify
            </Button>
          </form>

          {result === 'verified' && (
            <div className="mt-6 flex items-start gap-3 rounded-2xl border border-brand-100 bg-brand-50/70 p-6">
              <BadgeCheckIcon className="h-7 w-7 shrink-0 text-brand" />
              <div>
                <h3 className="font-display font-bold text-brand-dark">
                  Verified Agent
                </h3>
                <p className="mt-1 text-sm text-gray-600">
                  Agent{' '}
                  <span className="font-semibold">{code.toUpperCase()}</span> is
                  an authorised DigiAjo Global representative.
                </p>
              </div>
            </div>
          )}
          {result === 'not-found' && (
            <div className="mt-6 flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-6">
              <XCircleIcon className="h-7 w-7 shrink-0 text-red-500" />
              <div>
                <h3 className="font-display font-bold text-red-700">
                  Not found
                </h3>
                <p className="mt-1 text-sm text-red-600">
                  We couldn't verify this ID. Please confirm with our customer
                  care on {BRAND.whatsappNumbers[0]}.
                </p>
              </div>
            </div>
          )}
        </Reveal>
      </Section>
    </>
  )
}
