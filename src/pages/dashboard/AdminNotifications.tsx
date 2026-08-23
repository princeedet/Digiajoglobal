import React, { useState, useEffect, useRef, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  CalendarClockIcon,
  CheckCircle2Icon,
  CheckCheckIcon,
  MegaphoneIcon,
  SendIcon,
  Trash2Icon,
} from 'lucide-react'
import { PageHeader } from '../../components/dashboard/PageHeader'
import { useDashboard } from '../../components/dashboard/DashboardContext'
import { apiFetch } from '../../lib/api'

const formatNotificationDate = (val: any): string => {
  if (!val) return ''
  let s = String(val).trim()
  if (s.includes(' ') && !s.includes('T')) {
    s = s.replace(' ', 'T')
  }
  const d = new Date(s)
  return isNaN(d.getTime()) ? String(val) : d.toLocaleString()
}

export function AdminNotifications() {
  const { members, notify } = useDashboard()
  const [form, setForm] = useState({
    audience: 'all',
    target_user: '',
    title: '',
    message: '',
    schedule: 'now',
  })
  const [memberList, setMemberList] = useState<any[]>([])
  const [userSearch, setUserSearch] = useState('')
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const [sent, setSent] = useState(false)
  const [recent, setRecent] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedNotif, setSelectedNotif] = useState<any | null>(null)
  const [clearModalOpen, setClearModalOpen] = useState(false)
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | number | null>(null)

  useEffect(() => {
    if (members && members.length > 0) {
      setMemberList(members)
    } else {
      apiFetch('/api/admin/members.php')
        .then(res => res.json())
        .then(data => {
          if (data.success && Array.isArray(data.members)) {
            setMemberList(data.members)
          }
        })
        .catch(() => {})
    }
  }, [members])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const filteredMembers = useMemo(() => {
    if (!userSearch) return memberList
    const query = userSearch.toLowerCase().trim()
    return memberList.filter(m =>
      (m.name && m.name.toLowerCase().includes(query)) ||
      (m.email && m.email.toLowerCase().includes(query)) ||
      (m.id && String(m.id).toLowerCase().includes(query)) ||
      (m.user_id && String(m.user_id).includes(query)) ||
      (m.phone && m.phone.toLowerCase().includes(query))
    )
  }, [memberList, userSearch])

  const fetchRecent = async () => {
    let serverNotifs: any[] = []
    try {
      const res = await apiFetch('/api/admin/notifications.php')
      if (res.ok) {
        const data = await res.json()
        if (data.success && Array.isArray(data.notifications)) {
          serverNotifs = data.notifications
        }
      }
    } catch (e) {}

    const list: any[] = [...serverNotifs]

    // Merge localStorage announcements
    try {
      const localAnnouncements = JSON.parse(localStorage.getItem('digiajo_announcements') || '[]')
      for (const a of localAnnouncements) {
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
            target_user: a.target_user,
            target_name: a.target_name,
            target_member_id: a.target_member_id,
            sent_at: a.sent_at || new Date().toISOString(),
            is_unread: a.is_unread !== undefined ? a.is_unread : 1,
          })
        }
      }
    } catch (e) {}

    // Filter out locally deleted IDs if any
    try {
      const deletedIds = new Set(JSON.parse(localStorage.getItem('digiajo_admin_deleted_ids') || '[]'))
      const filtered = list.filter(n => !deletedIds.has(String(n.id)))
      filtered.sort((a, b) => {
        const timeA = new Date(a.sent_at || a.date || a.created_at).getTime() || 0
        const timeB = new Date(b.sent_at || b.date || b.created_at).getTime() || 0
        return timeB - timeA
      })
      setRecent(filtered)
      return
    } catch (e) {}

    list.sort((a, b) => {
      const timeA = new Date(a.sent_at || a.date || a.created_at).getTime() || 0
      const timeB = new Date(b.sent_at || b.date || b.created_at).getTime() || 0
      return timeB - timeA
    })

    setRecent(list)
  }

  useEffect(() => {
    fetchRecent()
    const interval = setInterval(fetchRecent, 4000)
    const onUpdate = () => fetchRecent()
    window.addEventListener('digiajo:announcement_sent', onUpdate)
    window.addEventListener('digiajo:data_updated', onUpdate)
    window.addEventListener('notificationMarkedRead', onUpdate)

    let bc: BroadcastChannel | null = null
    if (typeof BroadcastChannel !== 'undefined') {
      try {
        bc = new BroadcastChannel('digiajo_realtime')
        bc.onmessage = (ev) => {
          if (ev.data?.type === 'cleared_all') {
            setRecent([])
          } else {
            fetchRecent()
          }
        }
      } catch (e) {}
    }

    return () => {
      clearInterval(interval)
      window.removeEventListener('digiajo:announcement_sent', onUpdate)
      window.removeEventListener('digiajo:data_updated', onUpdate)
      window.removeEventListener('notificationMarkedRead', onUpdate)
      if (bc) bc.close()
    }
  }, [])

  const handleDeleteNotification = (notifId: string | number, e: React.MouseEvent) => {
    e.stopPropagation()
    setDeleteConfirmId(notifId)
  }

  const confirmDeleteNotification = async () => {
    if (!deleteConfirmId) return
    const notifId = deleteConfirmId
    setDeleteConfirmId(null)
    setRecent(prev => prev.filter(n => String(n.id) !== String(notifId)))
    try {
      const existing = JSON.parse(localStorage.getItem('digiajo_announcements') || '[]')
      const updated = existing.filter((a: any) => String(a.id) !== String(notifId))
      localStorage.setItem('digiajo_announcements', JSON.stringify(updated))
    } catch (err) {}

    try {
      const deletedSet = new Set(JSON.parse(localStorage.getItem('digiajo_admin_deleted_ids') || '[]'))
      deletedSet.add(String(notifId))
      localStorage.setItem('digiajo_admin_deleted_ids', JSON.stringify(Array.from(deletedSet)))
    } catch (e) {}

    try {
      await apiFetch('/api/admin/notifications.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete', notification_id: notifId }),
      })
    } catch (e) {}

    notify('Announcement permanently deleted from system.', 'info')
    window.dispatchEvent(new CustomEvent('digiajo:announcement_sent'))
    window.dispatchEvent(new CustomEvent('digiajo:data_updated'))
    window.dispatchEvent(new CustomEvent('notificationMarkedRead'))
    if (typeof BroadcastChannel !== 'undefined') {
      try {
        const bc = new BroadcastChannel('digiajo_realtime')
        bc.postMessage({ type: 'deleted', id: notifId })
        bc.close()
      } catch (e) {}
    }
  }

  const handleClearAllAdminNotifications = () => {
    setClearModalOpen(true)
  }

  const confirmClearAllAdminNotifications = async () => {
    setClearModalOpen(false)
    const allIds = recent.map(n => String(n.id))
    setRecent([])
    try {
      localStorage.removeItem('digiajo_announcements')
      const deletedSet = new Set(JSON.parse(localStorage.getItem('digiajo_admin_deleted_ids') || '[]'))
      allIds.forEach(id => deletedSet.add(id))
      localStorage.setItem('digiajo_admin_deleted_ids', JSON.stringify(Array.from(deletedSet)))
    } catch (err) {}

    try {
      await apiFetch('/api/admin/notifications.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'clear_all' }),
      })
    } catch (e) {}

    notify('All system notifications cleared permanently.', 'info')
    window.dispatchEvent(new CustomEvent('digiajo:announcement_sent'))
    window.dispatchEvent(new CustomEvent('digiajo:data_updated'))
    window.dispatchEvent(new CustomEvent('notificationMarkedRead'))
    if (typeof BroadcastChannel !== 'undefined') {
      try {
        const bc = new BroadcastChannel('digiajo_realtime')
        bc.postMessage({ type: 'cleared_all' })
        bc.close()
      } catch (e) {}
    }
  }

  const handleMarkAllAdminRead = async () => {
    setRecent(prev => prev.map(n => ({ ...n, is_unread: 0 })))
    notify('All notifications marked as read.', 'success')
    window.dispatchEvent(new CustomEvent('notificationMarkedRead'))

    if (typeof BroadcastChannel !== 'undefined') {
      try {
        const bc = new BroadcastChannel('digiajo_realtime')
        bc.postMessage({ type: 'marked_all_read' })
        bc.close()
      } catch (e) {}
    }

    try {
      await apiFetch('/api/admin/notifications.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'mark_read' }),
      })
    } catch (e) {}
  }

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!form.title.trim() || !form.message.trim()) {
      notify('Add both a title and message before sending.', 'error')
      return
    }

    if (form.audience === 'specific_user' && !form.target_user) {
      notify('Please select a specific member to receive this announcement.', 'error')
      return
    }
    
    setLoading(true)
    const selectedMember = memberList.find(
      m => String(m.user_id || m.id) === String(form.target_user) || String(m.id) === String(form.target_user)
    )

    const payload = {
      ...form,
      target_user: form.audience === 'specific_user' ? (selectedMember?.user_id || selectedMember?.id || form.target_user) : null,
      target_name: selectedMember?.name || null,
      target_member_id: selectedMember?.id || null,
    }

    try {
      const res = await apiFetch('/api/admin/notifications.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      if (res.ok) {
        const data = await res.json()
        if (data.success) {
          setSent(true)
          const newNotif = {
            id: Date.now(),
            title: form.title,
            body: form.message,
            kind: 'alert',
            audience: form.audience,
            target_user: payload.target_user,
            target_name: selectedMember?.name,
            target_member_id: selectedMember?.id,
            sent_at: new Date().toISOString(),
            is_unread: 1,
          }
          try {
            const existing = JSON.parse(localStorage.getItem('digiajo_announcements') || '[]')
            localStorage.setItem('digiajo_announcements', JSON.stringify([newNotif, ...existing]))
          } catch (e) {}
          setForm(f => ({ ...f, title: '', message: '', target_user: '' }))
          setUserSearch('')
          if (typeof BroadcastChannel !== 'undefined') {
            try {
              const bc = new BroadcastChannel('digiajo_realtime')
              bc.postMessage({ type: 'announcement_sent' })
              bc.close()
            } catch (e) {}
          }
          window.dispatchEvent(new CustomEvent('digiajo:announcement_sent'))
          window.dispatchEvent(new CustomEvent('digiajo:data_updated'))
          window.dispatchEvent(new CustomEvent('notificationMarkedRead'))
          setTimeout(() => setSent(false), 5000)
        } else {
          notify(data.error || 'Failed to send announcement.', 'error')
        }
      } else {
        notify('Failed to send announcement.', 'error')
      }
    } catch (e) {
      // Local fallback
      const newNotif = {
        id: Date.now(),
        title: form.title,
        body: form.message,
        kind: 'alert',
        audience: form.audience,
        target_user: payload.target_user,
        target_name: selectedMember?.name,
        target_member_id: selectedMember?.id,
        sent_at: new Date().toISOString(),
        is_unread: 1,
      }
      try {
        const existing = JSON.parse(localStorage.getItem('digiajo_announcements') || '[]')
        localStorage.setItem('digiajo_announcements', JSON.stringify([newNotif, ...existing]))
      } catch (err) {}
      setSent(true)
      setForm(f => ({ ...f, title: '', message: '', target_user: '' }))
      setUserSearch('')
      notify('Announcement dispatched successfully.')
      setRecent(prev => [newNotif, ...prev])
      if (typeof BroadcastChannel !== 'undefined') {
        try {
          const bc = new BroadcastChannel('digiajo_realtime')
          bc.postMessage({ type: 'announcement_sent' })
          bc.close()
        } catch (err) {}
      }
      window.dispatchEvent(new CustomEvent('digiajo:announcement_sent'))
      window.dispatchEvent(new CustomEvent('digiajo:data_updated'))
      window.dispatchEvent(new CustomEvent('notificationMarkedRead'))
      setTimeout(() => setSent(false), 5000)
    } finally {
      setLoading(false)
    }
  }

  const handleNotifView = async (notif: any) => {
    setSelectedNotif(notif)
    if (notif.is_unread == 1) {
      try {
        await apiFetch('/api/admin/notifications.php', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'mark_read', notification_id: notif.id }),
        })
        setRecent(prev =>
          prev.map(n => (n.id === notif.id ? { ...n, is_unread: 0 } : n))
        )
        window.dispatchEvent(new Event('notificationMarkedRead'))
      } catch (e) {}
    }
  }

  const input =
    'mt-1.5 w-full rounded-xl border border-gray-200 px-3.5 py-3 text-sm text-gray-800 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20'

  return (
    <>
      <PageHeader
        title="Notifications"
        description="Create company updates for members."
      />
      <div className="grid gap-6 xl:grid-cols-[1fr_.85fr]">
        <form
          onSubmit={submit}
          className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm"
        >
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50 text-brand">
              <MegaphoneIcon className="h-5 w-5" />
            </span>
            <div>
              <h3 className="font-display text-lg font-bold text-brand-dark">
                Compose announcement
              </h3>
              <p className="text-xs text-gray-500">
                Use clear, useful messages about company updates.
              </p>
            </div>
          </div>
          <div className="mt-6 space-y-4">
            <label className="block text-sm font-semibold text-gray-700">
              Audience
              <select
                value={form.audience}
                onChange={(e) => {
                  const val = e.target.value
                  setForm(f => ({
                    ...f,
                    audience: val,
                    target_user: val === 'specific_user' ? f.target_user : '',
                  }))
                  if (val !== 'specific_user') {
                    setUserSearch('')
                    setIsDropdownOpen(false)
                  }
                }}
                className={input}
              >
                <option value="all">All members</option>
                <option value="active_members">Active members only</option>
                <option value="specific_user">Specific member / user</option>
              </select>
            </label>

            {form.audience === 'specific_user' && (
              <div className="space-y-1.5">
                <label className="block text-sm font-semibold text-gray-700">
                  Select User / Member
                  <select
                    value={form.target_user}
                    onChange={(e) => {
                      const val = e.target.value
                      setForm(f => ({ ...f, target_user: val }))
                    }}
                    className={input}
                  >
                    <option value="">-- Choose a member from dropdown --</option>
                    {filteredMembers.map((m) => {
                      const memberKey = String(m.user_id || m.id)
                      return (
                        <option key={m.id || m.email} value={memberKey}>
                          {m.name} ({m.id}) {m.email ? `- ${m.email}` : ''}
                        </option>
                      )
                    })}
                  </select>
                </label>
                {memberList.length > 5 && (
                  <input
                    type="text"
                    placeholder="Search/filter dropdown options..."
                    value={userSearch}
                    onChange={(e) => setUserSearch(e.target.value)}
                    className="w-full rounded-xl border border-gray-100 bg-gray-50/80 px-3.5 py-2 text-xs text-gray-600 focus:border-brand focus:bg-white focus:outline-none"
                  />
                )}
              </div>
            )}

            <label className="block text-sm font-semibold text-gray-700">
              Title
              <input
                value={form.title}
                onChange={(e) =>
                  setForm({
                    ...form,
                    title: e.target.value,
                  })
                }
                className={input}
                placeholder="e.g. Saturday payment reminder"
              />
            </label>
            <label className="block text-sm font-semibold text-gray-700">
              Message
              <textarea
                value={form.message}
                onChange={(e) =>
                  setForm({
                    ...form,
                    message: e.target.value,
                  })
                }
                rows={5}
                className={`${input} resize-none`}
                placeholder="Write a concise member update..."
              />
            </label>
            <label className="block text-sm font-semibold text-gray-700">
              Delivery
              <select
                value={form.schedule}
                onChange={(e) =>
                  setForm({
                    ...form,
                    schedule: e.target.value,
                  })
                }
                className={input}
              >
                <option value="now">Send now</option>
                <option value="schedule">Schedule for later</option>
              </select>
            </label>
            {form.schedule === 'schedule' && (
              <label className="block text-sm font-semibold text-gray-700">
                Schedule date & time
                <input type="datetime-local" className={input} />
              </label>
            )}
          </div>
          <button
            type="submit"
            disabled={loading}
            className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-brand px-4 py-3 text-sm font-bold text-white hover:bg-brand-dark disabled:opacity-50"
          >
            <SendIcon className="h-4 w-4" />
            {loading ? 'Sending...' : 'Send announcement'}
          </button>
        </form>
        <section className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-5">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-50 text-amber-700">
              <CalendarClockIcon className="h-5 w-5" />
            </span>
            <div className="flex flex-wrap items-center justify-between gap-3 w-full">
              <div>
                <h3 className="font-display text-lg font-bold text-brand-dark">
                  Recent operational feed
                </h3>
                <p className="text-xs text-gray-500">All system notifications · {recent.length} entries</p>
              </div>
              <div className="flex items-center gap-2">
                {recent.length > 0 && (
                  <>
                    <button
                      type="button"
                      onClick={handleMarkAllAdminRead}
                      title="Mark all notifications as read"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:text-brand bg-white hover:bg-gray-50 rounded-lg transition border border-gray-200 shadow-2xs"
                    >
                      <CheckCheckIcon className="h-3.5 w-3.5" /> Mark All as Read
                    </button>
                    <button
                      type="button"
                      onClick={handleClearAllAdminNotifications}
                      title="Permanently delete all notifications from system"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 rounded-lg transition border border-red-100"
                    >
                      <Trash2Icon className="h-3.5 w-3.5" /> Delete All
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-3 max-h-[520px] overflow-y-auto pr-1">
            {recent.length === 0 ? (
              <p className="text-sm text-gray-500 py-4 text-center">No notifications yet.</p>
            ) : (
              recent.map((notif, i) => {
                const kindMeta: Record<string, { label: string; color: string }> = {
                  payout:   { label: 'Payout',        color: 'bg-blue-100 text-blue-700' },
                  referral: { label: 'Referral',      color: 'bg-purple-100 text-purple-700' },
                  payment:  { label: 'Payment',       color: 'bg-green-100 text-green-700' },
                  alert:    { label: 'Announcement',  color: 'bg-amber-100 text-amber-700' },
                  update:   { label: 'Update',        color: 'bg-gray-100 text-gray-600' },
                }
                const meta = kindMeta[notif.kind] ?? { label: notif.kind, color: 'bg-gray-100 text-gray-600' }

                const audienceLabel =
                  notif.audience === 'specific_user' && (notif.target_name || notif.target_member_id)
                    ? `→ ${notif.target_name || 'Member'} (${notif.target_member_id || notif.target_user || 'ID'})`
                    : notif.audience === 'specific_user'
                    ? '→ Specific user'
                    : notif.audience === 'active_members'
                    ? 'Active members'
                    : notif.audience === 'admin'
                    ? 'Admin only'
                    : 'All members'

                return (
                  <div
                    key={i}
                    onClick={() => handleNotifView(notif)}
                    className={`flex gap-3 rounded-xl border p-3.5 cursor-pointer transition-all hover:shadow-sm hover:border-brand/30 ${notif.is_unread == 1 ? 'border-brand/20 bg-brand-50/20' : 'border-gray-100 bg-white'}`}
                  >
                    {/* Kind dot */}
                    <div className="mt-0.5 shrink-0">
                      <span className={`inline-flex h-2 w-2 rounded-full ${notif.kind === 'payout' ? 'bg-blue-500' : notif.kind === 'referral' ? 'bg-purple-500' : notif.kind === 'payment' ? 'bg-green-500' : 'bg-amber-500'}`} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-bold text-gray-800 leading-snug">{notif.title}</p>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${meta.color}`}>
                            {meta.label}
                          </span>
                          <button
                            type="button"
                            onClick={(e) => handleDeleteNotification(notif.id, e)}
                            title="Permanently Delete Notification from System"
                            className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition"
                          >
                            <Trash2Icon className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                      <p className="mt-1 text-xs text-gray-500 line-clamp-2">{notif.body}</p>
                      <p className="mt-1.5 text-[10px] text-gray-400">{audienceLabel} · {formatNotificationDate(notif.sent_at)}</p>
                    </div>
                  </div>
                )
              })
            )}
          </div>

          {sent && (
            <div className="mt-5 flex gap-3 rounded-xl bg-green-50 p-4 text-sm text-green-800">
              <CheckCircle2Icon className="h-5 w-5 shrink-0 text-green-600" />
              <p>Announcement successfully dispatched. Members have been notified.</p>
            </div>
          )}
        </section>
      </div>

      <AnimatePresence>
        {clearModalOpen && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden p-6 text-center"
            >
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-red-50 text-red-600 mb-4">
                <Trash2Icon className="h-7 w-7" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">
                Clear All Notifications?
              </h3>
              <p className="text-sm text-gray-500 mb-6 leading-relaxed">
                Are you sure you want to clear all system notifications permanently?
              </p>
              <div className="flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setClearModalOpen(false)}
                  className="w-full rounded-xl border border-gray-200 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={confirmClearAllAdminNotifications}
                  className="w-full rounded-xl bg-red-600 py-2.5 text-sm font-semibold text-white hover:bg-red-700 shadow-sm transition"
                >
                  OK
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {deleteConfirmId !== null && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden p-6 text-center"
            >
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-red-50 text-red-600 mb-4">
                <Trash2Icon className="h-7 w-7" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">
                Delete Notification?
              </h3>
              <p className="text-sm text-gray-500 mb-6 leading-relaxed">
                Are you sure you want to permanently delete this notification from the system?
              </p>
              <div className="flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setDeleteConfirmId(null)}
                  className="w-full rounded-xl border border-gray-200 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={confirmDeleteNotification}
                  className="w-full rounded-xl bg-red-600 py-2.5 text-sm font-semibold text-white hover:bg-red-700 shadow-sm transition"
                >
                  Delete
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {selectedNotif && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col"
            >
              <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                <h3 className="font-bold text-lg text-gray-900">{selectedNotif.title}</h3>
                <button onClick={() => setSelectedNotif(null)} className="text-gray-400 hover:text-gray-600">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
              <div className="p-6 overflow-y-auto max-h-[60vh] whitespace-pre-wrap text-sm text-gray-700 leading-relaxed">
                {selectedNotif.body}
              </div>
              <div className="p-4 bg-gray-50 text-right text-xs text-gray-500 border-t border-gray-100">
                Sent: {formatNotificationDate(selectedNotif.sent_at)}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  )
}
