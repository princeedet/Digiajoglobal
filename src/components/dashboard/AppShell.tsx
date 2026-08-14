import React, { useState, useEffect } from 'react'
import { NavLink, Outlet, useLocation, useNavigate, Navigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import {
  BellIcon,
  ChevronDownIcon,
  HomeIcon,
  LogOutIcon,
  MenuIcon,
  SettingsIcon,
  ShieldCheckIcon,
  UsersIcon,
  WalletCardsIcon,
  XIcon,
  LandmarkIcon,
  SendIcon,
  ReceiptTextIcon,
  UserRoundIcon,
  PiggyBankIcon,
  type LucideIcon,
} from 'lucide-react'
import { Logo } from '../ui/Logo'
import { DashboardProvider } from './DashboardContext'
import { Toast } from './Toast'
import { getCurrentUser, clearCurrentUser } from '../../lib/persistence'
type Role = 'member' | 'admin'
interface NavItem {
  id?: string
  to: string
  label: string
  icon: LucideIcon
  end?: boolean
}
const memberNav: NavItem[] = [
  {
    to: '/dashboard',
    label: 'Overview',
    icon: HomeIcon,
    end: true,
  },
  {
    to: '/dashboard/payments',
    label: 'Payment history',
    icon: ReceiptTextIcon,
  },
  {
    to: '/dashboard/savings',
    label: 'Savings history',
    icon: PiggyBankIcon,
  },
  {
    to: '/dashboard/referrals',
    label: 'Referrals',
    icon: UsersIcon,
  },
  {
    to: '/dashboard/notifications',
    label: 'Notifications',
    icon: BellIcon,
  },
  {
    to: '/dashboard/settings',
    label: 'Settings',
    icon: SettingsIcon,
  },
]
const adminNav: NavItem[] = [
  {
    id: 'dashboard',
    to: '/admin',
    label: 'Command centre',
    icon: HomeIcon,
    end: true,
  },
  {
    id: 'members',
    to: '/admin/users',
    label: 'Manage users',
    icon: UsersIcon,
  },
  {
    id: 'payments',
    to: '/admin/payments',
    label: 'Payments',
    icon: ReceiptTextIcon,
  },
  {
    id: 'payouts',
    to: '/admin/payouts',
    label: 'Payouts',
    icon: WalletCardsIcon,
  },
  {
    id: 'referrals',
    to: '/admin/referrals',
    label: 'Referrals',
    icon: UsersIcon,
  },
  {
    id: 'notifications',
    to: '/admin/notifications',
    label: 'Notifications',
    icon: SendIcon,
  },
  {
    id: 'staff',
    to: '/admin/staff',
    label: 'Staff Management',
    icon: ShieldCheckIcon,
  }
]
function SidebarContent({
  role,
  onNavigate,
}: {
  role: Role
  onNavigate?: () => void
}) {
  const currentUser = getCurrentUser()
  
  let nav = role === 'admin' ? adminNav : memberNav
  
  if (role === 'admin' && currentUser) {
    if (currentUser.adminRole === 'support') {
      const perms = currentUser.permissions || []
      nav = adminNav.filter(item => item.id && perms.includes(item.id))
    } else {
      // Super admin sees all, but we ensure 'staff' is there (it is, in the array)
    }
  }

  return (
    <>
      <div className="border-b border-white/10 px-5 py-5">
        <Logo variant="light" />
      </div>
      <div className="px-4 py-5">
        <p className="px-3 text-[11px] font-bold uppercase tracking-[0.14em] text-white/45">
          {role === 'admin' ? (currentUser?.adminRole === 'support' ? 'Staff workspace' : 'Super admin workspace') : 'Member workspace'}
        </p>
        <nav className="mt-3 space-y-1" aria-label={`${role} navigation`}>
          {nav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              onClick={onNavigate}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold transition-colors ${isActive ? 'bg-white text-brand-dark shadow-sm' : 'text-white/70 hover:bg-white/10 hover:text-white'}`
              }
            >
              <item.icon className="h-5 w-5" /> {item.label}
            </NavLink>
          ))}
        </nav>
      </div>
      <div className="mt-auto px-4 pb-5">
        <div className="rounded-2xl bg-white/10 p-4">
          <div className="flex items-center gap-2 text-sm font-bold text-white">
            {role === 'admin' ? (
              <ShieldCheckIcon className="h-4 w-4 text-accent" />
            ) : (
              <PiggyBankIcon className="h-4 w-4 text-accent" />
            )}
            {role === 'admin' ? 'Admin controls' : 'Stay on track'}
          </div>
          <p className="mt-1 text-xs leading-relaxed text-white/60">
            {role === 'admin'
              ? 'Actions in this dashboard are prototype-only.'
              : 'Your next ₦1,300 contribution is due Saturday.'}
          </p>
        </div>
      </div>
    </>
  )
}
function UserMenu({ role }: { role: Role }) {
  const [open, setOpen] = useState(false)
  const navigate = useNavigate()
  
  const currentUser = getCurrentUser()
  const name = currentUser ? currentUser.name : (role === 'admin' ? 'DigiAjo Global' : 'Adebimpe Adeyemi')
  const initials = currentUser ? currentUser.initials : (role === 'admin' ? 'DG' : 'AA')
  const userRoleText = currentUser ? (currentUser.role === 'admin' ? 'Super Admin' : 'Member') : (role === 'admin' ? 'Super Admin' : 'Member')

  const handleLogout = () => {
    clearCurrentUser()
    navigate('/login')
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-label="Open account menu"
        className="flex items-center gap-2 rounded-xl p-1.5 text-left hover:bg-gray-100"
      >
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand text-xs font-bold text-white">
          {initials}
        </span>
        <span className="hidden leading-tight sm:block col-span-1">
          <span className="block text-sm font-bold text-brand-dark">
            {name}
          </span>
          <span className="block text-xs text-gray-500">
            {userRoleText}
          </span>
        </span>
        <ChevronDownIcon className="hidden h-4 w-4 text-gray-500 sm:block" />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{
              opacity: 0,
              y: 8,
            }}
            animate={{
              opacity: 1,
              y: 0,
            }}
            exit={{
              opacity: 0,
              y: 8,
            }}
            className="absolute right-0 top-full z-50 mt-2 w-52 rounded-xl border border-gray-100 bg-white p-1.5 shadow-xl"
          >
            <button
              onClick={() => {
                setOpen(false)
                navigate(role === 'member' ? '/dashboard/settings' : '/admin/settings')
              }}
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
            >
              <UserRoundIcon className="h-4 w-4" /> Account settings
            </button>
            <button
              onClick={handleLogout}
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-red-600 hover:bg-red-50"
            >
              <LogOutIcon className="h-4 w-4" /> Log out
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}function NotificationBell({ role }: { role: Role }) {
  const [open, setOpen] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  const [notifications, setNotifications] = useState<any[]>([])
  const currentUser = getCurrentUser()
  const navigate = useNavigate()

  const fetchNotifications = () => {
    if (!currentUser) return
    const endpoint =
      role === 'admin'
        ? '/api/admin/notifications.php'
        : `/api/member/notifications.php?member_id=${currentUser.id}`

    fetch(endpoint)
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setNotifications(data.notifications || [])
          setUnreadCount(data.unreadCount || 0)
        }
      })
  }

  useEffect(() => {
    fetchNotifications()
    const interval = setInterval(fetchNotifications, 30000)
    // Also re-fetch when a notification is marked read from the notifications page
    const onMarkedRead = () => fetchNotifications()
    window.addEventListener('notificationMarkedRead', onMarkedRead)
    return () => {
      clearInterval(interval)
      window.removeEventListener('notificationMarkedRead', onMarkedRead)
    }
  }, [currentUser, role])

  // Mark ONE notification as read by its id, decrement count by 1
  const markOneAsRead = async (notifId: number, wasUnread: boolean) => {
    if (!wasUnread || !currentUser) return
    try {
      if (role === 'admin') {
        await fetch('/api/admin/notifications.php', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'mark_read', notification_id: notifId }),
        })
      } else {
        await fetch('/api/member/notifications.php', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ member_id: currentUser.id, notification_id: notifId }),
        })
      }
      // Optimistically decrement and mark as read in local state
      setUnreadCount(prev => Math.max(0, prev - 1))
      setNotifications(prev =>
        prev.map(n => (n.id === notifId ? { ...n, is_unread: 0 } : n))
      )
    } catch (e) {}
  }

  const handleNotificationClick = (notif: any) => {
    // Mark just this one as read
    markOneAsRead(notif.id, notif.is_unread == 1)
    setOpen(false)
    if (role === 'admin') {
      navigate('/admin/notifications')
    } else {
      navigate('/dashboard/notifications')
    }
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className="relative rounded-xl p-2 text-gray-500 hover:bg-brand-50 hover:text-brand"
        aria-label="View notifications"
      >
        <BellIcon className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute right-1.5 top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-accent text-[9px] font-bold text-white ring-2 ring-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            className="absolute right-0 top-full z-50 mt-2 w-80 rounded-xl border border-gray-100 bg-white shadow-xl overflow-hidden"
          >
            <div className="p-3 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
              <h4 className="text-sm font-bold text-gray-800">Notifications</h4>
              {unreadCount > 0 && (
                <span className="rounded-full bg-accent px-2 py-0.5 text-[10px] font-bold text-white">
                  {unreadCount} unread
                </span>
              )}
            </div>
            <div className="max-h-80 overflow-y-auto divide-y divide-gray-50">
              {notifications.length === 0 ? (
                <div className="p-4 text-center text-sm text-gray-500">No notifications yet.</div>
              ) : (
                notifications.map((notif, i) => (
                  <div
                    key={i}
                    onClick={() => handleNotificationClick(notif)}
                    className={`flex items-start gap-3 p-4 hover:bg-gray-50 cursor-pointer transition-colors ${notif.is_unread == 1 ? 'bg-brand-50/40' : ''}`}
                  >
                    {/* Unread dot */}
                    <div className="mt-1.5 shrink-0">
                      <span className={`block h-2 w-2 rounded-full transition-all ${notif.is_unread == 1 ? 'bg-accent' : 'bg-transparent'}`} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className={`text-sm leading-snug ${notif.is_unread == 1 ? 'font-bold text-gray-900' : 'font-medium text-gray-700'}`}>
                        {notif.title}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{notif.body}</p>
                      <p className="text-[10px] text-gray-400 mt-1">{new Date(notif.sent_at).toLocaleString()}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function AppShellContents({ role }: { role: Role }) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [isNavigating, setIsNavigating] = useState(false)
  const location = useLocation()
  
  useEffect(() => {
    setIsNavigating(true)
    const timer = setTimeout(() => {
      setIsNavigating(false)
    }, 600) // 600ms glowing reloader duration
    return () => clearTimeout(timer)
  }, [location.pathname])

  const title =
    role === 'admin'
      ? location.pathname === '/admin'
        ? 'Command centre'
        : location.pathname.slice(7).replace(/-/g, ' ')
      : location.pathname === '/dashboard'
        ? 'My dashboard'
        : location.pathname.slice(11).replace(/-/g, ' ')
  return (
    <div className="min-h-screen bg-[#f6f8f6]">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col bg-brand-dark lg:flex">
        <SidebarContent role={role} />
      </aside>

      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.button
              aria-label="Close navigation"
              onClick={() => setMobileOpen(false)}
              className="fixed inset-0 z-50 bg-black/35 lg:hidden"
              initial={{
                opacity: 0,
              }}
              animate={{
                opacity: 1,
              }}
              exit={{
                opacity: 0,
              }}
            />
            <motion.aside
              role="dialog"
              aria-label="Navigation menu"
              className="fixed inset-y-0 left-0 z-[60] flex w-72 flex-col bg-brand-dark shadow-2xl lg:hidden"
              initial={{
                x: -288,
              }}
              animate={{
                x: 0,
              }}
              exit={{
                x: -288,
              }}
              transition={{
                type: 'tween',
                duration: 0.22,
              }}
            >
              <button
                onClick={() => setMobileOpen(false)}
                className="absolute right-4 top-4 rounded-lg p-2 text-white/80 hover:bg-white/10"
                aria-label="Close navigation"
              >
                <XIcon className="h-5 w-5" />
              </button>
              <SidebarContent
                role={role}
                onNavigate={() => setMobileOpen(false)}
              />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      <div className="lg:pl-64">
        <header className="sticky top-0 z-30 flex h-[72px] items-center justify-between border-b border-gray-100 bg-white/95 px-4 backdrop-blur sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileOpen(true)}
              className="rounded-lg p-2 text-brand-dark hover:bg-brand-50 lg:hidden"
              aria-label="Open navigation"
            >
              <MenuIcon className="h-5 w-5" />
            </button>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-brand-light">
                {role === 'admin' ? 'Operations' : 'Member portal'}
              </p>
              <h1 className="font-display text-lg font-bold capitalize text-brand-dark">
                {title}
              </h1>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <NotificationBell role={role} />
            <UserMenu role={role} />
          </div>
        </header>
        <main className="relative p-4 sm:p-6 lg:p-8 min-h-[calc(100vh-72px)]">
          <AnimatePresence mode="wait">
            {isNavigating ? (
              <motion.div
                key="loader"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="absolute inset-0 z-40 flex flex-col items-center justify-center bg-[#f6f8f6]/90 backdrop-blur-sm"
              >
                {/* Outer glow rings */}
                <div className="relative flex items-center justify-center">
                  <div className="absolute h-32 w-32 animate-ping rounded-full bg-brand/10" style={{ animationDuration: '1.2s' }}></div>
                  <div className="absolute h-24 w-24 animate-ping rounded-full bg-brand/15" style={{ animationDuration: '1s', animationDelay: '0.2s' }}></div>
                  <div className="absolute h-32 w-32 rounded-full bg-brand/5 shadow-[0_0_40px_rgba(21,128,61,0.35)]"></div>

                  {/* Logo card */}
                  <div className="relative z-10 flex h-20 w-20 flex-col items-center justify-center rounded-2xl bg-white shadow-2xl shadow-brand/30 ring-2 ring-brand/20">
                    <PiggyBankIcon className="h-9 w-9 text-brand animate-pulse" style={{ animationDuration: '1.4s' }} />
                  </div>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key={location.pathname}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25, ease: 'easeOut' }}
              >
                <Outlet />
              </motion.div>
            )}
          </AnimatePresence>
        </main>
      </div>
      <Toast />
    </div>
  )
}
export function AppShell({ role }: { role: Role }) {
  const currentUser = getCurrentUser()
  if (!currentUser) {
    return <Navigate to="/login" replace />
  }
  
  // If we want strict role checks:
  // if (currentUser.role !== role) {
  //  return <Navigate to="/login" replace />
  // }

  return (
    <DashboardProvider>
      <AppShellContents role={role} />
    </DashboardProvider>
  )
}
