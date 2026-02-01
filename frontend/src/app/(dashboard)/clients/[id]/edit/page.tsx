'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { clientsApi } from '@/lib/api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from '@/components/ui/use-toast'
import { ArrowLeft, Save, Loader2 } from 'lucide-react'
import Link from 'next/link'

export default function EditClientPage() {
  const router = useRouter()
  const params = useParams()
  const clientId = params.id as string
  const queryClient = useQueryClient()
  
  const [formData, setFormData] = useState({
    name: '',
    surname: '',
    company: '',
    email: '',
    phone: '',
    mobile: '',
    address1: '',
    address2: '',
    city: '',
    state: '',
    zip: '',
    country: 'IN',
    vatId: '',
    taxCode: '',
    web: '',
    isActive: true
  })

  const { data, isLoading } = useQuery({
    queryKey: ['client', clientId],
    queryFn: () => clientsApi.getById(clientId),
  })

  useEffect(() => {
    if (data?.data?.data) {
      const client = data.data.data
      setFormData({
        name: client.name || '',
        surname: client.surname || '',
        company: client.company || '',
        email: client.contact?.email || '',
        phone: client.contact?.phone || '',
        mobile: client.contact?.mobile || '',
        address1: client.address?.line1 || '',
        address2: client.address?.line2 || '',
        city: client.address?.city || '',
        state: client.address?.state || '',
        zip: client.address?.zip || '',
        country: client.address?.country || 'IN',
        vatId: client.tax?.vatId || '',
        taxCode: client.tax?.taxCode || '',
        web: client.contact?.web || '',
        isActive: client.isActive !== false
      })
    }
  }, [data])

  const updateMutation = useMutation({
    mutationFn: (data: any) => clientsApi.update(clientId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] })
      queryClient.invalidateQueries({ queryKey: ['client', clientId] })
      toast({ title: 'Client updated successfully' })
      router.push(`/clients/${clientId}`)
    },
    onError: (error: any) => {
      toast({ 
        title: 'Error updating client', 
        description: error.response?.data?.message || 'Something went wrong',
        variant: 'destructive'
      })
    }
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    updateMutation.mutate({
      name: formData.name,
      surname: formData.surname,
      company: formData.company,
      address: {
        line1: formData.address1,
        line2: formData.address2,
        city: formData.city,
        state: formData.state,
        zip: formData.zip,
        country: formData.country
      },
      contact: {
        email: formData.email,
        phone: formData.phone,
        mobile: formData.mobile,
        web: formData.web
      },
      tax: {
        vatId: formData.vatId,
        taxCode: formData.taxCode
      },
      isActive: formData.isActive
    })
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }))
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href={`/clients/${clientId}`}>
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Edit Client</h1>
          <p className="text-gray-500">Update client information</p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">First Name *</Label>
                  <Input id="name" name="name" value={formData.name} onChange={handleChange} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="surname">Last Name</Label>
                  <Input id="surname" name="surname" value={formData.surname} onChange={handleChange} />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="company">Company</Label>
                <Input id="company" name="company" value={formData.company} onChange={handleChange} />
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="isActive"
                  name="isActive"
                  checked={formData.isActive}
                  onChange={handleChange}
                  className="h-4 w-4 rounded border-gray-300"
                />
                <Label htmlFor="isActive">Active Client</Label>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Contact Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" name="email" type="email" value={formData.email} onChange={handleChange} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input id="phone" name="phone" value={formData.phone} onChange={handleChange} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="mobile">Mobile</Label>
                  <Input id="mobile" name="mobile" value={formData.mobile} onChange={handleChange} />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="web">Website</Label>
                <Input id="web" name="web" value={formData.web} onChange={handleChange} placeholder="https://" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Address</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="address1">Address Line 1</Label>
                <Input id="address1" name="address1" value={formData.address1} onChange={handleChange} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="address2">Address Line 2</Label>
                <Input id="address2" name="address2" value={formData.address2} onChange={handleChange} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="city">City</Label>
                  <Input id="city" name="city" value={formData.city} onChange={handleChange} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="state">State</Label>
                  <Input id="state" name="state" value={formData.state} onChange={handleChange} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="zip">ZIP/Postal Code</Label>
                  <Input id="zip" name="zip" value={formData.zip} onChange={handleChange} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="country">Country</Label>
                  <Input id="country" name="country" value={formData.country} onChange={handleChange} />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Tax Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="vatId">VAT ID / GST Number</Label>
                <Input id="vatId" name="vatId" value={formData.vatId} onChange={handleChange} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="taxCode">Tax Code / PAN</Label>
                <Input id="taxCode" name="taxCode" value={formData.taxCode} onChange={handleChange} />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="flex justify-end gap-4 mt-6">
          <Link href={`/clients/${clientId}`}>
            <Button type="button" variant="outline">Cancel</Button>
          </Link>
          <Button type="submit" disabled={updateMutation.isPending}>
            {updateMutation.isPending ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving...</>
            ) : (
              <><Save className="mr-2 h-4 w-4" />Save Changes</>
            )}
          </Button>
        </div>
      </form>
    </div>
  )
}
