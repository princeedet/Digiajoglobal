import React, { useMemo, useState, useCallback } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  CheckCircle2Icon,
  KeyRoundIcon,
  LockIcon,
  PencilIcon,
  SearchIcon,
  Trash2Icon,
  UserCheckIcon,
  UsersIcon,
  XIcon,
} from 'lucide-react'
import { PageHeader } from '../../components/dashboard/PageHeader'
import { StatusBadge } from '../../components/dashboard/StatusBadge'
import { useDashboard } from '../../components/dashboard/DashboardContext'
import type { MemberUser, UserStatus } from '../../lib/dashboard-data'
import { NAIRA } from '../../lib/brand'

// ── Edit User Modal ────────────────────────────────────────────────────────────
function EditUserModal({
  user,
  onClose,
  onSaved,
}: {
  user: MemberUser
  onClose: () => void
  onSaved: () => void
}) {
  const [form, setForm] = useState({
    name: user.name,
    email: user.email,
    phone: (user as any).phone || '',
    status: user.status,
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const handleSave = async () => {
    setSaving(true)
    setError('')
    try {
      const res = await fetch('/Digiajoglobal/api/admin/members.php', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: user.id, ...form }),
      })
      const data = await res.json()
      if (data.success) {
        setSuccess('User updated successfully!')
        setTimeout(() => { onSaved(); onClose() }, 1200)
      } else {
        setError(data.error || 'Failed to update user.')
      }
    } catch {
      setError('Unable to connect. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 16 }}
        transition={{ duration: 0.2 }}
        className="w-full max-w-md rounded-3xl bg-white p-8 shadow-2xl"
      >
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand/10">
              <PencilIcon className="h-5 w-5 text-brand" />
            </div>
            <div>
              <h3 className="font-display text-lg font-extrabold text-brand-dark">Edit User</h3>
              <p className="text-xs text-gray-500">{user.id}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <XIcon className="h-5 w-5" />
          </button>
        </div>

        {success ? (
          <div className="text-center py-6">
            <CheckCircle2Icon className="h-12 w-12 text-brand mx-auto mb-3" />
            <p className="font-bold text-brand-dark">{success}</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-gray-700">Full Name</label>
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-gray-700">Email</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-gray-700">Phone</label>
              <input
                type="tel"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-gray-700">Status</label>
              <select
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value as any })}
                className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
              >
                <option value="active">Active</option>
                <option value="suspended">Suspended</option>
                <option value="pending_verification">Pending Verification</option>
              </select>
            </div>

            {error && (
              <p className="rounded-xl bg-red-50 px-3 py-2.5 text-xs font-medium text-red-700">{error}</p>
            )}

            <div className="flex gap-3 pt-2">
              <button
                onClick={onClose}
                className="flex-1 rounded-xl border border-gray-200 py-3 text-sm font-bold text-gray-600 hover:bg-gray-50 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 rounded-xl bg-brand py-3 text-sm font-bold text-white hover:bg-brand-dark transition disabled:opacity-70"
              >
                {saving ? 'Saving…' : 'Save Changes'}
              </button>
            </div>
          </div>
        )}
      </motion.div>
    </motion.div>
  )
}

// ── Delete Confirm Modal ───────────────────────────────────────────────────────
function DeleteConfirmModal({
  ids,
  names,
  onClose,
  onDeleted,
}: {
  ids: string[]
  names: string
  onClose: () => void
  onDeleted: () => void
}) {
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState('')

  const handleDelete = async () => {
    setDeleting(true)
    setError('')
    try {
      const res = await fetch('/Digiajoglobal/api/admin/members.php', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids }),
      })
      const data = await res.json()
      if (data.success) {
        onDeleted()
        onClose()
      } else {
        setError(data.error || 'Failed to delete user(s).')
      }
    } catch {
      setError('Unable to connect. Please try again.')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 16 }}
        transition={{ duration: 0.2 }}
        className="w-full max-w-sm rounded-3xl bg-white p-8 shadow-2xl"
      >
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50 mx-auto">
          <Trash2Icon className="h-7 w-7 text-red-500" />
        </div>
        <h3 className="mt-5 text-center font-display text-xl font-extrabold text-brand-dark">
          Delete {ids.length > 1 ? `${ids.length} Users` : 'User'}?
        </h3>
        <p className="mt-2 text-center text-sm text-gray-500 leading-relaxed">
          This will permanently delete <span className="font-bold text-gray-700">{names}</span> and all their data (payments, savings, referrals). This cannot be undone.
        </p>
        {error && (
          <p className="mt-3 rounded-xl bg-red-50 px-3 py-2.5 text-xs font-medium text-red-700">{error}</p>
        )}
        <div className="mt-6 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 rounded-xl border border-gray-200 py-3 text-sm font-bold text-gray-600 hover:bg-gray-50 transition"
          >
            Cancel
          </button>
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="flex-1 rounded-xl bg-red-500 py-3 text-sm font-bold text-white hover:bg-red-600 transition disabled:opacity-70"
          >
            {deleting ? 'Deleting…' : 'Yes, Delete'}
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}

// ── Main AdminUsers Component ──────────────────────────────────────────────────
export function AdminUsers() {
  const { members, updateUserStatus, refreshData } = useDashboard() as any
  const [query, setQuery]   = useState('')
  const [status, setStatus] = useState<'all' | UserStatus>('all')
  const [selected, setSelected] = useState<MemberUser | null>(null)
  const [editUser, setEditUser]     = useState<MemberUser | null>(null)
  const [deleteModal, setDeleteModal] = useState<{ ids: string[]; names: string } | null>(null)
  const [checkedIds, setCheckedIds]   = useState<Set<string>>(new Set())

  // Reset password modal state
  const [showResetModal,   setShowResetModal]   = useState(false)
  const [newPassword,      setNewPassword]      = useState('')
  const [confirmPassword,  setConfirmPassword]  = useState('')
  const [resetLoading,     setResetLoading]     = useState(false)
  const [resetError,       setResetError]       = useState('')
  const [resetSuccess,     setResetSuccess]     = useState('')

  const visible = useMemo(
    () =>
      (members as MemberUser[]).filter(
        (member) =>
          (status === 'all' || member.status === status) &&
          `${member.name} ${member.id} ${member.email}`
            .toLowerCase()
            .includes(query.toLowerCase()),
      ),
    [members, status, query],
  )

  // ── Checkbox helpers ────────────────────────────────────────────────────────
  const allVisibleChecked = visible.length > 0 && visible.every((m) => checkedIds.has(m.id))
  const someChecked = checkedIds.size > 0

  const toggleAll = () => {
    if (allVisibleChecked) {
      setCheckedIds(new Set())
    } else {
      setCheckedIds(new Set(visible.map((m) => m.id)))
    }
  }
  const toggleOne = (id: string) => {
    setCheckedIds((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const openResetModal = () => {
    setNewPassword('')
    setConfirmPassword('')
    setResetError('')
    setResetSuccess('')
    setShowResetModal(true)
  }

  const handleResetPassword = async () => {
    if (!newPassword.trim()) { setResetError('Please enter a new password.'); return }
    if (newPassword.length < 6) { setResetError('Password must be at least 6 characters.'); return }
    if (newPassword !== confirmPassword) { setResetError('Passwords do not match.'); return }
    setResetLoading(true)
    setResetError('')
    try {
      const res = await fetch('/Digiajoglobal/api/admin/reset_user_password.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: selected?.id, new_password: newPassword }),
      })
      const data = await res.json()
      setResetLoading(false)
      if (data.success) {
        setResetSuccess(data.message || 'Password has been reset successfully.')
      } else {
        setResetError(data.error || 'Failed to reset password.')
      }
    } catch {
      setResetLoading(false)
      setResetError('Unable to connect. Please try again.')
    }
  }

  const handleDeleteSelected = () => {
    const selectedMembers = visible.filter((m) => checkedIds.has(m.id))
    const names = selectedMembers.length === 1
      ? selectedMembers[0].name
      : `${selectedMembers.length} users`
    setDeleteModal({ ids: [...checkedIds], names })
  }

  const handleMarkAll = async (newStatus: 'active' | 'suspended') => {
    const ids = [...checkedIds]
    if (ids.length === 0) return
    await Promise.all(
      ids.map((id) =>
        fetch('/Digiajoglobal/api/admin/members.php', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id, status: newStatus }),
        }),
      ),
    )
    if (typeof refreshData === 'function') refreshData()
    setCheckedIds(new Set())
  }

  return (
    <>
      <PageHeader
        title="Manage users"
        description="Find members, view account details, edit, and manage accounts."
      />

      <section className="rounded-2xl border border-gray-100 bg-white shadow-sm">
        {/* Toolbar */}
        <div className="flex flex-col gap-3 border-b border-gray-100 p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <label className="relative block max-w-md flex-1">
              <SearchIcon className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search name, ID or email"
                className="w-full rounded-xl border border-gray-200 py-2.5 pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand/20"
              />
            </label>
            <div className="flex gap-2">
              {(['all', 'active', 'suspended', 'pending_verification'] as const).map((item) => (
                <button
                  key={item}
                  onClick={() => setStatus(item)}
                  className={`rounded-full px-3 py-2 text-xs font-bold capitalize ${status === item ? 'bg-brand text-white' : 'bg-gray-50 text-gray-600'}`}
                >
                  {item === 'pending_verification' ? 'Pending' : item}
                </button>
              ))}
            </div>
          </div>

          {/* Bulk action bar */}
          <AnimatePresence>
            {someChecked && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="flex flex-wrap items-center gap-2 overflow-hidden"
              >
                <span className="text-xs font-bold text-gray-500">
                  {checkedIds.size} selected
                </span>
                <button
                  onClick={() => handleMarkAll('active')}
                  className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700 hover:bg-emerald-100 transition"
                >
                  <UserCheckIcon className="h-3.5 w-3.5" />
                  Mark Active
                </button>
                <button
                  onClick={() => handleMarkAll('suspended')}
                  className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1.5 text-xs font-bold text-amber-700 hover:bg-amber-100 transition"
                >
                  <UsersIcon className="h-3.5 w-3.5" />
                  Mark Suspended
                </button>
                <button
                  onClick={handleDeleteSelected}
                  className="inline-flex items-center gap-1.5 rounded-full bg-red-50 px-3 py-1.5 text-xs font-bold text-red-600 hover:bg-red-100 transition"
                >
                  <Trash2Icon className="h-3.5 w-3.5" />
                  Delete Selected
                </button>
                <button
                  onClick={() => setCheckedIds(new Set())}
                  className="ml-auto text-xs text-gray-400 hover:text-gray-600"
                >
                  Clear
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Desktop table */}
        <div className="hidden overflow-x-auto md:block">
          <table className="w-full text-left">
            <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-4 py-3">
                  <input
                    type="checkbox"
                    checked={allVisibleChecked}
                    onChange={toggleAll}
                    className="h-4 w-4 rounded border-gray-300 accent-brand cursor-pointer"
                    title="Select all"
                  />
                </th>
                <th className="px-5 py-3">Member</th>
                <th className="px-5 py-3">Plan</th>
                <th className="px-5 py-3">Saved</th>
                <th className="px-5 py-3">Progress</th>
                <th className="px-5 py-3">Referrals</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {visible.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-5 py-10 text-center text-sm text-gray-400">
                    No members found.
                  </td>
                </tr>
              )}
              {visible.map((member) => (
                <tr
                  key={member.id}
                  className={`transition-colors ${checkedIds.has(member.id) ? 'bg-brand-50/40' : 'hover:bg-gray-50/50'}`}
                >
                  <td className="px-4 py-4">
                    <input
                      type="checkbox"
                      checked={checkedIds.has(member.id)}
                      onChange={() => toggleOne(member.id)}
                      className="h-4 w-4 rounded border-gray-300 accent-brand cursor-pointer"
                    />
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-50 text-xs font-bold text-brand shrink-0">
                        {member.initials}
                      </span>
                      <div>
                        <p className="text-sm font-bold text-gray-800">{member.name}</p>
                        <p className="text-xs text-gray-500">{member.id} • {member.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-4 text-sm text-gray-600">{member.plan}</td>
                  <td className="px-5 py-4 text-sm font-bold text-gray-800">{NAIRA(member.saved)}</td>
                  <td className="px-5 py-4 text-sm text-gray-600">
                    {member.weeks ? `${member.weeks}/50 weeks` : '—'}
                  </td>
                  <td className="px-5 py-4 text-sm text-gray-600">
                    <span className="inline-flex items-center gap-1">
                      <span className="font-bold text-brand">{(member as any).active_referrals ?? member.referral_count ?? 0}</span>
                      {(member as any).referral_count > 0 && (member as any).active_referrals !== undefined && (
                        <span className="text-gray-400">/ {(member as any).referral_count}</span>
                      )}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <StatusBadge status={member.status} />
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setEditUser(member)}
                        className="rounded-lg border border-gray-200 p-2 text-gray-500 hover:bg-gray-50 hover:text-brand transition"
                        title="Edit user"
                      >
                        <PencilIcon className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => setDeleteModal({ ids: [member.id], names: member.name })}
                        className="rounded-lg border border-red-100 p-2 text-red-400 hover:bg-red-50 hover:text-red-600 transition"
                        title="Delete user"
                      >
                        <Trash2Icon className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => setSelected(member)}
                        className="text-sm font-bold text-brand hover:underline"
                      >
                        View
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile cards */}
        <div className="divide-y divide-gray-100 md:hidden">
          {visible.map((member) => (
            <div
              key={member.id}
              className={`flex items-center gap-3 p-4 ${checkedIds.has(member.id) ? 'bg-brand-50/40' : ''}`}
            >
              <input
                type="checkbox"
                checked={checkedIds.has(member.id)}
                onChange={() => toggleOne(member.id)}
                className="h-4 w-4 rounded border-gray-300 accent-brand cursor-pointer shrink-0"
              />
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-50 text-xs font-bold text-brand shrink-0">
                {member.initials}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-gray-800 truncate">{member.name}</p>
                <p className="text-xs text-gray-500">{member.id} • {NAIRA(member.saved)}</p>
              </div>
              <div className="flex gap-1.5 shrink-0">
                <button
                  onClick={() => setEditUser(member)}
                  className="rounded-lg border border-gray-200 p-1.5 text-gray-400 hover:text-brand transition"
                >
                  <PencilIcon className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => setSelected(member)}
                  className="text-xs font-bold text-brand"
                >
                  View
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── User Details Slide-over ── */}
      {selected && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Member account details"
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
          onClick={(e) => { if (e.target === e.currentTarget) setSelected(null) }}
        >
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <span className="flex h-12 w-12 items-center justify-center rounded-full bg-brand text-sm font-bold text-white">
                  {selected.initials}
                </span>
                <div>
                  <h3 className="font-display text-lg font-bold text-brand-dark">
                    {selected.name}
                  </h3>
                  <p className="text-xs text-gray-500">
                    {selected.id} • Joined {selected.joined}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelected(null)}
                aria-label="Close account details"
                className="text-gray-400 hover:text-gray-600"
              >
                <XIcon className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-xl bg-gray-50 p-3">
                <p className="text-xs text-gray-500">Plan</p>
                <p className="mt-1 font-bold text-gray-800">{selected.plan}</p>
              </div>
              <div className="rounded-xl bg-gray-50 p-3">
                <p className="text-xs text-gray-500">Total saved</p>
                <p className="mt-1 font-bold text-gray-800">{NAIRA(selected.saved)}</p>
              </div>
              <div className="rounded-xl bg-gray-50 p-3">
                <p className="text-xs text-gray-500">Phone</p>
                <p className="mt-1 font-bold text-gray-800">{(selected as any).phone || '—'}</p>
              </div>
              <div className="rounded-xl bg-gray-50 p-3">
                <p className="text-xs text-gray-500">Email</p>
                <p className="mt-1 font-bold text-gray-800 text-xs break-all">{selected.email}</p>
              </div>
              <div className="rounded-xl bg-gray-50 p-3">
                <p className="text-xs text-gray-500">Current status</p>
                <p className="mt-1"><StatusBadge status={selected.status} /></p>
              </div>
              <div className="rounded-xl bg-gray-50 p-3">
                <p className="text-xs text-gray-500">Progress</p>
                <p className="mt-1 font-bold text-gray-800">
                  {selected.weeks ? `${selected.weeks} / 50 weeks` : '—'}
                </p>
              </div>

              {/* Bank Account Details */}
              <div className="col-span-2 rounded-xl border border-dashed border-gray-200 bg-brand-50/10 p-3">
                <p className="text-[10px] font-bold uppercase tracking-wider text-brand">Payout Bank Account</p>
                <div className="mt-2 grid grid-cols-3 gap-2 text-xs leading-normal">
                  <div>
                    <p className="text-[10px] text-gray-400 font-semibold uppercase">Bank</p>
                    <p className="font-bold text-gray-700 mt-0.5">{(selected as any).bank_name || 'Not set'}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-400 font-semibold uppercase">Account No.</p>
                    <p className="font-bold text-gray-700 mt-0.5">{(selected as any).account_number || 'Not set'}</p>
                  </div>
                  <div className="col-span-1">
                    <p className="text-[10px] text-gray-400 font-semibold uppercase">Account Name</p>
                    <p className="font-bold text-gray-700 mt-0.5 truncate" title={(selected as any).account_name}>{(selected as any).account_name || 'Not set'}</p>
                  </div>
                </div>
              </div>

              <div className="col-span-2 rounded-xl bg-brand-50 p-3 flex justify-between items-center">
                <div>
                  <p className="text-xs text-brand-light font-bold uppercase">Referrals Made</p>
                  <p className="mt-1 font-display text-lg font-bold text-brand-dark">
                    {(selected as any).active_referrals ?? 0} active
                    {(selected as any).referral_count > 0 && (
                      <span className="text-sm text-gray-400 font-normal ml-1">
                        / {(selected as any).referral_count} total
                      </span>
                    )}
                  </p>
                </div>
                {(selected as any).referred_by_name && (
                  <div className="text-right">
                    <p className="text-xs text-brand-light font-bold uppercase">Referred By</p>
                    <p className="mt-1 font-bold text-brand-dark">{(selected as any).referred_by_name}</p>
                  </div>
                )}
              </div>
            </div>

            <div className="mt-6 flex gap-3 flex-wrap">
              <button
                onClick={openResetModal}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-200 px-4 py-3 text-sm font-bold text-gray-700 hover:bg-gray-50 transition"
              >
                <KeyRoundIcon className="h-4 w-4" />
                Reset Password
              </button>
              <button
                onClick={() => setEditUser(selected)}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-brand/30 px-4 py-3 text-sm font-bold text-brand hover:bg-brand-50 transition"
              >
                <PencilIcon className="h-4 w-4" />
                Edit User
              </button>
              <button
                onClick={() => {
                  updateUserStatus(selected.id, selected.status === 'active' ? 'suspended' : 'active')
                  setSelected({ ...selected, status: selected.status === 'active' ? 'suspended' : 'active' })
                }}
                className={`flex-1 rounded-xl px-4 py-3 text-sm font-bold transition ${
                  selected.status === 'active'
                    ? 'border border-red-200 text-red-600 hover:bg-red-50'
                    : 'bg-brand text-white hover:bg-brand-dark'
                }`}
              >
                {selected.status === 'active' ? 'Suspend account' : 'Reactivate account'}
              </button>
              <button
                onClick={() => {
                  setSelected(null)
                  setDeleteModal({ ids: [selected.id], names: selected.name })
                }}
                className="rounded-xl border border-red-100 px-4 py-3 text-sm font-bold text-red-500 hover:bg-red-50 transition"
              >
                <Trash2Icon className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Reset Password Modal ── */}
      <AnimatePresence>
        {showResetModal && selected && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
            onClick={(e) => { if (e.target === e.currentTarget) setShowResetModal(false) }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 16 }}
              transition={{ duration: 0.2 }}
              className="w-full max-w-sm rounded-3xl bg-white p-8 shadow-2xl"
            >
              {resetSuccess ? (
                <>
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50 mx-auto">
                    <CheckCircle2Icon className="h-7 w-7 text-brand" />
                  </div>
                  <h3 className="mt-5 text-center font-display text-xl font-extrabold text-brand-dark">
                    Password Reset!
                  </h3>
                  <p className="mt-2 text-center text-sm text-gray-500 leading-relaxed">{resetSuccess}</p>
                  <button
                    onClick={() => setShowResetModal(false)}
                    className="mt-6 w-full rounded-xl bg-brand py-3 text-sm font-bold text-white hover:bg-brand-dark transition"
                  >
                    Done
                  </button>
                </>
              ) : (
                <>
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-orange-50 mx-auto">
                    <LockIcon className="h-7 w-7 text-orange-500" />
                  </div>
                  <h3 className="mt-5 text-center font-display text-xl font-extrabold text-brand-dark">
                    Reset Password
                  </h3>
                  <p className="mt-1 text-center text-sm text-gray-500">
                    Set a new password for <span className="font-bold text-gray-700">{selected.name}</span>
                  </p>
                  <div className="mt-6 space-y-4">
                    <div>
                      <label className="mb-1.5 block text-sm font-semibold text-gray-700">New Password</label>
                      <input
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm placeholder-gray-400 transition focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
                        placeholder="Min. 6 characters"
                        autoFocus
                      />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-sm font-semibold text-gray-700">Confirm Password</label>
                      <input
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') handleResetPassword() }}
                        className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm placeholder-gray-400 transition focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
                        placeholder="Re-enter new password"
                      />
                    </div>
                    {resetError && (
                      <p className="rounded-xl bg-red-50 px-3 py-2.5 text-xs font-medium text-red-700">{resetError}</p>
                    )}
                    <button
                      onClick={handleResetPassword}
                      disabled={resetLoading}
                      className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-brand py-3.5 text-sm font-bold text-white hover:bg-brand-dark transition disabled:opacity-70"
                    >
                      {resetLoading ? (
                        <><span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" /> Resetting…</>
                      ) : 'Reset Password'}
                    </button>
                    <button
                      onClick={() => setShowResetModal(false)}
                      className="w-full rounded-xl border border-gray-200 py-3 text-sm font-bold text-gray-600 hover:bg-gray-50 transition"
                    >
                      Cancel
                    </button>
                  </div>
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Edit User Modal ── */}
      <AnimatePresence>
        {editUser && (
          <EditUserModal
            user={editUser}
            onClose={() => setEditUser(null)}
            onSaved={() => {
              if (typeof refreshData === 'function') refreshData()
              setEditUser(null)
            }}
          />
        )}
      </AnimatePresence>

      {/* ── Delete Confirm Modal ── */}
      <AnimatePresence>
        {deleteModal && (
          <DeleteConfirmModal
            ids={deleteModal.ids}
            names={deleteModal.names}
            onClose={() => setDeleteModal(null)}
            onDeleted={() => {
              if (typeof refreshData === 'function') refreshData()
              setCheckedIds(new Set())
              setDeleteModal(null)
            }}
          />
        )}
      </AnimatePresence>
    </>
  )
}
