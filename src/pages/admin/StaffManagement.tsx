import React, { useEffect, useState, useCallback } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  CheckCircle2Icon,
  PencilIcon,
  PlusIcon,
  ShieldIcon,
  Trash2Icon,
  UsersIcon,
  XIcon,
} from 'lucide-react'
import { PageHeader } from '../../components/dashboard/PageHeader'

const AVAILABLE_PAGES = [
  { id: 'dashboard', label: 'Admin Dashboard' },
  { id: 'members', label: 'Members Management' },
  { id: 'payments', label: 'Payments & Verification' },
  { id: 'payouts', label: 'Payouts & Withdrawals' },
  { id: 'referrals', label: 'Referrals Management' },
  { id: 'notifications', label: 'System Notifications' },
]

export interface StaffMember {
  id: number
  name: string
  full_name: string
  email: string
  phone: string
  is_active: number
  permissions: string[]
  created_at: string
}

function StaffModal({
  staff,
  onClose,
  onSaved,
}: {
  staff?: StaffMember
  onClose: () => void
  onSaved: () => void
}) {
  const [form, setForm] = useState({
    name: staff?.name || '',
    full_name: staff?.full_name || '',
    email: staff?.email || '',
    phone: staff?.phone || '',
    password: '',
    is_active: staff ? staff.is_active : 1,
    permissions: staff?.permissions || [],
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const handleTogglePermission = (pageId: string) => {
    setForm(prev => {
      const perms = prev.permissions.includes(pageId)
        ? prev.permissions.filter(p => p !== pageId)
        : [...prev.permissions, pageId]
      return { ...prev, permissions: perms }
    })
  }

  const handleSave = async () => {
    if (!form.name || !form.email || (!staff && !form.password)) {
      setError('Name, email, and password are required.')
      return
    }

    setSaving(true)
    setError('')
    try {
      const method = staff ? 'PUT' : 'POST'
      const payload = staff ? { id: staff.id, ...form } : form
      const res = await fetch('/api/admin/staff.php', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (data.success) {
        setSuccess(staff ? 'Staff updated successfully!' : 'Staff created successfully!')
        setTimeout(() => { onSaved(); onClose() }, 1200)
      } else {
        setError(data.error || 'Failed to save staff account.')
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
      className="fixed inset-0 z-[80] flex items-center justify-center overflow-y-auto bg-black/60 p-4 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 16 }}
        transition={{ duration: 0.2 }}
        className="w-full max-w-lg rounded-3xl bg-white p-8 shadow-2xl my-8"
      >
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand/10">
              <ShieldIcon className="h-5 w-5 text-brand" />
            </div>
            <div>
              <h3 className="font-display text-lg font-extrabold text-brand-dark">
                {staff ? 'Edit Staff Account' : 'New Staff Account'}
              </h3>
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
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">First Name</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full rounded-xl border border-gray-200 px-4 py-2 focus:border-brand focus:ring-2 focus:ring-brand/20 outline-none transition-all"
                  placeholder="e.g. Jane"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Full Name</label>
                <input
                  type="text"
                  value={form.full_name}
                  onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                  className="w-full rounded-xl border border-gray-200 px-4 py-2 focus:border-brand focus:ring-2 focus:ring-brand/20 outline-none transition-all"
                  placeholder="e.g. Jane Doe"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Email Address</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="w-full rounded-xl border border-gray-200 px-4 py-2 focus:border-brand focus:ring-2 focus:ring-brand/20 outline-none transition-all"
                  placeholder="staff@digiajoglobal.com"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Phone</label>
                <input
                  type="text"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  className="w-full rounded-xl border border-gray-200 px-4 py-2 focus:border-brand focus:ring-2 focus:ring-brand/20 outline-none transition-all"
                  placeholder="080..."
                />
              </div>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Password {staff && <span className="text-gray-400 font-normal">(leave blank to keep current)</span>}
              </label>
              <input
                type="password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                className="w-full rounded-xl border border-gray-200 px-4 py-2 focus:border-brand focus:ring-2 focus:ring-brand/20 outline-none transition-all"
                placeholder={staff ? "••••••••" : "Create password"}
              />
            </div>

            {staff && (
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Status</label>
                <select
                  value={form.is_active}
                  onChange={(e) => setForm({ ...form, is_active: parseInt(e.target.value) })}
                  className="w-full rounded-xl border border-gray-200 px-4 py-2 focus:border-brand focus:ring-2 focus:ring-brand/20 outline-none transition-all"
                >
                  <option value={1}>Active</option>
                  <option value={0}>Suspended</option>
                </select>
              </div>
            )}

            <div className="pt-4 border-t border-gray-100">
              <label className="mb-3 block text-sm font-bold text-gray-900">Page Permissions</label>
              <div className="space-y-2">
                {AVAILABLE_PAGES.map(page => (
                  <label key={page.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors border border-transparent hover:border-gray-100">
                    <input
                      type="checkbox"
                      checked={form.permissions.includes(page.id)}
                      onChange={() => handleTogglePermission(page.id)}
                      className="h-5 w-5 rounded border-gray-300 text-brand focus:ring-brand"
                    />
                    <span className="text-sm font-medium text-gray-700">{page.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {error && <p className="text-sm text-red-500 font-medium">{error}</p>}

            <div className="mt-6 flex justify-end gap-3 pt-4">
              <button
                onClick={onClose}
                className="rounded-xl px-5 py-2.5 text-sm font-bold text-gray-600 hover:bg-gray-100 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="rounded-xl bg-brand px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-brand/25 hover:bg-brand-dark transition-all disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save Account'}
              </button>
            </div>
          </div>
        )}
      </motion.div>
    </motion.div>
  )
}

export function StaffManagement() {
  const [staff, setStaff] = useState<StaffMember[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [editingStaff, setEditingStaff] = useState<StaffMember | null>(null)
  const [deletingStaff, setDeletingStaff] = useState<StaffMember | null>(null)
  const [isCreating, setIsCreating] = useState(false)

  const fetchStaff = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/staff.php')
      const data = await res.json()
      if (data.success) {
        setStaff(data.staff)
      } else {
        setError(data.error)
      }
    } catch {
      setError('Unable to fetch staff list.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchStaff()
  }, [fetchStaff])

  const confirmDelete = async () => {
    if (!deletingStaff) return
    try {
      const res = await fetch(`/api/admin/staff.php`, { 
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: deletingStaff.id })
      })
      const data = await res.json()
      if (data.success) {
        setDeletingStaff(null)
        fetchStaff()
      } else {
        alert(data.error || 'Error deleting staff.')
      }
    } catch {
      alert('Network error')
    }
  }


  if (loading && staff.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="space-y-8 w-full">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <PageHeader
          title="Staff Management"
          description="Manage support accounts and assign page permissions."
        />
        <button
          onClick={() => setIsCreating(true)}
          className="flex items-center gap-2 rounded-xl bg-brand px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-brand/25 transition-all hover:bg-brand-dark focus:ring-4 focus:ring-brand/20 active:scale-95"
        >
          <PlusIcon className="h-4 w-4" />
          Add Staff
        </button>
      </div>

      {error ? (
        <div className="rounded-2xl bg-red-50 p-6 text-center text-red-600">
          <p>{error}</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-3xl border border-gray-100 bg-white shadow-xl shadow-gray-200/40">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50/50 text-xs uppercase text-gray-500 border-b border-gray-100">
                <tr>
                  <th className="px-6 py-4 font-bold">Staff Member</th>
                  <th className="px-6 py-4 font-bold">Contact</th>
                  <th className="px-6 py-4 font-bold">Permissions</th>
                  <th className="px-6 py-4 font-bold">Status</th>
                  <th className="px-6 py-4 text-right font-bold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {staff.map((member) => (
                  <tr key={member.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand/10 text-brand font-bold">
                          {member.name.substring(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-bold text-gray-900">{member.full_name || member.name}</div>
                          <div className="text-xs text-gray-500">Joined {new Date(member.created_at).toLocaleDateString()}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-gray-600">
                      <div>{member.email}</div>
                      <div className="text-xs">{member.phone}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1">
                        {member.permissions.length === 0 ? (
                          <span className="text-xs text-gray-400 italic">No access</span>
                        ) : (
                          member.permissions.slice(0, 3).map(p => {
                            const label = AVAILABLE_PAGES.find(ap => ap.id === p)?.label || p
                            return (
                              <span key={p} className="inline-flex rounded bg-brand/10 px-2 py-0.5 text-[10px] font-bold text-brand">
                                {label}
                              </span>
                            )
                          })
                        )}
                        {member.permissions.length > 3 && (
                          <span className="inline-flex rounded bg-gray-100 px-2 py-0.5 text-[10px] font-bold text-gray-600">
                            +{member.permissions.length - 3} more
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold ${
                        member.is_active 
                          ? 'bg-green-50 text-green-700 border border-green-200/50' 
                          : 'bg-red-50 text-red-700 border border-red-200/50'
                      }`}>
                        {member.is_active ? 'Active' : 'Suspended'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => setEditingStaff(member)}
                        className="p-2 text-gray-400 hover:text-brand transition-colors"
                        title="Edit Staff"
                      >
                        <PencilIcon className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => setDeletingStaff(member)}
                        className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                        title="Delete Staff"
                      >
                        <Trash2Icon className="h-5 w-5" />
                      </button>
                    </td>
                  </tr>
                ))}
                {staff.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                      <ShieldIcon className="h-12 w-12 text-gray-200 mx-auto mb-3" />
                      <p>No staff accounts found.</p>
                      <p className="text-sm mt-1">Click "Add Staff" to create one.</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <AnimatePresence>
        {(isCreating || editingStaff) && (
          <StaffModal
            staff={editingStaff || undefined}
            onClose={() => {
              setIsCreating(false)
              setEditingStaff(null)
            }}
            onSaved={fetchStaff}
          />
        )}
        {deletingStaff && (
          <div 
            className="fixed inset-0 z-[80] flex items-center justify-center overflow-y-auto bg-black/60 p-4 backdrop-blur-sm"
            onClick={(e) => { if (e.target === e.currentTarget) setDeletingStaff(null) }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 16 }}
              transition={{ duration: 0.2 }}
              className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl text-center"
            >
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-red-100">
                <Trash2Icon className="h-7 w-7 text-red-600" />
              </div>
              <h3 className="font-display text-xl font-bold text-gray-900 mb-2">Delete Staff Account?</h3>
              <p className="text-sm text-gray-500 mb-6">
                Are you sure you want to permanently delete <strong>{deletingStaff.name}</strong>? This action cannot be undone.
              </p>
              <div className="flex gap-3 w-full">
                <button
                  onClick={() => setDeletingStaff(null)}
                  className="flex-1 rounded-xl bg-gray-100 px-4 py-2.5 text-sm font-bold text-gray-700 hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDelete}
                  className="flex-1 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-red-700 shadow-lg shadow-red-600/20 transition-all"
                >
                  Delete
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}
