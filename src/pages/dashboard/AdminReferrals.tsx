import React, { useState, useEffect } from 'react'
import { PageHeader } from '../../components/dashboard/PageHeader'
import { NAIRA } from '../../lib/brand'
import { StatusBadge } from '../../components/dashboard/StatusBadge'

interface AdminReferral {
  id: string
  referrer_name: string
  referrer_id: string
  referee_name: string
  referee_phone: string
  date: string
  status: 'pending' | 'active' | 'paid'
  commission: string
}

export function AdminReferrals() {
  const [referrals, setReferrals] = useState<AdminReferral[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/admin/referrals.php')
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setReferrals(data.referrals || [])
        }
      })
      .finally(() => setLoading(false))
  }, [])

  return (
    <>
      <PageHeader
        title="Referrals"
        description="Monitor all member referrals and commissions across the platform."
      />

      <div className="rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden mt-6">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 text-gray-500">
              <tr>
                <th className="px-5 py-4 font-semibold">Referrer</th>
                <th className="px-5 py-4 font-semibold">Referee (New User)</th>
                <th className="px-5 py-4 font-semibold">Date</th>
                <th className="px-5 py-4 font-semibold">Status</th>
                <th className="px-5 py-4 font-semibold text-right">Commission</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-5 py-8 text-center text-gray-500">
                    Loading referrals...
                  </td>
                </tr>
              ) : referrals.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-8 text-center text-gray-500">
                    No referrals found.
                  </td>
                </tr>
              ) : (
                referrals.map((ref) => (
                  <tr key={ref.id} className="hover:bg-gray-50 transition">
                    <td className="px-5 py-4">
                      <div className="font-bold text-gray-900">{ref.referrer_name}</div>
                      <div className="text-xs text-gray-500">{ref.referrer_id}</div>
                    </td>
                    <td className="px-5 py-4">
                      <div className="font-bold text-gray-900">{ref.referee_name}</div>
                      <div className="text-xs text-gray-500">{ref.referee_phone}</div>
                    </td>
                    <td className="px-5 py-4 text-gray-600">{ref.date}</td>
                    <td className="px-5 py-4">
                      <StatusBadge status={ref.status === 'active' || ref.status === 'paid' ? 'active' : 'pending'} />
                    </td>
                    <td className="px-5 py-4 text-right font-bold text-gray-900">
                      {ref.status === 'pending' ? 'Pending' : NAIRA(Number(ref.commission))}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  )
}
