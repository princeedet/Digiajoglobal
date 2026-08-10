import React from 'react'
import { HashRouter, Routes, Route } from 'react-router-dom'
import { Layout } from './components/layout/Layout'
import { AppShell } from './components/dashboard/AppShell'
import { Home } from './pages/Home'
import { DoubleUp } from './pages/DoubleUp'
import { DigiMart } from './pages/DigiMart'
import { About } from './pages/About'
import { FAQs } from './pages/FAQs'
import { Contact } from './pages/Contact'
import { Register } from './pages/Register'
import { Login } from './pages/Login'
import { Verify } from './pages/Verify'
import { DigiRide } from './pages/DigiRide'
import { Legal } from './pages/Legal'
import { NotFound } from './pages/NotFound'
import { MemberDashboard } from './pages/dashboard/MemberDashboard'
import { PaymentHistory } from './pages/dashboard/PaymentHistory'
import { SavingsHistory } from './pages/dashboard/SavingsHistory'
import { Referrals } from './pages/dashboard/Referrals'
import { MemberNotifications } from './pages/dashboard/MemberNotifications'
import { MemberSettings } from './pages/dashboard/MemberSettings'
import { AdminDashboard } from './pages/dashboard/AdminDashboard'
import { AdminUsers } from './pages/dashboard/AdminUsers'
import { AdminPayments } from './pages/dashboard/AdminPayments'
import { AdminPayouts } from './pages/dashboard/AdminPayouts'
import { AdminNotifications } from './pages/dashboard/AdminNotifications'
import { AdminSettings } from './pages/dashboard/AdminSettings'
import { AdminReferrals } from './pages/dashboard/AdminReferrals'
import { clearSeedData } from './lib/persistence'

// ── One-time migration: wipe stale seed data if present from old build ────────
const DATA_VERSION = 'v2'
if (localStorage.getItem('digiajo_data_version') !== DATA_VERSION) {
  clearSeedData()
  localStorage.setItem('digiajo_data_version', DATA_VERSION)
}
export function App() {
  return (
    <HashRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Home />} />
          <Route path="/double-up" element={<DoubleUp />} />
          <Route path="/digimart" element={<DigiMart />} />
          <Route path="/about" element={<About />} />
          <Route path="/faqs" element={<FAQs />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/register" element={<Register />} />
          <Route path="/verify" element={<Verify />} />
          <Route path="/digiride" element={<DigiRide />} />
          <Route path="/legal/terms" element={<Legal type="terms" />} />
          <Route path="/legal/privacy" element={<Legal type="privacy" />} />
        </Route>

        <Route path="/login" element={<Login />} />
        <Route element={<AppShell role="member" />}>
          <Route path="/dashboard" element={<MemberDashboard />} />
          <Route path="/dashboard/payments" element={<PaymentHistory />} />
          <Route path="/dashboard/savings" element={<SavingsHistory />} />
          <Route path="/dashboard/referrals" element={<Referrals />} />
          <Route path="/dashboard/notifications" element={<MemberNotifications />} />
          <Route path="/dashboard/settings" element={<MemberSettings />} />
        </Route>
        <Route element={<AppShell role="admin" />}>
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/admin/users" element={<AdminUsers />} />
          <Route path="/admin/payments" element={<AdminPayments />} />
          <Route path="/admin/payouts" element={<AdminPayouts />} />
          <Route path="/admin/referrals" element={<AdminReferrals />} />
          <Route path="/admin/notifications" element={<AdminNotifications />} />
          <Route path="/admin/settings" element={<AdminSettings />} />
        </Route>
        <Route path="*" element={<NotFound />} />
      </Routes>
    </HashRouter>
  )
}
