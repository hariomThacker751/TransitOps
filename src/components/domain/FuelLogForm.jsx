import { useState, useEffect } from 'react'
import { Input, Select, FormField } from '@/components/ui/FormField'
import Button from '@/components/ui/Button'
import { useResource } from '@/hooks/useResource'
import api from '@/api'

/**
 * FuelLogForm — log a fuel entry against a vehicle (and optionally a trip).
 */
export default function FuelLogForm({ onSubmit, onCancel, loading }) {
  const [form, setForm] = useState({ vehicle_reg: '', trip_id: '', liters: '', cost: '', date: '' })
  const [errors, setErrors] = useState({})

  const { data: vehicles } = useResource(() => api.vehicles.list())
  const { data: trips } = useResource(() => api.trips.list({ status: 'Dispatched' }))

  const set = (key) => (e) => {
    setForm((f) => ({ ...f, [key]: e.target.value }))
    setErrors((p) => ({ ...p, [key]: undefined }))
  }

  const validate = () => {
    const e = {}
    if (!form.vehicle_reg) e.vehicle_reg = 'Select a vehicle.'
    if (!form.liters || Number(form.liters) <= 0) e.liters = 'Liters must be > 0.'
    if (!form.cost || Number(form.cost) <= 0) e.cost = 'Cost must be > 0.'
    if (!form.date) e.date = 'Date is required.'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const submit = (e) => {
    e.preventDefault()
    if (!validate()) return
    onSubmit({ ...form, liters: Number(form.liters), cost: Number(form.cost), trip_id: form.trip_id || null })
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <FormField label="Vehicle" required error={errors.vehicle_reg}>
        <Select value={form.vehicle_reg} onChange={set('vehicle_reg')}>
          <option value="">Select vehicle…</option>
          {(vehicles || []).map((v) => (
            <option key={v.registration_number} value={v.registration_number}>
              {v.registration_number} — {v.vehicle_name_model}
            </option>
          ))}
        </Select>
      </FormField>

      <FormField label="Trip (optional)" hint="Link to an active dispatched trip">
        <Select value={form.trip_id} onChange={set('trip_id')}>
          <option value="">No specific trip</option>
          {(trips || []).map((t) => (
            <option key={t.trip_id} value={t.trip_id}>{t.trip_id} — {t.source} → {t.destination}</option>
          ))}
        </Select>
      </FormField>

      <div className="grid grid-cols-3 gap-4">
        <Input label="Liters" type="number" required placeholder="50" error={errors.liters} value={form.liters} onChange={set('liters')} />
        <Input label="Cost (₹)" type="number" required placeholder="5000" error={errors.cost} value={form.cost} onChange={set('cost')} />
        <Input label="Date" type="date" required error={errors.date} value={form.date} onChange={set('date')} />
      </div>

      <div className="flex items-center justify-end gap-3 pt-2">
        <Button type="button" variant="outline" onClick={onCancel} disabled={loading}>Cancel</Button>
        <Button type="submit" loading={loading}>Log Fuel</Button>
      </div>
    </form>
  )
}