import { useMemo, useState } from 'react'
import { ReceiptText, Plus, Truck, IndianRupee, Calendar } from 'lucide-react'
import PageHeader from '@/components/ui/PageHeader'
import Button from '@/components/ui/Button'
import FilterBar from '@/components/ui/FilterBar'
import DataTable from '@/components/ui/DataTable'
import Modal from '@/components/ui/Modal'
import { Select } from '@/components/ui/FormField'
import ExpenseForm from '@/components/domain/ExpenseForm'
import Badge from '@/components/ui/Badge'
import { useResource } from '@/hooks/useResource'
import api from '@/api'
import { useAuth } from '@/context/AuthContext'
import toast from 'react-hot-toast'
import { EXPENSE_TYPES } from '@/utils/statusConfig'
import { formatCurrency, formatDate } from '@/utils/format'

const TYPE_TONES = {
  'Traffic Fine': 'red', 'Permit Renewal': 'blue', Parking: 'slate',
  'Loading Charges': 'amber', Toll: 'blue', Insurance: 'emerald', Repair: 'amber', Other: 'zinc',
}

export default function Expenses() {
  const { can } = useAuth()
  const [vehicleFilter, setVehicleFilter] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [createOpen, setCreateOpen] = useState(false)
  const [saving, setSaving] = useState(false)

  const filterKey = `${vehicleFilter}|${typeFilter}`
  // The mock API doesn't filter expenses by type, so we do it client-side.
  const { data: allExpenses, loading, refetch } = useResource(
    () => api.expenses.list({ vehicle_reg: vehicleFilter }),
    [vehicleFilter],
  )

  const expenses = useMemo(() => {
    if (!allExpenses) return []
    return typeFilter ? allExpenses.filter((e) => e.expense_type === typeFilter) : allExpenses
  }, [allExpenses, typeFilter])

  const { data: vehicles } = useResource(() => api.vehicles.list())
  const vehicleMap = useMemo(() => {
    const m = {}
    ;(vehicles || []).forEach((v) => (m[v.registration_number] = v))
    return m
  }, [vehicles])

  const handleCreate = async (payload) => {
    setSaving(true)
    const res = await api.expenses.create(payload)
    setSaving(false)
    if (res.success === false) { toast.error(res.message); return }
    toast.success(`Expense ${res.data.expense_id} recorded.`)
    setCreateOpen(false)
    refetch()
  }

  const totalAmount = useMemo(() => (expenses || []).reduce((s, e) => s + e.amount, 0), [expenses])

  const columns = useMemo(() => [
    {
      key: 'expense_id', header: 'ID', sortable: true,
      render: (e) => <span className="font-mono text-xs font-semibold text-ink-900">{e.expense_id}</span>,
    },
    {
      key: 'vehicle_reg', header: 'Vehicle', sortable: true,
      render: (e) => (
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 flex-none items-center justify-center rounded-lg bg-ink-100 text-ink-500">
            <Truck className="h-4 w-4" />
          </div>
          <div>
            <p className="font-mono text-xs font-semibold text-ink-800">{e.vehicle_reg}</p>
            <p className="text-xs text-ink-500">{vehicleMap[e.vehicle_reg]?.vehicle_name_model || '—'}</p>
          </div>
        </div>
      ),
    },
    { key: 'expense_type', header: 'Type', sortable: true, render: (e) => <Badge tone={TYPE_TONES[e.expense_type] || 'zinc'}>{e.expense_type}</Badge> },
    { key: 'amount', header: 'Amount', sortable: true, align: 'right', render: (e) => <span className="text-xs font-semibold">{formatCurrency(e.amount)}</span> },
    { key: 'date', header: 'Date', sortable: true, render: (e) => <span className="text-xs text-ink-600">{formatDate(e.date)}</span> },
  ], [vehicleMap])

  return (
    <div className="space-y-6">
      <PageHeader
        title="Expenses"
        subtitle="Track operational expenses per vehicle"
        icon={ReceiptText}
        actions={
          <div className="flex items-center gap-3">
            <span className="hidden rounded-lg bg-ink-100 px-3 py-1.5 text-xs font-semibold text-ink-600 sm:inline-block">
              Total: {formatCurrency(totalAmount)}
            </span>
            {can('expenses', 'create') && <Button leftIcon={Plus} onClick={() => setCreateOpen(true)}>Add Expense</Button>}
          </div>
        }
      />

      <FilterBar>
        <Select value={vehicleFilter} onChange={(e) => setVehicleFilter(e.target.value)} className="h-10 w-auto min-w-[180px]">
          <option value="">All vehicles</option>
          {(vehicles || []).map((v) => <option key={v.registration_number} value={v.registration_number}>{v.registration_number}</option>)}
        </Select>
        <Select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="h-10 w-auto min-w-[160px]">
          <option value="">All types</option>
          {EXPENSE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
        </Select>
      </FilterBar>

      <DataTable
        columns={columns}
        rows={expenses}
        loading={loading}
        rowKey={(e) => e.expense_id}
        initialSort={{ key: 'date', dir: 'desc' }}
        emptyTitle="No expenses found"
        emptyMessage="Record an expense to track operational costs."
        emptyIcon={ReceiptText}
      />

      {can('expenses', 'create') && (
        <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Add Expense" description="Record an operational expense." size="md">
          <ExpenseForm onSubmit={handleCreate} onCancel={() => setCreateOpen(false)} loading={saving} />
        </Modal>
      )}
    </div>
  )
}