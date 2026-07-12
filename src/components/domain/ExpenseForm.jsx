import { useState } from 'react'
import { Input, Select, FormField } from '@/components/ui/FormField'
import Button from '@/components/ui/Button'
import { useResource } from '@/hooks/useResource'
import api from '@/api'
import { EXPENSE_TYPES } from '@/utils/statusConfig'

/**
 * ExpenseForm — log an expense against a vehicle.
 */
export default function ExpenseForm({ onSubmit, onCancel, loading }) {
  const [form, setForm] = useState({ vehicle_reg: '', expense_type: 'Toll', amount: '', date: '' })
  const [errors, setErrors] = useState({})

  const { data: vehicles } = useResource(() => api.vehicles.list())

  const set = (key) => (e) => {
    setForm((f) => ({ ...f, [key]: e.target.value }))
    setErrors((p) => ({ ...p, [key]: undefined }))
  }

  const validate = () => {
    const e = {}
    if (!form.vehicle_reg) e.vehicle_reg = 'Select a vehicle.'
    if (!form.expense_type.trim()) e.expense_type = 'Type is required.'
    if (!form.amount || Number(form.amount) <= 0) e.amount = 'Amount must be > 0.'
    if (!form.date) e.date = 'Date is required.'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const submit = (e) => {
    e.preventDefault()
    if (!validate()) return
    onSubmit({ ...form, amount: Number(form.amount) })
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

      <Select label="Expense Type" value={form.expense_type} onChange={set('expense_type')}>
        {EXPENSE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
      </Select>

      <div className="grid grid-cols-2 gap-4">
        <Input label="Amount (₹)" type="number" required placeholder="1000" error={errors.amount} value={form.amount} onChange={set('amount')} />
        <Input label="Date" type="date" required error={errors.date} value={form.date} onChange={set('date')} />
      </div>

      <div className="flex items-center justify-end gap-3 pt-2">
        <Button type="button" variant="outline" onClick={onCancel} disabled={loading}>Cancel</Button>
        <Button type="submit" loading={loading}>Add Expense</Button>
      </div>
    </form>
  )
}