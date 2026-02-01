'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { quotesApi, clientsApi, taxRatesApi, invoiceGroupsApi, productsApi } from '@/lib/api'
import { formatCurrency } from '@/lib/utils'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from '@/components/ui/use-toast'
import Link from 'next/link'
import { ArrowLeft, Save, Loader2, Plus, Trash, Search, AlertCircle } from 'lucide-react'

interface QuoteItem {
  id: string
  name: string
  description: string
  quantity: number
  price: number
  taxRate: string
  taxRatePercent: number
  discountAmount: number
}

export default function NewQuotationPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const queryClient = useQueryClient()
  const preselectedClient = searchParams.get('client')

  const [clientId, setClientId] = useState(preselectedClient || '')
  const [clientSearch, setClientSearch] = useState('')
  const [invoiceGroupId, setInvoiceGroupId] = useState('')
  const [expiresDate, setExpiresDate] = useState('')
  const [notes, setNotes] = useState('')
  const [items, setItems] = useState<QuoteItem[]>([
    { id: '1', name: '', description: '', quantity: 1, price: 0, taxRate: '', taxRatePercent: 0, discountAmount: 0 }
  ])
  const [discountPercent, setDiscountPercent] = useState(0)
  const [showClientDropdown, setShowClientDropdown] = useState(false)
  const [errors, setErrors] = useState<{[key: string]: string}>({})

  const { data: clientsData } = useQuery({
    queryKey: ['clients-search', clientSearch],
    queryFn: () => clientsApi.getAll({ search: clientSearch, limit: 10 }),
  })

  const { data: taxRatesData } = useQuery({
    queryKey: ['taxRates'],
    queryFn: taxRatesApi.getAll,
  })

  const { data: numberSeriesData } = useQuery({
    queryKey: ['numberSeries', 'quotation'],
    queryFn: () => invoiceGroupsApi.getAll('quotation'),
  })

  const { data: productsData } = useQuery({
    queryKey: ['products'],
    queryFn: () => productsApi.getAll({ limit: 100 }),
  })

  const clients = clientsData?.data?.data || []
  const taxRates = taxRatesData?.data?.data || []
  const numberSeries = numberSeriesData?.data?.data || []
  const products = productsData?.data?.data || []

  useEffect(() => {
    if (numberSeries.length > 0 && !invoiceGroupId) {
      // Auto-select quotation series or first available
      const quotationSeries = numberSeries.find((s: any) => 
        s.documentType === 'quotation' || s.name.toLowerCase().includes('quotation') || s.name.toLowerCase().includes('quote')
      )
      const defaultSeries = quotationSeries || numberSeries.find((s: any) => s.isDefault) || numberSeries[0]
      setInvoiceGroupId(defaultSeries._id)
    }
  }, [numberSeries, invoiceGroupId])

  useEffect(() => {
    if (!expiresDate) {
      const date = new Date()
      date.setDate(date.getDate() + 15)
      setExpiresDate(date.toISOString().split('T')[0])
    }
  }, [expiresDate])

  const createMutation = useMutation({
    mutationFn: (data: any) => quotesApi.create(data),
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ['quotations'] })
      toast({ title: 'Quotation created successfully' })
      router.push(`/quotes/${response.data.data._id}`)
    },
    onError: (error: any) => {
      toast({
        title: 'Error creating quotation',
        description: error.response?.data?.message || 'Something went wrong',
        variant: 'destructive'
      })
    }
  })

  const addItem = () => {
    setItems([
      ...items,
      { id: Date.now().toString(), name: '', description: '', quantity: 1, price: 0, taxRate: '', taxRatePercent: 0, discountAmount: 0 }
    ])
  }

  const removeItem = (id: string) => {
    if (items.length > 1) {
      setItems(items.filter(item => item.id !== id))
    }
  }

  const updateItem = (id: string, field: string, value: any) => {
    setItems(items.map(item => {
      if (item.id === id) {
        const updated = { ...item, [field]: value }
        if (field === 'taxRate' && value) {
          const taxRate = taxRates.find((tr: any) => tr._id === value)
          updated.taxRatePercent = taxRate?.percent || 0
        }
        return updated
      }
      return item
    }))
    // Clear error when user types
    if (errors[`item_${id}_${field}`]) {
      setErrors(prev => {
        const newErrors = { ...prev }
        delete newErrors[`item_${id}_${field}`]
        return newErrors
      })
    }
  }

  const calculateItemTotal = (item: QuoteItem) => {
    const subtotal = item.quantity * item.price
    const discount = item.discountAmount || 0
    const taxableAmount = subtotal - discount
    const tax = taxableAmount * (item.taxRatePercent / 100)
    return taxableAmount + tax
  }

  const calculateTotals = () => {
    const subtotal = items.reduce((sum, item) => sum + (item.quantity * item.price), 0)
    const itemDiscount = items.reduce((sum, item) => sum + (item.discountAmount || 0), 0)
    const globalDiscount = subtotal * (discountPercent / 100)
    const taxableAmount = subtotal - itemDiscount - globalDiscount
    const itemTax = items.reduce((sum, item) => {
      const itemSubtotal = item.quantity * item.price - (item.discountAmount || 0)
      return sum + (itemSubtotal * (item.taxRatePercent / 100))
    }, 0)
    const total = taxableAmount + itemTax
    return { subtotal, itemDiscount, globalDiscount, itemTax, total }
  }

  const totals = calculateTotals()

  const validateForm = (): boolean => {
    const newErrors: {[key: string]: string} = {}

    if (!clientId) {
      newErrors.client = 'Please select a client'
    }

    const validItems = items.filter(item => item.name.trim() !== '')
    if (validItems.length === 0) {
      newErrors.items = 'Please add at least one item'
    }

    // Validate each item
    items.forEach(item => {
      if (item.name.trim() !== '') {
        if (item.quantity <= 0) {
          newErrors[`item_${item.id}_quantity`] = 'Quantity must be greater than 0'
        }
        if (item.price <= 0) {
          newErrors[`item_${item.id}_price`] = 'Price must be greater than 0'
        }
      }
    })

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) {
      toast({ 
        title: 'Validation Error', 
        description: 'Please fix the errors before submitting',
        variant: 'destructive' 
      })
      return
    }

    const validItems = items.filter(item => item.name.trim() !== '')

    createMutation.mutate({
      client: clientId,
      invoiceGroup: invoiceGroupId,
      dates: { expires: expiresDate },
      items: validItems.map(item => ({
        name: item.name,
        description: item.description,
        quantity: item.quantity,
        price: item.price,
        taxRate: item.taxRate || undefined,
        discountAmount: item.discountAmount
      })),
      amounts: { discountPercent },
      notes
    })
  }

  const selectedClient = clients.find((c: any) => c._id === clientId)

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/quotes">
          <Button variant="ghost" size="icon"><ArrowLeft className="h-5 w-5" /></Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">New Quotation</h1>
          <p className="text-gray-500">Create a new quotation for your client</p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2">
            <CardHeader><CardTitle>Client Details</CardTitle></CardHeader>
            <CardContent>
              <div className="relative">
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Search clients..."
                      value={clientSearch}
                      onChange={(e) => { setClientSearch(e.target.value); setShowClientDropdown(true) }}
                      onFocus={() => setShowClientDropdown(true)}
                      className={`pl-10 ${errors.client ? 'border-red-500' : ''}`}
                    />
                  </div>
                </div>
                {errors.client && (
                  <p className="text-red-500 text-sm mt-1 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" /> {errors.client}
                  </p>
                )}
                {showClientDropdown && clients.length > 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-white border rounded-md shadow-lg max-h-60 overflow-auto">
                    {clients.map((client: any) => (
                      <button
                        key={client._id}
                        type="button"
                        className="w-full px-4 py-2 text-left hover:bg-gray-100 flex items-center gap-3"
                        onClick={() => { setClientId(client._id); setClientSearch(''); setShowClientDropdown(false); setErrors(prev => { const e = {...prev}; delete e.client; return e }) }}
                      >
                        <div className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center text-green-600 font-medium">
                          {client.name?.charAt(0)}
                        </div>
                        <div>
                          <p className="font-medium">{client.name} {client.surname}</p>
                          <p className="text-sm text-gray-500">{client.company || client.contact?.email}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {selectedClient && (
                <div className="mt-4 p-4 bg-green-50 rounded-lg border border-green-200">
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-full bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center text-white font-semibold">
                      {selectedClient.name?.charAt(0)}
                    </div>
                    <div>
                      <p className="font-medium text-green-900">{selectedClient.name} {selectedClient.surname}</p>
                      {selectedClient.company && <p className="text-sm text-green-700">{selectedClient.company}</p>}
                      {selectedClient.contact?.email && <p className="text-sm text-green-600">{selectedClient.contact.email}</p>}
                    </div>
                    <Button type="button" variant="ghost" size="sm" className="ml-auto" onClick={() => setClientId('')}>Change</Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Quotation Settings</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Number Series <span className="text-red-500">*</span></Label>
                <select className="w-full h-10 px-3 border rounded-md" value={invoiceGroupId} onChange={(e) => setInvoiceGroupId(e.target.value)} required>
                  <option value="">Select series...</option>
                  {numberSeries.map((series: any) => (
                    <option key={series._id} value={series._id}>{series.name}</option>
                  ))}
                </select>
                <p className="text-xs text-gray-500">Determines the quotation number format</p>
              </div>
              <div className="space-y-2">
                <Label>Valid Until <span className="text-red-500">*</span></Label>
                <Input type="date" value={expiresDate} onChange={(e) => setExpiresDate(e.target.value)} required />
                <p className="text-xs text-gray-500">Quotation will expire after this date</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="mt-6">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Line Items</CardTitle>
              {errors.items && (
                <p className="text-red-500 text-sm mt-1 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" /> {errors.items}
                </p>
              )}
            </div>
            <Button type="button" variant="outline" size="sm" onClick={addItem}>
              <Plus className="mr-2 h-4 w-4" /> Add Item
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {items.map((item, index) => (
                <div key={item.id} className={`grid grid-cols-12 gap-4 p-4 border rounded-lg ${
                  (errors[`item_${item.id}_quantity`] || errors[`item_${item.id}_price`]) ? 'border-red-300 bg-red-50' : ''
                }`}>
                  <div className="col-span-12 md:col-span-4">
                    <Label className="text-xs">Item Name <span className="text-red-500">*</span></Label>
                    <Input 
                      placeholder="Item name..." 
                      value={item.name} 
                      onChange={(e) => updateItem(item.id, 'name', e.target.value)} 
                    />
                    <Input 
                      placeholder="Description (optional)" 
                      value={item.description} 
                      onChange={(e) => updateItem(item.id, 'description', e.target.value)} 
                      className="mt-2" 
                    />
                  </div>
                  <div className="col-span-4 md:col-span-2">
                    <Label className="text-xs">Quantity <span className="text-red-500">*</span></Label>
                    <Input 
                      type="number" 
                      min="0.01" 
                      step="0.01" 
                      value={item.quantity} 
                      onChange={(e) => updateItem(item.id, 'quantity', parseFloat(e.target.value) || 0)} 
                      className={errors[`item_${item.id}_quantity`] ? 'border-red-500' : ''}
                    />
                    {errors[`item_${item.id}_quantity`] && (
                      <p className="text-red-500 text-xs mt-1">{errors[`item_${item.id}_quantity`]}</p>
                    )}
                  </div>
                  <div className="col-span-4 md:col-span-2">
                    <Label className="text-xs">Price <span className="text-red-500">*</span></Label>
                    <Input 
                      type="number" 
                      min="0.01" 
                      step="0.01" 
                      value={item.price} 
                      onChange={(e) => updateItem(item.id, 'price', parseFloat(e.target.value) || 0)} 
                      className={errors[`item_${item.id}_price`] ? 'border-red-500' : ''}
                    />
                    {errors[`item_${item.id}_price`] && (
                      <p className="text-red-500 text-xs mt-1">{errors[`item_${item.id}_price`]}</p>
                    )}
                  </div>
                  <div className="col-span-4 md:col-span-2">
                    <Label className="text-xs">Tax Rate</Label>
                    <select className="w-full h-10 px-3 border rounded-md" value={item.taxRate} onChange={(e) => updateItem(item.id, 'taxRate', e.target.value)}>
                      <option value="">No Tax</option>
                      {taxRates.map((rate: any) => (
                        <option key={rate._id} value={rate._id}>{rate.name} ({rate.percent}%)</option>
                      ))}
                    </select>
                  </div>
                  <div className="col-span-10 md:col-span-1 flex items-end">
                    <p className="font-semibold text-right w-full text-green-600">{formatCurrency(calculateItemTotal(item))}</p>
                  </div>
                  <div className="col-span-2 md:col-span-1 flex items-end justify-end">
                    <Button type="button" variant="ghost" size="icon" onClick={() => removeItem(item.id)} disabled={items.length === 1}>
                      <Trash className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 flex justify-end">
              <div className="w-full max-w-sm space-y-3 bg-gray-50 p-4 rounded-lg">
                <div className="flex justify-between">
                  <span className="text-gray-600">Subtotal:</span>
                  <span className="font-medium">{formatCurrency(totals.subtotal)}</span>
                </div>
                {totals.itemTax > 0 && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Tax:</span>
                    <span className="font-medium">{formatCurrency(totals.itemTax)}</span>
                  </div>
                )}
                <div className="flex justify-between text-lg font-bold border-t pt-3 text-green-600">
                  <span>Grand Total:</span>
                  <span>{formatCurrency(totals.total)}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="mt-6">
          <CardHeader><CardTitle>Additional Notes</CardTitle></CardHeader>
          <CardContent>
            <textarea 
              className="w-full h-24 px-3 py-2 border rounded-md" 
              placeholder="Enter any notes or special instructions for the client..." 
              value={notes} 
              onChange={(e) => setNotes(e.target.value)} 
            />
          </CardContent>
        </Card>

        <div className="flex justify-end gap-4 mt-6">
          <Link href="/quotes"><Button type="button" variant="outline">Cancel</Button></Link>
          <Button type="submit" disabled={createMutation.isPending} className="bg-green-600 hover:bg-green-700">
            {createMutation.isPending ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Creating...</>
            ) : (
              <><Save className="mr-2 h-4 w-4" />Create Quotation</>
            )}
          </Button>
        </div>
      </form>
    </div>
  )
}
