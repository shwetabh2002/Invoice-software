'use client'

import { useQuery } from '@tanstack/react-query'
import { dashboardApi } from '@/lib/api'
import { formatCurrency, formatDate, getStatusColor, capitalize } from '@/lib/utils'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { 
  FileText, 
  FilePlus, 
  Users, 
  CreditCard, 
  TrendingUp,
  AlertCircle,
  ArrowRight,
  Plus,
  RefreshCw
} from 'lucide-react'
import { DashboardSkeleton, ErrorState } from '@/components/loading'

export default function DashboardPage() {
  const { data, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => dashboardApi.get('this-month'),
    staleTime: 30000, // Consider data fresh for 30 seconds
    retry: 2,
    retryDelay: 1000,
  })

  const dashboard = data?.data?.data

  if (isLoading) {
    return <DashboardSkeleton />
  }

  if (error) {
    return (
      <ErrorState 
        title="Failed to load dashboard"
        message="We couldn't load your dashboard data. Please try again."
        onRetry={() => refetch()}
      />
    )
  }

  const quickActions = [
    { name: 'New Client', href: '/clients/new', icon: Users, color: 'bg-blue-500' },
    { name: 'New Quote', href: '/quotes/new', icon: FilePlus, color: 'bg-green-500' },
    { name: 'New Invoice', href: '/invoices/new', icon: FileText, color: 'bg-purple-500' },
    { name: 'New Payment', href: '/payments/new', icon: CreditCard, color: 'bg-orange-500' },
  ]

  // Calculate totals from stats
  const invoiceTotal = dashboard?.invoiceStats?.reduce((sum: number, s: any) => sum + s.total, 0) || 0
  const quoteTotal = dashboard?.quoteStats?.reduce((sum: number, s: any) => sum + s.total, 0) || 0
  const paidTotal = dashboard?.invoiceStats?.find((s: any) => s.status === 'paid')?.total || 0

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
          <p className="text-gray-500 dark:text-gray-400">Overview of your business this month</p>
        </div>
      </div>

      {/* Quick actions */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-semibold">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {quickActions.map((action) => (
              <Link key={action.name} href={action.href}>
                <Button variant="outline" className="w-full h-auto py-4 flex flex-col items-center gap-2 hover:bg-gray-50">
                  <div className={`p-2 rounded-lg ${action.color}`}>
                    <action.icon className="h-5 w-5 text-white" />
                  </div>
                  <span className="text-sm font-medium">{action.name}</span>
                </Button>
              </Link>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Stats grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Total Clients</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">{dashboard?.totals?.clients || 0}</p>
              </div>
              <div className="h-12 w-12 bg-blue-100 rounded-full flex items-center justify-center">
                <Users className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Invoiced</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">{formatCurrency(invoiceTotal)}</p>
              </div>
              <div className="h-12 w-12 bg-purple-100 rounded-full flex items-center justify-center">
                <FileText className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Paid</p>
                <p className="text-3xl font-bold text-green-600 mt-1">{formatCurrency(paidTotal)}</p>
              </div>
              <div className="h-12 w-12 bg-green-100 rounded-full flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className={dashboard?.overdueTotal > 0 ? 'border-red-200 bg-red-50' : ''}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Overdue</p>
                <p className={`text-3xl font-bold mt-1 ${dashboard?.overdueTotal > 0 ? 'text-red-600' : 'text-gray-900'}`}>
                  {formatCurrency(dashboard?.overdueTotal || 0)}
                </p>
              </div>
              <div className={`h-12 w-12 rounded-full flex items-center justify-center ${dashboard?.overdueTotal > 0 ? 'bg-red-100' : 'bg-gray-100'}`}>
                <AlertCircle className={`h-6 w-6 ${dashboard?.overdueTotal > 0 ? 'text-red-600' : 'text-gray-400'}`} />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Invoice and Quote Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Invoice Overview */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg font-semibold">Invoice Overview</CardTitle>
            <Link href="/invoices">
              <Button variant="ghost" size="sm">
                View All <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {dashboard?.invoiceStats?.map((stat: any) => (
                <div key={stat.status} className="flex items-center justify-between py-2 border-b last:border-0">
                  <div className="flex items-center gap-3">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${getStatusColor(stat.status)}`}>
                      {capitalize(stat.label)}
                    </span>
                    <span className="text-sm text-gray-500">({stat.count})</span>
                  </div>
                  <span className="font-semibold">{formatCurrency(stat.total)}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Quote Overview */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg font-semibold">Quote Overview</CardTitle>
            <Link href="/quotes">
              <Button variant="ghost" size="sm">
                View All <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {dashboard?.quoteStats?.map((stat: any) => (
                <div key={stat.status} className="flex items-center justify-between py-2 border-b last:border-0">
                  <div className="flex items-center gap-3">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${getStatusColor(stat.status)}`}>
                      {capitalize(stat.label)}
                    </span>
                    <span className="text-sm text-gray-500">({stat.count})</span>
                  </div>
                  <span className="font-semibold">{formatCurrency(stat.total)}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent invoices and quotes */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Invoices */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg font-semibold">Recent Invoices</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {dashboard?.recentInvoices?.slice(0, 5).map((invoice: any) => (
                <Link 
                  key={invoice._id} 
                  href={`/invoices/${invoice._id}`}
                  className="flex items-center justify-between py-2 border-b last:border-0 hover:bg-gray-50 -mx-4 px-4 transition-colors"
                >
                  <div>
                    <p className="font-medium text-gray-900">{invoice.invoiceNumber || `#${invoice._id.slice(-6)}`}</p>
                    <p className="text-sm text-gray-500">{invoice.client?.name}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">{formatCurrency(invoice.amounts?.total || 0)}</p>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(invoice.status)}`}>
                      {capitalize(invoice.status)}
                    </span>
                  </div>
                </Link>
              ))}
              {(!dashboard?.recentInvoices || dashboard.recentInvoices.length === 0) && (
                <p className="text-center text-gray-500 py-4">No invoices yet</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Recent Quotes */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg font-semibold">Recent Quotes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {dashboard?.recentQuotes?.slice(0, 5).map((quote: any) => (
                <Link 
                  key={quote._id} 
                  href={`/quotes/${quote._id}`}
                  className="flex items-center justify-between py-2 border-b last:border-0 hover:bg-gray-50 -mx-4 px-4 transition-colors"
                >
                  <div>
                    <p className="font-medium text-gray-900">{quote.quoteNumber || `#${quote._id.slice(-6)}`}</p>
                    <p className="text-sm text-gray-500">{quote.client?.name}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">{formatCurrency(quote.amounts?.total || 0)}</p>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(quote.status)}`}>
                      {capitalize(quote.status)}
                    </span>
                  </div>
                </Link>
              ))}
              {(!dashboard?.recentQuotes || dashboard.recentQuotes.length === 0) && (
                <p className="text-center text-gray-500 py-4">No quotes yet</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
