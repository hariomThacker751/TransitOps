import { useMemo, useState } from 'react'
import { Fuel, Plus, Truck, IndianRupee, Calendar, Droplet } from 'lucide-react'
import PageHeader from '@/components/ui/PageHeader'
import Button from '@/components/ui/Button'
import FilterBar from '@/components/ui/FilterBar'
import DataTable from '@/components/ui/DataTable'
import Modal from '@/components/ui/Modal'
import { Select } from '@/components/ui/FormField'
import FuelLogForm from '@/components/domain/FuelLogForm'
import { useResource } from '@/hooks/useResource'
import api from '@/api'
import { useAuth } from '@/context/AuthContext'
import toast from 'react-hot-toast'
import { formatCurrency, formatDate, formatLiters } from '@/utils/format'

export default function FuelLogs() {
  const { can } = useAuth()
  const [vehicleFilter, setVehicleFilter] = useState('')
  const [createOpen, setCreateOpen] = useState(false)
  const [saving, setSaving] = useState(false)

  const { data: logs, loading, refetch } = useResource(
    () => api.fuelLogs.list({ vehicle_reg: vehicleFilter }),
    [vehicleFilter],
  )
  const { data: vehicles } = useResource(() => api.vehicles.list())

  const vehicleMap = useMemo(() => {
    const m = {}
    ;(vehicles || []).forEach((v) => (m[v.registration_number] = v))
    return m
  }, [vehicles])

  const handleCreate = async (payload) => {
    setSaving(true)
    const res = await api.fuelLogs.create(payload)
    setSaving(false)
    if (res.success === false) { toast.error(res.message); return }
    toast.success(`Fuel log ${res.data.fuel_log_id} created.`)
    setCreateOpen(false)
    refetch()
  }

  const columns = useMemo(() => [
    {
      key: 'fuel_log_id', header: 'ID', sortable: true,
      render: (f) => <span className="font-mono text-xs font-semibold text-ink-900">{f.fuel_log_id}</span>,
    },
    {
      key: 'vehicle_reg', header: 'Vehicle', sortable: true,
      render: (f) => (
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 flex-none items-center justify-center rounded-lg bg-blue-50 text-blue-600 ring-1 ring-blue-600/10">
            <Truck className="h-4 w-4" />
          </div>
          <div>
            <p className="font-mono text-xs font-semibold text-ink-800">{f.vehicle_reg}</p>
            <p className="text-xs text-ink-500">{vehicleMap[f.vehicle_reg]?.vehicle_name_model || '—'}</p>
          </div>
        </div>
      ),
    },
    { key: 'trip_id', header: 'Trip', sortable: true, render: (f) => f.trip_id ? <span className="font-mono text-xs text-ink-600">{f.trip_id}</span> : <span className="text-xs text-ink-300">—</span> },
    { key: 'liters', header: 'Liters', sortable: true, align: 'right', render: (f) => <span className="inline-flex items-center gap-1 text-xs"><Droplet className="h-3 w-3 text-blue-400" />{formatLiters(f.liters)}</span> },
    { key: 'cost', header: 'Cost', sortable: true, align: 'right', render: (f) => <span className="text-xs font-medium">{formatCurrency(f.cost)}</span> },
    { key: 'date', header: 'Date', sortable: true, render: (f) => <span className="text-xs text-ink-600">{formatDate(f.date)}</span> },
  ], [vehicleMap])

  return (
    <div className="space-y-6">
      <PageHeader
        title="Fuel Logs"
        subtitle="Track fuel consumption and costs per vehicle"
        icon={Fuel}
        actions={can('fuelLogs', 'create') && <Button leftIcon={Plus} onClick={() => setCreateOpen(true)}>Log Fuel</Button>}
      />

      <FilterBar>
        <Select value={vehicleFilter} onChange={(e) => setVehicleFilter(e.target.value)} className="h-10 w-auto min-w-[180px]">
          <option value="">All vehicles</option>
          {(vehicles || []).map((v) => <option key={v.registration_number} value={v.registration_number}>{v.registration_number}</option>)}
        </Select>
      </FilterBar>

      <DataTable
        columns={columns}
        rows={logs || []}
        loading={loading}
        rowKey={(f) => f.fuel_log_id}
        initialSort={{ key: 'date', dir: 'desc' }}
        emptyTitle="No fuel logs"
        emptyMessage="Log fuel consumption to track operational costs."
        emptyIcon={Fuel}
      />

      {can('fuelLogs', 'create') && (
        <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Log Fuel" description="Record fuel for a vehicle." size="md">
          <FuelLogForm onSubmit={handleCreate} onCancel={() => setCreateOpen(false)} loading={saving} />
        </Modal>
      )}
    </div>
  )
}