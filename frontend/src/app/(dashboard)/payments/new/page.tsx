'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { paymentsApi, invoicesApi, paymentMethodsApi } from '@/lib/api'
import { formatCurrency } from '@/lib/utils'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from '@/components/ui/use-toast'
import Link from 'next/link'
import { ArrowLeft, Save, Loader2, Search, FileText } from 'lucide-react'

export default function NewPaymentPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const queryClient = useQueryClient()
  const preselectedInvoice = searchParams.get('invoice')

  const [invoiceId, setInvoiceId] = useState(preselectedInvoice || '')
  const [invoiceSearch, setInvoiceSearch] = useState('')
  const [amount, setAmount] = useState('')
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0])
  const [paymentMethodId, setPaymentMethodId] = useState('')
  const [note, setNote] = useState('')
  const [showInvoiceDropdown, setShowInvoiceDropdown] = useState(false)

  const { data: invoicesData } = useQuery({
    queryKey: ['invoices-unpaid', invoiceSearch],
    queryFn: () => invoicesApi.getAll({ search: invoiceSearch, limit: 10 }),
  })

  const { data: paymentMethodsData } = useQuery({
    queryKey: ['paymentMethods'],
    queryFn: paymentMethodsApi.getAll,
  })

  const invoices = (invoicesData?.data?.data || []).filter((i: any) => 
    i.status !== 'paid' && i.status !== 'draft' && i.amounts?.balance > 0
  )
  const paymentMethods = paymentMethodsData?.data?.data || []
  const selectedInvoice = invoices.find((i: any) => i._id === invoiceId) || 
    (invoicesData?.data?.data || []).find((i: any) => i._id === invoiceId)

  const createMutation = useMutation({
    mutationFn: (data: any) => paymentsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payments'] })
      queryClient.invalidateQueries({ queryKey: ['invoices'] })
      toast({ title: 'Payment recorded successfully' })
      router.push('/payments')
    },
    onError: (error: any) => {
      toast({
        title: 'Error recording payment',
        description: error.response?.data?.message || 'Something went wrong',
        variant: 'destructive'
      })
    }
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!invoiceId) {
      toast({ title: 'Please select an invoice', variant: 'destructive' })
      return
    }

    const paymentAmount = parseFloat(amount)
    if (!paymentAmount || paymentAmount <= 0) {
      toast({ title: 'Please enter a valid amount', variant: 'destructive' })
      return
    }

    createMutation.mutate({
      invoice: invoiceId,
      amount: paymentAmount,
      date: paymentDate,
      paymentMethod: paymentMethodId || undefined,
      note
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/payments">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Record Payment</h1>
          <p className="text-gray-500">Record a new payment for an invoice</p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Invoice Selection */}
          <Card>
            <CardHeader>
              <CardTitle>Invoice</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="relative">
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Search invoices..."
                      value={invoiceSearch}
                      onChange={(e) => {
                        setInvoiceSearch(e.target.value)
                        setShowInvoiceDropdown(true)
                      }}
                      onFocus={() => setShowInvoiceDropdown(true)}
                      className="pl-10"
                    />
                  </div>
                </div>

                {showInvoiceDropdown && invoices.length > 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-white border rounded-md shadow-lg max-h-60 overflow-auto">
                    {invoices.map((invoice: any) => (
                      <button
                        key={invoice._id}
                        type="button"
                        className="w-full px-4 py-2 text-left hover:bg-gray-100 flex items-center justify-between"
                        onClick={() => {
                          setInvoiceId(invoice._id)
                          setAmount(invoice.amounts?.balance?.toString() || '')
                          setInvoiceSearch('')
                          setShowInvoiceDropdown(false)
                        }}
                      >
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded bg-blue-100 flex items-center justify-center">
                            <FileText className="h-4 w-4 text-blue-600" />
                          </div>
                          <div>
                            <p className="font-medium">{invoice.invoiceNumber || `#${invoice._id.slice(-6)}`}</p>
                            <p className="text-sm text-gray-500">{invoice.client?.name}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-red-600">
                            {formatCurrency(invoice.amounts?.balance || 0)}
                          </p>
                          <p className="text-xs text-gray-500">Balance due</p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {selectedInvoice && (
                <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-12 w-12 rounded-lg bg-blue-100 flex items-center justify-center">
                        <FileText className="h-6 w-6 text-blue-600" />
                      </div>
                      <div>
                        <p className="font-medium">{selectedInvoice.invoiceNumber || `#${selectedInvoice._id.slice(-6)}`}</p>
                        <p className="text-sm text-gray-500">{selectedInvoice.client?.name}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-500">Total: {formatCurrency(selectedInvoice.amounts?.total || 0)}</p>
                      <p className="text-sm text-gray-500">Paid: {formatCurrency(selectedInvoice.amounts?.paid || 0)}</p>
                      <p className="font-semibold text-red-600">
                        Balance: {formatCurrency(selectedInvoice.amounts?.balance || 0)}
                      </p>
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="mt-2"
                    onClick={() => setInvoiceId('')}
                  >
                    Change Invoice
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Payment Details */}
          <Card>
            <CardHeader>
              <CardTitle>Payment Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Amount *</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  max={selectedInvoice?.amounts?.balance}
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  required
                />
                {selectedInvoice && (
                  <p className="text-sm text-gray-500">
                    Maximum: {formatCurrency(selectedInvoice.amounts?.balance || 0)}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label>Payment Date *</Label>
                <Input
                  type="date"
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label>Payment Method</Label>
                <select
                  className="w-full h-10 px-3 border rounded-md"
                  value={paymentMethodId}
                  onChange={(e) => setPaymentMethodId(e.target.value)}
                >
                  <option value="">Select method...</option>
                  {paymentMethods.map((method: any) => (
                    <option key={method._id} value={method._id}>
                      {method.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <Label>Note</Label>
                <textarea
                  className="w-full h-20 px-3 py-2 border rounded-md"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Optional payment note..."
                />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="flex justify-end gap-4 mt-6">
          <Link href="/payments">
            <Button type="button" variant="outline">Cancel</Button>
          </Link>
          <Button type="submit" disabled={createMutation.isPending} className="bg-green-600 hover:bg-green-700">
            {createMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Recording...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Record Payment
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  )
}
