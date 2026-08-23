import React, { useState } from 'react'
import {
  BellIcon,
  Building2Icon,
  CheckCircle2Icon,
  EyeIcon,
  EyeOffIcon,
  LockKeyholeIcon,
  UserRoundIcon,
} from 'lucide-react'
import { PageHeader } from '../../components/dashboard/PageHeader'
import { useDashboard } from '../../components/dashboard/DashboardContext'
import { getCurrentUser, setCurrentUser, getStoredMembers, saveMembers } from '../../lib/persistence'

export function AdminSettings() {
  const { notify } = useDashboard()
  const currentUser = getCurrentUser()

  const [profile, setProfile] = useState({
    name: currentUser?.name || 'Adebimpe Adeyemi',
    email: currentUser?.email || 'adebimpe@example.com',
    phone: currentUser?.phone || '0803 234 8182',
  })

  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  const handleSaveProfile = () => {
    if (!currentUser) return
    
    // Save to global list
    const members = getStoredMembers()
    const updatedMembers = members.map((m) => {
      if (m.id === currentUser.id) {
        return {
          ...m,
          name: profile.name,
          email: profile.email,
          phone: profile.phone,
        }
      }
      return m
    })
    saveMembers(updatedMembers)

    // Save to current user session & clear security alert flag
    const nextUser = {
      ...currentUser,
      name: profile.name,
      email: profile.email,
      phone: profile.phone,
      needsSecurityUpdate: false,
    }
    setCurrentUser(nextUser)
    notify('Profile details updated successfully and security flag cleared.')
  }

  const handleSavePassword = () => {
    if (!currentUser) return
    if (!newPassword.trim()) {
      notify('Password cannot be empty.', 'error')
      return
    }
    if (newPassword !== confirmPassword) {
      notify('Passwords do not match.', 'error')
      return
    }

    // Save new password
    localStorage.setItem(`digiajo_password_${currentUser.id}`, newPassword)

    // Clear session security update banner
    const nextUser = {
      ...currentUser,
      needsSecurityUpdate: false,
    }
    setCurrentUser(nextUser)

    setNewPassword('')
    setConfirmPassword('')
    notify('Password updated successfully. Security check completed.')
  }

  const input =
    'mt-1.5 w-full rounded-xl border border-gray-200 bg-white px-3.5 py-3 text-sm text-gray-800 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20'

  return (
    <>
      <PageHeader
        title="Settings"
        description="Keep your profile, alerts and payout details up to date."
      />
      <div className="grid gap-6 xl:grid-cols-2">
        {/* Profile Details */}
        <section className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand">
              <UserRoundIcon className="h-5 w-5" />
            </span>
            <div>
              <h3 className="font-display font-bold text-brand-dark">
                Profile details
              </h3>
              <p className="text-xs text-gray-500">
                Used for account communication.
              </p>
            </div>
          </div>
          <div className="mt-6 grid gap-4">
            <label className="text-sm font-semibold text-gray-700">
              Full name
              <input
                className={input}
                value={profile.name}
                onChange={(e) => setProfile({ ...profile, name: e.target.value })}
              />
            </label>
            <label className="text-sm font-semibold text-gray-700">
              Email address
              <input
                type="email"
                className={input}
                value={profile.email}
                onChange={(e) => setProfile({ ...profile, email: e.target.value })}
              />
            </label>
            <label className="text-sm font-semibold text-gray-700">
              Phone number
              <input
                className={input}
                value={profile.phone}
                onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
              />
            </label>
          </div>
          <button
            onClick={handleSaveProfile}
            className="mt-6 rounded-xl bg-brand px-4 py-3 text-sm font-bold text-white hover:bg-brand-dark"
          >
            Save profile
          </button>
        </section>



        {/* Account Security (Password change) */}
        <section className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand">
              <LockKeyholeIcon className="h-5 w-5" />
            </span>
            <div>
              <h3 className="font-display font-bold text-brand-dark">
                Account security
              </h3>
              <p className="text-xs text-gray-500">
                Change your sign-in password.
              </p>
            </div>
          </div>
          <div className="mt-6 grid gap-4">
            <label className="text-sm font-semibold text-gray-700">
              New Password
              <div className="relative">
                <input
                  type={showNewPassword ? 'text' : 'password'}
                  className={`${input} pr-11`}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded p-1 text-gray-400 hover:text-brand transition"
                  aria-label={showNewPassword ? 'Hide password' : 'Show password'}
                >
                  {showNewPassword ? (
                    <EyeOffIcon className="h-4 w-4" />
                  ) : (
                    <EyeIcon className="h-4 w-4" />
                  )}
                </button>
              </div>
            </label>
            <label className="text-sm font-semibold text-gray-700">
              Confirm New Password
              <div className="relative">
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  className={`${input} pr-11`}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter new password"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded p-1 text-gray-400 hover:text-brand transition"
                  aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                >
                  {showConfirmPassword ? (
                    <EyeOffIcon className="h-4 w-4" />
                  ) : (
                    <EyeIcon className="h-4 w-4" />
                  )}
                </button>
              </div>
            </label>
          </div>
          <button
            onClick={handleSavePassword}
            className="mt-6 rounded-xl bg-brand px-4 py-3 text-sm font-bold text-white hover:bg-brand-dark"
          >
            Save Password
          </button>
        </section>
      </div>
    </>
  )
}
