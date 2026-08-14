import {
  BanknoteIcon,
  CreditCardIcon,
  LandmarkIcon,
  type LucideIcon,
} from 'lucide-react'

export type PaymentStatus = 'approved' | 'pending' | 'rejected'
export type UserStatus = 'active' | 'suspended' | 'pending_verification'
export type PaymentChannel = 'Bank transfer' | 'Card' | 'USSD'

export interface Payment {
  id: string
  member: string
  memberId: string
  amount: number
  date: string
  reference: string
  channel: PaymentChannel
  status: PaymentStatus
  purpose: string
}

export interface SavingsRecord {
  week: number
  dueDate: string
  paidDate: string | null
  amount: number
  hands: number
  fine: number
  status: 'paid' | 'late' | 'upcoming' | 'missed' | 'approved' | 'pending' | 'rejected'
  reference: string
  isMonthly: boolean
  weekInBatch: number
  totalInBatch: number
}

export interface PlanSummary {
  planId: number
  handName: string
  planType: string
  weeksCompleted: number
  totalWeeks: number
  totalSaved: number
  totalFines: number
  startDate: string
  status: string
  weeklyAmount: number
}

export interface SavingsHand {
  summary: PlanSummary
  weeks: SavingsRecord[]
}

export interface MemberUser {
  id: string
  name: string
  email: string
  phone: string
  initials: string
  joined: string
  saved: number
  status: UserStatus
  plan: 'Double Up' | 'DigiMart'
  weeks?: number
  needsSecurityUpdate?: boolean
  referral_count?: number
  referred_by_name?: string | null
  bank_name?: string | null
  account_number?: string | null
  account_name?: string | null
}

export interface Referral {
  id: string
  name: string
  phone: string
  joined: string
  status: 'pending' | 'active' | 'paid'
  earnings: number
}

// ── All data starts empty — real data comes from MySQL via PHP API ─────────────
export const memberPayments: Payment[] = []
export const pendingTransfers: Payment[] = []
export const allPayments: Payment[] = []
export const savingsHistory: SavingsRecord[] = []
export const referrals: Referral[] = []
export const members: MemberUser[] = []
export const activity: { title: string; body: string; time: string; kind: string }[] = []

export const paymentChannels: { label: string; icon: LucideIcon }[] = [
  { label: 'Card', icon: CreditCardIcon },
  { label: 'Bank transfer', icon: LandmarkIcon },
  { label: 'USSD', icon: BanknoteIcon },
]
