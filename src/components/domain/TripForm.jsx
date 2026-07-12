import { useState, useEffect } from 'react'
import { Input, Select, FormField } from '@/components/ui/FormField'
import Button from '@/components/ui/Button'
import { useResource } from '@/hooks/useResource'
import api from '@/api'

/**
 * TripForm — create a Draft trip.
 *
 * Vehicle/driver dropdowns show dispatch-eligible options:
 *  - Real mode: calls /vehicles/eligible-for-dispatch and /drivers/eligible-for-dispatch
 *    (the backend filters out In Shop, Retired, Suspended, and expired-license).
 *  - Mock mode: the mock doesn't have eligible-for-dispatch endpoints, so we
 *    fall back to list({status:'Available'}) which approximates the same filter.
 */
export default function TripForm({ onSubmit, onCancel, loading }) {
  const [form, setForm] = useState({
    source: '', destination: '', vehicle_reg: '', driver_id: '',
    cargo_weight_kg: '', planned_distance_km: '', revenue: '',
  })
  const [errors, setErrors] = useState({})

  const useEligible = !api.isMock
  const { data: vehicles } = useResource(
    () => (useEligible ? api.vehicles.eligibleForDispatch() : api.vehicles.list({ status: 'Available' })),
    [],
  )
  const { data: drivers } = useResource(
    () => (useEligible ? api.drivers.eligibleForDispatch() : api.drivers.list({ status: 'Available' })),
    [],
  )

  const set = (key) => (e) => {
    setForm((f) => ({ ...f, [key]: e.target.value }))
    setErrors((p) => ({ ...p, [key]: undefined }))
  }

  const validate = () => {
    const e = {}
    if (!form.source.trim()) e.source = 'Source is required.'
    if (!form.destination.trim()) e.destination = 'Destination is required.'
    if (!form.vehicle_reg) e.vehicle_reg = 'Select a vehicle.'
    if (!form.driver_id) e.driver_id = 'Select a driver.'
    if (!form.cargo_weight_kg || Number(form.cargo_weight_kg) <= 0) e.cargo_weight_kg = 'Cargo weight must be > 0.'
    if (!form.planned_distance_km || Number(form.planned_distance_km) <= 0) e.planned_distance_km = 'Distance must be > 0.'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const submit = (e) => {
    e.preventDefault()
    if (!validate()) return
    onSubmit({
      ...form,
      cargo_weight_kg: Number(form.cargo_weight_kg),
      planned_distance_km: Number(form.planned_distance_km),
      revenue: Number(form.revenue) || 0,
    })
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <Input label="Source" required placeholder="Surat" error={errors.source} value={form.source} onChange={set('source')} />
        <Input label="Destination" required placeholder="Ahmedabad" error={errors.destination} value={form.destination} onChange={set('destination')} />
      </div>

      <FormField label="Vehicle" required error={errors.vehicle_reg} hint="Only dispatch-eligible vehicles are listed">
        <Select value={form.vehicle_reg} onChange={set('vehicle_reg')}>
          <option value="">Select vehicle…</option>
          {(vehicles || []).map((v) => (
            <option key={v.registration_number} value={v.registration_number}>
              {v.registration_number} — {v.vehicle_name_model} ({v.max_load_capacity_kg} kg)
            </option>
          ))}
        </Select>
      </FormField>

      <FormField label="Driver" required error={errors.driver_id} hint="Only dispatch-eligible drivers are listed">
        <Select value={form.driver_id} onChange={set('driver_id')}>
          <option value="">Select driver…</option>
          {(drivers || []).map((d) => (
            <option key={d.driver_id} value={d.driver_id}>
              {d.name} ({d.driver_id}) — {d.license_category}
            </option>
          ))}
        </Select>
      </FormField>

      <div className="grid grid-cols-3 gap-4">
        <Input label="Cargo (kg)" type="number" required placeholder="500" error={errors.cargo_weight_kg} value={form.cargo_weight_kg} onChange={set('cargo_weight_kg')} />
        <Input label="Distance (km)" type="number" required placeholder="335" error={errors.planned_distance_km} value={form.planned_distance_km} onChange={set('planned_distance_km')} />
        <Input label="Revenue (₹)" type="number" placeholder="0" value={form.revenue} onChange={set('revenue')} />
      </div>

      <div className="flex items-center justify-end gap-3 pt-2">
        <Button type="button" variant="outline" onClick={onCancel} disabled={loading}>Cancel</Button>
        <Button type="submit" loading={loading}>Create Draft Trip</Button>
      </div>
    </form>
  )
}