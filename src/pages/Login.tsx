import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import {
  CheckCircle2Icon,
  EyeIcon,
  EyeOffIcon,
  LockIcon,
  MailIcon,
  ShieldCheckIcon,
} from 'lucide-react'
import { Logo } from '../components/ui/Logo'
import { setCurrentUser, getStoredMembers, saveMembers, getLastSixDigits } from '../lib/persistence'
import { apiUrl } from '../lib/api'

type Role = 'member' | 'admin'
const credentials: Record<
  Role,
  {
    email: string
    password: string
    title: string
    description: string
  }
> = {
  member: {
    email: 'member@digiajo.demo',
    password: 'Member123!',
    title: 'Member sign in',
    description: 'View your savings, contributions and referrals.',
  },
  admin: {
    email: 'admin@digiajoglobal.com',
    password: 'Admin123!',
    title: 'Super admin sign in',
    description: 'Manage members, review transfers and operations.',
  },
}
export function Login() {
  const [role, setRole] = useState<Role>('member')
  const [form, setForm] = useState({
    email: '',
    password: '',
  })
  const [error, setError] = useState('')
  const [infoAlert, setInfoAlert] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showForgotModal, setShowForgotModal] = useState(false)
  const [forgotEmail, setForgotEmail] = useState('')
  const [forgotLoading, setForgotLoading] = useState(false)
  const [forgotError, setForgotError] = useState('')
  const [forgotSuccess, setForgotSuccess] = useState('')
  const navigate = useNavigate()
  const active = credentials[role]

  const handleForgotPassword = async () => {
    if (!forgotEmail.trim()) {
      setForgotError('Please enter your email address.')
      return
    }
    setForgotLoading(true)
    setForgotError('')
    try {
      const res = await fetch(apiUrl('/api/forgot_password.php'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: forgotEmail }),
      })
      const data = await res.json()
      setForgotLoading(false)
      if (data.success) {
        setForgotSuccess(data.message || 'A temporary password has been sent to your email.')
      } else {
        setForgotError(data.error || 'Unable to reset password. Please try again.')
      }
    } catch {
      setForgotLoading(false)
      setForgotError('Unable to connect. Please try again later.')
    }
  }

  // Read alert if navigated from successful Paystack/Flutterwave payment
  useEffect(() => {
    const alertMsg = sessionStorage.getItem('digiajo_login_alert')
    if (alertMsg) {
      setInfoAlert(alertMsg)
      sessionStorage.removeItem('digiajo_login_alert')
    }
  }, [])

  const useDemo = () => {
    setForm({
      email: active.email,
      password: active.password,
    })
    setError('')
  }
  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!form.email.trim() || !form.password.trim()) {
      setError('Enter your email address and password to continue.')
      return
    }
    setLoading(true)
    setError('')

    // ── Try PHP / MySQL API first ─────────────────────────────────────────
    try {
      const res = await fetch(apiUrl('/api/login.php'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: form.email, password: form.password, role }),
      })
      const data = await res.json()

      if (data.success) {
        setCurrentUser({ ...data.user, role: data.role })
        // Also cache in localStorage for offline continuity
        if (data.role === 'member') {
          const members = getStoredMembers()
          const exists = members.find((m) => m.email.toLowerCase() === form.email.toLowerCase())
          if (!exists) {
            members.push(data.user)
            saveMembers(members)
          }
        }
        setLoading(false)
        navigate(data.role === 'admin' ? '/admin' : '/user')
        return
      } else {
        setLoading(false)
        setError(data.error || 'Login failed. Please try again.')
        return
      }
    } catch {
      // API unreachable — fall back to localStorage / demo credentials
    }

    // ── Fallback: localStorage + demo credentials ──────────────────────────
    setLoading(false)

    if (role === 'admin') {
      const expected = credentials.admin
      if (
        form.email.toLowerCase() !== expected.email.toLowerCase() ||
        form.password !== expected.password
      ) {
        setError('Invalid username or password.')
        return
      }
      setCurrentUser({
        id: 'ADMIN-001',
        name: 'DigiAjo Global',
        email: form.email,
        phone: '08038010330',
        initials: 'DG',
        joined: '01 Jan 2026',
        saved: 0,
        status: 'active',
        plan: 'Double Up',
        weeks: 0,
        role: 'admin',
      })
      navigate('/admin')
      return
    }

    // Member: check localStorage
    const members = getStoredMembers()
    const matchedMember = members.find(
      (m) => m.email.toLowerCase() === form.email.toLowerCase()
    )

    if (matchedMember) {
      const customP = localStorage.getItem(`digiajo_password_${matchedMember.id}`)
      const correctPassword = customP || getLastSixDigits(matchedMember.phone)

      if (form.password !== correctPassword) {
        setError('Incorrect password. For new accounts, use the last 6 digits of your phone number.')
        return
      }
      if (matchedMember.status === 'pending_verification') {
        setError('Your account is pending confirmation of your registration payment.')
        return
      }
      if (matchedMember.status === 'suspended') {
        setError('Your account has been suspended. Please contact support.')
        return
      }
      setCurrentUser({ ...matchedMember, role: 'member', needsSecurityUpdate: !customP })
      navigate('/user')
    } else {
      // Static demo member fallback
      const expected = credentials.member
      if (
        form.email.toLowerCase() === expected.email.toLowerCase() &&
        form.password === expected.password
      ) {
        setCurrentUser({
          id: 'DA-01824',
          name: 'Adebimpe Adeyemi',
          email: expected.email,
          phone: '0803 234 8182',
          initials: 'AA',
          joined: '02 Dec 2025',
          saved: 41600,
          status: 'active',
          plan: 'Double Up',
          weeks: 32,
          role: 'member',
          needsSecurityUpdate: true,
        })
        navigate('/user')
      } else {
        setError('Account not found. Please register to get started.')
      }
    }
  }
  const input =
    'w-full rounded-xl border border-gray-200 bg-white py-3 pl-11 pr-4 text-sm text-gray-900 placeholder-gray-400 transition focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20'
  return (
    <div className="grid min-h-screen w-full bg-[#f6f8f6] lg:grid-cols-[1fr_.9fr]">
      <section className="hidden bg-brand-dark p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <Logo variant="light" />
        <div className="max-w-md">
          <span className="inline-flex rounded-full bg-white/10 px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-accent">
            DigiAjo Member Portal
          </span>
          <h1 className="mt-5 font-display text-4xl font-extrabold leading-tight">
            Your savings journey, clearly in view.
          </h1>
          <p className="mt-4 text-base leading-relaxed text-white/70">
            Track weekly contributions, follow your Double Up progress, and
            manage your rewards in one calm, focused place.
          </p>
        </div>
        <div className="flex items-center gap-3 text-sm text-white/60">
          <ShieldCheckIcon className="h-5 w-5 text-accent" />
          Prototype interface — no live account access or payment processing.
        </div>
      </section>
      <main className="flex items-center justify-center p-5 sm:p-8">
        <div className="w-full max-w-md">
          <div className="mb-10 flex justify-center lg:hidden">
            <Logo />
          </div>
          <div className="rounded-3xl border border-gray-100 bg-white p-6 shadow-xl shadow-brand-dark/5 sm:p-8">
            <div
              className="rounded-xl bg-gray-100 p-1"
              role="tablist"
              aria-label="Choose sign in role"
            >
              <button
                role="tab"
                aria-selected={role === 'member'}
                onClick={() => {
                  setRole('member')
                  setError('')
                  setForm({
                    email: '',
                    password: '',
                  })
                }}
                className={`w-1/2 rounded-lg px-3 py-2.5 text-sm font-bold transition ${role === 'member' ? 'bg-white text-brand-dark shadow-sm' : 'text-gray-500'}`}
              >
                Member
              </button>
              <button
                role="tab"
                aria-selected={role === 'admin'}
                onClick={() => {
                  setRole('admin')
                  setError('')
                  setForm({
                    email: '',
                    password: '',
                  })
                }}
                className={`w-1/2 rounded-lg px-3 py-2.5 text-sm font-bold transition ${role === 'admin' ? 'bg-white text-brand-dark shadow-sm' : 'text-gray-500'}`}
              >
                Super Admin
              </button>
            </div>
            <AnimatePresence mode="wait">
              <motion.div
                key={role}
                initial={{
                  opacity: 0,
                  y: 6,
                }}
                animate={{
                  opacity: 1,
                  y: 0,
                }}
                exit={{
                  opacity: 0,
                  y: -6,
                }}
              >
                <h2 className="mt-7 font-display text-2xl font-extrabold text-brand-dark">
                  {active.title}
                </h2>
                <p className="mt-1 text-sm text-gray-500">
                  {active.description}
                </p>
                {infoAlert && (
                  <div className="mt-4 flex items-start gap-2.5 rounded-xl bg-brand-50 px-3.5 py-3 text-xs font-semibold text-brand-dark border border-brand-100">
                    <CheckCircle2Icon className="h-4 w-4 shrink-0 text-brand-light mt-0.5" />
                    <span>{infoAlert}</span>
                  </div>
                )}
                <form onSubmit={submit} noValidate className="mt-7 space-y-4">
                  <label className="relative block">
                    <span className="mb-1.5 block text-sm font-semibold text-gray-700">
                      Email address
                    </span>
                    <MailIcon className="absolute left-3.5 top-10 h-4 w-4 text-gray-400" />
                    <input
                      type="email"
                      value={form.email}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          email: e.target.value,
                        })
                      }
                      className={input}
                      placeholder="you@example.com"
                      autoComplete="email"
                    />
                  </label>
                  <label className="relative block">
                    <span className="mb-1.5 block text-sm font-semibold text-gray-700">
                      Password
                    </span>
                    <LockIcon className="absolute left-3.5 top-10 h-4 w-4 text-gray-400" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={form.password}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          password: e.target.value,
                        })
                      }
                      className={`${input} pr-11`}
                      placeholder="Enter your password"
                      autoComplete="current-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((value) => !value)}
                      className="absolute right-3 top-9 rounded p-1 text-gray-400 hover:text-brand"
                      aria-label={
                        showPassword ? 'Hide password' : 'Show password'
                      }
                    >
                      {showPassword ? (
                        <EyeOffIcon className="h-4 w-4" />
                      ) : (
                        <EyeIcon className="h-4 w-4" />
                      )}
                    </button>
                  </label>
                  {error && (
                    <p
                      role="alert"
                      className="rounded-xl bg-red-50 px-3 py-2.5 text-xs font-medium text-red-700"
                    >
                      {error}
                    </p>
                  )}

                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={() => {
                        setShowForgotModal(true)
                        setForgotEmail(form.email)
                        setForgotError('')
                        setForgotSuccess('')
                      }}
                      className="text-xs font-bold text-brand hover:text-brand-dark transition"
                    >
                      Forgot password?
                    </button>
                  </div>

                  <button
                    disabled={loading}
                    type="submit"
                    className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-brand px-4 py-3.5 text-sm font-bold text-white transition hover:bg-brand-dark disabled:cursor-wait disabled:opacity-70"
                  >
                    {loading ? (
                      <>
                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                        Signing in…
                      </>
                    ) : (
                      'Sign in to portal'
                    )}
                  </button>
                </form>
              </motion.div>
            </AnimatePresence>

            <div className="mt-8 text-center">
              <button
                onClick={() => navigate('/')}
                className="text-sm font-bold text-gray-500 hover:text-brand transition"
              >
                &larr; Go back to Home Page
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* ── Forgot Password Modal ── */}
      <AnimatePresence>
        {showForgotModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
            onClick={(e) => { if (e.target === e.currentTarget) { setShowForgotModal(false) } }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 16 }}
              transition={{ duration: 0.2 }}
              className="w-full max-w-sm rounded-3xl bg-white p-8 shadow-2xl"
            >
              {forgotSuccess ? (
                <>
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50 mx-auto">
                    <CheckCircle2Icon className="h-7 w-7 text-brand" />
                  </div>
                  <h3 className="mt-5 text-center font-display text-xl font-extrabold text-brand-dark">
                    Check your email
                  </h3>
                  <p className="mt-2 text-center text-sm text-gray-500 leading-relaxed">
                    {forgotSuccess}
                  </p>
                  <button
                    onClick={() => setShowForgotModal(false)}
                    className="mt-6 w-full rounded-xl bg-brand py-3 text-sm font-bold text-white hover:bg-brand-dark transition"
                  >
                    Back to Sign In
                  </button>
                </>
              ) : (
                <>
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50 mx-auto">
                    <LockIcon className="h-7 w-7 text-brand" />
                  </div>
                  <h3 className="mt-5 text-center font-display text-xl font-extrabold text-brand-dark">
                    Forgot Password?
                  </h3>
                  <p className="mt-2 text-center text-sm text-gray-500">
                    Enter your registered email and we'll send you a temporary password.
                  </p>
                  <div className="mt-6 space-y-4">
                    <label className="relative block">
                      <span className="mb-1.5 block text-sm font-semibold text-gray-700">Email address</span>
                      <MailIcon className="absolute left-3.5 top-10 h-4 w-4 text-gray-400" />
                      <input
                        type="email"
                        value={forgotEmail}
                        onChange={(e) => setForgotEmail(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') handleForgotPassword() }}
                        className="w-full rounded-xl border border-gray-200 bg-white py-3 pl-11 pr-4 text-sm text-gray-900 placeholder-gray-400 transition focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
                        placeholder="you@example.com"
                        autoFocus
                      />
                    </label>
                    {forgotError && (
                      <p className="rounded-xl bg-red-50 px-3 py-2.5 text-xs font-medium text-red-700">
                        {forgotError}
                      </p>
                    )}
                    <button
                      onClick={handleForgotPassword}
                      disabled={forgotLoading}
                      className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-brand py-3.5 text-sm font-bold text-white hover:bg-brand-dark transition disabled:opacity-70 disabled:cursor-wait"
                    >
                      {forgotLoading ? (
                        <><span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" /> Sending…</>
                      ) : 'Send Reset Email'}
                    </button>
                    <button
                      onClick={() => setShowForgotModal(false)}
                      className="w-full rounded-xl border border-gray-200 py-3 text-sm font-bold text-gray-600 hover:bg-gray-50 transition"
                    >
                      Cancel
                    </button>
                  </div>
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
