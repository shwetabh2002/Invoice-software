'use client'

import { useQuery } from '@tanstack/react-query'
import { clientsApi } from '@/lib/api'
import { formatCurrency, formatDate, getStatusColor, capitalize } from '@/lib/utils'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { 
  ArrowLeft, 
  Edit, 
  Mail, 
  Phone, 
  Building, 
  MapPin,
  Globe,
  FileText,
  FilePlus
} from 'lucide-react'

export default function ClientDetailPage() {
  const params = useParams()
  const clientId = params.id as string

  const { data: clientData, isLoading } = useQuery({
    queryKey: ['client', clientId],
    queryFn: () => clientsApi.getById(clientId),
  })

  const { data: invoicesData } = useQuery({
    queryKey: ['client-invoices', clientId],
    queryFn: () => clientsApi.getInvoices(clientId, { limit: 5 }),
  })

  const { data: quotesData } = useQuery({
    queryKey: ['client-quotes', clientId],
    queryFn: () => clientsApi.getQuotes(clientId, { limit: 5 }),
  })

  const client = clientData?.data?.data
  const invoices = invoicesData?.data?.data || []
  const quotes = quotesData?.data?.data || []

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
        </div>
      </div>
    )
  }

  if (!client) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-semibold">Client not found</h2>
        <Link href="/clients">
          <Button className="mt-4">Back to Clients</Button>
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/clients">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white text-2xl font-semibold">
              {client.name?.charAt(0) || 'C'}
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                {client.name} {client.surname}
              </h1>
              {client.company && (
                <p className="text-gray-500 flex items-center gap-1">
                  <Building className="h-4 w-4" />
                  {client.company}
                </p>
              )}
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <Link href={`/invoices/new?client=${clientId}`}>
            <Button variant="outline">
              <FileText className="mr-2 h-4 w-4" />
              New Invoice
            </Button>
          </Link>
          <Link href={`/quotes/new?client=${clientId}`}>
            <Button variant="outline">
              <FilePlus className="mr-2 h-4 w-4" />
              New Quote
            </Button>
          </Link>
          <Link href={`/clients/${clientId}/edit`}>
            <Button>
              <Edit className="mr-2 h-4 w-4" />
              Edit
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Contact Info */}
        <Card>
          <CardHeader>
            <CardTitle>Contact Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {client.contact?.email && (
              <div className="flex items-center gap-3">
                <Mail className="h-4 w-4 text-gray-400" />
                <a href={`mailto:${client.contact.email}`} className="text-blue-600 hover:underline">
                  {client.contact.email}
                </a>
              </div>
            )}
            {client.contact?.phone && (
              <div className="flex items-center gap-3">
                <Phone className="h-4 w-4 text-gray-400" />
                <a href={`tel:${client.contact.phone}`}>{client.contact.phone}</a>
              </div>
            )}
            {client.contact?.mobile && (
              <div className="flex items-center gap-3">
                <Phone className="h-4 w-4 text-gray-400" />
                <a href={`tel:${client.contact.mobile}`}>{client.contact.mobile}</a>
              </div>
            )}
            {client.contact?.web && (
              <div className="flex items-center gap-3">
                <Globe className="h-4 w-4 text-gray-400" />
                <a href={client.contact.web} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                  {client.contact.web}
                </a>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Address */}
        <Card>
          <CardHeader>
            <CardTitle>Address</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-start gap-3">
              <MapPin className="h-4 w-4 text-gray-400 mt-1" />
              <div>
                {client.address?.line1 && <p>{client.address.line1}</p>}
                {client.address?.line2 && <p>{client.address.line2}</p>}
                {(client.address?.city || client.address?.state || client.address?.zip) && (
                  <p>
                    {client.address.city}{client.address.city && client.address.state && ', '}
                    {client.address.state} {client.address.zip}
                  </p>
                )}
                {client.address?.country && <p>{client.address.country}</p>}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tax Info */}
        <Card>
          <CardHeader>
            <CardTitle>Tax Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {client.tax?.vatId && (
              <div>
                <p className="text-sm text-gray-500">VAT ID / GST</p>
                <p className="font-medium">{client.tax.vatId}</p>
              </div>
            )}
            {client.tax?.taxCode && (
              <div>
                <p className="text-sm text-gray-500">Tax Code / PAN</p>
                <p className="font-medium">{client.tax.taxCode}</p>
              </div>
            )}
            {!client.tax?.vatId && !client.tax?.taxCode && (
              <p className="text-gray-500">No tax information</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Invoices */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Recent Invoices</CardTitle>
          <Link href={`/invoices?client=${clientId}`}>
            <Button variant="ghost" size="sm">View All</Button>
          </Link>
        </CardHeader>
        <CardContent>
          {invoices.length === 0 ? (
            <p className="text-center text-gray-500 py-4">No invoices yet</p>
          ) : (
            <div className="space-y-3">
              {invoices.map((invoice: any) => (
                <Link 
                  key={invoice._id}
                  href={`/invoices/${invoice._id}`}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50"
                >
                  <div>
                    <p className="font-medium">{invoice.invoiceNumber || `#${invoice._id.slice(-6)}`}</p>
                    <p className="text-sm text-gray-500">{formatDate(invoice.dates?.created)}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">{formatCurrency(invoice.amounts?.total || 0)}</p>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(invoice.status)}`}>
                      {capitalize(invoice.status)}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Quotes */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Recent Quotes</CardTitle>
          <Link href={`/quotes?client=${clientId}`}>
            <Button variant="ghost" size="sm">View All</Button>
          </Link>
        </CardHeader>
        <CardContent>
          {quotes.length === 0 ? (
            <p className="text-center text-gray-500 py-4">No quotes yet</p>
          ) : (
            <div className="space-y-3">
              {quotes.map((quote: any) => (
                <Link 
                  key={quote._id}
                  href={`/quotes/${quote._id}`}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50"
                >
                  <div>
                    <p className="font-medium">{quote.quoteNumber || `#${quote._id.slice(-6)}`}</p>
                    <p className="text-sm text-gray-500">{formatDate(quote.dates?.created)}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">{formatCurrency(quote.amounts?.total || 0)}</p>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(quote.status)}`}>
                      {capitalize(quote.status)}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
