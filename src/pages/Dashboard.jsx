import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Truck, CheckCircle2, Wrench, Route, ClipboardList, IdCard,
  TrendingUp, AlertTriangle, ShieldAlert, Gauge,
} from 'lucide-react'
import {
  PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis,
  Tooltip, RadialBarChart, RadialBar, Legend, CartesianGrid,
} from 'recharts'

import PageHeader from '@/components/ui/PageHeader'
import KpiCard from '@/components/ui/KpiCard'
import ChartCard from '@/components/ui/ChartCard'
import { Card, CardHeader, CardBody } from '@/components/ui/Card'
import Badge, { StatusBadge } from '@/components/ui/Badge'
import { useResource } from '@/hooks/useResource'
import api from '@/api'
import { useAuth, ROLES } from '@/context/AuthContext'
import { formatNumber, formatCurrency, formatPercent, daysUntil, formatDate } from '@/utils/format'
import { resolveStatus, DRIVER_STATUS } from '@/utils/statusConfig'

const STATUS_COLORS = {
  Available: '#10b981', 'On Trip': '#3b82f6', 'In Shop': '#f59e0b', Retired: '#71717a',
  Draft: '#64748b', Dispatched: '#3b82f6', Completed: '#10b981', Cancelled: '#71717a',
  'Off Duty': '#64748b', Suspended: '#ef4444',
}

export default function Dashboard() {
  const { user, role, can } = useAuth()
  const navigate = useNavigate()

  const { data: kpis } = useResource(() => api.dashboard.kpis())
  const { data: charts } = useResource(() => api.dashboard.charts())
  const { data: drivers } = useResource(() => api.drivers.list(), [role])
  const { data: roi } = useResource(() => api.reports.roi(), [role])
  const { data: costs } = useResource(() => api.reports.vehicleCosts(), [role])

  // Safety alerts — expiring/expired licenses + suspended drivers.
  const safetyAlerts = useMemo(() => {
    if (!drivers) return []
    return drivers
      .filter((d) => {
        const days = daysUntil(d.license_expiry_date)
        return d.status === 'Suspended' || (days !== null && days <= 30)
      })
      .sort((a, b) => (daysUntil(a.license_expiry_date) || 0) - (daysUntil(b.license_expiry_date) || 0))
  }, [drivers])

  // Financial roll-ups.
  const fleetHealth = useMemo(() => {
    if (!roi) return { totalRevenue: 0, totalCost: 0, avgRoi: 0, profitable: 0, total: 0 }
    const totalRevenue = roi.reduce((s, r) => s + r.revenue, 0)
    const totalCost = roi.reduce((s, r) => s + r.operational_cost, 0)
    const avgRoi = roi.length ? roi.reduce((s, r) => s + r.roi, 0) / roi.length : 0
    return { totalRevenue, totalCost, avgRoi, profitable: roi.filter((r) => r.roi > 0).length, total: roi.length }
  }, [roi])

  const costTotals = useMemo(() => {
    if (!costs) return { fuel: 0, maintenance: 0, expenses: 0 }
    return {
      fuel: costs.reduce((s, c) => s + c.fuel, 0),
      maintenance: costs.reduce((s, c) => s + c.maintenance, 0),
      expenses: costs.reduce((s, c) => s + c.expenses, 0),
    }
  }, [costs])

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Welcome back, ${user?.name?.split(' ')[0]}`}
        subtitle={`${ROLES[role]?.label} · Real-time fleet operations overview`}
        icon={Gauge}
      />

      {/* ── KPI cards ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard label="Active Vehicles" value={formatNumber(kpis?.activeVehicles)} sub={`of ${kpis?.totalVehicles || 0} total`} icon={Truck} accent="blue" />
        <KpiCard label="Available" value={formatNumber(kpis?.availableVehicles)} sub="Ready to dispatch" icon={CheckCircle2} accent="emerald" />
        <KpiCard label="In Maintenance" value={formatNumber(kpis?.inMaintenance)} sub="Dispatch locked" icon={Wrench} accent="amber" />
        <KpiCard label="Active Trips" value={formatNumber(kpis?.activeTrips)} sub={`${kpis?.pendingTrips || 0} pending draft`} icon={Route} accent="brand" />
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard label="Drivers On Duty" value={formatNumber(kpis?.driversOnDuty)} sub={`of ${kpis?.totalDrivers || 0} drivers`} icon={IdCard} accent="blue" />
        <KpiCard label="Pending Trips" value={formatNumber(kpis?.pendingTrips)} sub="Awaiting dispatch" icon={ClipboardList} accent="slate" />
        <KpiCard label="Fleet Utilization" value={formatPercent(kpis?.utilization)} sub="Vehicles on trip" icon={TrendingUp} accent="brand" />
        {can('dashboard', 'safety') ? (
          <KpiCard label="Safety Alerts" value={formatNumber(safetyAlerts.length)} sub="Expiring/expired licenses" icon={ShieldAlert} accent="red" />
        ) : (
          <KpiCard label="Total Trips" value={formatNumber(kpis?.totalTrips)} sub="All-time records" icon={Route} accent="zinc" />
        )}
      </div>

      {/* ── Charts row ────────────────────────────────────────────── */}
      <div className="grid gap-4 lg:grid-cols-3">
        <ChartCard title="Fleet Status" subtitle="Vehicle distribution by status">
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={charts?.vehicleStatus || []} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={2}>
                {(charts?.vehicleStatus || []).map((entry) => (
                  <Cell key={entry.name} fill={STATUS_COLORS[entry.name] || '#94a3b8'} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 12 }} formatter={(v, n) => [`${v} vehicles`, n]} />
              <Legend iconType="circle" wrapperStyle={{ fontSize: 11 }} formatter={(v) => <span className="text-ink-600">{v}</span>} />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Fleet Utilization" subtitle="Vehicles currently on trip">
          <ResponsiveContainer width="100%" height={220}>
            <RadialBarChart innerRadius="70%" outerRadius="100%" data={[{ name: 'Utilization', value: kpis?.utilization || 0, fill: '#4f46e5' }]} startAngle={90} endAngle={-270}>
              <RadialBar background={{ fill: '#f1f5f9' }} dataKey="value" cornerRadius={20} />
              <text x="50%" y="50%" textAnchor="middle" dominantBaseline="middle">
                <tspan x="50%" dy="-0.3em" className="fill-ink-900" style={{ fontSize: 28, fontWeight: 700 }}>{formatPercent(kpis?.utilization)}</tspan>
                <tspan x="50%" dy="1.6em" className="fill-ink-400" style={{ fontSize: 11 }}>utilization</tspan>
              </text>
            </RadialBarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Trips by Status" subtitle="Current trip lifecycle distribution">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={charts?.tripStatus || []} layout="vertical" margin={{ left: 10, right: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} width={70} />
              <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 12 }} formatter={(v) => [`${v} trips`, 'Count']} cursor={{ fill: '#f8fafc' }} />
              <Bar dataKey="value" radius={[0, 6, 6, 0]} barSize={22}>
                {(charts?.tripStatus || []).map((entry) => (
                  <Cell key={entry.name} fill={STATUS_COLORS[entry.name] || '#94a3b8'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* ── Role-specific panels ──────────────────────────────────── */}
      <div className="grid gap-4 lg:grid-cols-2">
        {can('dashboard', 'safety') && (
          <Card>
            <CardHeader title="Safety & Compliance" subtitle="License expiry & driver status alerts" action={<Badge tone="red" dot dotColor="red">{safetyAlerts.length} alerts</Badge>} />
            <CardBody className="pt-0">
              {safetyAlerts.length === 0 ? (
                <p className="py-8 text-center text-sm text-ink-400">All drivers compliant ✓</p>
              ) : (
                <div className="space-y-2">
                  {safetyAlerts.slice(0, 5).map((d) => {
                    const days = daysUntil(d.license_expiry_date)
                    const expired = days !== null && days < 0
                    return (
                      <div key={d.driver_id} className="flex items-center justify-between gap-3 rounded-lg border border-ink-100 bg-ink-50/50 px-3 py-2.5">
                        <div className="flex min-w-0 items-center gap-2.5">
                          <div className={`flex h-8 w-8 flex-none items-center justify-center rounded-lg ${expired ? 'bg-red-50 text-red-600' : 'bg-amber-50 text-amber-600'}`}>
                            <AlertTriangle className="h-4 w-4" />
                          </div>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-ink-800">{d.name}</p>
                            <p className="text-xs text-ink-500">{expired ? `Expired ${formatDate(d.license_expiry_date)}` : `Expires in ${days} days`}</p>
                          </div>
                        </div>
                        <StatusBadge status={resolveStatus(DRIVER_STATUS, d.status)} />
                      </div>
                    )
                  })}
                </div>
              )}
            </CardBody>
          </Card>
        )}

        {can('dashboard', 'financial') && (
          <Card>
            <CardHeader title="Financial Overview" subtitle="Revenue, costs & vehicle ROI" action={<Badge tone="emerald" dot dotColor="emerald">{fleetHealth.profitable} profitable</Badge>} />
            <CardBody className="pt-0">
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg bg-emerald-50 px-3 py-2.5 ring-1 ring-emerald-600/10">
                  <p className="text-xs font-medium text-emerald-700">Total Revenue</p>
                  <p className="mt-0.5 text-lg font-bold text-ink-900">{formatCurrency(fleetHealth.totalRevenue, { compact: true })}</p>
                </div>
                <div className="rounded-lg bg-red-50 px-3 py-2.5 ring-1 ring-red-600/10">
                  <p className="text-xs font-medium text-red-700">Operational Cost</p>
                  <p className="mt-0.5 text-lg font-bold text-ink-900">{formatCurrency(fleetHealth.totalCost, { compact: true })}</p>
                </div>
              </div>
              <div className="mt-3 space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-ink-500">Average ROI</span>
                  <span className={`font-bold ${fleetHealth.avgRoi >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>{formatPercent(fleetHealth.avgRoi, { decimals: 1 })}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-ink-500">Profitable vehicles</span>
                  <span className="font-bold text-ink-800">{fleetHealth.profitable} / {fleetHealth.total}</span>
                </div>
                {/* Cost breakdown mini bar */}
                <div className="mt-3">
                  <p className="mb-1.5 text-xs font-medium text-ink-500">Cost breakdown</p>
                  <div className="flex h-2.5 overflow-hidden rounded-full bg-ink-100">
                    <div className="bg-blue-500" style={{ width: `${pct(costTotals.fuel, costTotals)}%` }} title="Fuel" />
                    <div className="bg-amber-500" style={{ width: `${pct(costTotals.maintenance, costTotals)}%` }} title="Maintenance" />
                    <div className="bg-ink-400" style={{ width: `${pct(costTotals.expenses, costTotals)}%` }} title="Expenses" />
                  </div>
                  <div className="mt-2 flex gap-4 text-[11px] text-ink-500">
                    <LegendDot color="bg-blue-500" label="Fuel" value={costTotals.fuel} />
                    <LegendDot color="bg-amber-500" label="Maint." value={costTotals.maintenance} />
                    <LegendDot color="bg-ink-400" label="Exp." value={costTotals.expenses} />
                  </div>
                </div>
              </div>
            </CardBody>
          </Card>
        )}
      </div>

      {/* ── Quick actions ─────────────────────────────────────────── */}
      {can('trips', 'create') && (
        <Card>
          <CardHeader title="Quick Actions" subtitle="Jump to common operations" />
          <CardBody className="pt-0">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <QuickAction icon={Route} label="Manage Trips" desc="Dispatch & complete" onClick={() => navigate('/trips')} accent="brand" />
              {can('vehicles', 'view') && <QuickAction icon={Truck} label="Vehicles" desc="Fleet registry" onClick={() => navigate('/vehicles')} accent="blue" />}
              {can('maintenance', 'view') && <QuickAction icon={Wrench} label="Maintenance" desc="Active & closed" onClick={() => navigate('/maintenance')} accent="amber" />}
              {can('reports', 'view') && <QuickAction icon={TrendingUp} label="Reports" desc="ROI & costs" onClick={() => navigate('/reports')} accent="emerald" />}
            </div>
          </CardBody>
        </Card>
      )}
    </div>
  )
}

function pct(part, total) {
  const sum = total.fuel + total.maintenance + total.expenses
  return sum > 0 ? (part / sum) * 100 : 0
}

function LegendDot({ color, label, value }) {
  return (
    <span className="flex items-center gap-1">
      <span className={`h-2 w-2 rounded-full ${color}`} />
      {label}: {formatCurrency(value, { compact: true })}
    </span>
  )
}

function QuickAction({ icon: Icon, label, desc, onClick, accent }) {
  const accents = {
    brand: 'hover:border-brand-300 hover:bg-brand-50/50 text-brand-600',
    blue: 'hover:border-blue-300 hover:bg-blue-50/50 text-blue-600',
    amber: 'hover:border-amber-300 hover:bg-amber-50/50 text-amber-600',
    emerald: 'hover:border-emerald-300 hover:bg-emerald-50/50 text-emerald-600',
  }
  return (
    <button onClick={onClick} className={`flex flex-col items-start gap-2 rounded-xl border border-ink-200 bg-white p-4 text-left transition-all ${accents[accent] || accents.brand}`}>
      <Icon className="h-5 w-5" />
      <div>
        <p className="text-sm font-bold text-ink-800">{label}</p>
        <p className="text-xs text-ink-500">{desc}</p>
      </div>
    </button>
  )
}
