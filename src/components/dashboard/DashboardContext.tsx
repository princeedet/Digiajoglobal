import React, { useMemo, useState, createContext, useContext, useEffect } from 'react'
import {
  type MemberUser,
  type Payment,
  type PaymentStatus,
  type UserStatus,
} from '../../lib/dashboard-data'

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

  const refreshData = async () => {
    setIsLoading(true)
    try {
      const [membersRes, paymentsRes, statsRes] = await Promise.all([
        fetch('/api/admin/members.php'),
        fetch('/api/admin/payments.php'),
        fetch('/api/admin/stats.php')
      ])

      if (membersRes.ok) {
        const membersData = await membersRes.json()
        if (membersData.success) setMembers(membersData.members)
      }

      if (paymentsRes.ok) {
        const paymentsData = await paymentsRes.json()
        if (paymentsData.success) setPayments(paymentsData.payments)
      }

      if (statsRes.ok) {
        const statsData = await statsRes.json()
        if (statsData.success) {
          setStats(statsData.stats)
          setRecentPayments(statsData.recentPayments)
        }
      }
    } catch (e) {
      console.error('Failed to fetch dashboard data', e)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    refreshData()
    // Poll for live feedback every 10 seconds
    const interval = setInterval(() => {
      refreshData()
    }, 10000)
    return () => clearInterval(interval)
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
        try {
          const res = await fetch('/api/admin/payments.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'approve', id })
          })
          const data = await res.json()
          if (data.success) {
            notify(`Payment ${id} approved successfully.`)
            refreshData()
          } else {
            notify(data.error || 'Failed to approve payment', 'error')
          }
        } catch (e) {
          notify('Network error approving payment', 'error')
        }
      },
      rejectPayment: async (id) => {
        try {
          const res = await fetch('/api/admin/payments.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'reject', id })
          })
          const data = await res.json()
          if (data.success) {
            notify(`Payment ${id} rejected.`, 'error')
            refreshData()
          } else {
            notify(data.error || 'Failed to reject payment', 'error')
          }
        } catch (e) {
          notify('Network error rejecting payment', 'error')
        }
      },
      updateUserStatus: async (id, status) => {
        try {
          const res = await fetch('/api/admin/members.php', {
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
          notify('Network error updating status', 'error')
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
