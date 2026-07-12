import { useMemo, useState } from 'react'
import { Route, Plus, Rocket, CheckCircle2, XCircle, ArrowRight, Calendar, Weight, IndianRupee } from 'lucide-react'
import PageHeader from '@/components/ui/PageHeader'
import Button from '@/components/ui/Button'
import FilterBar from '@/components/ui/FilterBar'
import DataTable from '@/components/ui/DataTable'
import Modal from '@/components/ui/Modal'
import Drawer from '@/components/ui/Drawer'
import { Select } from '@/components/ui/FormField'
import { StatusBadge } from '@/components/ui/Badge'
import TripForm from '@/components/domain/TripForm'
import DispatchActionPanel from '@/components/domain/DispatchActionPanel'
import CompleteTripModal from '@/components/domain/CompleteTripModal'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import { useResource, useDebounce } from '@/hooks/useResource'
import api from '@/api'
import { useAuth } from '@/context/AuthContext'
import toast from 'react-hot-toast'
import { TRIP_STATUS, TRIP_STATUS_OPTIONS, resolveStatus } from '@/utils/statusConfig'
import { formatDate, formatCurrency, formatKg, formatKm, formatLiters } from '@/utils/format'
import { cn } from '@/utils/cn'

export default function Trips() {
  const { can } = useAuth()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const debouncedSearch = useDebounce(search, 250)

  const [createOpen, setCreateOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [selected, setSelected] = useState(null)
  const [dispatchTrip, setDispatchTrip] = useState(null)
  const [completeTrip, setCompleteTrip] = useState(null)
  const [cancelTrip, setCancelTrip] = useState(null)
  const [actionLoading, setActionLoading] = useState(false)

  const filterKey = `${debouncedSearch}|${statusFilter}`
  const { data: trips, loading, refetch } = useResource(
    () => api.trips.list({ search: debouncedSearch, status: statusFilter }),
    [filterKey],
  )

  const { data: vehicles } = useResource(() => api.vehicles.list())
  const { data: drivers } = useResource(() => api.drivers.list())

  const vehicleMap = useMemo(() => {
    const m = {}
    ;(vehicles || []).forEach((v) => (m[v.registration_number] = v))
    return m
  }, [vehicles])
  const driverMap = useMemo(() => {
    const m = {}
    ;(drivers || []).forEach((d) => (m[d.driver_id] = d))
    return m
  }, [drivers])

  const handleCreate = async (payload) => {
    setSaving(true)
    const res = await api.trips.create(payload)
    setSaving(false)
    if (res.success === false) { toast.error(res.message); return }
    toast.success(`Draft trip ${res.data.trip_id} created.`)
    setCreateOpen(false)
    refetch()
  }

  const handleDispatched = () => {
    toast.success('Trip dispatched successfully.')
    setDispatchTrip(null)
    setSelected(null)
    refetch()
  }

  const handleComplete = async (payload) => {
    setActionLoading(true)
    const res = await api.trips.complete(completeTrip.trip_id, payload)
    setActionLoading(false)
    if (res.success === false) { toast.error(res.message); return }
    toast.success(`Trip ${completeTrip.trip_id} completed.`)
    setCompleteTrip(null)
    setSelected(null)
    refetch()
  }

  const handleCancel = async () => {
    setActionLoading(true)
    const res = await api.trips.cancel(cancelTrip.trip_id)
    setActionLoading(false)
    if (res.success === false) { toast.error(res.message); return }
    toast.success(`Trip ${cancelTrip.trip_id} cancelled.`)
    setCancelTrip(null)
    setSelected(null)
    refetch()
  }

  const columns = useMemo(() => [
    {
      key: 'trip_id', header: 'Trip', sortable: true,
      render: (t) => (
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 flex-none items-center justify-center rounded-lg bg-brand-50 text-brand-600 ring-1 ring-brand-600/10">
            <Route className="h-4 w-4" />
          </div>
          <div>
            <p className="font-mono text-xs font-semibold text-ink-900">{t.trip_id}</p>
            <p className="text-xs text-ink-500">{formatDate(t.created_date, 'dd MMM')}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'route', header: 'Route', sortable: true, accessor: (t) => `${t.source}-${t.destination}`,
      render: (t) => (
        <div className="flex items-center gap-1.5 text-sm">
          <span className="font-medium text-ink-800">{t.source}</span>
          <ArrowRight className="h-3 w-3 text-ink-400" />
          <span className="font-medium text-ink-800">{t.destination}</span>
        </div>
      ),
    },
    {
      key: 'vehicle_reg', header: 'Vehicle', sortable: true,
      render: (t) => <span className="font-mono text-xs text-ink-600">{t.vehicle_reg}</span>,
    },
    {
      key: 'driver_id', header: 'Driver', sortable: true,
      render: (t) => <span className="text-xs text-ink-600">{driverMap[t.driver_id]?.name || t.driver_id}</span>,
    },
    { key: 'cargo_weight_kg', header: 'Cargo', sortable: true, align: 'right', render: (t) => <span className="text-xs">{formatKg(t.cargo_weight_kg)}</span> },
    { key: 'revenue', header: 'Revenue', sortable: true, align: 'right', render: (t) => <span className="text-xs font-medium">{formatCurrency(t.revenue, { compact: true })}</span> },
    { key: 'status', header: 'Status', sortable: true, render: (t) => <StatusBadge status={resolveStatus(TRIP_STATUS, t.status)} /> },
  ], [vehicleMap, driverMap])

  return (
    <div className="space-y-6">
      <PageHeader
        title="Trips"
        subtitle="Create, dispatch, complete & cancel — with full rules enforcement"
        icon={Route}
        actions={can('trips', 'create') && <Button leftIcon={Plus} onClick={() => setCreateOpen(true)}>New Trip</Button>}
      />

      <FilterBar search={search} onSearchChange={setSearch} searchPlaceholder="Search trip ID, source, destination…">
        <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="h-10 w-auto min-w-[140px]">
          <option value="">All statuses</option>
          {TRIP_STATUS_OPTIONS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
        </Select>
      </FilterBar>

      <DataTable
        columns={columns}
        rows={trips || []}
        loading={loading}
        onRowClick={setSelected}
        rowKey={(t) => t.trip_id}
        initialSort={{ key: 'trip_id', dir: 'desc' }}
        emptyTitle="No trips found"
        emptyMessage="Create a new draft trip to get started."
        emptyIcon={Route}
      />

      {/* Create trip modal */}
      {can('trips', 'create') && (
        <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="New Trip" description="Create a draft trip. Dispatch it after validation." size="lg">
          <TripForm onSubmit={handleCreate} onCancel={() => setCreateOpen(false)} loading={saving} />
        </Modal>
      )}

      {/* Dispatch panel modal */}
      <Modal
        open={!!dispatchTrip}
        onClose={() => setDispatchTrip(null)}
        title={`Dispatch ${dispatchTrip?.trip_id}`}
        description={`${dispatchTrip?.source} → ${dispatchTrip?.destination}`}
        size="lg"
      >
        {dispatchTrip && <DispatchActionPanel trip={dispatchTrip} onDispatched={handleDispatched} onClose={() => setDispatchTrip(null)} />}
      </Modal>

      {/* Complete trip modal */}
      <CompleteTripModal
        open={!!completeTrip}
        trip={completeTrip}
        onClose={() => setCompleteTrip(null)}
        onComplete={handleComplete}
        loading={actionLoading}
      />

      {/* Cancel confirm */}
      <ConfirmDialog
        open={!!cancelTrip}
        onClose={() => setCancelTrip(null)}
        onConfirm={handleCancel}
        loading={actionLoading}
        title={`Cancel ${cancelTrip?.trip_id}?`}
        message={cancelTrip?.status === 'Dispatched'
          ? 'This trip is currently dispatched. Vehicle and driver will be restored to Available.'
          : 'This draft trip will be cancelled.'}
        confirmLabel="Cancel Trip"
      />

      {/* Detail drawer */}
      <Drawer
        open={!!selected}
        onClose={() => setSelected(null)}
        title={`${selected?.source} → ${selected?.destination}`}
        subtitle={selected?.trip_id}
        width="lg"
        footer={
          selected && (
            <div className="flex flex-wrap justify-end gap-2">
              {can('trips', 'cancel') && selected.status !== 'Completed' && selected.status !== 'Cancelled' && (
                <Button variant="danger-outline" leftIcon={XCircle} onClick={() => setCancelTrip(selected)}>Cancel</Button>
              )}
              {can('trips', 'complete') && selected.status === 'Dispatched' && (
                <Button leftIcon={CheckCircle2} onClick={() => setCompleteTrip(selected)}>Complete</Button>
              )}
              {can('trips', 'dispatch') && selected.status === 'Draft' && (
                <Button leftIcon={Rocket} onClick={() => setDispatchTrip(selected)}>Dispatch</Button>
              )}
            </div>
          )
        }
      >
        {selected && (
          <div className="space-y-5">
            <div className="flex items-center justify-between">
              <StatusBadge status={resolveStatus(TRIP_STATUS, selected.status)} />
              <span className="inline-flex items-center gap-1 text-xs text-ink-500"><Calendar className="h-3 w-3" />Created {formatDate(selected.created_date)}</span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <DetailStat icon={Route} label="Planned Distance" value={formatKm(selected.planned_distance_km)} />
              {selected.actual_distance_km != null && <DetailStat icon={Route} label="Actual Distance" value={formatKm(selected.actual_distance_km)} />}
              <DetailStat icon={Weight} label="Cargo" value={formatKg(selected.cargo_weight_kg)} />
              <DetailStat icon={IndianRupee} label="Revenue" value={formatCurrency(selected.revenue)} />
              {selected.fuel_consumed_liters != null && <DetailStat icon={Route} label="Fuel Used" value={formatLiters(selected.fuel_consumed_liters)} />}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg border border-ink-100 bg-ink-50/50 px-3 py-2.5">
                <p className="text-xs font-medium text-ink-400">Vehicle</p>
                <p className="mt-0.5 font-mono text-sm font-bold text-ink-800">{selected.vehicle_reg}</p>
                <p className="text-xs text-ink-500">{vehicleMap[selected.vehicle_reg]?.vehicle_name_model || '—'}</p>
              </div>
              <div className="rounded-lg border border-ink-100 bg-ink-50/50 px-3 py-2.5">
                <p className="text-xs font-medium text-ink-400">Driver</p>
                <p className="mt-0.5 text-sm font-bold text-ink-800">{driverMap[selected.driver_id]?.name || selected.driver_id}</p>
                <p className="text-xs text-ink-500">{driverMap[selected.driver_id]?.license_category || ''}</p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <DateStat label="Created" value={selected.created_date} />
              <DateStat label="Dispatched" value={selected.dispatched_date} />
              <DateStat label="Completed" value={selected.completed_date} />
            </div>
          </div>
        )}
      </Drawer>
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

function DateStat({ label, value }) {
  return (
    <div className="rounded-lg border border-ink-100 px-3 py-2.5 text-center">
      <p className="text-xs font-medium text-ink-400">{label}</p>
      <p className="mt-0.5 text-xs font-bold text-ink-700">{value ? formatDate(value, 'dd MMM yyyy') : '—'}</p>
    </div>
  )
}