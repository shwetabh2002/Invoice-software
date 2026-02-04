'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { settingsApi, taxRatesApi, invoiceGroupsApi, paymentMethodsApi } from '@/lib/api'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from '@/components/ui/use-toast'
import { 
  Settings, 
  Receipt, 
  CreditCard, 
  Percent, 
  Hash,
  Save,
  Plus,
  Trash,
  Building
} from 'lucide-react'

export default function SettingsPage() {
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState('general')

  const { data: settingsData } = useQuery({
    queryKey: ['settings'],
    queryFn: settingsApi.getAll,
  })

  const { data: taxRatesData } = useQuery({
    queryKey: ['taxRates'],
    queryFn: taxRatesApi.getAll,
  })

  const { data: invoiceGroupsData } = useQuery({
    queryKey: ['invoiceGroups'],
    queryFn: () => invoiceGroupsApi.getAll(),
  })

  const { data: paymentMethodsData } = useQuery({
    queryKey: ['paymentMethods'],
    queryFn: () => paymentMethodsApi.getAll(),
  })

  const settings = settingsData?.data?.data || {}
  const taxRates = taxRatesData?.data?.data || []
  const invoiceGroups = invoiceGroupsData?.data?.data || []
  const paymentMethods = paymentMethodsData?.data?.data || []

  const tabs = [
    { id: 'general', label: 'General', icon: Settings },
    { id: 'invoice', label: 'Invoice', icon: Receipt },
    { id: 'tax-rates', label: 'Tax Rates', icon: Percent },
    { id: 'invoice-groups', label: 'Invoice Groups', icon: Hash },
    { id: 'payment-methods', label: 'Payment Methods', icon: CreditCard },
  ]

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Settings</h1>
        <p className="text-gray-500 dark:text-gray-400">
          Configure your Girjasoft Invoices application
        </p>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Tabs */}
        <div className="lg:w-64 flex-shrink-0">
          <Card>
            <CardContent className="p-2">
              <nav className="space-y-1">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg transition-colors ${
                      activeTab === tab.id
                        ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400'
                        : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800'
                    }`}
                  >
                    <tab.icon className="h-4 w-4" />
                    {tab.label}
                  </button>
                ))}
              </nav>
            </CardContent>
          </Card>
        </div>

        {/* Content */}
        <div className="flex-1">
          {activeTab === 'general' && (
            <Card>
              <CardHeader>
                <CardTitle>General Settings</CardTitle>
                <CardDescription>Basic application configuration</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label>Application Name</Label>
                    <Input defaultValue={settings.app_name || 'Girjasoft Invoices'} />
                  </div>
                  <div className="space-y-2">
                    <Label>Default Language</Label>
                    <Input defaultValue={settings.default_language || 'english'} />
                  </div>
                  <div className="space-y-2">
                    <Label>Currency Symbol</Label>
                    <Input defaultValue={settings.currency_symbol || '₹'} />
                  </div>
                  <div className="space-y-2">
                    <Label>Currency Code</Label>
                    <Input defaultValue={settings.currency_code || 'INR'} />
                  </div>
                  <div className="space-y-2">
                    <Label>Date Format</Label>
                    <Input defaultValue={settings.date_format || 'DD-MM-YYYY'} />
                  </div>
                  <div className="space-y-2">
                    <Label>Default Country</Label>
                    <Input defaultValue={settings.default_country || 'IN'} />
                  </div>
                </div>
                <Button className="bg-blue-600 hover:bg-blue-700">
                  <Save className="mr-2 h-4 w-4" /> Save Changes
                </Button>
              </CardContent>
            </Card>
          )}

          {activeTab === 'invoice' && (
            <Card>
              <CardHeader>
                <CardTitle>Invoice Settings</CardTitle>
                <CardDescription>Configure invoice defaults and behavior</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label>Invoices Due After (days)</Label>
                    <Input type="number" defaultValue={settings.invoices_due_after || 30} />
                  </div>
                  <div className="space-y-2">
                    <Label>Quotes Expire After (days)</Label>
                    <Input type="number" defaultValue={settings.quotes_expire_after || 15} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Default Invoice Terms</Label>
                  <textarea 
                    className="w-full h-24 px-3 py-2 border rounded-md text-sm"
                    defaultValue={settings.default_invoice_terms || ''}
                    placeholder="Enter default invoice terms..."
                  />
                </div>
                <div className="space-y-2">
                  <Label>PDF Footer Text</Label>
                  <Input defaultValue={settings.pdf_invoice_footer || 'Thank you for your business!'} />
                </div>
                <Button className="bg-blue-600 hover:bg-blue-700">
                  <Save className="mr-2 h-4 w-4" /> Save Changes
                </Button>
              </CardContent>
            </Card>
          )}

          {activeTab === 'tax-rates' && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Tax Rates</CardTitle>
                  <CardDescription>Manage your tax rates</CardDescription>
                </div>
                <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
                  <Plus className="mr-2 h-4 w-4" /> Add Tax Rate
                </Button>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {taxRates.map((rate: any) => (
                    <div 
                      key={rate._id}
                      className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg"
                    >
                      <div className="flex items-center gap-4">
                        <div className="h-10 w-10 bg-blue-100 rounded-full flex items-center justify-center">
                          <Percent className="h-5 w-5 text-blue-600" />
                        </div>
                        <div>
                          <p className="font-medium">{rate.name}</p>
                          <p className="text-sm text-gray-500">{rate.percent}%</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {rate.isDefault && (
                          <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                            Default
                          </span>
                        )}
                        <Button variant="ghost" size="sm">
                          <Trash className="h-4 w-4 text-gray-400" />
                        </Button>
                      </div>
                    </div>
                  ))}
                  {taxRates.length === 0 && (
                    <p className="text-center text-gray-500 py-8">No tax rates configured</p>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {activeTab === 'invoice-groups' && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Invoice Groups</CardTitle>
                  <CardDescription>Manage invoice numbering schemes</CardDescription>
                </div>
                <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
                  <Plus className="mr-2 h-4 w-4" /> Add Group
                </Button>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {invoiceGroups.map((group: any) => (
                    <div 
                      key={group._id}
                      className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg"
                    >
                      <div className="flex items-center gap-4">
                        <div className="h-10 w-10 bg-purple-100 rounded-full flex items-center justify-center">
                          <Hash className="h-5 w-5 text-purple-600" />
                        </div>
                        <div>
                          <p className="font-medium">{group.name}</p>
                          <p className="text-sm text-gray-500 font-mono">{group.identifierFormat}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-500">Next: {group.nextId}</span>
                        {group.isDefault && (
                          <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                            Default
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                  {invoiceGroups.length === 0 && (
                    <p className="text-center text-gray-500 py-8">No invoice groups configured</p>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {activeTab === 'payment-methods' && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Payment Methods</CardTitle>
                  <CardDescription>Manage available payment methods</CardDescription>
                </div>
                <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
                  <Plus className="mr-2 h-4 w-4" /> Add Method
                </Button>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {paymentMethods.map((method: any) => (
                    <div 
                      key={method._id}
                      className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg"
                    >
                      <div className="flex items-center gap-4">
                        <div className="h-10 w-10 bg-green-100 rounded-full flex items-center justify-center">
                          <CreditCard className="h-5 w-5 text-green-600" />
                        </div>
                        <p className="font-medium">{method.name}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        {method.isDefault && (
                          <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                            Default
                          </span>
                        )}
                        <Button variant="ghost" size="sm">
                          <Trash className="h-4 w-4 text-gray-400" />
                        </Button>
                      </div>
                    </div>
                  ))}
                  {paymentMethods.length === 0 && (
                    <p className="text-center text-gray-500 py-8">No payment methods configured</p>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
