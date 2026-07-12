import { useMemo, useState } from 'react'
import { Wrench, Plus, Lock, Unlock, Truck, IndianRupee, Calendar } from 'lucide-react'
import PageHeader from '@/components/ui/PageHeader'
import Button from '@/components/ui/Button'
import FilterBar from '@/components/ui/FilterBar'
import DataTable from '@/components/ui/DataTable'
import Modal from '@/components/ui/Modal'
import Drawer from '@/components/ui/Drawer'
import { Select } from '@/components/ui/FormField'
import { StatusBadge } from '@/components/ui/Badge'
import MaintenanceForm from '@/components/domain/MaintenanceForm'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import { useResource } from '@/hooks/useResource'
import api from '@/api'
import { useAuth } from '@/context/AuthContext'
import toast from 'react-hot-toast'
import { VEHICLE_STATUS, MAINTENANCE_STATUS_OPTIONS, resolveStatus } from '@/utils/statusConfig'
import { formatCurrency, formatDate } from '@/utils/format'

const M_STATUS = {
  Active: { key: 'Active', label: 'Active', palette: 'amber', dot: 'amber', tone: 'warning' },
  Closed: { key: 'Closed', label: 'Closed', palette: 'emerald', dot: 'emerald', tone: 'positive' },
}

export default function Maintenance() {
  const { can } = useAuth()
  const [statusFilter, setStatusFilter] = useState('Active')
  const [createOpen, setCreateOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [selected, setSelected] = useState(null)
  const [closeTarget, setCloseTarget] = useState(null)
  const [actionLoading, setActionLoading] = useState(false)

  const { data: records, loading, refetch } = useResource(
    () => api.maintenance.list({ status: statusFilter }),
    [statusFilter],
  )
  const { data: vehicles } = useResource(() => api.vehicles.list())

  const vehicleMap = useMemo(() => {
    const m = {}
    ;(vehicles || []).forEach((v) => (m[v.registration_number] = v))
    return m
  }, [vehicles])

  const handleCreate = async (payload) => {
    setSaving(true)
    const res = await api.maintenance.create(payload)
    setSaving(false)
    if (res.success === false) { toast.error(res.message); return }
    toast.success(`Maintenance ${res.data.record.maintenance_id} created. Vehicle locked to In Shop.`)
    setCreateOpen(false)
    refetch()
  }

  const handleClose = async () => {
    setActionLoading(true)
    const res = await api.maintenance.close(closeTarget.maintenance_id)
    setActionLoading(false)
    if (res.success === false) { toast.error(res.message); return }
    toast.success(`Maintenance ${closeTarget.maintenance_id} closed. Vehicle restored.`)
    setCloseTarget(null)
    setSelected(null)
    refetch()
  }

  const columns = useMemo(() => [
    {
      key: 'maintenance_id', header: 'ID', sortable: true,
      render: (m) => <span className="font-mono text-xs font-semibold text-ink-900">{m.maintenance_id}</span>,
    },
    {
      key: 'vehicle_reg', header: 'Vehicle', sortable: true,
      render: (m) => (
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 flex-none items-center justify-center rounded-lg bg-amber-50 text-amber-600 ring-1 ring-amber-600/10">
            <Truck className="h-4 w-4" />
          </div>
          <div>
            <p className="font-mono text-xs font-semibold text-ink-800">{m.vehicle_reg}</p>
            <p className="text-xs text-ink-500">{vehicleMap[m.vehicle_reg]?.vehicle_name_model || '—'}</p>
          </div>
        </div>
      ),
    },
    { key: 'maintenance_type', header: 'Type', sortable: true, render: (m) => <span className="text-xs font-medium text-ink-700">{m.maintenance_type}</span> },
    { key: 'cost', header: 'Cost', sortable: true, align: 'right', render: (m) => <span className="text-xs font-medium">{formatCurrency(m.cost)}</span> },
    { key: 'start_date', header: 'Started', sortable: true, render: (m) => <span className="text-xs text-ink-600">{formatDate(m.start_date)}</span> },
    { key: 'end_date', header: 'Ended', sortable: true, render: (m) => <span className="text-xs text-ink-600">{m.end_date ? formatDate(m.end_date) : '—'}</span> },
    { key: 'status', header: 'Status', sortable: true, render: (m) => <StatusBadge status={resolveStatus(M_STATUS, m.status)} /> },
  ], [vehicleMap])

  return (
    <div className="space-y-6">
      <PageHeader
        title="Maintenance"
        subtitle="Schedule maintenance — vehicles are auto-locked to In Shop"
        icon={Wrench}
        actions={can('maintenance', 'create') && <Button leftIcon={Plus} onClick={() => setCreateOpen(true)}>New Record</Button>}
      />

      {/* Status coupling callout */}
      <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50/60 px-4 py-3">
        <Lock className="mt-0.5 h-4 w-4 flex-none text-amber-600" />
        <p className="text-xs text-amber-800">
          <span className="font-bold">Status coupling:</span> creating a maintenance record immediately sets the vehicle to <span className="font-semibold">In Shop</span> and removes it from the dispatch pool. Closing it restores the vehicle to <span className="font-semibold">Available</span> (unless Retired).
        </p>
      </div>

      <FilterBar>
        <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="h-10 w-auto min-w-[160px]">
          {MAINTENANCE_STATUS_OPTIONS.map((s) => <option key={s.value} value={s.value}>{s.label} records</option>)}
          <option value="">All records</option>
        </Select>
      </FilterBar>

      <DataTable
        columns={columns}
        rows={records || []}
        loading={loading}
        onRowClick={setSelected}
        rowKey={(m) => m.maintenance_id}
        initialSort={{ key: 'maintenance_id', dir: 'desc' }}
        emptyTitle="No maintenance records"
        emptyMessage="No records match this filter. Create a new maintenance record to lock a vehicle."
        emptyIcon={Wrench}
      />

      {can('maintenance', 'create') && (
        <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="New Maintenance Record" description="The selected vehicle will be locked to In Shop immediately." size="md">
          <MaintenanceForm onSubmit={handleCreate} onCancel={() => setCreateOpen(false)} loading={saving} />
        </Modal>
      )}

      <Drawer
        open={!!selected}
        onClose={() => setSelected(null)}
        title={selected?.maintenance_type}
        subtitle={selected?.maintenance_id}
        width="md"
        footer={
          selected && selected.status === 'Active' && can('maintenance', 'close') && (
            <div className="flex justify-end">
              <Button leftIcon={Unlock} onClick={() => setCloseTarget(selected)}>Close & Restore Vehicle</Button>
            </div>
          )
        }
      >
        {selected && (
          <div className="space-y-5">
            <div className="flex items-center justify-between">
              <StatusBadge status={resolveStatus(M_STATUS, selected.status)} />
              {selected.status === 'Active' && (
                <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-700">
                  <Lock className="h-3 w-3" /> Vehicle locked
                </span>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <DetailStat icon={Truck} label="Vehicle" value={selected.vehicle_reg} />
              <DetailStat icon={IndianRupee} label="Cost" value={formatCurrency(selected.cost)} />
              <DetailStat icon={Calendar} label="Started" value={formatDate(selected.start_date)} />
              <DetailStat icon={Calendar} label="Ended" value={selected.end_date ? formatDate(selected.end_date) : 'In progress'} />
            </div>

            {selected.status === 'Active' && vehicleMap[selected.vehicle_reg] && (
              <div className="rounded-lg border border-amber-200 bg-amber-50/50 px-3 py-2.5">
                <p className="text-xs text-amber-800">
                  <span className="font-semibold">{selected.vehicle_reg}</span> is currently <span className="font-semibold">In Shop</span> and cannot be dispatched until this record is closed.
                </p>
              </div>
            )}
          </div>
        )}
      </Drawer>

      <ConfirmDialog
        open={!!closeTarget}
        onClose={() => setCloseTarget(null)}
        onConfirm={handleClose}
        loading={actionLoading}
        title={`Close ${closeTarget?.maintenance_id}?`}
        message={`${closeTarget?.vehicle_reg} will be restored to Available (unless Retired) and re-enter the dispatch pool.`}
        confirmLabel="Close & Restore"
        tone="primary"
      />
    </div>
  )
}

function DetailStat({ icon: Icon, label, value }) {
  return (
    <div className="rounded-lg border border-ink-100 bg-ink-50/50 px-3 py-2.5">
      <div className="flex items-center gap-1.5 text-xs font-medium text-ink-400"><Icon className="h-3.5 w-3.5" />{label}</div>
      <p className="mt-1 text-sm font-bold text-ink-800">{value}</p>
    </div>
  )
}