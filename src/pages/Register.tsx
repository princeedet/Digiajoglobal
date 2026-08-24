import React, { useState } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  PiggyBankIcon,
  ShoppingBasketIcon,
  CheckCircle2Icon,
  ShieldCheckIcon,
  LockIcon,
  ArrowRightIcon,
  Building2Icon,
  CreditCardIcon,
  SmartphoneIcon,
  WalletIcon,
  Loader2Icon,
  GiftIcon,
} from 'lucide-react'
import { Section } from '../components/ui/Section'
import { Reveal } from '../components/ui/Reveal'
import { Button } from '../components/ui/Button'
import { BRAND } from '../lib/brand'
import { getStoredMembers, saveMembers, getStoredPayments, savePayments } from '../lib/persistence'
import type { MemberUser, Payment } from '../lib/dashboard-data'
import { apiUrl, apiFetch } from '../lib/api'

type Plan = 'double-up' | 'digimart'
const plans: Record<
  Plan,
  {
    icon: any
    title: string
    fee: string
    feeAmount: number
    note: string
    points: string[]
  }
> = {
  'double-up': {
    icon: PiggyBankIcon,
    title: 'Double Up Savings',
    fee: '₦2,000 one-time',
    feeAmount: 2000,
    note: 'Then ₦1,300 every Saturday for 50 weeks',
    points: [
      '100% profit match — cash out ₦130,000',
      'Bonus food items',
      'Multiple accounts, one fee',
    ],
  },
  digimart: {
    icon: ShoppingBasketIcon,
    title: 'DigiMart Co-ownership',
    fee: '₦100,000 per unit',
    feeAmount: 100000,
    note: 'Earn up to 50% over 12 months',
    points: [
      'Asset-backed retail returns',
      'Legal Investment Certificate',
      '5% referral commission',
    ],
  },
}
export function Register() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const initial = (params.get('plan') as Plan) || 'double-up'
  const [plan, setPlan] = useState<Plan>(
    initial in plans ? initial : 'double-up',
  )
  const [form, setForm] = useState({
    name: '',
    phone: '',
    email: '',
  })
  const [referralCode, setReferralCode] = useState(params.get('ref') || '')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [done, setDone] = useState(false)
  const [paymentMethod, setPaymentMethod] = useState<'bank' | 'paystack' | 'flutterwave'>('bank')
  const [isPaying, setIsPaying] = useState(false)
  const [paymentSubmitted, setPaymentSubmitted] = useState(false)
  const [generatedRef, setGeneratedRef] = useState('')
  const [generatedId, setGeneratedId] = useState('')
  const [bankRefInput, setBankRefInput] = useState('')
  const [apiError, setApiError] = useState('')

  const [isValidating, setIsValidating] = useState(false)
  const [generalError, setGeneralError] = useState('')

  const update = (k: string, v: string) => {
    setForm((f) => ({
      ...f,
      [k]: v,
    }))
    setErrors((e) => ({
      ...e,
      [k]: '',
    }))
    setGeneralError('')
    setApiError('')
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setGeneralError('')
    const next: Record<string, string> = {}
    if (!form.name.trim()) next.name = 'Enter your full name.'
    else if (form.name.trim().length < 3) next.name = 'Full name must be at least 3 characters.'
    
    if (!/^[0-9+\s-]{7,}$/.test(form.phone.trim()))
      next.phone = 'Enter a valid phone number.'
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      next.email = 'Enter a valid email address.'
    }
    setErrors(next)
    if (Object.keys(next).length > 0) {
      return
    }

    // Check backend database in real time for duplicate Name, Email, and Phone before proceeding to Step 2
    setIsValidating(true)
    try {
      const res = await apiFetch('/api/register.php?validate_only=1', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name.trim(),
          phone: form.phone.trim(),
          email: form.email.trim().toLowerCase(),
          plan,
          paymentMethod: 'bank',
        }),
      })
      const data = await res.json()

      if (!data.success) {
        setIsValidating(false)
        if (data.fields && typeof data.fields === 'object') {
          setErrors(data.fields)
        }
        if (data.error) {
          setGeneralError(data.error)
        }
        return
      }

      // If valid and unique, proceed to step 2 (payment options)
      setIsValidating(false)
      setErrors({})
      setDone(true)
    } catch (err: any) {
      setIsValidating(false)
      setGeneralError('Unable to connect to the server to verify your registration details. Please check your network and try again.')
    }
  }

  /** Call the PHP API to save registration to MySQL, also cache in localStorage */
  const callRegisterAPI = async (method: 'bank' | 'paystack' | 'flutterwave') => {
    const activeRefCode = referralCode.trim() || params.get('ref') || ''
    const payload = {
      name: form.name,
      phone: form.phone,
      email: form.email,
      plan,
      paymentMethod: method,
      bankRef: bankRefInput.trim(),
      ref: activeRefCode,
    }

    let apiResult: { success: boolean; userId?: string; reference?: string; status?: string; error?: string; fields?: Record<string, string> } | null = null

    try {
      const res = await apiFetch('/api/register.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      apiResult = await res.json()
    } catch (e: any) {
      apiResult = { success: false, error: e?.message || 'Unable to connect to database. Please check your connection.' }
    }

    if (apiResult && !apiResult.success) {
      if (apiResult.fields && typeof apiResult.fields === 'object') {
        setErrors(apiResult.fields)
        setDone(false) // Return user to step 1 so they can fix duplicate fields
      }
      const errMsg = apiResult.error || 'Registration failed. Please check your details and try again.'
      setApiError(errMsg)
      setIsPaying(false)
      return null
    }

    // Use server-generated ID if available, otherwise generate locally
    const userId = apiResult?.userId || `DA-${Math.floor(10000 + Math.random() * 90000)}`
    const ref    = apiResult?.reference || (method === 'bank'
      ? (bankRefInput.trim() || `DGA/${new Date().getMonth() + 1}${new Date().getDate()}/${userId.slice(-3)}`)
      : `${method.toUpperCase()}_${Math.floor(100000000 + Math.random() * 900000000)}`)
    const userStatus = method === 'bank' ? 'pending_verification' : 'active'

    // Also persist to localStorage so the app can use it immediately
    const newMember: MemberUser = {
      id: userId,
      name: form.name,
      email: form.email,
      phone: form.phone,
      initials: form.name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2),
      joined: new Date().toLocaleDateString('en-NG', { day: '2-digit', month: 'short', year: 'numeric' }),
      saved: 0,
      status: userStatus as any,
      plan: plan === 'double-up' ? 'Double Up' : 'DigiMart',
      weeks: 0,
    }
    const newPayment: Payment = {
      id: `PAY-${Math.floor(1000 + Math.random() * 9000)}`,
      member: form.name,
      memberId: userId,
      amount: plans[plan].feeAmount,
      date: new Date().toLocaleDateString('en-NG', { day: '2-digit', month: 'short', year: 'numeric' }),
      reference: ref,
      channel: method === 'bank' ? 'Bank transfer' : 'Card',
      status: method === 'bank' ? 'pending' : 'approved',
      purpose: plan === 'double-up' ? 'Double Up Registration' : 'DigiMart Unit Registration',
    }
    const members = getStoredMembers()
    members.push(newMember)
    saveMembers(members)
    const payments = getStoredPayments()
    payments.push(newPayment)
    savePayments(payments)

    // Notify other components/tabs
    window.dispatchEvent(new CustomEvent('digiajo:data_updated'))

    return { userId, ref }
  }

  const handleBankTransferComplete = async () => {
    setIsPaying(true)
    setApiError('')
    const result = await callRegisterAPI('bank')
    setIsPaying(false)
    if (!result) return
    setGeneratedId(result.userId)
    setGeneratedRef(result.ref)
    setPaymentSubmitted(true)
  }

  const handleOnlinePaymentComplete = async () => {
    setIsPaying(true)
    setApiError('')
    const result = await callRegisterAPI(paymentMethod)
    if (!result) return
    sessionStorage.setItem(
      'digiajo_login_alert',
      `Payment successful via ${paymentMethod === 'paystack' ? 'Paystack' : 'Flutterwave'}! Your account is active. Please log in using your email and the last 6 digits of your phone number.`
    )
    setIsPaying(false)
    navigate('/login')
  }

  const active = plans[plan]
  const inputBase =
    'w-full rounded-xl border bg-white px-4 py-3 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand'
  return (
    <>
      <section className="bg-brand-dark py-14 text-white lg:py-16">
        <div className="mx-auto max-w-3xl px-5 text-center lg:px-8">
          <span className="inline-block rounded-full bg-white/10 px-3 py-1.5 text-xs font-semibold text-accent">
            Get started in under 3 minutes
          </span>
          <h1 className="mt-5 font-display text-4xl font-extrabold tracking-tight sm:text-5xl">
            Create your DigiAjo account
          </h1>
          <p className="mt-4 text-white/75">
            Choose your plan, enter your details, and proceed to secure payment.
          </p>
        </div>
      </section>

      <Section>
        <div className="mx-auto grid max-w-5xl gap-8 lg:grid-cols-[1fr_1.1fr]">
          {/* Plan selection */}
          <div>
            <h2 className="font-display text-lg font-bold text-brand-dark">
              1. Choose your plan
            </h2>
            <div className="mt-4 space-y-4">
              {(Object.keys(plans) as Plan[]).map((key) => {
                const p = plans[key]
                const selected = plan === key
                return (
                  <button
                    disabled={done}
                    key={key}
                    onClick={() => setPlan(key)}
                    className={`flex w-full items-start gap-4 rounded-2xl border-2 p-5 text-left transition ${selected ? 'border-brand bg-brand-50/60' : 'border-gray-200 bg-white hover:border-brand-100'} ${done ? 'opacity-70 cursor-not-allowed' : ''}`}
                    aria-pressed={selected}
                  >
                    <div
                      className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${selected ? 'bg-brand text-white' : 'bg-brand-50 text-brand'}`}
                    >
                      <p.icon className="h-6 w-6" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <h3 className="font-display font-bold text-brand-dark">
                          {p.title}
                        </h3>
                        {selected && (
                          <CheckCircle2Icon className="h-5 w-5 text-brand" />
                        )}
                      </div>
                      <p className="text-sm font-semibold text-brand">
                        {p.fee}
                      </p>
                      <p className="mt-0.5 text-xs text-gray-500">{p.note}</p>
                    </div>
                  </button>
                )
              })}
            </div>

            <div className="mt-6 rounded-2xl bg-brand-50/60 p-5">
              <ul className="space-y-2">
                {active.points.map((pt) => (
                  <li
                    key={pt}
                    className="flex items-center gap-2 text-sm text-gray-700"
                  >
                    <CheckCircle2Icon className="h-4 w-4 text-brand-light" />{' '}
                    {pt}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Form / Checkout */}
          <Reveal>
            <div className="rounded-3xl border border-gray-100 bg-white p-8 shadow-sm">
              {done ? (
                paymentSubmitted ? (
                  <div className="flex flex-col items-center py-8 text-center">
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: 'spring', stiffness: 220, damping: 16 }}
                    >
                      <CheckCircle2Icon className="h-16 w-16 text-brand" />
                    </motion.div>
                    <h3 className="mt-4 font-display text-2xl font-bold text-brand-dark">
                      Transfer Submitted!
                    </h3>
                    <p className="mt-3 text-sm text-gray-600">
                      Your payment reference is <span className="font-mono font-bold text-brand-dark">{generatedRef}</span>.
                    </p>
                    <p className="mt-2 max-w-sm text-xs leading-relaxed text-gray-500">
                      Our administrators will review and confirm your bank transfer. Once confirmed, you can log in to your dashboard using your email (<span className="font-semibold">{form.email}</span>) and the last 6 digits of your phone number.
                    </p>
                    <div className="mt-8 w-full">
                      <Button
                        to="/login"
                        variant="primary"
                        size="lg"
                        className="w-full"
                      >
                        Go to Login Screen
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div>
                    <h2 className="font-display text-lg font-bold text-brand-dark">
                      2. Choose Payment Option
                    </h2>
                    <p className="mt-1 text-xs text-gray-500">
                      Complete registration for <span className="font-bold text-brand">{active.title}</span> ({active.fee})
                    </p>

                    {/* Payment option selectors */}
                    <div className="mt-4 grid grid-cols-3 gap-2.5">
                      <button
                        onClick={() => setPaymentMethod('bank')}
                        className={`flex flex-col items-center justify-center rounded-xl border-2 p-3 text-center transition ${paymentMethod === 'bank' ? 'border-brand bg-brand-50/50 font-bold text-brand' : 'border-gray-150 text-gray-500 hover:border-brand-100'}`}
                      >
                        <Building2Icon className="h-5 w-5 mb-1" />
                        <span className="text-xs">Bank Transfer</span>
                      </button>

                      {/* Paystack — Coming Soon */}
                      <div
                        className="relative flex flex-col items-center justify-center rounded-xl border-2 border-gray-100 bg-gray-50 p-3 text-center cursor-not-allowed opacity-50"
                        title="Coming Soon"
                      >
                        <CreditCardIcon className="h-5 w-5 mb-1 text-gray-400" />
                        <span className="text-xs text-gray-400">Paystack</span>
                        <span className="absolute -top-2 -right-2 rounded-full bg-gray-400 px-1.5 py-0.5 text-[9px] font-bold text-white uppercase tracking-wide">Soon</span>
                      </div>

                      {/* Flutterwave — Coming Soon */}
                      <div
                        className="relative flex flex-col items-center justify-center rounded-xl border-2 border-gray-100 bg-gray-50 p-3 text-center cursor-not-allowed opacity-50"
                        title="Coming Soon"
                      >
                        <SmartphoneIcon className="h-5 w-5 mb-1 text-gray-400" />
                        <span className="text-xs text-gray-400">Flutterwave</span>
                        <span className="absolute -top-2 -right-2 rounded-full bg-gray-400 px-1.5 py-0.5 text-[9px] font-bold text-white uppercase tracking-wide">Soon</span>
                      </div>
                    </div>

                    <div className="mt-6 border-t border-gray-100 pt-5">
                      {paymentMethod === 'bank' && (
                        <div className="space-y-4">
                          <div className="rounded-2xl bg-gray-50 p-4 border border-gray-100">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Payment Account Details</span>
                            <div className="mt-2.5 space-y-2 text-sm">
                              <div className="flex justify-between">
                                <span className="text-gray-500">Bank Name</span>
                                <span className="font-bold text-brand-dark">Rigo Microfinance Bank</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-500">Account Number</span>
                                <span className="font-mono font-bold text-brand-dark text-base">1100007188</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-500">Account Name</span>
                                <span className="font-bold text-brand-dark">Betahealthplus Integrated Services Ltd</span>
                              </div>
                            </div>
                          </div>

                          <div>
                            <label htmlFor="bankRef" className="mb-1.5 block text-xs font-semibold text-gray-600">
                              Payment Reference / Depositor's Name (Optional)
                            </label>
                            <input
                              id="bankRef"
                              value={bankRefInput}
                              onChange={(e) => setBankRefInput(e.target.value)}
                              className={inputBase}
                              placeholder="e.g. Adebayo Bank Transfer Reference"
                            />
                          </div>

                          {apiError && (
                            <p className="rounded-xl bg-red-50 px-3 py-2.5 text-xs font-medium text-red-700">
                              {apiError}
                            </p>
                          )}

                          <Button
                            disabled={isPaying}
                            onClick={handleBankTransferComplete}
                            variant="primary"
                            size="lg"
                            className="w-full"
                          >
                            {isPaying ? (
                              <><Loader2Icon className="h-5 w-5 animate-spin" /> Submitting...</>
                            ) : (
                              <><CheckCircle2Icon className="h-5 w-5" /> I have made the transfer</>
                            )}
                          </Button>
                        </div>
                      )}

                      {(paymentMethod === 'paystack' || paymentMethod === 'flutterwave') && (
                        <div className="space-y-4">
                          <div className="rounded-2xl border border-dashed border-gray-200 p-5 text-center bg-gray-50/50">
                            <WalletIcon className="mx-auto h-8 w-8 text-brand-light opacity-80" />
                            <h4 className="mt-2.5 text-sm font-bold text-brand-dark">
                              Secure Checkout with {paymentMethod === 'paystack' ? 'Paystack' : 'Flutterwave'}
                            </h4>
                            <p className="mt-1 text-xs text-gray-500 max-w-xs mx-auto leading-relaxed">
                              You will pay a total of <span className="font-semibold text-brand">{active.fee}</span> to activate your plan. Cards, USSD, and Bank App options are supported.
                            </p>
                          </div>

                          <div className="grid grid-cols-2 gap-3 text-left">
                            <div>
                              <span className="block text-[10px] font-semibold text-gray-400 uppercase">Registered Email</span>
                              <span className="block text-xs font-bold text-brand-dark truncate">{form.email}</span>
                            </div>
                            <div>
                              <span className="block text-[10px] font-semibold text-gray-400 uppercase">Amount</span>
                              <span className="block text-xs font-bold text-brand">{active.fee}</span>
                            </div>
                          </div>

                          <Button
                            disabled={isPaying}
                            onClick={handleOnlinePaymentComplete}
                            variant="accent"
                            size="lg"
                            className="w-full"
                          >
                            {isPaying ? (
                              <>
                                <Loader2Icon className="h-5 w-5 animate-spin" />
                                Processing Checkout...
                              </>
                            ) : (
                              <>
                                <LockIcon className="h-4 w-4" /> Pay {active.fee} Now
                              </>
                            )}
                          </Button>
                        </div>
                      )}
                    </div>

                    <div className="mt-6 flex justify-center">
                      <button
                        onClick={() => setDone(false)}
                        className="text-xs font-bold text-gray-500 hover:text-brand underline underline-offset-2"
                      >
                        ← Edit personal details
                      </button>
                    </div>
                  </div>
                )
              ) : (
                <>
                  <h2 className="font-display text-lg font-bold text-brand-dark">
                    2. Your details
                  </h2>
                  
                  {generalError && (
                    <div className="mt-3 rounded-xl bg-red-50 p-3 text-xs font-medium text-red-700 border border-red-200">
                      {generalError}
                    </div>
                  )}

                  <form onSubmit={submit} noValidate className="mt-5 space-y-5">
                    <div>
                      <label
                        htmlFor="rname"
                        className="mb-1.5 block text-sm font-semibold text-gray-700"
                      >
                        Full name <span className="text-red-500 font-bold">*</span>
                      </label>
                      <input
                        id="rname"
                        required
                        value={form.name}
                        onChange={(e) => update('name', e.target.value)}
                        className={`${inputBase} ${errors.name ? 'border-red-400' : 'border-gray-200'}`}
                        placeholder="Your full name (e.g. John Doe)"
                      />
                      {errors.name && (
                        <div className="mt-1.5 flex items-center justify-between text-xs">
                          <p className="text-red-500 font-medium">{errors.name}</p>
                          {errors.name.toLowerCase().includes('already registered') && (
                            <button
                              type="button"
                              onClick={() => navigate('/login')}
                              className="ml-2 font-bold text-brand hover:underline shrink-0"
                            >
                              Log in →
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                    <div>
                      <label
                        htmlFor="rphone"
                        className="mb-1.5 block text-sm font-semibold text-gray-700"
                      >
                        Phone / WhatsApp <span className="text-red-500 font-bold">*</span>
                      </label>
                      <input
                        id="rphone"
                        required
                        value={form.phone}
                        onChange={(e) => update('phone', e.target.value)}
                        className={`${inputBase} ${errors.phone ? 'border-red-400' : 'border-gray-200'}`}
                        placeholder="080... or +234..."
                      />
                      {errors.phone && (
                        <div className="mt-1.5 flex items-center justify-between text-xs">
                          <p className="text-red-500 font-medium">{errors.phone}</p>
                          {errors.phone.toLowerCase().includes('already registered') && (
                            <button
                              type="button"
                              onClick={() => navigate('/login')}
                              className="ml-2 font-bold text-brand hover:underline shrink-0"
                            >
                              Log in →
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                    <div>
                      <label
                        htmlFor="remail"
                        className="mb-1.5 block text-sm font-semibold text-gray-700"
                      >
                        Email address <span className="text-red-500 font-bold">*</span>
                      </label>
                      <input
                        id="remail"
                        type="email"
                        required
                        value={form.email}
                        onChange={(e) => update('email', e.target.value)}
                        className={`${inputBase} ${errors.email ? 'border-red-400' : 'border-gray-200'}`}
                        placeholder="you@email.com"
                      />
                      {errors.email && (
                        <div className="mt-1.5 flex items-center justify-between text-xs">
                          <p className="text-red-500 font-medium">{errors.email}</p>
                          {errors.email.toLowerCase().includes('already registered') && (
                            <button
                              type="button"
                              onClick={() => navigate('/login')}
                              className="ml-2 font-bold text-brand hover:underline shrink-0"
                            >
                              Log in →
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label
                          htmlFor="rref"
                          className="block text-sm font-semibold text-gray-700"
                        >
                          Referral Code <span className="text-xs font-normal text-gray-400">(Optional)</span>
                        </label>
                        {referralCode && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-brand bg-brand-50 px-2 py-0.5 rounded-full">
                            <GiftIcon className="h-3 w-3" /> Code Applied
                          </span>
                        )}
                      </div>
                      <input
                        id="rref"
                        value={referralCode}
                        onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
                        className={`${inputBase} font-mono uppercase tracking-wider`}
                        placeholder="e.g. 26E36FC8"
                      />
                    </div>
                    <Button
                      type="submit"
                      disabled={isValidating}
                      variant="accent"
                      size="lg"
                      className="w-full"
                    >
                      {isValidating ? (
                        <>
                          <Loader2Icon className="h-5 w-5 animate-spin" /> Verifying details...
                        </>
                      ) : (
                        <>
                          Continue to Payment <ArrowRightIcon className="h-5 w-5" />
                        </>
                      )}
                    </Button>
                    <p className="flex items-center justify-center gap-2 text-xs text-gray-400">
                      <ShieldCheckIcon className="h-4 w-4" /> Your information
                      is secure and encrypted.
                    </p>
                  </form>
                </>
              )}
            </div>
          </Reveal>
        </div>
      </Section>
    </>
  )
}

