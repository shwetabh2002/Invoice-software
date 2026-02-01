'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { invoicesApi } from '@/lib/api'
import { formatCurrency, formatDate, getStatusColor, capitalize } from '@/lib/utils'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import Link from 'next/link'
import { 
  Plus, 
  Search, 
  Edit, 
  Eye,
  FileText,
  Filter,
  Download,
  Loader2
} from 'lucide-react'
import { EmptyState, ErrorState } from '@/components/loading'
import { Skeleton } from '@/components/ui/skeleton'
import { useDebounce } from '@/hooks/useAsync'

export default function InvoicesPage() {
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [page, setPage] = useState(1)
  const debouncedSearch = useDebounce(search, 300)

  const { data, isLoading, isFetching, error, refetch } = useQuery({
    queryKey: ['invoices', { page, search: debouncedSearch, status }],
    queryFn: () => invoicesApi.getAll({ page, search: debouncedSearch, status: status || undefined, limit: 15 }),
    staleTime: 10000,
    placeholderData: (previousData) => previousData,
  })

  const invoices = data?.data?.data || []
  const pagination = data?.data?.pagination

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Invoices</h1>
            <p className="text-gray-500 dark:text-gray-400">Create and manage your invoices</p>
          </div>
        </div>
        <ErrorState 
          title="Failed to load invoices"
          message="We couldn't load your invoices. Please try again."
          onRetry={() => refetch()}
        />
      </div>
    )
  }

  const statusFilters = [
    { value: '', label: 'All Invoices' },
    { value: 'draft', label: 'Draft' },
    { value: 'sent', label: 'Sent' },
    { value: 'viewed', label: 'Viewed' },
    { value: 'paid', label: 'Paid' },
  ]

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Invoices</h1>
          <p className="text-gray-500 dark:text-gray-400">
            Create and manage your invoices
          </p>
        </div>
        <Link href="/invoices/new">
          <Button className="bg-blue-600 hover:bg-blue-700">
            <Plus className="mr-2 h-4 w-4" /> New Invoice
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <div className="relative flex-1 w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search by invoice number..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value)
                  setPage(1)
                }}
                className="pl-10"
              />
              {isFetching && (
                <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-blue-600" />
              )}
            </div>
            <div className="flex gap-2 w-full sm:w-auto overflow-x-auto pb-2 sm:pb-0">
              {statusFilters.map((filter) => (
                <Button
                  key={filter.value}
                  variant={status === filter.value ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => {
                    setStatus(filter.value)
                    setPage(1)
                  }}
                  className="whitespace-nowrap"
                >
                  {filter.label}
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Invoices table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-gray-50 dark:bg-gray-800">
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Invoice
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Client
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Due Date
                  </th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="px-6 py-4 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Status
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
                      <td className="px-6 py-4"><Skeleton className="h-4 w-28" /></td>
                      <td className="px-6 py-4">
                        <div className="space-y-2">
                          <Skeleton className="h-4 w-32" />
                          <Skeleton className="h-3 w-24" />
                        </div>
                      </td>
                      <td className="px-6 py-4"><Skeleton className="h-4 w-24" /></td>
                      <td className="px-6 py-4"><Skeleton className="h-4 w-24" /></td>
                      <td className="px-6 py-4 text-right"><Skeleton className="h-4 w-20 ml-auto" /></td>
                      <td className="px-6 py-4 text-center"><Skeleton className="h-6 w-16 mx-auto rounded-full" /></td>
                      <td className="px-6 py-4">
                        <div className="flex justify-end gap-2">
                          <Skeleton className="h-8 w-8 rounded" />
                          <Skeleton className="h-8 w-8 rounded" />
                        </div>
                      </td>
                    </tr>
                  ))
                ) : invoices.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12">
                      <EmptyState
                        icon={FileText}
                        title="No invoices found"
                        description={search || status ? "Try adjusting your filters" : "Create your first invoice to get started"}
                        action={
                          !search && !status && (
                            <Link href="/invoices/new">
                              <Button className="bg-blue-600 hover:bg-blue-700">
                                <Plus className="mr-2 h-4 w-4" /> New Invoice
                              </Button>
                            </Link>
                          )
                        }
                      />
                    </td>
                  </tr>
                ) : (
                  invoices.map((invoice: any) => {
                    const isOverdue = invoice.status !== 'paid' && 
                                      invoice.status !== 'draft' && 
                                      new Date(invoice.dates?.due) < new Date()
                    return (
                      <tr 
                        key={invoice._id} 
                        className="hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                      >
                        <td className="px-6 py-4">
                          <Link 
                            href={`/invoices/${invoice._id}`}
                            className="font-medium text-blue-600 hover:text-blue-800"
                          >
                            {invoice.invoiceNumber || `#${invoice._id.slice(-6)}`}
                          </Link>
                        </td>
                        <td className="px-6 py-4">
                          <div>
                            <p className="font-medium text-gray-900 dark:text-white">
                              {invoice.client?.name} {invoice.client?.surname}
                            </p>
                            {invoice.client?.company && (
                              <p className="text-sm text-gray-500">{invoice.client.company}</p>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          {formatDate(invoice.dates?.created)}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`text-sm ${isOverdue ? 'text-red-600 font-medium' : 'text-gray-600'}`}>
                            {formatDate(invoice.dates?.due)}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div>
                            <p className="font-semibold text-gray-900">
                              {formatCurrency(invoice.amounts?.total || 0)}
                            </p>
                            {invoice.amounts?.balance > 0 && invoice.amounts?.balance < invoice.amounts?.total && (
                              <p className="text-sm text-orange-600">
                                Due: {formatCurrency(invoice.amounts.balance)}
                              </p>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                            isOverdue ? getStatusColor('overdue') : getStatusColor(invoice.status)
                          }`}>
                            {isOverdue ? 'Overdue' : capitalize(invoice.status)}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Link href={`/invoices/${invoice._id}`}>
                              <Button variant="ghost" size="sm">
                                <Eye className="h-4 w-4" />
                              </Button>
                            </Link>
                            <Link href={`/invoices/${invoice._id}/edit`}>
                              <Button variant="ghost" size="sm">
                                <Edit className="h-4 w-4" />
                              </Button>
                            </Link>
                          </div>
                        </td>
                      </tr>
                    )
                  })
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
