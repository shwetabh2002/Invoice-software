'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { invoicesApi, paymentsApi } from '@/lib/api'
import { formatCurrency, formatDate, getStatusColor, capitalize } from '@/lib/utils'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from '@/components/ui/use-toast'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { useState } from 'react'
import { 
  ArrowLeft, 
  Edit, 
  Send, 
  Download, 
  Copy,
  Mail,
  CreditCard,
  Printer,
  Building,
  Calendar,
  DollarSign,
  CheckCircle,
  AlertCircle,
  Loader2,
  FileText
} from 'lucide-react'
import { DetailPageSkeleton, ErrorState } from '@/components/loading'

export default function InvoiceDetailPage() {
  const params = useParams()
  const router = useRouter()
  const queryClient = useQueryClient()
  const invoiceId = params.id as string
  
  const [showPaymentForm, setShowPaymentForm] = useState(false)
  const [paymentAmount, setPaymentAmount] = useState('')
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0])

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['invoice', invoiceId],
    queryFn: () => invoicesApi.getById(invoiceId),
    retry: 2,
  })

  const sendMutation = useMutation({
    mutationFn: () => invoicesApi.markAsSent(invoiceId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoice', invoiceId] })
      toast({ title: 'Invoice marked as sent' })
    }
  })

  const copyMutation = useMutation({
    mutationFn: () => invoicesApi.copy(invoiceId),
    onSuccess: (response) => {
      toast({ title: 'Invoice copied successfully' })
      router.push(`/invoices/${response.data.data._id}`)
    }
  })

  const paymentMutation = useMutation({
    mutationFn: (data: any) => paymentsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoice', invoiceId] })
      toast({ title: 'Payment recorded successfully' })
      setShowPaymentForm(false)
      setPaymentAmount('')
      refetch()
    },
    onError: (error: any) => {
      toast({
        title: 'Error recording payment',
        description: error.response?.data?.message,
        variant: 'destructive'
      })
    }
  })

  const invoice = data?.data?.data

  if (isLoading) {
    return <DetailPageSkeleton />
  }

  if (error) {
    return (
      <ErrorState 
        title="Failed to load invoice"
        message="We couldn't load this invoice. Please try again."
        onRetry={() => refetch()}
      />
    )
  }

  if (!invoice) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <FileText className="h-16 w-16 text-gray-300 mb-4" />
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Invoice not found</h2>
        <p className="text-gray-500 mb-4">The invoice you're looking for doesn't exist or has been deleted.</p>
        <Link href="/invoices">
          <Button>Back to Invoices</Button>
        </Link>
      </div>
    )
  }

  const isOverdue = invoice.status !== 'paid' && 
                    invoice.status !== 'draft' && 
                    new Date(invoice.dates?.due) < new Date()

  const handleRecordPayment = () => {
    const amount = parseFloat(paymentAmount)
    if (!amount || amount <= 0) {
      toast({ title: 'Please enter a valid amount', variant: 'destructive' })
      return
    }

    paymentMutation.mutate({
      invoice: invoiceId,
      amount,
      date: paymentDate
    })
  }

  const downloadPDF = async () => {
    try {
      window.open(`${process.env.NEXT_PUBLIC_API_URL}/pdf/invoice/${invoiceId}/download`, '_blank')
    } catch (error) {
      toast({ title: 'Error downloading PDF', variant: 'destructive' })
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link href="/invoices">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                {invoice.invoiceNumber || `Invoice #${invoice._id.slice(-6)}`}
              </h1>
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                isOverdue ? getStatusColor('overdue') : getStatusColor(invoice.status)
              }`}>
                {isOverdue ? 'Overdue' : capitalize(invoice.status)}
              </span>
            </div>
            <p className="text-gray-500">
              Created {formatDate(invoice.dates?.created)}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {invoice.status === 'draft' && (
            <Button onClick={() => sendMutation.mutate()} disabled={sendMutation.isPending}>
              <Send className="mr-2 h-4 w-4" />
              Mark as Sent
            </Button>
          )}
          {invoice.status !== 'paid' && invoice.status !== 'draft' && (
            <Button onClick={() => setShowPaymentForm(true)} variant="success" className="bg-green-600 hover:bg-green-700">
              <CreditCard className="mr-2 h-4 w-4" />
              Record Payment
            </Button>
          )}
          <Button variant="outline" onClick={downloadPDF}>
            <Download className="mr-2 h-4 w-4" />
            PDF
          </Button>
          <Button variant="outline" onClick={() => copyMutation.mutate()}>
            <Copy className="mr-2 h-4 w-4" />
            Copy
          </Button>
          {invoice.status === 'draft' && (
            <Link href={`/invoices/${invoiceId}/edit`}>
              <Button variant="outline">
                <Edit className="mr-2 h-4 w-4" />
                Edit
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* Payment Form Modal */}
      {showPaymentForm && (
        <Card className="border-green-200 bg-green-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Record Payment
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Amount</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  max={invoice.amounts?.balance}
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  placeholder={`Max: ${formatCurrency(invoice.amounts?.balance || 0)}`}
                />
              </div>
              <div className="space-y-2">
                <Label>Date</Label>
                <Input
                  type="date"
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                />
              </div>
              <div className="flex items-end gap-2">
                <Button onClick={handleRecordPayment} disabled={paymentMutation.isPending} className="bg-green-600 hover:bg-green-700">
                  {paymentMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save Payment'}
                </Button>
                <Button variant="outline" onClick={() => setShowPaymentForm(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Client Info */}
        <Card>
          <CardHeader>
            <CardTitle>Bill To</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <p className="font-semibold">{invoice.client?.name} {invoice.client?.surname}</p>
              {invoice.client?.company && (
                <p className="flex items-center gap-2 text-gray-600">
                  <Building className="h-4 w-4" />
                  {invoice.client.company}
                </p>
              )}
              {invoice.client?.contact?.email && (
                <p className="text-gray-600">{invoice.client.contact.email}</p>
              )}
              {invoice.client?.address?.city && (
                <p className="text-gray-600">
                  {invoice.client.address.city}, {invoice.client.address.country}
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Dates */}
        <Card>
          <CardHeader>
            <CardTitle>Dates</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <Calendar className="h-4 w-4 text-gray-400" />
                <div>
                  <p className="text-sm text-gray-500">Invoice Date</p>
                  <p className="font-medium">{formatDate(invoice.dates?.created)}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Calendar className={`h-4 w-4 ${isOverdue ? 'text-red-500' : 'text-gray-400'}`} />
                <div>
                  <p className="text-sm text-gray-500">Due Date</p>
                  <p className={`font-medium ${isOverdue ? 'text-red-600' : ''}`}>
                    {formatDate(invoice.dates?.due)}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Amount Summary */}
        <Card className={invoice.status === 'paid' ? 'border-green-200 bg-green-50' : ''}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {invoice.status === 'paid' ? (
                <CheckCircle className="h-5 w-5 text-green-600" />
              ) : (
                <DollarSign className="h-5 w-5" />
              )}
              Amount
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600">Total:</span>
                <span className="font-bold text-xl">{formatCurrency(invoice.amounts?.total || 0)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Paid:</span>
                <span className="text-green-600">{formatCurrency(invoice.amounts?.paid || 0)}</span>
              </div>
              {invoice.amounts?.balance > 0 && (
                <div className="flex justify-between border-t pt-2">
                  <span className="text-gray-600">Balance Due:</span>
                  <span className={`font-bold ${isOverdue ? 'text-red-600' : ''}`}>
                    {formatCurrency(invoice.amounts.balance)}
                  </span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Invoice Items */}
      <Card>
        <CardHeader>
          <CardTitle>Items</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4 font-semibold">Item</th>
                  <th className="text-right py-3 px-4 font-semibold">Qty</th>
                  <th className="text-right py-3 px-4 font-semibold">Price</th>
                  <th className="text-right py-3 px-4 font-semibold">Tax</th>
                  <th className="text-right py-3 px-4 font-semibold">Total</th>
                </tr>
              </thead>
              <tbody>
                {invoice.items?.map((item: any, index: number) => (
                  <tr key={index} className="border-b">
                    <td className="py-3 px-4">
                      <p className="font-medium">{item.name}</p>
                      {item.description && (
                        <p className="text-sm text-gray-500">{item.description}</p>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right">{item.quantity}</td>
                    <td className="py-3 px-4 text-right">{formatCurrency(item.price)}</td>
                    <td className="py-3 px-4 text-right">{item.taxRatePercent || 0}%</td>
                    <td className="py-3 px-4 text-right font-medium">
                      {formatCurrency(item.amounts?.total || item.quantity * item.price)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={4} className="py-3 px-4 text-right font-semibold">Subtotal:</td>
                  <td className="py-3 px-4 text-right font-semibold">
                    {formatCurrency(invoice.amounts?.subtotal || 0)}
                  </td>
                </tr>
                {invoice.amounts?.itemTaxTotal > 0 && (
                  <tr>
                    <td colSpan={4} className="py-3 px-4 text-right text-gray-600">Tax:</td>
                    <td className="py-3 px-4 text-right">
                      {formatCurrency(invoice.amounts.itemTaxTotal)}
                    </td>
                  </tr>
                )}
                {invoice.amounts?.discountAmount > 0 && (
                  <tr>
                    <td colSpan={4} className="py-3 px-4 text-right text-gray-600">Discount:</td>
                    <td className="py-3 px-4 text-right text-red-600">
                      -{formatCurrency(invoice.amounts.discountAmount)}
                    </td>
                  </tr>
                )}
                <tr className="bg-gray-50">
                  <td colSpan={4} className="py-3 px-4 text-right font-bold text-lg">Total:</td>
                  <td className="py-3 px-4 text-right font-bold text-lg">
                    {formatCurrency(invoice.amounts?.total || 0)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Terms */}
      {invoice.terms && (
        <Card>
          <CardHeader>
            <CardTitle>Terms & Conditions</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-wrap text-gray-600">{invoice.terms}</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
