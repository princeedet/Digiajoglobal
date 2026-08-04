import React, { useEffect, useRef, useState } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { MenuIcon, XIcon, ChevronDownIcon, PiggyBankIcon, ShoppingBasketIcon, TruckIcon } from 'lucide-react'
import { Logo } from '../ui/Logo'
import { Button } from '../ui/Button'

const services = [
  {
    label: 'Double Up Savings',
    to: '/double-up',
    icon: PiggyBankIcon,
    desc: 'Save weekly, earn 100% match',
  },
  {
    label: 'DigiMart Co-ownership',
    to: '/digimart',
    icon: ShoppingBasketIcon,
    desc: 'Invest once, earn up to 50%',
  },
  {
    label: 'DigiRide Egg Express',
    to: '/digiride',
    icon: TruckIcon,
    desc: 'Fresh eggs, reliable supply',
  },
]

const topLinks = [
  { label: 'Home', to: '/' },
  { label: 'About Us', to: '/about' },
  { label: 'FAQs', to: '/faqs' },
  { label: 'Contact', to: '/contact' },
]

function ServicesDropdown() {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLLIElement>(null)
  const location = useLocation()
  const isServiceActive = services.some((s) => location.pathname === s.to)

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // Close on route change
  useEffect(() => setOpen(false), [location.pathname])

  return (
    <li ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className={`flex items-center gap-1 rounded-full px-3.5 py-2 text-sm font-medium transition-colors ${
          isServiceActive ? 'bg-brand-50 text-brand-dark' : 'text-gray-600 hover:text-brand-dark'
        }`}
        aria-expanded={open}
        aria-haspopup="true"
      >
        Our Services
        <ChevronDownIcon
          className={`h-4 w-4 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.97 }}
            transition={{ duration: 0.15 }}
            className="absolute left-1/2 top-full z-50 mt-2 w-64 -translate-x-1/2 overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-xl"
          >
            {services.map((s) => (
              <NavLink
                key={s.to}
                to={s.to}
                className={({ isActive }) =>
                  `flex items-start gap-3 px-4 py-3.5 transition-colors hover:bg-brand-50 ${
                    isActive ? 'bg-brand-50' : ''
                  }`
                }
              >
                <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand/10">
                  <s.icon className="h-4 w-4 text-brand" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-brand-dark">{s.label}</p>
                  <p className="text-xs text-gray-500">{s.desc}</p>
                </div>
              </NavLink>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </li>
  )
}

export function Header() {
  const [open, setOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const [mobileServicesOpen, setMobileServicesOpen] = useState(false)
  const location = useLocation()

  useEffect(() => { setOpen(false); setMobileServicesOpen(false) }, [location.pathname])
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8)
    onScroll()
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <header
      className={`sticky top-0 z-40 w-full transition-all duration-300 ${scrolled ? 'bg-white/95 shadow-sm backdrop-blur' : 'bg-white'}`}
    >
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-5 py-3.5 lg:px-8">
        <Link to="/" aria-label="DigiAjo Global home">
          <Logo />
        </Link>

        {/* Desktop nav */}
        <ul className="hidden items-center gap-1 lg:flex">
          {topLinks.map((l) => (
            <li key={l.to}>
              <NavLink
                to={l.to}
                className={({ isActive }) =>
                  `rounded-full px-3.5 py-2 text-sm font-medium transition-colors ${
                    isActive ? 'bg-brand-50 text-brand-dark' : 'text-gray-600 hover:text-brand-dark'
                  }`
                }
              >
                {l.label}
              </NavLink>
            </li>
          ))}
          <ServicesDropdown />
        </ul>

        {/* Desktop CTA buttons */}
        <div className="hidden items-center gap-3 lg:flex">
          <Button to="/login" variant="secondary" size="md">Login</Button>
          <Button to="/register" variant="accent" size="md">Start Saving Now</Button>
        </div>

        {/* Mobile hamburger */}
        <button
          className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-brand-dark lg:hidden"
          onClick={() => setOpen((v) => !v)}
          aria-label={open ? 'Close menu' : 'Open menu'}
          aria-expanded={open}
        >
          {open ? <XIcon className="h-6 w-6" /> : <MenuIcon className="h-6 w-6" />}
        </button>
      </nav>

      {/* Mobile menu */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden border-t border-gray-100 bg-white lg:hidden"
          >
            <ul className="flex flex-col gap-1 px-5 py-4">
              {topLinks.map((l) => (
                <li key={l.to}>
                  <NavLink
                    to={l.to}
                    className={({ isActive }) =>
                      `block rounded-lg px-3 py-2.5 text-sm font-medium ${
                        isActive ? 'bg-brand-50 text-brand-dark' : 'text-gray-700'
                      }`
                    }
                  >
                    {l.label}
                  </NavLink>
                </li>
              ))}

              {/* Mobile services accordion */}
              <li>
                <button
                  onClick={() => setMobileServicesOpen((v) => !v)}
                  className="flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-sm font-medium text-gray-700"
                >
                  Our Services
                  <ChevronDownIcon
                    className={`h-4 w-4 transition-transform duration-200 ${mobileServicesOpen ? 'rotate-180' : ''}`}
                  />
                </button>
                <AnimatePresence>
                  {mobileServicesOpen && (
                    <motion.ul
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      {services.map((s) => (
                        <li key={s.to}>
                          <NavLink
                            to={s.to}
                            className={({ isActive }) =>
                              `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm ${
                                isActive ? 'bg-brand-50 font-semibold text-brand-dark' : 'pl-6 text-gray-600'
                              }`
                            }
                          >
                            <s.icon className="h-4 w-4 shrink-0 text-brand" />
                            {s.label}
                          </NavLink>
                        </li>
                      ))}
                    </motion.ul>
                  )}
                </AnimatePresence>
              </li>

              <li className="pt-2">
                <Button to="/login" variant="secondary" className="w-full">Login</Button>
              </li>
              <li className="pt-2">
                <Button to="/register" variant="accent" className="w-full">Start Saving Now</Button>
              </li>
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  )
}
