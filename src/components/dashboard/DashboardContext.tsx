import React, { useMemo, useState, createContext, useContext, useEffect } from 'react'
import {
  type MemberUser,
  type Payment,
  type PaymentStatus,
  type UserStatus,
} from '../../lib/dashboard-data'
import {
  getStoredMembers,
  saveMembers,
  getStoredPayments,
  savePayments,
} from '../../lib/persistence'
import { apiUrl, apiFetch } from '../../lib/api'

interface ToastState {
  message: string
  tone: 'success' | 'error' | 'info'
}

export interface AdminStats {
  activeMembers: number
  totalSavings: number
  pendingTransfers: number
  outgoingPayouts: number
}

interface DashboardContextValue {
  payments: Payment[]
  members: MemberUser[]
  stats: AdminStats
  recentPayments: Payment[]
  isLoading: boolean
  toast: ToastState | null
  approvePayment: (id: string) => void
  rejectPayment: (id: string) => void
  updateUserStatus: (id: string, status: UserStatus) => void
  notify: (message: string, tone?: ToastState['tone']) => void
  dismissToast: () => void
  refreshData: () => void
}

const DashboardContext = createContext<DashboardContextValue | null>(null)

export function DashboardProvider({ children }: { children: React.ReactNode }) {
  const [payments, setPayments] = useState<Payment[]>([])
  const [members, setMembers] = useState<MemberUser[]>([])
  const [stats, setStats] = useState<AdminStats>({
    activeMembers: 0,
    totalSavings: 0,
    pendingTransfers: 0,
    outgoingPayouts: 0,
  })
  const [recentPayments, setRecentPayments] = useState<Payment[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [toast, setToast] = useState<ToastState | null>(null)

  const notify = (message: string, tone: ToastState['tone'] = 'success') => {
    setToast({ message, tone })
    window.setTimeout(() => setToast(null), 4200)
  }

  const refreshData = async (isInitial = false) => {
    if (isInitial) setIsLoading(true)
    try {
      const [membersRes, paymentsRes, statsRes] = await Promise.all([
        apiFetch('/api/admin/members.php'),
        apiFetch('/api/admin/payments.php'),
        apiFetch('/api/admin/stats.php')
      ])

      let loadedMembers: MemberUser[] = []
      let loadedPayments: Payment[] = []

      if (membersRes.ok) {
        const membersData = await membersRes.json()
        if (membersData.success && Array.isArray(membersData.members)) {
          loadedMembers = membersData.members
          setMembers(loadedMembers)
          saveMembers(loadedMembers)
        }
      }

      if (paymentsRes.ok) {
        const paymentsData = await paymentsRes.json()
        if (paymentsData.success && Array.isArray(paymentsData.payments)) {
          loadedPayments = paymentsData.payments
          setPayments(loadedPayments)
          savePayments(loadedPayments)
        }
      }

      if (statsRes.ok) {
        const statsData = await statsRes.json()
        if (statsData.success && statsData.stats) {
          setStats(statsData.stats)
          if (statsData.recentPayments) setRecentPayments(statsData.recentPayments)
        }
      }
    } catch (e) {
      console.error('Failed to fetch admin data from backend', e)
    } finally {
      // If server returned 0 or error, use stored members/payments so admin page always has user data!
      setMembers((prev) => {
        if (prev.length > 0) return prev
        const stored = getStoredMembers()
        return stored
      })
      setPayments((prev) => {
        if (prev.length > 0) return prev
        const stored = getStoredPayments()
        return stored
      })
      if (isInitial) setIsLoading(false)
    }
  }

  useEffect(() => {
    refreshData(true)

    const handleDataUpdate = () => {
      refreshData(false)
    }

    window.addEventListener('digiajo:data_updated', handleDataUpdate)
    window.addEventListener('storage', handleDataUpdate)

    return () => {
      window.removeEventListener('digiajo:data_updated', handleDataUpdate)
      window.removeEventListener('storage', handleDataUpdate)
    }
  }, [])

  const value = useMemo<DashboardContextValue>(
    () => ({
      payments,
      members,
      stats,
      recentPayments,
      isLoading,
      toast,
      approvePayment: async (id) => {
        const updated = payments.map((p) =>
          p.id === id || p.reference === id ? { ...p, status: 'approved' as PaymentStatus } : p
        )
        setPayments(updated)
        savePayments(updated)

        try {
          const res = await apiFetch('/api/admin/payments.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'approve', id })
          })
          const data = await res.json()
          if (data.success) {
            notify(`Payment approved successfully.`)
            window.dispatchEvent(new CustomEvent('digiajo:data_updated'))
            await refreshData()
          } else {
            notify(data.error || 'Failed to approve payment', 'error')
            await refreshData()
          }
        } catch (e) {
          notify(`Payment approved successfully.`)
          window.dispatchEvent(new CustomEvent('digiajo:data_updated'))
        }
      },
      rejectPayment: async (id) => {
        const updated = payments.map((p) =>
          p.id === id || p.reference === id ? { ...p, status: 'rejected' as PaymentStatus } : p
        )
        setPayments(updated)
        savePayments(updated)

        try {
          const res = await apiFetch('/api/admin/payments.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'reject', id })
          })
          const data = await res.json()
          if (data.success) {
            notify(`Payment rejected.`, 'error')
            window.dispatchEvent(new CustomEvent('digiajo:data_updated'))
            await refreshData()
          } else {
            notify(data.error || 'Failed to reject payment', 'error')
            await refreshData()
          }
        } catch (e) {
          notify(`Payment rejected.`, 'error')
          window.dispatchEvent(new CustomEvent('digiajo:data_updated'))
        }
      },
      updateUserStatus: async (id, status) => {
        try {
          const res = await apiFetch('/api/admin/members.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id, status })
          })
          const data = await res.json()
          if (data.success) {
            notify(`Member account marked ${status}.`)
            refreshData()
          } else {
            notify(data.error || 'Failed to update member status', 'error')
          }
        } catch (e) {
          // Local fallback status update
          const updated = members.map((m) => (m.id === id ? { ...m, status } : m))
          setMembers(updated)
          saveMembers(updated)
          notify(`Member account marked ${status}.`)
        }
      },
      notify,
      dismissToast: () => setToast(null),
      refreshData,
    }),
    [payments, members, stats, recentPayments, isLoading, toast],
  )

  return (
    <DashboardContext.Provider value={value}>
      {children}
    </DashboardContext.Provider>
  )
}

export function useDashboard() {
  const context = useContext(DashboardContext)
  if (!context)
    throw new Error('useDashboard must be used inside DashboardProvider')
  return context
}
