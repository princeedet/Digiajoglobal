import React, { useState } from 'react'
import { CheckCircle2Icon, SendIcon, WalletCardsIcon } from 'lucide-react'
import { PageHeader } from '../../components/dashboard/PageHeader'
import { useDashboard } from '../../components/dashboard/DashboardContext'
export function AdminPayouts() {
  const { members, notify } = useDashboard()
  const [form, setForm] = useState({
    member: '',
    amount: '',
    reason: 'Double Up cash-out',
    notes: ''
  })
  
  React.useEffect(() => {
    if (!form.member && members.length > 0) {
      const firstActive = members.find((m) => m.status === 'active')
      if (firstActive) {
        setForm((f) => ({ ...f, member: firstActive.id }))
      }
    }
  }, [members, form.member])

  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!form.amount || Number(form.amount) <= 0 || !form.member) {
      notify('Enter a valid payout amount and select a member.', 'error')
      return
    }
    
    setLoading(true)
    try {
      const res = await fetch('/Digiajoglobal/api/admin/payouts.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      })
      const data = await res.json()
      if (data.success) {
        setSubmitted(true)
        notify('Payout scheduled successfully. The member has been notified.')
        setForm(f => ({ ...f, amount: '', notes: '' }))
        setTimeout(() => setSubmitted(false), 5000)
      } else {
        notify(data.error || 'Failed to schedule payout.', 'error')
      }
    } catch (e) {
      notify('Network error.', 'error')
    } finally {
      setLoading(false)
    }
  }
  const input =
    'mt-1.5 w-full rounded-xl border border-gray-200 px-3.5 py-3 text-sm text-gray-800 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20'
  return (
    <>
      <PageHeader
        title="Payouts"
        description="Prepare and review member payout instructions. This prototype does not send money."
      />
      <div className="grid gap-6 xl:grid-cols-[1fr_.85fr]">
        <form
          onSubmit={submit}
          className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm"
        >
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50 text-brand">
              <WalletCardsIcon className="h-5 w-5" />
            </span>
            <div>
              <h3 className="font-display text-lg font-bold text-brand-dark">
                Create payout instruction
              </h3>
              <p className="text-xs text-gray-500">
                Verify the destination details separately before any real
                payment.
              </p>
            </div>
          </div>
          <div className="mt-6 space-y-4">
            <label className="block text-sm font-semibold text-gray-700">
              Member
              <select
                value={form.member}
                onChange={(e) =>
                  setForm({
                    ...form,
                    member: e.target.value,
                  })
                }
                className={input}
              >
                {members
                  .filter((member) => member.status === 'active')
                  .map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.name} — {member.id}
                  </option>
                ))}
              </select>
            </label>

            {(() => {
              const selectedMember = members.find((m) => m.id === form.member)
              if (!selectedMember) return null
              return (
                <div className="rounded-xl border border-dashed border-gray-200 bg-brand-50/10 p-3.5 text-xs text-gray-600 leading-normal">
                  <p className="font-bold text-brand uppercase tracking-wider text-[10px]">Destination Bank Details</p>
                  <div className="mt-2 grid grid-cols-3 gap-2">
                    <div>
                      <span className="text-[10px] uppercase font-semibold text-gray-400 font-display">Bank</span>
                      <p className="font-bold text-gray-700 mt-0.5">{selectedMember.bank_name || 'Not set'}</p>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-semibold text-gray-400 font-display">Account No.</span>
                      <p className="font-bold text-gray-700 mt-0.5">{selectedMember.account_number || 'Not set'}</p>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-semibold text-gray-400 font-display">Account Name</span>
                      <p className="font-bold text-gray-700 mt-0.5 truncate" title={selectedMember.account_name}>
                        {selectedMember.account_name || 'Not set'}
                      </p>
                    </div>
                  </div>
                </div>
              )
            })()}
            <label className="block text-sm font-semibold text-gray-700">
              Amount (₦)
              <input
                value={form.amount}
                onChange={(e) =>
                  setForm({
                    ...form,
                    amount: e.target.value.replace(/\D/g, ''),
                  })
                }
                inputMode="numeric"
                placeholder="e.g. 130000"
                className={input}
              />
            </label>
            <label className="block text-sm font-semibold text-gray-700">
              Reason
              <select
                value={form.reason}
                onChange={(e) =>
                  setForm({
                    ...form,
                    reason: e.target.value,
                  })
                }
                className={input}
              >
                <option>Double Up cash-out</option>
                <option>Referral commission</option>
                <option>DigiMart return</option>
                <option>Adjustment / refund</option>
              </select>
            </label>
            <label className="block text-sm font-semibold text-gray-700">
              Internal note
              <textarea
                rows={3}
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                className={`${input} resize-none`}
                placeholder="Optional reconciliation note"
              />
            </label>
          </div>
          <button
            type="submit"
            disabled={loading}
            className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-brand px-4 py-3 text-sm font-bold text-white hover:bg-brand-dark disabled:opacity-50"
          >
            <SendIcon className="h-4 w-4" /> {loading ? 'Preparing...' : 'Prepare payout'}
          </button>
        </form>
        <section className="rounded-2xl bg-brand-dark p-6 text-white">
          <h3 className="font-display text-xl font-extrabold">
            Payout safeguards
          </h3>
          <ul className="mt-5 space-y-4 text-sm text-white/75">
            <li className="flex gap-3">
              <CheckCircle2Icon className="h-5 w-5 shrink-0 text-accent" />
              Verify the member's account details before releasing funds.
            </li>
            <li className="flex gap-3">
              <CheckCircle2Icon className="h-5 w-5 shrink-0 text-accent" />
              Keep the payment reference in your reconciliation records.
            </li>
            <li className="flex gap-3">
              <CheckCircle2Icon className="h-5 w-5 shrink-0 text-accent" />
              Notify the member after a real transfer has completed.
            </li>
          </ul>
          {submitted && (
            <div className="mt-6 rounded-xl bg-white/10 p-4">
              <p className="font-bold text-accent">Draft prepared</p>
              <p className="mt-1 text-xs text-white/65">
                This demo has not made a bank transfer or changed any real
                balance.
              </p>
            </div>
          )}
        </section>
      </div>
    </>
  )
}
