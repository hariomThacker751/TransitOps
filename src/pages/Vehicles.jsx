import { useMemo, useState } from 'react'
import { Truck, Plus, MapPin, Gauge, IndianRupee, Weight } from 'lucide-react'
import PageHeader from '@/components/ui/PageHeader'
import Button from '@/components/ui/Button'
import FilterBar from '@/components/ui/FilterBar'
import DataTable from '@/components/ui/DataTable'
import Modal from '@/components/ui/Modal'
import Drawer from '@/components/ui/Drawer'
import { Select } from '@/components/ui/FormField'
import { Card, CardBody } from '@/components/ui/Card'
import { StatusBadge } from '@/components/ui/Badge'
import VehicleForm from '@/components/domain/VehicleForm'
import { useResource } from '@/hooks/useResource'
import { useDebounce } from '@/hooks/useResource'
import api from '@/api'
import toast from 'react-hot-toast'
import {
  VEHICLE_STATUS, TRIP_STATUS, VEHICLE_STATUS_OPTIONS, VEHICLE_TYPES, VEHICLE_REGIONS, resolveStatus,
} from '@/utils/statusConfig'
import { formatNumber, formatCurrency, formatKm, formatKg } from '@/utils/format'
import { cn } from '@/utils/cn'

export default function Vehicles() {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [regionFilter, setRegionFilter] = useState('')
  const debouncedSearch = useDebounce(search, 250)

  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [saving, setSaving] = useState(false)
  const [selected, setSelected] = useState(null)

  const filterKey = `${debouncedSearch}|${statusFilter}|${typeFilter}|${regionFilter}`
  const { data: vehicles, loading, refetch } = useResource(
    () => api.vehicles.list({ search: debouncedSearch, status: statusFilter, type: typeFilter, region: regionFilter }),
    [filterKey],
  )

  // Linked data for the detail drawer.
  const { data: trips } = useResource(() => api.trips.list({ vehicle_reg: selected?.registration_number }), [selected?.registration_number])
  const { data: maintenance } = useResource(() => api.maintenance.list({ vehicle_reg: selected?.registration_number }), [selected?.registration_number])

  const openCreate = () => {
    setEditing(null)
    setModalOpen(true)
  }
  const openEdit = (v) => {
    setEditing(v)
    setModalOpen(true)
    setSelected(null)
  }

  const handleSubmit = async (payload) => {
    setSaving(true)
    try {
      const res = editing ? await api.vehicles.update(editing.registration_number, payload) : await api.vehicles.create(payload)
      if (res.success === false) {
        toast.error(res.message)
      } else {
        toast.success(editing ? 'Vehicle updated.' : 'Vehicle created.')
        setModalOpen(false)
        refetch()
      }
    } catch (e) {
      toast.error(e.message || 'Operation failed.')
    }
    setSaving(false)
  }

  const columns = useMemo(() => [
    {
      key: 'registration_number',
      header: 'Vehicle',
      sortable: true,
      render: (v) => (
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 flex-none items-center justify-center rounded-lg bg-brand-50 text-brand-600 ring-1 ring-brand-600/10">
            <Truck className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <p className="font-mono text-xs font-semibold text-ink-900">{v.registration_number}</p>
            <p className="truncate text-xs text-ink-500">{v.vehicle_name_model}</p>
          </div>
        </div>
      ),
    },
    { key: 'type', header: 'Type', sortable: true, render: (v) => <span className="text-xs font-medium text-ink-600">{v.type}</span> },
    { key: 'max_load_capacity_kg', header: 'Max Load', sortable: true, align: 'right', render: (v) => <span className="text-xs">{formatKg(v.max_load_capacity_kg)}</span> },
    { key: 'odometer_km', header: 'Odometer', sortable: true, align: 'right', render: (v) => <span className="text-xs">{formatKm(v.odometer_km)}</span> },
    { key: 'acquisition_cost', header: 'Cost', sortable: true, align: 'right', render: (v) => <span className="text-xs">{formatCurrency(v.acquisition_cost, { compact: true })}</span> },
    { key: 'region', header: 'Region', sortable: true, render: (v) => <span className="inline-flex items-center gap-1 text-xs text-ink-600"><MapPin className="h-3 w-3 text-ink-400" />{v.region}</span> },
    { key: 'status', header: 'Status', sortable: true, render: (v) => <StatusBadge status={resolveStatus(VEHICLE_STATUS, v.status)} /> },
  ], [])

  return (
    <div className="space-y-6">
      <PageHeader
        title="Vehicles"
        subtitle="Fleet registry — manage and track all vehicles"
        icon={Truck}
        actions={<Button leftIcon={Plus} onClick={openCreate}>Add Vehicle</Button>}
      />

      <FilterBar search={search} onSearchChange={setSearch} searchPlaceholder="Search by reg or model…">
        <FilterSelect value={statusFilter} onChange={setStatusFilter} placeholder="All statuses" options={VEHICLE_STATUS_OPTIONS} />
        <FilterSelect value={typeFilter} onChange={setTypeFilter} placeholder="All types" options={VEHICLE_TYPES.map((t) => ({ value: t, label: t }))} />
        <FilterSelect value={regionFilter} onChange={setRegionFilter} placeholder="All regions" options={VEHICLE_REGIONS.map((r) => ({ value: r, label: r }))} />
      </FilterBar>

      <DataTable
        columns={columns}
        rows={vehicles || []}
        loading={loading}
        onRowClick={setSelected}
        rowKey={(v) => v.registration_number}
        initialSort={{ key: 'registration_number', dir: 'asc' }}
        emptyTitle="No vehicles found"
        emptyMessage="Adjust filters or add a new vehicle to get started."
        emptyIcon={Truck}
      />

      {/* Create / Edit modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? `Edit ${editing.registration_number}` : 'Add Vehicle'}
        description={editing ? 'Update vehicle details.' : 'Register a new vehicle in the fleet.'}
        size="lg"
      >
        <VehicleForm initial={editing} onSubmit={handleSubmit} onCancel={() => setModalOpen(false)} loading={saving} />
      </Modal>

      {/* Detail drawer */}
      <Drawer
        open={!!selected}
        onClose={() => setSelected(null)}
        title={selected?.vehicle_name_model}
        subtitle={selected?.registration_number}
        width="lg"
        footer={
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setSelected(null)}>Close</Button>
            <Button onClick={() => openEdit(selected)}>Edit Vehicle</Button>
          </div>
        }
      >
        {selected && (
          <div className="space-y-5">
            <div className="flex items-center justify-between">
              <StatusBadge status={resolveStatus(VEHICLE_STATUS, selected.status)} />
              <span className="inline-flex items-center gap-1 text-xs text-ink-500"><MapPin className="h-3 w-3" />{selected.region}</span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <DetailStat icon={Weight} label="Max Load" value={formatKg(selected.max_load_capacity_kg)} />
              <DetailStat icon={Gauge} label="Odometer" value={formatKm(selected.odometer_km)} />
              <DetailStat icon={IndianRupee} label="Acquisition Cost" value={formatCurrency(selected.acquisition_cost)} />
              <DetailStat icon={Truck} label="Type" value={selected.type} />
            </div>

            <div>
              <h4 className="mb-2 text-xs font-bold uppercase tracking-wide text-ink-400">Recent Trips</h4>
              {trips && trips.length > 0 ? (
                <div className="space-y-1.5">
                  {trips.slice(0, 5).map((t) => (
                    <div key={t.trip_id} className="flex items-center justify-between rounded-lg border border-ink-100 px-3 py-2 text-xs">
                      <span className="font-mono font-semibold text-ink-700">{t.trip_id}</span>
                      <span className="text-ink-500">{t.source} → {t.destination}</span>
                      <StatusBadge status={resolveStatus(TRIP_STATUS, t.status)} />
                    </div>
                  ))}
                </div>
              ) : <p className="text-xs text-ink-400">No trips recorded.</p>}
            </div>

            <div>
              <h4 className="mb-2 text-xs font-bold uppercase tracking-wide text-ink-400">Maintenance History</h4>
              {maintenance && maintenance.length > 0 ? (
                <div className="space-y-1.5">
                  {maintenance.slice(0, 5).map((m) => (
                    <div key={m.maintenance_id} className="flex items-center justify-between rounded-lg border border-ink-100 px-3 py-2 text-xs">
                      <span className="font-semibold text-ink-700">{m.maintenance_type}</span>
                      <span className="text-ink-500">{formatCurrency(m.cost)}</span>
                      <StatusBadge status={resolveStatus({ Active: { key: 'Active', label: 'Active', palette: 'amber', dot: 'amber' }, Closed: { key: 'Closed', label: 'Closed', palette: 'emerald', dot: 'emerald' } }, m.status)} />
                    </div>
                  ))}
                </div>
              ) : <p className="text-xs text-ink-400">No maintenance records.</p>}
            </div>
          </div>
        )}
      </Drawer>
    </div>
  )
}

function FilterSelect({ value, onChange, placeholder, options }) {
  return (
    <div className="relative">
      <Select value={value} onChange={(e) => onChange(e.target.value)} className="h-10 w-auto min-w-[140px]">
        <option value="">{placeholder}</option>
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </Select>
    </div>
  )
}

function DetailStat({ icon: Icon, label, value }) {
  return (
    <div className="rounded-lg border border-ink-100 bg-ink-50/50 px-3 py-2.5">
      <div className="flex items-center gap-1.5 text-xs font-medium text-ink-400">
        <Icon className="h-3.5 w-3.5" />{label}
      </div>
      <p className="mt-1 text-sm font-bold text-ink-800">{value}</p>
    </div>
  )
}