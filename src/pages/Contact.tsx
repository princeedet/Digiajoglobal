import React, { useState } from 'react'
import {
  MapPinIcon,
  PhoneIcon,
  MessageCircleIcon,
  ClockIcon,
  CheckCircle2Icon,
} from 'lucide-react'
import { Section } from '../components/ui/Section'
import { Reveal } from '../components/ui/Reveal'
import { Button } from '../components/ui/Button'
import { BRAND } from '../lib/brand'
export function Contact() {
  const [form, setForm] = useState({
    name: '',
    phone: '',
    message: '',
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [sent, setSent] = useState(false)
  const update = (k: string, v: string) => {
    setForm((f) => ({
      ...f,
      [k]: v,
    }))
    setErrors((e) => ({
      ...e,
      [k]: '',
    }))
  }
  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    const next: Record<string, string> = {}
    if (!form.name.trim()) next.name = 'Please enter your name.'
    if (!/^[0-9+\s]{7,}$/.test(form.phone.trim()))
      next.phone = 'Enter a valid phone number.'
    if (form.message.trim().length < 10)
      next.message = 'Message must be at least 10 characters.'
    setErrors(next)
    if (Object.keys(next).length === 0) {
      setSent(true)
      setForm({
        name: '',
        phone: '',
        message: '',
      })
    }
  }
  const inputBase =
    'w-full rounded-xl border bg-white px-4 py-3 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand'
  return (
    <>
      <section className="bg-brand-dark py-16 text-white lg:py-20">
        <div className="mx-auto max-w-3xl px-5 text-center lg:px-8">
          <span className="inline-block rounded-full bg-white/10 px-3 py-1.5 text-xs font-semibold text-accent">
            We're here to help
          </span>
          <h1 className="mt-5 font-display text-4xl font-extrabold tracking-tight sm:text-5xl">
            Contact DigiAjo Global
          </h1>
          <p className="mt-4 text-white/75">
            Reach our customer care team or visit our head office in Lagos.
          </p>
        </div>
      </section>

      <Section>
        <div className="grid gap-10 lg:grid-cols-2">
          {/* Info */}
          <div className="space-y-4">
            <Reveal>
              <div className="flex items-start gap-4 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand">
                  <MapPinIcon className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="font-display font-bold text-brand-dark">
                    Head Office
                  </h3>
                  <p className="mt-1 text-sm text-gray-600">{BRAND.address}</p>
                </div>
              </div>
            </Reveal>
            <Reveal delay={0.06}>
              <div className="flex items-start gap-4 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand">
                  <PhoneIcon className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="font-display font-bold text-brand-dark">
                    WhatsApp Customer Care
                  </h3>
                  <p className="mt-1 text-sm text-gray-600">
                    {BRAND.whatsappNumbers.join(' | ')}
                  </p>
                </div>
              </div>
            </Reveal>
            <Reveal delay={0.12}>
              <div className="flex items-start gap-4 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand">
                  <ClockIcon className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="font-display font-bold text-brand-dark">
                    Support Hours
                  </h3>
                  <p className="mt-1 text-sm text-gray-600">
                    Monday – Saturday, 9:00 a.m. – 6:00 p.m.
                  </p>
                </div>
              </div>
            </Reveal>
            <Reveal delay={0.18}>
              <div className="rounded-2xl bg-brand-dark p-6 text-white">
                <p className="text-sm text-white/80">Prefer instant chat?</p>
                <div className="mt-3">
                  <Button href={BRAND.whatsappLink} variant="accent">
                    <MessageCircleIcon className="h-5 w-5" /> Chat on WhatsApp
                  </Button>
                </div>
              </div>
            </Reveal>
          </div>

          {/* Form */}
          <Reveal>
            <div className="rounded-3xl border border-gray-100 bg-white p-8 shadow-sm">
              {sent ? (
                <div className="flex flex-col items-center py-10 text-center">
                  <CheckCircle2Icon className="h-14 w-14 text-brand" />
                  <h3 className="mt-4 font-display text-xl font-bold text-brand-dark">
                    Message received!
                  </h3>
                  <p className="mt-2 text-sm text-gray-600">
                    Our team will get back to you shortly. For urgent matters,
                    chat with us on WhatsApp.
                  </p>
                  <Button
                    className="mt-6"
                    variant="secondary"
                    onClick={() => setSent(false)}
                  >
                    Send another message
                  </Button>
                </div>
              ) : (
                <form onSubmit={submit} noValidate className="space-y-5">
                  <div>
                    <label
                      htmlFor="name"
                      className="mb-1.5 block text-sm font-semibold text-gray-700"
                    >
                      Full name
                    </label>
                    <input
                      id="name"
                      value={form.name}
                      onChange={(e) => update('name', e.target.value)}
                      className={`${inputBase} ${errors.name ? 'border-red-400' : 'border-gray-200'}`}
                      placeholder="Your name"
                    />
                    {errors.name && (
                      <p className="mt-1 text-xs text-red-500">{errors.name}</p>
                    )}
                  </div>
                  <div>
                    <label
                      htmlFor="phone"
                      className="mb-1.5 block text-sm font-semibold text-gray-700"
                    >
                      Phone / WhatsApp number
                    </label>
                    <input
                      id="phone"
                      value={form.phone}
                      onChange={(e) => update('phone', e.target.value)}
                      className={`${inputBase} ${errors.phone ? 'border-red-400' : 'border-gray-200'}`}
                      placeholder="080..."
                    />
                    {errors.phone && (
                      <p className="mt-1 text-xs text-red-500">
                        {errors.phone}
                      </p>
                    )}
                  </div>
                  <div>
                    <label
                      htmlFor="message"
                      className="mb-1.5 block text-sm font-semibold text-gray-700"
                    >
                      Message
                    </label>
                    <textarea
                      id="message"
                      rows={4}
                      value={form.message}
                      onChange={(e) => update('message', e.target.value)}
                      className={`${inputBase} resize-none ${errors.message ? 'border-red-400' : 'border-gray-200'}`}
                      placeholder="How can we help you?"
                    />
                    {errors.message && (
                      <p className="mt-1 text-xs text-red-500">
                        {errors.message}
                      </p>
                    )}
                  </div>
                  <Button
                    type="submit"
                    variant="primary"
                    size="lg"
                    className="w-full"
                  >
                    Send Message
                  </Button>
                </form>
              )}
            </div>
          </Reveal>
        </div>
      </Section>
    </>
  )
}
