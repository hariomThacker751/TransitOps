import { useMemo, useState } from 'react'
import { IdCard, Plus, ShieldBan, ShieldCheck, Phone, CalendarClock, AlertTriangle } from 'lucide-react'
import PageHeader from '@/components/ui/PageHeader'
import Button from '@/components/ui/Button'
import FilterBar from '@/components/ui/FilterBar'
import DataTable from '@/components/ui/DataTable'
import Modal from '@/components/ui/Modal'
import Drawer from '@/components/ui/Drawer'
import { Select } from '@/components/ui/FormField'
import { StatusBadge } from '@/components/ui/Badge'
import DriverForm from '@/components/domain/DriverForm'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import { useResource, useDebounce } from '@/hooks/useResource'
import api from '@/api'
import { useAuth } from '@/context/AuthContext'
import toast from 'react-hot-toast'
import {
  DRIVER_STATUS, TRIP_STATUS, DRIVER_STATUS_OPTIONS, LICENSE_CATEGORIES, resolveStatus,
} from '@/utils/statusConfig'
import { formatDate, daysUntil, isExpired, isExpiringSoon } from '@/utils/format'
import { cn } from '@/utils/cn'

export default function Drivers() {
  const { can } = useAuth()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [licenseFilter, setLicenseFilter] = useState('')
  const debouncedSearch = useDebounce(search, 250)

  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [saving, setSaving] = useState(false)
  const [selected, setSelected] = useState(null)
  const [suspendTarget, setSuspendTarget] = useState(null)
  const [actionLoading, setActionLoading] = useState(false)

  const filterKey = `${debouncedSearch}|${statusFilter}|${licenseFilter}`
  const { data: drivers, loading, refetch } = useResource(
    () => api.drivers.list({ search: debouncedSearch, status: statusFilter, license_category: licenseFilter }),
    [filterKey],
  )

  const { data: trips } = useResource(() => api.trips.list({ driver_id: selected?.driver_id }), [selected?.driver_id])

  const openCreate = () => { setEditing(null); setModalOpen(true) }
  const openEdit = (d) => { setEditing(d); setModalOpen(true); setSelected(null) }

  const handleSubmit = async (payload) => {
    setSaving(true)
    const res = editing ? await api.drivers.update(editing.driver_id, payload) : await api.drivers.create(payload)
    setSaving(false)
    if (res.success === false) { toast.error(res.message); return }
    toast.success(editing ? 'Driver updated.' : 'Driver created.')
    setModalOpen(false)
    refetch()
  }

  const handleSuspend = async () => {
    if (!suspendTarget) return
    setActionLoading(true)
    const res = suspendTarget.status === 'Suspended'
      ? await api.drivers.reinstate(suspendTarget.driver_id)
      : await api.drivers.suspend(suspendTarget.driver_id)
    setActionLoading(false)
    if (res.success === false) { toast.error(res.message); return }
    toast.success(suspendTarget.status === 'Suspended' ? 'Driver reinstated.' : 'Driver suspended.')
    setSuspendTarget(null)
    refetch()
  }

  const columns = useMemo(() => [
    {
      key: 'name', header: 'Driver', sortable: true,
      render: (d) => (
        <div className="flex items-center gap-3">
          <div className={cn('flex h-9 w-9 flex-none items-center justify-center rounded-full text-xs font-bold text-white', scoreColor(d.safety_score))}>
            {d.name.charAt(0)}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-ink-900">{d.name}</p>
            <p className="font-mono text-xs text-ink-500">{d.driver_id}</p>
          </div>
        </div>
      ),
    },
    { key: 'license_number', header: 'License', sortable: true, render: (d) => <span className="font-mono text-xs">{d.license_number}</span> },
    { key: 'license_category', header: 'Category', sortable: true, render: (d) => <span className="text-xs font-medium text-ink-600">{d.license_category}</span> },
    {
      key: 'license_expiry_date', header: 'License Expiry', sortable: true,
      render: (d) => <LicenseExpiry value={d.license_expiry_date} />,
    },
    {
      key: 'safety_score', header: 'Safety Score', sortable: true,
      render: (d) => <SafetyBar score={d.safety_score} />,
    },
    { key: 'status', header: 'Status', sortable: true, render: (d) => <StatusBadge status={resolveStatus(DRIVER_STATUS, d.status)} /> },
  ], [])

  return (
    <div className="space-y-6">
      <PageHeader
        title="Drivers"
        subtitle="Driver management — compliance, safety scores & status"
        icon={IdCard}
        actions={can('drivers', 'create') && <Button leftIcon={Plus} onClick={openCreate}>Add Driver</Button>}
      />

      <FilterBar search={search} onSearchChange={setSearch} searchPlaceholder="Search by name or ID…">
        <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="h-10 w-auto min-w-[140px]">
          <option value="">All statuses</option>
          {DRIVER_STATUS_OPTIONS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
        </Select>
        <Select value={licenseFilter} onChange={(e) => setLicenseFilter(e.target.value)} className="h-10 w-auto min-w-[140px]">
          <option value="">All categories</option>
          {LICENSE_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </Select>
      </FilterBar>

      <DataTable
        columns={columns}
        rows={drivers || []}
        loading={loading}
        onRowClick={setSelected}
        rowKey={(d) => d.driver_id}
        initialSort={{ key: 'name', dir: 'asc' }}
        emptyTitle="No drivers found"
        emptyMessage="Adjust filters or add a new driver."
        emptyIcon={IdCard}
      />

      {/* Create / Edit modal */}
      {can('drivers', 'create') && (
        <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? `Edit ${editing.name}` : 'Add Driver'} description={editing ? 'Update driver details.' : 'Register a new driver.'} size="lg">
          <DriverForm initial={editing} onSubmit={handleSubmit} onCancel={() => setModalOpen(false)} loading={saving} />
        </Modal>
      )}

      {/* Detail drawer */}
      <Drawer
        open={!!selected}
        onClose={() => setSelected(null)}
        title={selected?.name}
        subtitle={selected?.driver_id}
        width="lg"
        footer={
          <div className="flex justify-end gap-3">
            {can('drivers', 'suspend') && selected && selected.status !== 'On Trip' && (
              <Button
                variant={selected.status === 'Suspended' ? 'primary' : 'danger-outline'}
                leftIcon={selected.status === 'Suspended' ? ShieldCheck : ShieldBan}
                onClick={() => setSuspendTarget(selected)}
              >
                {selected.status === 'Suspended' ? 'Reinstate' : 'Suspend'}
              </Button>
            )}
            {can('drivers', 'edit') && <Button onClick={() => openEdit(selected)}>Edit Driver</Button>}
          </div>
        }
      >
        {selected && (
          <div className="space-y-5">
            <div className="flex items-center justify-between">
              <StatusBadge status={resolveStatus(DRIVER_STATUS, selected.status)} />
              <LicenseExpiry value={selected.license_expiry_date} compact />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <DetailStat icon={IdCard} label="License No." value={selected.license_number} />
              <DetailStat icon={IdCard} label="Category" value={selected.license_category} />
              <DetailStat icon={CalendarClock} label="Expires" value={formatDate(selected.license_expiry_date)} />
              <DetailStat icon={Phone} label="Contact" value={selected.contact_number || '—'} />
            </div>

            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <p className="text-xs font-bold uppercase tracking-wide text-ink-400">Safety Score</p>
                <span className={cn('text-sm font-bold', scoreTextColor(selected.safety_score))}>{selected.safety_score}/100</span>
              </div>
              <div className="h-2.5 overflow-hidden rounded-full bg-ink-100">
                <div className={cn('h-full rounded-full', scoreColor(selected.safety_score))} style={{ width: `${selected.safety_score}%` }} />
              </div>
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
              ) : <p className="text-xs text-ink-400">No trips assigned.</p>}
            </div>
          </div>
        )}
      </Drawer>

      <ConfirmDialog
        open={!!suspendTarget}
        onClose={() => setSuspendTarget(null)}
        onConfirm={handleSuspend}
        loading={actionLoading}
        title={suspendTarget?.status === 'Suspended' ? 'Reinstate driver?' : 'Suspend driver?'}
        message={suspendTarget?.status === 'Suspended'
          ? `${suspendTarget?.name} will be marked Available and eligible for dispatch.`
          : `${suspendTarget?.name} will be suspended and blocked from all dispatch operations.`}
        confirmLabel={suspendTarget?.status === 'Suspended' ? 'Reinstate' : 'Suspend'}
        tone={suspendTarget?.status === 'Suspended' ? 'primary' : 'danger'}
      />
    </div>
  )
}

function scoreColor(score) {
  if (score >= 80) return 'bg-emerald-500'
  if (score >= 60) return 'bg-amber-500'
  return 'bg-red-500'
}
function scoreTextColor(score) {
  if (score >= 80) return 'text-emerald-600'
  if (score >= 60) return 'text-amber-600'
  return 'text-red-600'
}

function SafetyBar({ score }) {
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-16 overflow-hidden rounded-full bg-ink-100">
        <div className={cn('h-full rounded-full', scoreColor(score))} style={{ width: `${score}%` }} />
      </div>
      <span className={cn('text-xs font-semibold', scoreTextColor(score))}>{score}</span>
    </div>
  )
}

function LicenseExpiry({ value, compact = false }) {
  if (isExpired(value)) {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-semibold text-red-600">
        <AlertTriangle className="h-3 w-3" /> {compact ? 'Expired' : `Expired ${formatDate(value)}`}
      </span>
    )
  }
  if (isExpiringSoon(value)) {
    const days = daysUntil(value)
    return (
      <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-600">
        <CalendarClock className="h-3 w-3" /> {compact ? `${days}d left` : `In ${days} days`}
      </span>
    )
  }
  return <span className="text-xs text-ink-500">{formatDate(value)}</span>
}

function DetailStat({ icon: Icon, label, value }) {
  return (
    <div className="rounded-lg border border-ink-100 bg-ink-50/50 px-3 py-2.5">
      <div className="flex items-center gap-1.5 text-xs font-medium text-ink-400"><Icon className="h-3.5 w-3.5" />{label}</div>
      <p className="mt-1 text-sm font-bold text-ink-800">{value}</p>
    </div>
  )
}