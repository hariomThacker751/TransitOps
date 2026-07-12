import { useState } from 'react'
import { Input, FormField } from '@/components/ui/FormField'
import Button from '@/components/ui/Button'
import Modal from '@/components/ui/Modal'

/**
 * CompleteTripModal — collect final readings to complete a Dispatched trip.
 * On submit, trip→Completed and vehicle/driver→Available.
 */
export default function CompleteTripModal({ open, trip, onClose, onComplete, loading }) {
  const [form, setForm] = useState({ actual_distance_km: '', fuel_consumed_liters: '', final_odometer: '' })
  const [errors, setErrors] = useState({})

  const set = (key) => (e) => {
    setForm((f) => ({ ...f, [key]: e.target.value }))
    setErrors((p) => ({ ...p, [key]: undefined }))
  }

  const submit = (e) => {
    e.preventDefault()
    const err = {}
    if (!form.actual_distance_km || Number(form.actual_distance_km) <= 0) err.actual_distance_km = 'Required.'
    if (!form.fuel_consumed_liters || Number(form.fuel_consumed_liters) <= 0) err.fuel_consumed_liters = 'Required.'
    setErrors(err)
    if (Object.keys(err).length) return
    onComplete({
      actual_distance_km: Number(form.actual_distance_km),
      fuel_consumed_liters: Number(form.fuel_consumed_liters),
      final_odometer: form.final_odometer ? Number(form.final_odometer) : undefined,
    })
  }

  return (
    <Modal open={open} onClose={onClose} title={`Complete Trip ${trip?.trip_id}`} description="Enter final readings to complete this trip.">
      <form onSubmit={submit} className="space-y-4">
        <div className="rounded-lg bg-ink-50 px-3 py-2.5 text-xs text-ink-500">
          <span className="font-semibold text-ink-700">{trip?.source}</span> → <span className="font-semibold text-ink-700">{trip?.destination}</span>
          <span className="mx-2">·</span>Planned: {trip?.planned_distance_km} km
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Input label="Actual Distance (km)" type="number" required placeholder={trip?.planned_distance_km} error={errors.actual_distance_km} value={form.actual_distance_km} onChange={set('actual_distance_km')} />
          <Input label="Fuel Consumed (L)" type="number" required placeholder="0" error={errors.fuel_consumed_liters} value={form.fuel_consumed_liters} onChange={set('fuel_consumed_liters')} />
        </div>
        <Input label="Final Odometer (km)" type="number" placeholder="Optional" value={form.final_odometer} onChange={set('final_odometer')} />
        <div className="flex items-center justify-end gap-3 pt-2">
          <Button type="button" variant="outline" onClick={onClose} disabled={loading}>Cancel</Button>
          <Button type="submit" loading={loading}>Complete Trip</Button>
        </div>
      </form>
    </Modal>
  )
}