import { useState, useEffect } from 'react'
import { Input, Select, FormField } from '@/components/ui/FormField'
import Button from '@/components/ui/Button'
import { useResource } from '@/hooks/useResource'
import api from '@/api'
import { MAINTENANCE_TYPES } from '@/utils/statusConfig'

/**
 * MaintenanceForm — create a maintenance record.
 * On submit the vehicle is automatically locked to In Shop (handled by the API).
 */
export default function MaintenanceForm({ onSubmit, onCancel, loading }) {
  const [form, setForm] = useState({
    vehicle_reg: '', maintenance_type: 'General Inspection', cost: '', start_date: '',
  })
  const [errors, setErrors] = useState({})

  const { data: vehicles } = useResource(() => api.vehicles.list())

  const set = (key) => (e) => {
    setForm((f) => ({ ...f, [key]: e.target.value }))
    setErrors((p) => ({ ...p, [key]: undefined }))
  }

  const validate = () => {
    const e = {}
    if (!form.vehicle_reg) e.vehicle_reg = 'Select a vehicle.'
    if (!form.maintenance_type.trim()) e.maintenance_type = 'Type is required.'
    if (!form.cost || Number(form.cost) <= 0) e.cost = 'Cost must be > 0.'
    if (!form.start_date) e.start_date = 'Start date is required.'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const submit = (e) => {
    e.preventDefault()
    if (!validate()) return
    onSubmit({ ...form, cost: Number(form.cost) })
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <FormField label="Vehicle" required error={errors.vehicle_reg} hint="Creating maintenance will move this vehicle to In Shop">
        <Select value={form.vehicle_reg} onChange={set('vehicle_reg')}>
          <option value="">Select vehicle…</option>
          {(vehicles || []).map((v) => (
            <option key={v.registration_number} value={v.registration_number}>
              {v.registration_number} — {v.vehicle_name_model} ({v.status})
            </option>
          ))}
        </Select>
      </FormField>

      <Select label="Maintenance Type" value={form.maintenance_type} onChange={set('maintenance_type')}>
        {MAINTENANCE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
      </Select>

      <div className="grid grid-cols-2 gap-4">
        <Input label="Cost (₹)" type="number" required placeholder="5000" error={errors.cost} value={form.cost} onChange={set('cost')} />
        <Input label="Start Date" type="date" required error={errors.start_date} value={form.start_date} onChange={set('start_date')} />
      </div>

      <div className="flex items-center justify-end gap-3 pt-2">
        <Button type="button" variant="outline" onClick={onCancel} disabled={loading}>Cancel</Button>
        <Button type="submit" loading={loading}>Create & Lock Vehicle</Button>
      </div>
    </form>
  )
}