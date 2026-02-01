'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { paymentsApi } from '@/lib/api'
import { formatCurrency, formatDate } from '@/lib/utils'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import Link from 'next/link'
import { 
  Plus, 
  Search, 
  Trash,
  CreditCard,
  FileText
} from 'lucide-react'
import { toast } from '@/components/ui/use-toast'

export default function PaymentsPage() {
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const queryClient = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['payments', { page }],
    queryFn: () => paymentsApi.getAll({ page, limit: 20 }),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => paymentsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payments'] })
      toast({ title: 'Payment deleted' })
    }
  })

  const payments = data?.data?.data || []
  const pagination = data?.data?.pagination

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Payments</h1>
          <p className="text-gray-500 dark:text-gray-400">
            Track all payment records
          </p>
        </div>
        <Link href="/payments/new">
          <Button className="bg-green-600 hover:bg-green-700">
            <Plus className="mr-2 h-4 w-4" /> Record Payment
          </Button>
        </Link>
      </div>

      {/* Payments table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-gray-50 dark:bg-gray-800">
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Invoice
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Client
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Method
                  </th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {isLoading ? (
                  [...Array(5)].map((_, i) => (
                    <tr key={i}>
                      <td colSpan={6} className="px-6 py-4">
                        <div className="animate-pulse flex space-x-4">
                          <div className="h-4 bg-gray-200 rounded w-1/6"></div>
                          <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : payments.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                      <CreditCard className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                      <p>No payments recorded yet</p>
                    </td>
                  </tr>
                ) : (
                  payments.map((payment: any) => (
                    <tr 
                      key={payment._id} 
                      className="hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                    >
                      <td className="px-6 py-4 text-sm">
                        {formatDate(payment.date)}
                      </td>
                      <td className="px-6 py-4">
                        <Link 
                          href={`/invoices/${payment.invoice?._id}`}
                          className="text-blue-600 hover:underline font-medium"
                        >
                          {payment.invoice?.invoiceNumber || '#' + payment.invoice?._id?.slice(-6)}
                        </Link>
                      </td>
                      <td className="px-6 py-4">
                        {payment.invoice?.client?.name} {payment.invoice?.client?.surname}
                        {payment.invoice?.client?.company && (
                          <span className="text-sm text-gray-500 block">
                            {payment.invoice.client.company}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {payment.paymentMethod?.name || '-'}
                      </td>
                      <td className="px-6 py-4 text-right font-semibold text-green-600">
                        {formatCurrency(payment.amount)}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            if (confirm('Are you sure you want to delete this payment?')) {
                              deleteMutation.mutate(payment._id)
                            }
                          }}
                        >
                          <Trash className="h-4 w-4 text-red-500" />
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {pagination && pagination.pages > 1 && (
            <div className="flex items-center justify-between px-6 py-4 border-t">
              <p className="text-sm text-gray-500">
                Showing {(pagination.page - 1) * pagination.limit + 1} to{' '}
                {Math.min(pagination.page * pagination.limit, pagination.total)} of{' '}
                {pagination.total} results
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(p => p + 1)}
                  disabled={page >= pagination.pages}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
