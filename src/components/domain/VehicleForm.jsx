import { useState, useEffect } from 'react'
import { Input, Select, FormField } from '@/components/ui/FormField'
import Button from '@/components/ui/Button'
import { VEHICLE_TYPES, VEHICLE_REGIONS, VEHICLE_STATUS_OPTIONS } from '@/utils/statusConfig'

const EMPTY = {
  registration_number: '',
  vehicle_name_model: '',
  type: 'Truck',
  max_load_capacity_kg: '',
  odometer_km: '',
  acquisition_cost: '',
  status: 'Available',
  region: 'North',
}

/**
 * VehicleForm — create/edit form for vehicle records.
 * Used inside a Modal. Calls onSubmit with the payload; parent handles the API.
 */
export default function VehicleForm({ initial, onSubmit, onCancel, loading }) {
  const [form, setForm] = useState(EMPTY)
  const [errors, setErrors] = useState({})

  useEffect(() => {
    if (initial) {
      setForm({
        registration_number: initial.registration_number || '',
        vehicle_name_model: initial.vehicle_name_model || '',
        type: initial.type || 'Truck',
        max_load_capacity_kg: initial.max_load_capacity_kg ?? '',
        odometer_km: initial.odometer_km ?? '',
        acquisition_cost: initial.acquisition_cost ?? '',
        status: initial.status || 'Available',
        region: initial.region || 'North',
      })
    } else {
      setForm(EMPTY)
    }
    setErrors({})
  }, [initial])

  const set = (key) => (e) => {
    setForm((f) => ({ ...f, [key]: e.target.value }))
    setErrors((prev) => ({ ...prev, [key]: undefined }))
  }

  const validate = () => {
    const e = {}
    if (!form.registration_number.trim()) e.registration_number = 'Registration number is required.'
    if (!form.vehicle_name_model.trim()) e.vehicle_name_model = 'Vehicle name/model is required.'
    if (form.max_load_capacity_kg === '' || Number(form.max_load_capacity_kg) <= 0)
      e.max_load_capacity_kg = 'Max load must be greater than 0.'
    if (form.acquisition_cost !== '' && Number(form.acquisition_cost) < 0)
      e.acquisition_cost = 'Acquisition cost cannot be negative.'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const submit = (e) => {
    e.preventDefault()
    if (!validate()) return
    onSubmit({
      ...form,
      max_load_capacity_kg: Number(form.max_load_capacity_kg),
      odometer_km: Number(form.odometer_km) || 0,
      acquisition_cost: Number(form.acquisition_cost) || 0,
    })
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <Input label="Registration Number" required placeholder="VEH-15" error={errors.registration_number} value={form.registration_number} onChange={set('registration_number')} disabled={!!initial} />
        <Input label="Name / Model" required placeholder="Tata Ace" error={errors.vehicle_name_model} value={form.vehicle_name_model} onChange={set('vehicle_name_model')} />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <Select label="Type" value={form.type} onChange={set('type')}>
          {VEHICLE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
        </Select>
        <Select label="Region" value={form.region} onChange={set('region')}>
          {VEHICLE_REGIONS.map((r) => <option key={r} value={r}>{r}</option>)}
        </Select>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <Input label="Max Load Capacity (kg)" type="number" required placeholder="1500" error={errors.max_load_capacity_kg} value={form.max_load_capacity_kg} onChange={set('max_load_capacity_kg')} />
        <Input label="Odometer (km)" type="number" placeholder="0" value={form.odometer_km} onChange={set('odometer_km')} />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <Input label="Acquisition Cost (₹)" type="number" placeholder="0" error={errors.acquisition_cost} value={form.acquisition_cost} onChange={set('acquisition_cost')} />
        <Select label="Status" value={form.status} onChange={set('status')}>
          {VEHICLE_STATUS_OPTIONS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
        </Select>
      </div>

      <div className="flex items-center justify-end gap-3 pt-2">
        <Button type="button" variant="outline" onClick={onCancel} disabled={loading}>Cancel</Button>
        <Button type="submit" loading={loading}>{initial ? 'Save changes' : 'Create vehicle'}</Button>
      </div>
    </form>
  )
}
