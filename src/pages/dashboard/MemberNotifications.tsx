import React, { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  BellIcon,
  CreditCardIcon,
  PiggyBankIcon,
  MegaphoneIcon,
  UsersIcon,
  ShieldCheckIcon,
  AlertTriangleIcon,
  CheckCheckIcon,
  SparklesIcon,
  CheckCircle2Icon,
  CalendarDaysIcon,
  Trash2Icon,
} from 'lucide-react'
import { PageHeader } from '../../components/dashboard/PageHeader'
import { getCurrentUser, getStoredPayments } from '../../lib/persistence'
import { apiFetch } from '../../lib/api'

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

export function MemberNotifications() {
  const [notifications, setNotifications] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedNotif, setSelectedNotif] = useState<any | null>(null)
  const [activeTab, setActiveTab] = useState<'all' | 'savings' | 'announcements' | 'referrals' | 'account'>('all')
  const currentUser = getCurrentUser()
  const currentUserId = currentUser ? String(currentUser.id) : ''

  const fetchNotifications = async () => {
    if (!currentUser) return
    let serverNotifs: any[] = []
    try {
      const res = await apiFetch(`/api/member/notifications.php?member_id=${encodeURIComponent(currentUser.id)}&email=${encodeURIComponent(currentUser.email || '')}&name=${encodeURIComponent(currentUser.name || '')}`)
      if (res.ok) {
        const data = await res.json()
        if (data.success && Array.isArray(data.notifications)) {
          serverNotifs = data.notifications
        }
      }
    } catch (e) {
      console.error(e)
    }

    const list: any[] = [...serverNotifs]

    // Check offline / localStorage announcements
    try {
      const localAnnouncements = JSON.parse(localStorage.getItem('digiajo_announcements') || '[]')
      for (const a of localAnnouncements) {
        const isForMe =
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

    // Check local payments
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

    const deletedIds = getDeletedNotifIds(currentUserId)
    const readIds = getReadNotifIds(currentUserId)

    const activeList = list.filter(n => !deletedIds.has(String(n.id)))

    // Apply local read status overrides
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
    setLoading(false)
  }

  useEffect(() => {
    fetchNotifications()
    const handleUpdate = () => fetchNotifications()
    const interval = setInterval(fetchNotifications, 4000)

    window.addEventListener('digiajo:announcement_sent', handleUpdate)
    window.addEventListener('digiajo:data_updated', handleUpdate)
    window.addEventListener('notificationMarkedRead', handleUpdate)

    let bc: BroadcastChannel | null = null
    if (typeof BroadcastChannel !== 'undefined') {
      try {
        bc = new BroadcastChannel('digiajo_realtime')
        bc.onmessage = (ev) => {
          if (ev.data?.type === 'cleared_all') {
            setNotifications([])
          } else {
            fetchNotifications()
          }
        }
      } catch (e) {}
    }

    return () => {
      clearInterval(interval)
      window.removeEventListener('digiajo:announcement_sent', handleUpdate)
      window.removeEventListener('digiajo:data_updated', handleUpdate)
      window.removeEventListener('notificationMarkedRead', handleUpdate)
      if (bc) bc.close()
    }
  }, [currentUser])

  const handleDeleteNotification = async (notifId: string | number, e: React.MouseEvent) => {
    e.stopPropagation()
    addDeletedNotifId(notifId, currentUserId)
    setNotifications(prev => prev.filter(n => String(n.id) !== String(notifId)))
    window.dispatchEvent(new CustomEvent('notificationMarkedRead'))
    if (typeof BroadcastChannel !== 'undefined') {
      try {
        const bc = new BroadcastChannel('digiajo_realtime')
        bc.postMessage({ type: 'deleted', id: notifId })
        bc.close()
      } catch (err) {}
    }
    if (currentUser) {
      try {
        await apiFetch('/api/member/notifications.php', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ member_id: currentUser.id, action: 'delete', notification_id: notifId }),
        })
      } catch (err) {}
    }
  }

  const handleClearAllNotifications = async () => {
    if (!currentUser || notifications.length === 0) return
    notifications.forEach(n => addDeletedNotifId(n.id, currentUserId))
    setNotifications([])
    window.dispatchEvent(new CustomEvent('notificationMarkedRead'))
    if (typeof BroadcastChannel !== 'undefined') {
      try {
        const bc = new BroadcastChannel('digiajo_realtime')
        bc.postMessage({ type: 'cleared_all' })
        bc.close()
      } catch (err) {}
    }
    try {
      await apiFetch('/api/member/notifications.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ member_id: currentUser.id, action: 'clear_all' }),
      })
    } catch (err) {}
  }

  const handleSelectNotification = async (notif: any) => {
    setSelectedNotif(notif)
    if ((notif.is_unread == 1 || notif.is_unread === true) && currentUser) {
      addReadNotifId(notif.id, currentUserId)
      setNotifications(prev =>
        prev.map(n => (String(n.id) === String(notif.id) ? { ...n, is_unread: 0 } : n))
      )
      window.dispatchEvent(new CustomEvent('notificationMarkedRead'))
      if (typeof BroadcastChannel !== 'undefined') {
        try {
          const bc = new BroadcastChannel('digiajo_realtime')
          bc.postMessage({ type: 'marked_read', id: notif.id })
          bc.close()
        } catch (e) {}
      }
      try {
        await apiFetch('/api/member/notifications.php', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ member_id: currentUser.id, notification_id: notif.id }),
        })
      } catch (e) {}
    }
  }



  const handleMarkAllAsRead = async () => {
    if (!currentUser) return
    notifications.forEach(n => addReadNotifId(n.id, currentUserId))
    setNotifications(prev => prev.map(n => ({ ...n, is_unread: 0 })))
    window.dispatchEvent(new CustomEvent('notificationMarkedRead'))
    if (typeof BroadcastChannel !== 'undefined') {
      try {
        const bc = new BroadcastChannel('digiajo_realtime')
        bc.postMessage({ type: 'marked_all_read' })
        bc.close()
      } catch (e) {}
    }
    try {
      await apiFetch('/api/member/notifications.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ member_id: currentUser.id }),
      })
    } catch (e) {}
  }

  const getCategory = (n: any) => {
    const title = (n.title || '').toLowerCase()
    const kind = (n.kind || '').toLowerCase()
    const body = (n.body || '').toLowerCase()
    const type = (n.type || '').toLowerCase()
    const audience = (n.audience || '').toLowerCase()

    if (title.includes('saving') || title.includes('payment') || title.includes('hand') || kind === 'payment' || type === 'payment' || body.includes('₦')) return 'savings'
    if (title.includes('announcement') || title.includes('reminder') || kind === 'alert' || type === 'alert' || audience === 'all' || audience === 'active_members' || audience === 'specific_user' || audience === 'general') return 'announcements'
    if (title.includes('referral') || title.includes('milestone') || kind === 'referral' || type === 'referral') return 'referrals'
    return 'account'
  }

  const filteredNotifications = useMemo(() => {
    if (activeTab === 'all') return notifications
    return notifications.filter(n => getCategory(n) === activeTab)
  }, [notifications, activeTab])

  const unreadCount = useMemo(() => {
    return notifications.filter(n => n.is_unread == 1).length
  }, [notifications])

  const getMeta = (notif: any) => {
    const cat = getCategory(notif)
    const title = (notif.title || '').toLowerCase()
    const isError = notif.kind === 'error' || title.includes('decline') || title.includes('reject') || title.includes('suspend')
    const isSuccess = notif.kind === 'success' || title.includes('approved') || title.includes('active') || title.includes('unlocked')

    if (isError) {
      return {
        icon: AlertTriangleIcon,
        color: 'text-red-600 bg-red-50 border-red-100',
        badge: 'bg-red-100 text-red-700',
        badgeLabel: 'Alert',
      }
    }
    if (cat === 'savings') {
      return {
        icon: isSuccess ? CheckCircle2Icon : PiggyBankIcon,
        color: 'text-brand bg-brand-50 border-brand-100',
        badge: isSuccess ? 'bg-emerald-100 text-emerald-800' : 'bg-brand-100 text-brand-dark',
        badgeLabel: isSuccess ? 'Approved' : 'Savings',
      }
    }
    if (cat === 'announcements') {
      return {
        icon: MegaphoneIcon,
        color: 'text-amber-600 bg-amber-50 border-amber-100',
        badge: 'bg-amber-100 text-amber-800',
        badgeLabel: 'Broadcast',
      }
    }
    if (cat === 'referrals') {
      return {
        icon: UsersIcon,
        color: 'text-purple-600 bg-purple-50 border-purple-100',
        badge: 'bg-purple-100 text-purple-800',
        badgeLabel: 'Referral',
      }
    }
    return {
      icon: ShieldCheckIcon,
      color: 'text-blue-600 bg-blue-50 border-blue-100',
      badge: 'bg-blue-100 text-blue-800',
      badgeLabel: 'Account',
    }
  }

  return (
    <>
      <PageHeader
        title="Notifications & Activity"
        description="Real-time activity logs, savings contributions, admin broadcasts, and referral alerts."
      />

      <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm min-h-[550px]">
        {/* Header toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-gray-100 pb-5 mb-5">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50 text-brand">
              <BellIcon className="h-5 w-5" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-display text-lg font-bold text-brand-dark">
                  Your Activity Feed
                </h3>
                {unreadCount > 0 && (
                  <span className="rounded-full bg-brand px-2 py-0.5 text-[11px] font-bold text-white">
                    {unreadCount} unread
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-500">
                Track all savings, payments, broadcasts, and system updates
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {notifications.length > 0 && (
              <>
                <button
                  onClick={handleMarkAllAsRead}
                  title="Mark all notifications as read"
                  className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 hover:text-brand transition-colors shadow-2xs"
                >
                  <CheckCheckIcon className="h-3.5 w-3.5" />
                  Mark All as Read
                </button>
                <button
                  onClick={handleClearAllNotifications}
                  title="Delete all notifications"
                  className="inline-flex items-center gap-1.5 rounded-xl border border-red-100 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-100 hover:text-red-700 transition-colors"
                >
                  <Trash2Icon className="h-3.5 w-3.5" />
                  Delete All
                </button>
              </>
            )}
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex flex-wrap gap-2 mb-6">
          {[
            { id: 'all', label: 'All Activities' },
            { id: 'savings', label: 'Savings & Payments' },
            { id: 'announcements', label: 'Announcements' },
            { id: 'referrals', label: 'Referrals' },
            { id: 'account', label: 'Account & Security' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`rounded-xl px-3.5 py-1.5 text-xs font-semibold transition-all ${
                activeTab === tab.id
                  ? 'bg-brand text-white shadow-sm'
                  : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* List Content */}
        {loading ? (
          <div className="flex justify-center p-12">
            <div className="h-7 w-7 animate-spin rounded-full border-2 border-brand border-t-transparent" />
          </div>
        ) : filteredNotifications.length === 0 ? (
          <div className="py-16 text-center text-sm text-gray-500">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-gray-50 text-gray-400">
              <BellIcon className="h-6 w-6" />
            </div>
            <p className="font-semibold text-gray-700">No notifications in this category</p>
            <p className="text-xs text-gray-400 mt-1">Activities and announcements will appear here as they occur.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredNotifications.map((notif, i) => {
              const meta = getMeta(notif)
              const IconComp = meta.icon

              return (
                <div 
                  key={i} 
                  onClick={() => handleSelectNotification(notif)}
                  className={`flex gap-3.5 p-4 border rounded-2xl cursor-pointer transition-all hover:border-brand/40 hover:shadow-sm ${
                    notif.is_unread == 1 
                      ? 'border-brand/30 bg-brand-50/15' 
                      : 'border-gray-100 bg-white'
                  }`}
                >
                  <div className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border ${meta.color}`}>
                    <IconComp className="h-5 w-5" />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="text-sm font-bold text-gray-900 leading-snug">
                        {notif.title}
                      </h4>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${meta.badge}`}>
                          {meta.badgeLabel}
                        </span>
                        <button
                          type="button"
                          onClick={(e) => handleDeleteNotification(notif.id, e)}
                          title="Delete Notification"
                          className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition"
                        >
                          <Trash2Icon className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                    <p className="text-xs text-gray-600 mt-1 line-clamp-2 leading-relaxed">
                      {notif.body}
                    </p>
                    <div className="flex items-center gap-2 mt-2.5 text-[11px] text-gray-400">
                      <CalendarDaysIcon className="h-3 w-3" />
                      <span>{formatNotificationDate(notif.sent_at)}</span>
                      {notif.is_unread == 1 && (
                        <span className="inline-flex items-center gap-1 font-bold text-brand ml-auto">
                          <span className="h-1.5 w-1.5 rounded-full bg-brand" /> New
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Modal View for full notification text */}
      <AnimatePresence>
        {selectedNotif && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/45 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50/80">
                <div className="flex items-center gap-2.5 pr-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-50 text-brand">
                    <BellIcon className="h-4 w-4" />
                  </span>
                  <h3 className="font-bold text-base text-gray-900 leading-tight">
                    {selectedNotif.title}
                  </h3>
                </div>
                <button 
                  onClick={() => setSelectedNotif(null)} 
                  className="shrink-0 rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>

              <div className="p-6 overflow-y-auto whitespace-pre-wrap text-sm text-gray-700 leading-relaxed font-sans">
                {selectedNotif.body}
              </div>

              <div className="p-4 bg-gray-50 text-right text-xs text-gray-500 border-t border-gray-100 shrink-0">
                Date Dispatched: {formatNotificationDate(selectedNotif.sent_at)}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  )
}
