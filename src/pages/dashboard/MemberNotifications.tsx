import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { BellIcon } from 'lucide-react'
import { PageHeader } from '../../components/dashboard/PageHeader'
import { getCurrentUser } from '../../lib/persistence'

export function MemberNotifications() {
  const [notifications, setNotifications] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedNotif, setSelectedNotif] = useState<any | null>(null)
  const currentUser = getCurrentUser()

  useEffect(() => {
    if (!currentUser) return
    const fetchNotifications = async () => {
      try {
        const res = await fetch(`/Digiajoglobal/api/member/notifications.php?member_id=${currentUser.id}`)
        const data = await res.json()
        if (data.success) {
          setNotifications(data.notifications || [])
        }
      } catch (e) {
        console.error(e)
      } finally {
        setLoading(false)
      }
    }
    fetchNotifications()
  }, [currentUser])

  return (
    <>
      <PageHeader
        title="Notifications"
        description="Stay updated with the latest announcements, alerts, and operational feed."
      />
      <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm min-h-[500px]">
        <div className="flex items-center gap-3 border-b border-gray-100 pb-5 mb-5">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50 text-brand">
            <BellIcon className="h-5 w-5" />
          </span>
          <div>
            <h3 className="font-display text-lg font-bold text-brand-dark">
              Your Inbox
            </h3>
            <p className="text-xs text-gray-500">
              All notifications and alerts
            </p>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center p-10">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-brand border-t-transparent" />
          </div>
        ) : notifications.length === 0 ? (
          <div className="p-10 text-center text-sm text-gray-500">
            No notifications found.
          </div>
        ) : (
          <div className="space-y-4">
            {notifications.map((notif, i) => (
              <div 
                key={i} 
                onClick={() => setSelectedNotif(notif)}
                className={`p-4 border border-gray-100 rounded-xl cursor-pointer hover:border-brand hover:shadow-sm transition-all ${notif.is_unread ? 'bg-brand-50/20' : 'bg-white'}`}
              >
                <div className="flex justify-between items-start gap-4">
                  <div>
                    <h4 className="text-sm font-bold text-gray-800">{notif.title}</h4>
                    <p className="text-xs text-gray-600 mt-1.5 line-clamp-2">{notif.body}</p>
                  </div>
                  {notif.is_unread === 1 && (
                    <span className="shrink-0 h-2 w-2 rounded-full bg-brand mt-1.5" />
                  )}
                </div>
                <p className="text-[10px] text-gray-400 mt-3">{new Date(notif.sent_at).toLocaleString()}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      <AnimatePresence>
        {selectedNotif && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                <h3 className="font-bold text-lg text-gray-900 pr-4">{selectedNotif.title}</h3>
                <button onClick={() => setSelectedNotif(null)} className="shrink-0 text-gray-400 hover:text-gray-600">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
              <div className="p-6 overflow-y-auto whitespace-pre-wrap text-sm text-gray-700 leading-relaxed">
                {selectedNotif.body}
              </div>
              <div className="p-4 bg-gray-50 text-right text-xs text-gray-500 border-t border-gray-100 shrink-0">
                Sent: {new Date(selectedNotif.sent_at).toLocaleString()}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  )
}
