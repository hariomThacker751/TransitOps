import { useState, useEffect } from 'react'
import { Input, Select, FormField } from '@/components/ui/FormField'
import Button from '@/components/ui/Button'
import { DRIVER_STATUS_OPTIONS, LICENSE_CATEGORIES } from '@/utils/statusConfig'

const EMPTY = {
  name: '',
  license_number: '',
  license_category: 'LMV',
  license_expiry_date: '',
  contact_number: '',
  safety_score: '',
  status: 'Available',
}

/**
 * DriverForm — create/edit form for driver records.
 */
export default function DriverForm({ initial, onSubmit, onCancel, loading }) {
  const [form, setForm] = useState(EMPTY)
  const [errors, setErrors] = useState({})

  useEffect(() => {
    setForm(initial ? {
      name: initial.name || '',
      license_number: initial.license_number || '',
      license_category: initial.license_category || 'LMV',
      license_expiry_date: initial.license_expiry_date || '',
      contact_number: initial.contact_number || '',
      safety_score: initial.safety_score ?? '',
      status: initial.status || 'Available',
    } : EMPTY)
    setErrors({})
  }, [initial])

  const set = (key) => (e) => {
    setForm((f) => ({ ...f, [key]: e.target.value }))
    setErrors((p) => ({ ...p, [key]: undefined }))
  }

  const validate = () => {
    const e = {}
    if (!form.name.trim()) e.name = 'Name is required.'
    if (!form.license_number.trim()) e.license_number = 'License number is required.'
    if (!form.license_expiry_date) e.license_expiry_date = 'Expiry date is required.'
    if (form.safety_score !== '' && (Number(form.safety_score) < 0 || Number(form.safety_score) > 100))
      e.safety_score = 'Safety score must be between 0 and 100.'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const submit = (e) => {
    e.preventDefault()
    if (!validate()) return
    onSubmit({
      ...form,
      safety_score: Number(form.safety_score) || 0,
    })
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <Input label="Full Name" required placeholder="Alex Sharma" error={errors.name} value={form.name} onChange={set('name')} />
      <div className="grid grid-cols-2 gap-4">
        <Input label="License Number" required placeholder="GJ142023617488" error={errors.license_number} value={form.license_number} onChange={set('license_number')} disabled={!!initial} />
        <Select label="License Category" value={form.license_category} onChange={set('license_category')}>
          {LICENSE_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </Select>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <Input label="License Expiry" type="date" required error={errors.license_expiry_date} value={form.license_expiry_date} onChange={set('license_expiry_date')} />
        <Input label="Contact Number" placeholder="+91 98765 43210" value={form.contact_number} onChange={set('contact_number')} />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <Input label="Safety Score (0–100)" type="number" placeholder="75" error={errors.safety_score} value={form.safety_score} onChange={set('safety_score')} />
        <Select label="Status" value={form.status} onChange={set('status')}>
          {DRIVER_STATUS_OPTIONS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
        </Select>
      </div>

      <div className="flex items-center justify-end gap-3 pt-2">
        <Button type="button" variant="outline" onClick={onCancel} disabled={loading}>Cancel</Button>
        <Button type="submit" loading={loading}>{initial ? 'Save changes' : 'Create driver'}</Button>
      </div>
    </form>
  )
}