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
  Trash2Icon,
  type LucideIcon,
} from 'lucide-react'
import { Logo } from '../ui/Logo'
import { DashboardProvider, useDashboard } from './DashboardContext'
import { Toast } from './Toast'
import { getCurrentUser, clearCurrentUser, getStoredPayments } from '../../lib/persistence'
import { apiFetch } from '../../lib/api'
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
    to: '/user',
    label: 'Overview',
    icon: HomeIcon,
    end: true,
  },
  {
    to: '/user/payments',
    label: 'Payment history',
    icon: ReceiptTextIcon,
  },
  {
    to: '/user/savings',
    label: 'Savings history',
    icon: PiggyBankIcon,
  },
  {
    to: '/user/referrals',
    label: 'Referrals',
    icon: UsersIcon,
  },
  {
    to: '/user/notifications',
    label: 'Notifications',
    icon: BellIcon,
  },
  {
    to: '/user/settings',
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
  unreadCount = 0,
  onNavigate,
}: {
  role: Role
  unreadCount?: number
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
              <item.icon className="h-5 w-5" />
              <span>{item.label}</span>
              {item.to.includes('notifications') && unreadCount > 0 && (
                <span className="ml-auto flex h-5 min-w-[20px] items-center justify-center rounded-full bg-accent px-1.5 text-[10px] font-bold text-white shadow-xs animate-pulse">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
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
                navigate(role === 'member' ? '/user/settings' : '/admin/settings')
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
}
const getReadNotifIds = (userId?: string): Set<string> => {
  try {
    const key = userId ? `digiajo_read_notifications_${userId}` : 'digiajo_read_notifications'
    return new Set(JSON.parse(localStorage.getItem(key) || '[]'))
  } catch (e) {
    return new Set()
  }
}

const addReadNotifId = (id: string | number, userId?: string) => {
  try {
    const key = userId ? `digiajo_read_notifications_${userId}` : 'digiajo_read_notifications'
    const set = getReadNotifIds(userId)
    set.add(String(id))
    localStorage.setItem(key, JSON.stringify(Array.from(set)))
  } catch (e) {}
}

const getDeletedNotifIds = (userId?: string): Set<string> => {
  try {
    const key = userId ? `digiajo_deleted_notifications_${userId}` : 'digiajo_deleted_notifications'
    return new Set(JSON.parse(localStorage.getItem(key) || '[]'))
  } catch (e) {
    return new Set()
  }
}

const addDeletedNotifId = (id: string | number, userId?: string) => {
  try {
    const key = userId ? `digiajo_deleted_notifications_${userId}` : 'digiajo_deleted_notifications'
    const set = getDeletedNotifIds(userId)
    set.add(String(id))
    localStorage.setItem(key, JSON.stringify(Array.from(set)))
  } catch (e) {}
}

const parseTime = (val: any): number => {
  if (!val) return 0
  if (typeof val === 'number') return val
  if (typeof val === 'string') {
    let s = val.trim()
    if (s.includes('/')) {
      const parts = s.split(',')
      const dParts = parts[0].trim().split('/')
      if (dParts.length === 3) {
        const timePart = parts[1] ? parts[1].trim() : '00:00:00'
        const iso = `${dParts[2]}-${dParts[1].padStart(2, '0')}-${dParts[0].padStart(2, '0')}T${timePart}`
        const t = new Date(iso).getTime()
        if (!isNaN(t)) return t
      }
    }
    if (s.includes(' ') && !s.includes('T')) {
      s = s.replace(' ', 'T')
    }
    const t = new Date(s).getTime()
    if (!isNaN(t)) return t
  }
  return 0
}

const formatNotificationDate = (val: any): string => {
  if (!val) return ''
  let s = String(val).trim()
  if (s.includes(' ') && !s.includes('T')) {
    s = s.replace(' ', 'T')
  }
  const d = new Date(s)
  return isNaN(d.getTime()) ? String(val) : d.toLocaleString()
}

function NotificationBell({
  role,
  onUnreadCountChange,
}: {
  role: Role
  onUnreadCountChange?: (count: number) => void
}) {
  const [open, setOpen] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  const [notifications, setNotifications] = useState<any[]>([])
  const prevIdsRef = React.useRef<Set<string>>(new Set())
  const isInitialFetchRef = React.useRef(true)
  const currentUser = getCurrentUser()
  const currentUserId = currentUser ? String(currentUser.id) : ''
  const navigate = useNavigate()
  const { notify } = useDashboard()

  const requestPushPermission = async () => {
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'default') {
      try {
        await Notification.requestPermission()
      } catch (e) {}
    }
  }

  const fetchNotifications = async () => {
    if (!currentUser) return
    const endpoint =
      role === 'admin'
        ? '/api/admin/notifications.php'
        : `/api/member/notifications.php?member_id=${encodeURIComponent(currentUser.id)}&email=${encodeURIComponent(currentUser.email || '')}&name=${encodeURIComponent(currentUser.name || '')}`

    let serverNotifs: any[] = []
    try {
      const res = await apiFetch(endpoint)
      if (res.ok) {
        const data = await res.json()
        if (data.success && Array.isArray(data.notifications)) {
          serverNotifs = data.notifications
        }
      }
    } catch (e) {
      // Non-fatal if offline
    }

    const list: any[] = [...serverNotifs]

    // Merge offline / localStorage announcements
    try {
      const localAnnouncements = JSON.parse(localStorage.getItem('digiajo_announcements') || '[]')
      for (const a of localAnnouncements) {
        const isForMe =
          role === 'admin' ||
          a.audience === 'all' ||
          a.audience === 'active_members' ||
          a.audience === 'general' ||
          !a.audience ||
          String(a.target_user) === currentUserId ||
          String(a.target_member_id) === currentUserId ||
          (a.target_user && currentUserId && String(a.target_user).replace(/\D/g, '') === currentUserId.replace(/\D/g, '')) ||
          (a.target_name && currentUser.name && a.target_name.toLowerCase().includes(currentUser.name.toLowerCase())) ||
          (currentUser.email && a.target_user && String(a.target_user).toLowerCase() === currentUser.email.toLowerCase())

        if (isForMe) {
          const alreadyExists = list.some(n =>
            String(n.id) === String(a.id) ||
            (n.title === a.title && (n.body === (a.body || a.message)))
          )
          if (!alreadyExists) {
            list.push({
              id: a.id || `ann-${Date.now()}`,
              title: a.title,
              body: a.body || a.message,
              kind: a.kind || 'alert',
              type: a.type || 'alert',
              audience: a.audience || 'all',
              sent_at: a.sent_at || new Date().toISOString(),
              is_unread: a.is_unread !== undefined ? a.is_unread : 1,
            })
          }
        }
      }
    } catch (e) {}

    // Merge local payments for member role
    if (role === 'member' && currentUser) {
      const localPayments = getStoredPayments().filter(p =>
        p.memberId === currentUser.id ||
        (p.member && currentUser.name && p.member.toLowerCase() === currentUser.name.toLowerCase())
      )
      for (const p of localPayments) {
        const pRef = p.reference || p.id
        const isApproved = (p.status as string) === 'approved' || (p.status as string) === 'confirmed'
        const isRejected = (p.status as string) === 'rejected' || (p.status as string) === 'declined'
        const alreadyExists = list.some(n =>
          (n.body && n.body.includes(pRef)) ||
          (n.title && n.title.includes(pRef)) ||
          (String(n.id) === String(p.id)) ||
          (String(n.id) === `pay-${p.id || pRef}`)
        )
        if (!alreadyExists) {
          list.push({
            id: `pay-${p.id || pRef}`,
            title: isApproved ? 'Savings Payment Approved' : (isRejected ? 'Payment Verification Declined' : 'Savings Payment Submitted'),
            body: isApproved
              ? `Your contribution of ₦${Number(p.amount).toLocaleString()} (Ref: ${pRef}) has been confirmed and credited to your savings balance!`
              : (isRejected ? `Your payment submission of ₦${Number(p.amount).toLocaleString()} (Ref: ${pRef}) was declined. Please verify your receipt or re-submit.` : `Your savings contribution of ₦${Number(p.amount).toLocaleString()} (Ref: ${pRef}) has been received and is pending admin verification.`),
            kind: isApproved ? 'success' : (isRejected ? 'error' : 'info'),
            type: 'payment',
            sent_at: p.date || new Date().toISOString(),
            is_unread: isApproved ? 0 : 1,
          })
        }
      }
    }

    const deletedIds = getDeletedNotifIds(currentUserId)
    const readIds = getReadNotifIds(currentUserId)

    const activeList = list.filter(n => !deletedIds.has(String(n.id)))

    for (const n of activeList) {
      if (readIds.has(String(n.id))) {
        n.is_unread = 0
      }
    }

    activeList.sort((a, b) => {
      const timeA = parseTime(a.sent_at || a.date || a.created_at)
      const timeB = parseTime(b.sent_at || b.date || b.created_at)
      return timeB - timeA
    })

    setNotifications(activeList)
    let count = 0
    for (const n of activeList) {
      if (n.is_unread == 1 || n.is_unread === true) count++
    }
    setUnreadCount(count)

    // Trigger toast notification if new unread item arrived during active session
    if (!isInitialFetchRef.current) {
      for (const notif of activeList) {
        if ((notif.is_unread == 1 || notif.is_unread === true) && !prevIdsRef.current.has(String(notif.id))) {
          notify(`${notif.title}: ${notif.body}`, notif.kind === 'error' ? 'error' : (notif.kind === 'alert' ? 'info' : 'success'))

          if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
            try { navigator.vibrate([200, 100, 200]) } catch (e) {}
          }

          if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
            try {
              new Notification(notif.title || 'DigiAjo Notification', {
                body: notif.body,
                icon: '/favicon.svg',
              })
            } catch (e) {}
          }
        }
      }
    }

    isInitialFetchRef.current = false
    prevIdsRef.current = new Set(activeList.map(n => String(n.id)))
  }

  useEffect(() => {
    onUnreadCountChange?.(unreadCount)
  }, [unreadCount, onUnreadCountChange])

  useEffect(() => {
    fetchNotifications()
    const interval = setInterval(fetchNotifications, 4000)
    const onMarkedRead = () => fetchNotifications()
    window.addEventListener('notificationMarkedRead', onMarkedRead)
    window.addEventListener('digiajo:announcement_sent', onMarkedRead)
    window.addEventListener('digiajo:data_updated', onMarkedRead)

    let bc: BroadcastChannel | null = null
    if (typeof BroadcastChannel !== 'undefined') {
      try {
        bc = new BroadcastChannel('digiajo_realtime')
        bc.onmessage = (ev) => {
          if (ev.data?.type === 'cleared_all') {
            setNotifications([])
            setUnreadCount(0)
          } else {
            fetchNotifications()
          }
        }
      } catch (e) {}
    }

    return () => {
      clearInterval(interval)
      window.removeEventListener('notificationMarkedRead', onMarkedRead)
      window.removeEventListener('digiajo:announcement_sent', onMarkedRead)
      window.removeEventListener('digiajo:data_updated', onMarkedRead)
      if (bc) bc.close()
    }
  }, [currentUser, role])

  const handleDeleteOne = async (notifId: string | number, e: React.MouseEvent) => {
    e.stopPropagation()

    addDeletedNotifId(notifId, currentUserId)
    setNotifications(prev => prev.filter(n => String(n.id) !== String(notifId)))
    setUnreadCount(prev => (prev > 0 ? prev - 1 : 0))
    window.dispatchEvent(new CustomEvent('notificationMarkedRead'))

    if (role === 'admin') {
      try {
        const existing = JSON.parse(localStorage.getItem('digiajo_announcements') || '[]')
        const updated = existing.filter((a: any) => String(a.id) !== String(notifId))
        localStorage.setItem('digiajo_announcements', JSON.stringify(updated))
        const deletedSet = new Set(JSON.parse(localStorage.getItem('digiajo_admin_deleted_ids') || '[]'))
        deletedSet.add(String(notifId))
        localStorage.setItem('digiajo_admin_deleted_ids', JSON.stringify(Array.from(deletedSet)))
      } catch (err) {}
    }

    if (typeof BroadcastChannel !== 'undefined') {
      try {
        const bc = new BroadcastChannel('digiajo_realtime')
        bc.postMessage({ type: 'deleted', id: notifId })
        bc.close()
      } catch (err) {}
    }

    if (role === 'admin') {
      try {
        await apiFetch('/api/admin/notifications.php', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'delete', notification_id: notifId }),
        })
      } catch (err) {}
    } else if (currentUser) {
      try {
        await apiFetch('/api/member/notifications.php', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ member_id: currentUser.id, action: 'delete', notification_id: notifId }),
        })
      } catch (err) {}
    }
  }

  const markOneAsRead = async (notifId: string | number, wasUnread: boolean) => {
    if (!wasUnread || !currentUser) return
    addReadNotifId(notifId, currentUserId)

    setUnreadCount(prev => Math.max(0, prev - 1))
    setNotifications(prev =>
      prev.map(n => (String(n.id) === String(notifId) ? { ...n, is_unread: 0 } : n))
    )
    window.dispatchEvent(new CustomEvent('notificationMarkedRead'))

    if (typeof BroadcastChannel !== 'undefined') {
      try {
        const bc = new BroadcastChannel('digiajo_realtime')
        bc.postMessage({ type: 'marked_read', id: notifId })
        bc.close()
      } catch (e) {}
    }

    try {
      if (role === 'admin') {
        await apiFetch('/api/admin/notifications.php', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'mark_read', notification_id: notifId }),
        })
      } else {
        await apiFetch('/api/member/notifications.php', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ member_id: currentUser.id, notification_id: notifId }),
        })
      }
    } catch (e) {}
  }

  const handleMarkAllAsReadInBell = async () => {
    if (!currentUser) return
    notifications.forEach(n => addReadNotifId(n.id, currentUserId))
    setNotifications(prev => prev.map(n => ({ ...n, is_unread: 0 })))
    setUnreadCount(0)
    window.dispatchEvent(new CustomEvent('notificationMarkedRead'))

    if (typeof BroadcastChannel !== 'undefined') {
      try {
        const bc = new BroadcastChannel('digiajo_realtime')
        bc.postMessage({ type: 'marked_all_read' })
        bc.close()
      } catch (e) {}
    }

    try {
      if (role === 'admin') {
        await apiFetch('/api/admin/notifications.php', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'mark_read' }),
        })
      } else {
        await apiFetch('/api/member/notifications.php', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ member_id: currentUser.id }),
        })
      }
    } catch (e) {}
  }

  const handleNotificationClick = (notif: any) => {
    markOneAsRead(notif.id, notif.is_unread == 1 || notif.is_unread === true)
    setOpen(false)
    if (role === 'admin') {
      navigate('/admin/notifications')
    } else {
      navigate('/user/notifications')
    }
  }

  const bellRef = React.useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      if (bellRef.current && !bellRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }

    if (open) {
      document.addEventListener('mousedown', handleClickOutside)
      document.addEventListener('touchstart', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('touchstart', handleClickOutside)
    }
  }, [open])

  return (
    <div ref={bellRef} className="relative">
      <button
        onClick={() => {
          setOpen(o => !o)
          requestPushPermission()
        }}
        className="relative rounded-xl p-2 text-gray-500 hover:bg-brand-50 hover:text-brand transition"
        aria-label="View notifications"
      >
        <BellIcon className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-accent px-1 text-[10px] font-extrabold text-white ring-2 ring-white shadow-sm animate-bounce">
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
            className="absolute right-0 top-full z-50 mt-2 w-80 sm:w-96 rounded-2xl border border-gray-100 bg-white shadow-2xl overflow-hidden"
          >
            <div className="p-3.5 border-b border-gray-100 bg-gray-50/90 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-bold text-gray-900">Notifications</h4>
                {unreadCount > 0 && (
                  <span className="rounded-full bg-accent px-2 py-0.5 text-[10px] font-bold text-white">
                    {unreadCount} unread
                  </span>
                )}
              </div>
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={handleMarkAllAsReadInBell}
                  className="text-[11px] font-semibold text-brand hover:text-brand-dark hover:underline"
                >
                  Mark all as read
                </button>
              )}
            </div>
            <div className="max-h-80 overflow-y-auto divide-y divide-gray-100">
              {notifications.length === 0 ? (
                <div className="p-6 text-center text-sm text-gray-500">
                  <BellIcon className="h-7 w-7 text-gray-300 mx-auto mb-2" />
                  <p className="font-semibold text-gray-700">No notifications yet</p>
                  <p className="text-xs text-gray-400 mt-0.5">Announcements and activity will appear here.</p>
                </div>
              ) : (
                notifications.map((notif, i) => (
                  <div
                    key={i}
                    onClick={() => handleNotificationClick(notif)}
                    className={`flex items-start gap-3 p-3.5 hover:bg-gray-50 cursor-pointer transition-colors ${
                      notif.is_unread == 1 || notif.is_unread === true ? 'bg-brand-50/35' : ''
                    }`}
                  >
                    {/* Unread dot */}
                    <div className="mt-1.5 shrink-0">
                      <span className={`block h-2 w-2 rounded-full transition-all ${
                        notif.is_unread == 1 || notif.is_unread === true ? 'bg-accent' : 'bg-transparent'
                      }`} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-1">
                        <p className={`text-sm leading-snug ${
                          notif.is_unread == 1 || notif.is_unread === true ? 'font-bold text-gray-900' : 'font-medium text-gray-700'
                        }`}>
                          {notif.title}
                        </p>
                        <button
                          type="button"
                          onClick={(e) => handleDeleteOne(notif.id, e)}
                          title="Delete notification"
                          className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition shrink-0"
                        >
                          <Trash2Icon className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      <p className="text-xs text-gray-600 mt-0.5 line-clamp-2 leading-relaxed">{notif.body}</p>
                      <p className="text-[10px] text-gray-400 mt-1">{formatNotificationDate(notif.sent_at)}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
            <div className="p-2.5 border-t border-gray-100 bg-gray-50 text-center">
              <button
                type="button"
                onClick={() => {
                  setOpen(false)
                  navigate(role === 'admin' ? '/admin/notifications' : '/user/notifications')
                }}
                className="text-xs font-bold text-brand hover:text-brand-dark transition"
              >
                View all notifications &rarr;
              </button>
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
  const [unreadCount, setUnreadCount] = useState(0)
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
      : (location.pathname === '/user' || location.pathname === '/user/dashboard' || location.pathname === '/dashboard')
        ? 'My dashboard'
        : (location.pathname.startsWith('/user/') ? location.pathname.slice(6).replace(/-/g, ' ') : location.pathname.slice(11).replace(/-/g, ' '))
  return (
    <div className="min-h-screen bg-[#f6f8f6]">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col bg-brand-dark lg:flex">
        <SidebarContent role={role} unreadCount={unreadCount} />
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
                unreadCount={unreadCount}
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
            <h1 className="font-display text-xl font-bold capitalize text-brand-dark">
              {title}
            </h1>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <NotificationBell role={role} onUnreadCountChange={setUnreadCount} />
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
