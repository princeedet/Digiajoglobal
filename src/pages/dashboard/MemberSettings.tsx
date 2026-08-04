import React, { useState } from 'react'
import {
  BellIcon,
  Building2Icon,
  CheckCircle2Icon,
  LockKeyholeIcon,
  UserRoundIcon,
} from 'lucide-react'
import { PageHeader } from '../../components/dashboard/PageHeader'
import { useDashboard } from '../../components/dashboard/DashboardContext'
import { getCurrentUser, setCurrentUser, getStoredMembers, saveMembers } from '../../lib/persistence'

export function MemberSettings() {
  const { notify } = useDashboard()
  const currentUser = getCurrentUser()

  const [profile, setProfile] = useState({
    name: currentUser?.name || 'Adebimpe Adeyemi',
    email: currentUser?.email || 'adebimpe@example.com',
    phone: currentUser?.phone || '0803 234 8182',
  })

  const [alerts, setAlerts] = useState({
    contributions: true,
    updates: true,
    referrals: false,
  })

  const [bank, setBank] = useState({
    bankName: '',
    accountNumber: '',
    accountName: '',
  })

  React.useEffect(() => {
    if (!currentUser) return
    fetch(`/Digiajoglobal/api/member/bank.php?member_id=${currentUser.id}`)
      .then(res => res.json())
      .then(data => {
        if (data.success && data.bank) {
          setBank({
            bankName: data.bank.bank_name || '',
            accountNumber: data.bank.account_number || '',
            accountName: data.bank.account_name || '',
          })
        }
      })
      .catch(err => console.error(err))
  }, [currentUser])

  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

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

    // Notify backend to send email
    fetch('/Digiajoglobal/api/member/notify_action.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: profile.email,
        name: profile.name,
        action: 'update_profile'
      })
    })

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

    // Notify backend to send email
    fetch('/Digiajoglobal/api/member/notify_action.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: currentUser.email,
        name: currentUser.name,
        action: 'update_password'
      })
    })

    setNewPassword('')
    setConfirmPassword('')
    notify('Password updated successfully. Security check completed.')
  }

  const handleSaveBank = async () => {
    if (!currentUser) return
    if (!bank.bankName || !bank.accountNumber || !bank.bankName) {
      notify('All payout details fields are required.', 'error')
      return
    }
    try {
      const res = await fetch('/Digiajoglobal/api/member/bank.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          member_id: currentUser.id,
          bank_name: bank.bankName,
          account_number: bank.accountNumber,
          account_name: bank.accountName,
        }),
      })
      const data = await res.json()
      if (data.success) {
        notify('Payout details saved successfully.')
      } else {
        notify(data.error || 'Failed to save payout details.', 'error')
      }
    } catch (e) {
      notify('Network error.', 'error')
    }
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

        {/* Preferences */}
        <section className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand">
              <BellIcon className="h-5 w-5" />
            </span>
            <div>
              <h3 className="font-display font-bold text-brand-dark">
                Notification preferences
              </h3>
              <p className="text-xs text-gray-500">
                Choose what you want to hear about.
              </p>
            </div>
          </div>
          <div className="mt-6 space-y-4">
            {(
              [
                {
                  key: 'contributions',
                  title: 'Contribution reminders',
                  desc: 'Saturday due-date and payment updates.',
                },
                {
                  key: 'updates',
                  title: 'Company updates',
                  desc: 'Important service and policy news.',
                },
                {
                  key: 'referrals',
                  title: 'Referral activity',
                  desc: 'When people join using your code.',
                },
              ] as const
            ).map((item) => (
              <label
                key={item.key}
                className="flex cursor-pointer items-start justify-between gap-4 rounded-xl border border-gray-100 p-4"
              >
                <span>
                  <span className="block text-sm font-bold text-gray-800">
                    {item.title}
                  </span>
                  <span className="mt-0.5 block text-xs text-gray-500">
                    {item.desc}
                  </span>
                </span>
                <input
                  type="checkbox"
                  checked={alerts[item.key]}
                  onChange={(e) =>
                    setAlerts({
                      ...alerts,
                      [item.key]: e.target.checked,
                    })
                  }
                  className="mt-1 h-4 w-4 accent-brand"
                />
              </label>
            ))}
          </div>
          <button
            onClick={() =>
              notify('Notification preferences updated.')
            }
            className="mt-6 rounded-xl border border-brand px-4 py-3 text-sm font-bold text-brand hover:bg-brand-50"
          >
            Save preferences
          </button>
        </section>

        {/* Payout Details */}
        <section className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand">
              <Building2Icon className="h-5 w-5" />
            </span>
            <div>
              <h3 className="font-display font-bold text-brand-dark">
                Payout account
              </h3>
              <p className="text-xs text-gray-500">
                Where cash-out payments would be sent.
              </p>
            </div>
          </div>
          <div className="mt-6 grid gap-4">
            <label className="text-sm font-semibold text-gray-700">
              Bank name
              <input
                className={input}
                value={bank.bankName}
                onChange={(e) =>
                  setBank({
                    ...bank,
                    bankName: e.target.value,
                  })
                }
              />
            </label>
            <label className="text-sm font-semibold text-gray-700">
              Account number
              <input
                inputMode="numeric"
                className={input}
                value={bank.accountNumber}
                onChange={(e) =>
                  setBank({
                    ...bank,
                    accountNumber: e.target.value,
                  })
                }
              />
            </label>
            <label className="text-sm font-semibold text-gray-700">
              Account name
              <input
                className={input}
                value={bank.accountName}
                onChange={(e) =>
                  setBank({
                    ...bank,
                    accountName: e.target.value,
                  })
                }
              />
            </label>
          </div>
          <button
            onClick={handleSaveBank}
            className="mt-6 rounded-xl bg-brand px-4 py-3 text-sm font-bold text-white hover:bg-brand-dark"
          >
            Save payout details
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
              <input
                type="password"
                className={input}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new password"
              />
            </label>
            <label className="text-sm font-semibold text-gray-700">
              Confirm New Password
              <input
                type="password"
                className={input}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter new password"
              />
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
