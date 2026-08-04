import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  CalendarClockIcon,
  CheckCircle2Icon,
  MegaphoneIcon,
  SendIcon,
} from 'lucide-react'
import { PageHeader } from '../../components/dashboard/PageHeader'
import { useDashboard } from '../../components/dashboard/DashboardContext'
export function AdminNotifications() {
  const { notify } = useDashboard()
  const [form, setForm] = useState({
    audience: 'all',
    title: '',
    message: '',
    schedule: 'now',
  })
  const [sent, setSent] = useState(false)
  const [recent, setRecent] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedNotif, setSelectedNotif] = useState<any | null>(null)

  const fetchRecent = () => {
    fetch('/Digiajoglobal/api/admin/notifications.php')
      .then(res => res.json())
      .then(data => {
        if (data.success) setRecent(data.notifications)
      })
  }

  React.useEffect(() => {
    fetchRecent()
  }, [])

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!form.title.trim() || !form.message.trim()) {
      notify('Add both a title and message before sending.', 'error')
      return
    }
    
    setLoading(true)
    try {
      const res = await fetch('/Digiajoglobal/api/admin/notifications.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      })
      const data = await res.json()
      if (data.success) {
        setSent(true)
        setForm(f => ({ ...f, title: '', message: '' }))
        notify('Announcement sent successfully.')
        fetchRecent()
        setTimeout(() => setSent(false), 5000)
      } else {
        notify(data.error || 'Failed to send announcement.', 'error')
      }
    } catch (e) {
      notify('Network error.', 'error')
    } finally {
      setLoading(false)
    }
  }
  const handleNotifView = async (notif: any) => {
    setSelectedNotif(notif)
    if (notif.is_unread == 1) {
      try {
        await fetch('/Digiajoglobal/api/admin/notifications.php', {
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
                onChange={(e) =>
                  setForm({
                    ...form,
                    audience: e.target.value,
                  })
                }
                className={input}
              >
                <option value="all">All members</option>
                <option value="active_members">Active members only</option>
              </select>
            </label>
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
            <div>
              <h3 className="font-display text-lg font-bold text-brand-dark">
                Recent operational feed
              </h3>
              <p className="text-xs text-gray-500">All system notifications · {recent.length} entries</p>
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
                  notif.audience === 'specific_user' && notif.target_name
                    ? `→ ${notif.target_name} (${notif.target_member_id})`
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
                        <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${meta.color}`}>
                          {meta.label}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-gray-500 line-clamp-2">{notif.body}</p>
                      <p className="mt-1.5 text-[10px] text-gray-400">{audienceLabel} · {new Date(notif.sent_at).toLocaleString()}</p>
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
        {selectedNotif && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40">
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
                Sent: {new Date(selectedNotif.sent_at).toLocaleString()}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  )
}
