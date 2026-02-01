'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { quotesApi } from '@/lib/api'
import { formatCurrency, formatDate, getStatusColor, capitalize } from '@/lib/utils'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { toast } from '@/components/ui/use-toast'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { 
  ArrowLeft, 
  Edit, 
  Send, 
  Download, 
  Copy,
  Building,
  Calendar,
  FileText,
  CheckCircle,
  XCircle,
  Loader2,
  ArrowRight,
  Clock,
  AlertTriangle
} from 'lucide-react'

export default function QuotationDetailPage() {
  const params = useParams()
  const router = useRouter()
  const queryClient = useQueryClient()
  const quoteId = params.id as string

  const { data, isLoading } = useQuery({
    queryKey: ['quotation', quoteId],
    queryFn: () => quotesApi.getById(quoteId),
  })

  const sendMutation = useMutation({
    mutationFn: () => quotesApi.markAsSent(quoteId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quotation', quoteId] })
      toast({ title: 'Quotation marked as sent' })
    }
  })

  const convertMutation = useMutation({
    mutationFn: () => quotesApi.convert(quoteId),
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ['quotation', quoteId] })
      toast({ title: 'Quotation converted to invoice successfully' })
      router.push(`/invoices/${response.data.data._id}`)
    },
    onError: (error: any) => {
      toast({ title: 'Error converting quotation', description: error.response?.data?.message, variant: 'destructive' })
    }
  })

  const copyMutation = useMutation({
    mutationFn: () => quotesApi.copy(quoteId),
    onSuccess: (response) => {
      toast({ title: 'Quotation copied successfully' })
      router.push(`/quotes/${response.data.data._id}`)
    }
  })

  const quotation = data?.data?.data

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-green-600" />
      </div>
    )
  }

  if (!quotation) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-semibold">Quotation not found</h2>
        <Link href="/quotes"><Button className="mt-4">Back to Quotations</Button></Link>
      </div>
    )
  }

  const isExpired = !quotation.invoice && quotation.status !== 'approved' && new Date(quotation.dates?.expires) < new Date()

  const downloadPDF = () => {
    window.open(`${process.env.NEXT_PUBLIC_API_URL}/pdf/quote/${quoteId}/download`, '_blank')
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link href="/quotes">
            <Button variant="ghost" size="icon"><ArrowLeft className="h-5 w-5" /></Button>
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                Quotation {quotation.quoteNumber || `#${quotation._id.slice(-6)}`}
              </h1>
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(quotation.status)}`}>
                {capitalize(quotation.status)}
              </span>
              {isExpired && (
                <span className="px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-800 flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" /> Expired
                </span>
              )}
            </div>
            <p className="text-gray-500">Created {formatDate(quotation.dates?.created)}</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {quotation.status === 'draft' && (
            <Button onClick={() => sendMutation.mutate()} disabled={sendMutation.isPending}>
              <Send className="mr-2 h-4 w-4" />Mark as Sent
            </Button>
          )}
          {(quotation.status === 'approved' || quotation.status === 'viewed' || quotation.status === 'sent') && !quotation.invoice && (
            <Button onClick={() => convertMutation.mutate()} disabled={convertMutation.isPending} className="bg-blue-600 hover:bg-blue-700">
              <FileText className="mr-2 h-4 w-4" />Convert to Invoice
            </Button>
          )}
          {quotation.invoice && (
            <Link href={`/invoices/${quotation.invoice._id || quotation.invoice}`}>
              <Button variant="outline" className="border-blue-300 text-blue-600">
                <ArrowRight className="mr-2 h-4 w-4" />View Invoice
              </Button>
            </Link>
          )}
          <Button variant="outline" onClick={downloadPDF}>
            <Download className="mr-2 h-4 w-4" />Download PDF
          </Button>
          <Button variant="outline" onClick={() => copyMutation.mutate()}>
            <Copy className="mr-2 h-4 w-4" />Duplicate
          </Button>
          {quotation.status === 'draft' && !quotation.invoice && (
            <Link href={`/quotes/${quoteId}/edit`}>
              <Button variant="outline"><Edit className="mr-2 h-4 w-4" />Edit</Button>
            </Link>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Client Info */}
        <Card className="border-l-4 border-l-green-500">
          <CardHeader><CardTitle className="flex items-center gap-2"><Building className="h-5 w-5" /> Quotation For</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-2">
              <p className="font-semibold text-lg">{quotation.client?.name} {quotation.client?.surname}</p>
              {quotation.client?.company && (
                <p className="text-gray-600">{quotation.client.company}</p>
              )}
              {quotation.client?.address?.line1 && (
                <p className="text-sm text-gray-500">
                  {quotation.client.address.line1}
                  {quotation.client.address.city && `, ${quotation.client.address.city}`}
                </p>
              )}
              {quotation.client?.contact?.email && <p className="text-sm text-blue-600">{quotation.client.contact.email}</p>}
              {quotation.client?.contact?.phone && <p className="text-sm text-gray-500">Tel: {quotation.client.contact.phone}</p>}
            </div>
          </CardContent>
        </Card>

        {/* Dates */}
        <Card className="border-l-4 border-l-blue-500">
          <CardHeader><CardTitle className="flex items-center gap-2"><Calendar className="h-5 w-5" /> Important Dates</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                  <Calendar className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Issue Date</p>
                  <p className="font-medium">{formatDate(quotation.dates?.created)}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className={`h-10 w-10 rounded-full flex items-center justify-center ${isExpired ? 'bg-red-100' : 'bg-green-100'}`}>
                  <Clock className={`h-5 w-5 ${isExpired ? 'text-red-600' : 'text-green-600'}`} />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Valid Until</p>
                  <p className={`font-medium ${isExpired ? 'text-red-600' : 'text-green-600'}`}>
                    {formatDate(quotation.dates?.expires)}
                    {isExpired && <span className="text-xs ml-2">(Expired)</span>}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Amount */}
        <Card className={`border-l-4 ${quotation.status === 'approved' ? 'border-l-green-500 bg-green-50' : quotation.status === 'rejected' ? 'border-l-red-500 bg-red-50' : 'border-l-amber-500'}`}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {quotation.status === 'approved' ? <CheckCircle className="h-5 w-5 text-green-600" /> : 
               quotation.status === 'rejected' ? <XCircle className="h-5 w-5 text-red-600" /> : 
               <FileText className="h-5 w-5 text-amber-600" />}
              Quotation Amount
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-bold text-gray-900">{formatCurrency(quotation.amounts?.total || 0)}</p>
            <p className="text-sm text-gray-500 mt-2">
              {quotation.items?.length || 0} item{quotation.items?.length !== 1 ? 's' : ''} included
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Items */}
      <Card>
        <CardHeader className="bg-gray-50 border-b">
          <CardTitle>Line Items</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-100 border-b">
                  <th className="text-left py-4 px-6 font-semibold text-gray-700">Item Description</th>
                  <th className="text-center py-4 px-4 font-semibold text-gray-700">Qty</th>
                  <th className="text-right py-4 px-4 font-semibold text-gray-700">Unit Price</th>
                  <th className="text-center py-4 px-4 font-semibold text-gray-700">Tax</th>
                  <th className="text-right py-4 px-6 font-semibold text-gray-700">Amount</th>
                </tr>
              </thead>
              <tbody>
                {quotation.items?.map((item: any, index: number) => (
                  <tr key={index} className="border-b hover:bg-gray-50">
                    <td className="py-4 px-6">
                      <p className="font-medium text-gray-900">{item.name}</p>
                      {item.description && <p className="text-sm text-gray-500 mt-1">{item.description}</p>}
                    </td>
                    <td className="py-4 px-4 text-center">{item.quantity}</td>
                    <td className="py-4 px-4 text-right">{formatCurrency(item.price)}</td>
                    <td className="py-4 px-4 text-center text-gray-500">{item.taxRatePercent || 0}%</td>
                    <td className="py-4 px-6 text-right font-semibold">
                      {formatCurrency(item.amounts?.total || item.quantity * item.price)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-gray-50">
                <tr className="border-b">
                  <td colSpan={4} className="py-3 px-6 text-right text-gray-600">Subtotal:</td>
                  <td className="py-3 px-6 text-right font-medium">{formatCurrency(quotation.amounts?.subtotal || 0)}</td>
                </tr>
                {quotation.amounts?.itemTaxTotal > 0 && (
                  <tr className="border-b">
                    <td colSpan={4} className="py-3 px-6 text-right text-gray-600">Total Tax:</td>
                    <td className="py-3 px-6 text-right">{formatCurrency(quotation.amounts.itemTaxTotal)}</td>
                  </tr>
                )}
                {(quotation.amounts?.discountAmount > 0 || quotation.amounts?.discountPercent > 0) && (
                  <tr className="border-b">
                    <td colSpan={4} className="py-3 px-6 text-right text-green-600">Discount:</td>
                    <td className="py-3 px-6 text-right text-green-600">
                      -{formatCurrency(quotation.amounts.discountAmount || 0)}
                    </td>
                  </tr>
                )}
                <tr className="bg-green-600 text-white">
                  <td colSpan={4} className="py-4 px-6 text-right font-bold text-lg">Grand Total:</td>
                  <td className="py-4 px-6 text-right font-bold text-xl">{formatCurrency(quotation.amounts?.total || 0)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Notes */}
      {quotation.notes && (
        <Card>
          <CardHeader className="bg-amber-50 border-b border-amber-100">
            <CardTitle className="text-amber-800">Additional Notes</CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <p className="whitespace-pre-wrap text-gray-600">{quotation.notes}</p>
          </CardContent>
        </Card>
      )}

      {/* Validity Warning */}
      {isExpired && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
          <AlertTriangle className="h-6 w-6 text-red-600" />
          <div>
            <p className="font-medium text-red-800">This quotation has expired</p>
            <p className="text-sm text-red-600">The validity period ended on {formatDate(quotation.dates?.expires)}. Consider creating a new quotation.</p>
          </div>
        </div>
      )}
    </div>
  )
}
