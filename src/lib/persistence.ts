import { type MemberUser, type Payment } from './dashboard-data'

export { type MemberUser, type Payment }
export type { UserStatus, PaymentStatus } from './dashboard-data'

// ── Phone helpers ─────────────────────────────────────────────────────────────
export function getCleanDigits(phone: string): string {
  return phone.replace(/\D/g, '')
}

export function getLastSixDigits(phone: string): string {
  const digits = getCleanDigits(phone)
  return digits.slice(-6)
}

// ── Members ───────────────────────────────────────────────────────────────────
export function getStoredMembers(): MemberUser[] {
  const stored = localStorage.getItem('digiajo_members')
  if (stored) {
    try {
      return JSON.parse(stored)
    } catch (e) {
      console.error('Error parsing members from localStorage', e)
    }
  }
  // Start empty — no seed data
  return []
}

export function saveMembers(members: MemberUser[]) {
  localStorage.setItem('digiajo_members', JSON.stringify(members))
}

// ── Payments ──────────────────────────────────────────────────────────────────
export function getStoredPayments(): Payment[] {
  const stored = localStorage.getItem('digiajo_payments')
  if (stored) {
    try {
      return JSON.parse(stored)
    } catch (e) {
      console.error('Error parsing payments from localStorage', e)
    }
  }
  // Start empty — no seed data
  return []
}

export function savePayments(payments: Payment[]) {
  localStorage.setItem('digiajo_payments', JSON.stringify(payments))
}

// ── Current User Session ──────────────────────────────────────────────────────
export interface CurrentUserSession extends MemberUser {
  needsSecurityUpdate?: boolean
  role: 'member' | 'admin'
  customPassword?: string
}

export function getCurrentUser(): CurrentUserSession | null {
  const stored = localStorage.getItem('digiajo_current_user')
  if (stored) {
    try {
      return JSON.parse(stored)
    } catch (e) {
      console.error('Error parsing current user', e)
    }
  }
  return null
}

export function setCurrentUser(user: CurrentUserSession | null) {
  if (user) {
    localStorage.setItem('digiajo_current_user', JSON.stringify(user))
  } else {
    localStorage.removeItem('digiajo_current_user')
  }
}

export function clearCurrentUser() {
  localStorage.removeItem('digiajo_current_user')
}

/**
 * Call this on first app load (or when you want a full reset) to ensure
 * the browser doesn't have stale seed data from an older version of the app.
 */
export function clearSeedData() {
  localStorage.removeItem('digiajo_members')
  localStorage.removeItem('digiajo_payments')
}
