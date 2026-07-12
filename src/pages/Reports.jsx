import { useMemo, useState } from 'react'
import { BarChart3, Download, TrendingUp, TrendingDown, Fuel, IndianRupee, Gauge, Sparkles } from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from 'recharts'
import PageHeader from '@/components/ui/PageHeader'
import Button from '@/components/ui/Button'
import Tabs from '@/components/ui/Tabs'
import ChartCard from '@/components/ui/ChartCard'
import DataTable from '@/components/ui/DataTable'
import KpiCard from '@/components/ui/KpiCard'
import AnomalyExplainerModal from '@/components/domain/AnomalyExplainerModal'
import { useResource } from '@/hooks/useResource'
import api from '@/api'
import { useAuth } from '@/context/AuthContext'
import toast from 'react-hot-toast'
import { formatCurrency, formatNumber, formatPercent, formatKm, formatLiters } from '@/utils/format'
import { exportCSV } from '@/utils/csv'
import { cn } from '@/utils/cn'

const TABS = [
  { value: 'roi', label: 'Vehicle ROI', icon: TrendingUp },
  { value: 'costs', label: 'Cost Breakdown', icon: IndianRupee },
  { value: 'fuel', label: 'Fuel Efficiency', icon: Fuel },
]

// Maps each report tab to the anomaly-explainer metric.
const TAB_METRIC = { roi: 'roi', costs: 'operational_cost', fuel: 'fuel_efficiency' }

export default function Reports() {
  const { can } = useAuth()
  const [tab, setTab] = useState('roi')
  const [anomaly, setAnomaly] = useState(null) // { vehicleReg, metric }

  const { data: roi, loading: roiLoading } = useResource(() => api.reports.roi(), [tab])
  const { data: costs, loading: costsLoading } = useResource(() => api.reports.vehicleCosts(), [tab])
  const { data: fuel, loading: fuelLoading } = useResource(() => api.reports.fuelEfficiency(), [tab])

  const openAnomaly = (vehicleReg) => setAnomaly({ vehicleReg, metric: TAB_METRIC[tab] || 'roi' })
  const closeAnomaly = () => setAnomaly(null)

  const handleExport = async () => {
    const stamp = new Date().toISOString().slice(0, 10)
    // Real mode: download CSV from the backend (it generates the file).
    if (!api.isMock) {
      const reportType = tab === 'roi' ? 'roi' : tab === 'costs' ? 'vehicle-costs' : 'fuel-efficiency'
      try {
        const response = await api.reports.exportCSV(reportType)
        const disposition = response.headers?.['content-disposition'] || ''
        const filenameMatch = disposition.match(/filename="?(.+?)"?$/)
        const filename = filenameMatch ? filenameMatch[1] : `transitops-${reportType}-${stamp}.csv`
        const blob = new Blob([response.data], { type: 'text/csv;charset=utf-8;' })
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.download = filename
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        URL.revokeObjectURL(url)
        toast.success('CSV exported.')
      } catch (e) {
        toast.error(e?.message || 'Export failed.')
      }
      return
    }
    // Mock mode: generate CSV client-side from the in-memory data.
    if (tab === 'roi' && roi) {
      exportCSV(`transitops-roi-${stamp}.csv`, roi, [
        { header: 'Vehicle', value: 'registration_number' },
        { header: 'Model', value: 'vehicle_name_model' },
        { header: 'Acquisition Cost', value: 'acquisition_cost' },
        { header: 'Revenue', value: 'revenue' },
        { header: 'Operational Cost', value: 'operational_cost' },
        { header: 'ROI %', value: 'roi' },
        { header: 'Status', value: 'status' },
      ])
    } else if (tab === 'costs' && costs) {
      exportCSV(`transitops-costs-${stamp}.csv`, costs, [
        { header: 'Vehicle', value: 'registration_number' },
        { header: 'Model', value: 'vehicle_name_model' },
        { header: 'Fuel', value: 'fuel' },
        { header: 'Maintenance', value: 'maintenance' },
        { header: 'Expenses', value: 'expenses' },
        { header: 'Total', value: 'total' },
      ])
    } else if (tab === 'fuel' && fuel) {
      exportCSV(`transitops-fuel-efficiency-${stamp}.csv`, fuel, [
        { header: 'Vehicle', value: 'registration_number' },
        { header: 'Model', value: 'vehicle_name_model' },
        { header: 'Completed Trips', value: 'completedTrips' },
        { header: 'Total Distance (km)', value: 'totalDistance' },
        { header: 'Trip Fuel (L)', value: 'tripFuel' },
        { header: 'All Fuel (L)', value: 'allFuel' },
        { header: 'Efficiency (km/L)', value: 'efficiency' },
      ])
    }
    toast.success('CSV exported.')
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reports & Analytics"
        subtitle="ROI, operational costs, and fuel efficiency — computed live"
        icon={BarChart3}
        actions={can('reports', 'export') && <Button variant="outline" leftIcon={Download} onClick={handleExport}>Export CSV</Button>}
      />

      <Tabs tabs={TABS} value={tab} onChange={setTab} />

      {tab === 'roi' && <ROITab data={roi} loading={roiLoading} onExplain={openAnomaly} />}
      {tab === 'costs' && <CostsTab data={costs} loading={costsLoading} onExplain={openAnomaly} />}
      {tab === 'fuel' && <FuelTab data={fuel} loading={fuelLoading} onExplain={openAnomaly} />}

      {anomaly && (
        <AnomalyExplainerModal
          open={!!anomaly}
          onClose={closeAnomaly}
          vehicleReg={anomaly.vehicleReg}
          metric={anomaly.metric}
        />
      )}
    </div>
  )
}

// ── ROI Tab ──────────────────────────────────────────────────────────────────
function ROITab({ data, loading, onExplain }) {
  const summary = useMemo(() => {
    if (!data) return { totalRevenue: 0, totalCost: 0, avgRoi: 0, profitable: 0 }
    const totalRevenue = data.reduce((s, r) => s + r.revenue, 0)
    const totalCost = data.reduce((s, r) => s + r.operational_cost, 0)
    const avgRoi = data.length ? data.reduce((s, r) => s + r.roi, 0) / data.length : 0
    return { totalRevenue, totalCost, avgRoi, profitable: data.filter((r) => r.roi > 0).length }
  }, [data])

  const columns = [
    {
      key: 'registration_number', header: 'Vehicle', sortable: true,
      render: (r) => (
        <div>
          <p className="font-mono text-xs font-semibold text-ink-900">{r.registration_number}</p>
          <p className="truncate text-xs text-ink-500">{r.vehicle_name_model}</p>
        </div>
      ),
    },
    { key: 'acquisition_cost', header: 'Acquisition', sortable: true, align: 'right', render: (r) => <span className="text-xs">{formatCurrency(r.acquisition_cost, { compact: true })}</span> },
    { key: 'revenue', header: 'Revenue', sortable: true, align: 'right', render: (r) => <span className="text-xs font-medium text-emerald-600">{formatCurrency(r.revenue, { compact: true })}</span> },
    { key: 'operational_cost', header: 'Op. Cost', sortable: true, align: 'right', render: (r) => <span className="text-xs font-medium text-red-600">{formatCurrency(r.operational_cost, { compact: true })}</span> },
    {
      key: 'roi', header: 'ROI %', sortable: true, align: 'right',
      render: (r) => (
        <span className={cn('inline-flex items-center gap-1 text-xs font-bold', r.roi >= 0 ? 'text-emerald-600' : 'text-red-600')}>
          {r.roi >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
          {formatPercent(r.roi, { decimals: 1 })}
        </span>
      ),
    },
    {
      key: 'explain', header: '', sortable: false, align: 'right',
      render: (r) => (
        <Button variant="ghost" size="sm" leftIcon={Sparkles} onClick={() => onExplain?.(r.registration_number)}>
          Explain
        </Button>
      ),
    },
  ]

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard label="Total Revenue" value={formatCurrency(summary.totalRevenue, { compact: true })} icon={IndianRupee} accent="emerald" />
        <KpiCard label="Total Op. Cost" value={formatCurrency(summary.totalCost, { compact: true })} icon={IndianRupee} accent="red" />
        <KpiCard label="Average ROI" value={formatPercent(summary.avgRoi, { decimals: 1 })} icon={TrendingUp} accent={summary.avgRoi >= 0 ? 'emerald' : 'red'} />
        <KpiCard label="Profitable" value={`${summary.profitable} / ${data?.length || 0}`} icon={Gauge} accent="blue" />
      </div>

      <DataTable columns={columns} rows={data || []} loading={loading} rowKey={(r) => r.registration_number} initialSort={{ key: 'roi', dir: 'desc' }} emptyTitle="No ROI data" emptyIcon={BarChart3} />
    </div>
  )
}

// ── Cost Breakdown Tab ───────────────────────────────────────────────────────
function CostsTab({ data, loading, onExplain }) {
  const chartData = useMemo(() => {
    if (!data) return []
    return data
      .filter((d) => d.total > 0)
      .sort((a, b) => b.total - a.total)
      .slice(0, 10)
      .map((d) => ({ name: d.registration_number, Fuel: d.fuel, Maintenance: d.maintenance, Expenses: d.expenses }))
  }, [data])

  const totals = useMemo(() => {
    if (!data) return { fuel: 0, maintenance: 0, expenses: 0 }
    return {
      fuel: data.reduce((s, d) => s + d.fuel, 0),
      maintenance: data.reduce((s, d) => s + d.maintenance, 0),
      expenses: data.reduce((s, d) => s + d.expenses, 0),
    }
  }, [data])

  const columns = [
    {
      key: 'registration_number', header: 'Vehicle', sortable: true,
      render: (r) => (
        <div>
          <p className="font-mono text-xs font-semibold text-ink-900">{r.registration_number}</p>
          <p className="truncate text-xs text-ink-500">{r.vehicle_name_model}</p>
        </div>
      ),
    },
    { key: 'fuel', header: 'Fuel', sortable: true, align: 'right', render: (r) => <span className="text-xs text-blue-600">{formatCurrency(r.fuel, { compact: true })}</span> },
    { key: 'maintenance', header: 'Maintenance', sortable: true, align: 'right', render: (r) => <span className="text-xs text-amber-600">{formatCurrency(r.maintenance, { compact: true })}</span> },
    { key: 'expenses', header: 'Expenses', sortable: true, align: 'right', render: (r) => <span className="text-xs text-ink-500">{formatCurrency(r.expenses, { compact: true })}</span> },
    { key: 'total', header: 'Total', sortable: true, align: 'right', render: (r) => <span className="text-xs font-bold text-ink-900">{formatCurrency(r.total, { compact: true })}</span> },
    {
      key: 'explain', header: '', sortable: false, align: 'right',
      render: (r) => (
        <Button variant="ghost" size="sm" leftIcon={Sparkles} onClick={() => onExplain?.(r.registration_number)}>
          Explain
        </Button>
      ),
    },
  ]

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-4">
        <KpiCard label="Total Fuel" value={formatCurrency(totals.fuel, { compact: true })} icon={Fuel} accent="blue" />
        <KpiCard label="Total Maintenance" value={formatCurrency(totals.maintenance, { compact: true })} icon={IndianRupee} accent="amber" />
        <KpiCard label="Total Expenses" value={formatCurrency(totals.expenses, { compact: true })} icon={IndianRupee} accent="zinc" />
      </div>

      <ChartCard title="Cost Breakdown by Vehicle" subtitle="Top 10 vehicles by total cost (fuel / maintenance / expenses)">
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData} margin={{ left: 0, right: 16, top: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
            <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} angle={-20} textAnchor="end" height={50} />
            <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} tickFormatter={(v) => formatCurrency(v, { compact: true })} />
            <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 12 }} formatter={(v) => formatCurrency(v)} cursor={{ fill: '#f8fafc' }} />
            <Bar dataKey="Fuel" stackId="a" fill="#3b82f6" radius={[0, 0, 0, 0]} />
            <Bar dataKey="Maintenance" stackId="a" fill="#f59e0b" radius={[0, 0, 0, 0]} />
            <Bar dataKey="Expenses" stackId="a" fill="#71717a" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      <DataTable columns={columns} rows={data || []} loading={loading} rowKey={(r) => r.registration_number} initialSort={{ key: 'total', dir: 'desc' }} emptyTitle="No cost data" emptyIcon={IndianRupee} />
    </div>
  )
}

// ── Fuel Efficiency Tab ──────────────────────────────────────────────────────
function FuelTab({ data, loading, onExplain }) {
  const columns = [
    {
      key: 'registration_number', header: 'Vehicle', sortable: true,
      render: (r) => (
        <div>
          <p className="font-mono text-xs font-semibold text-ink-900">{r.registration_number}</p>
          <p className="truncate text-xs text-ink-500">{r.vehicle_name_model}</p>
        </div>
      ),
    },
    { key: 'completedTrips', header: 'Trips', sortable: true, align: 'right', render: (r) => <span className="text-xs">{formatNumber(r.completedTrips)}</span> },
    { key: 'totalDistance', header: 'Distance', sortable: true, align: 'right', render: (r) => <span className="text-xs">{formatKm(r.totalDistance)}</span> },
    { key: 'tripFuel', header: 'Fuel Used', sortable: true, align: 'right', render: (r) => <span className="text-xs">{formatLiters(r.tripFuel)}</span> },
    {
      key: 'efficiency', header: 'Efficiency (km/L)', sortable: true, align: 'right',
      render: (r) => (
        <span className={cn('text-xs font-bold', r.efficiency > 0 ? 'text-emerald-600' : 'text-ink-400')}>
          {r.efficiency > 0 ? `${r.efficiency} km/L` : '—'}
        </span>
      ),
    },
    {
      key: 'explain', header: '', sortable: false, align: 'right',
      render: (r) => (
        <Button variant="ghost" size="sm" leftIcon={Sparkles} onClick={() => onExplain?.(r.registration_number)}>
          Explain
        </Button>
      ),
    },
  ]

  const avgEff = useMemo(() => {
    if (!data) return 0
    const valid = data.filter((d) => d.efficiency > 0)
    return valid.length ? valid.reduce((s, d) => s + d.efficiency, 0) / valid.length : 0
  }, [data])

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard label="Avg Efficiency" value={avgEff > 0 ? `${avgEff.toFixed(1)} km/L` : '—'} icon={Fuel} accent="brand" />
        <KpiCard label="Total Distance" value={formatKm(data?.reduce((s, d) => s + d.totalDistance, 0) || 0)} icon={Gauge} accent="blue" />
        <KpiCard label="Total Fuel" value={formatLiters(data?.reduce((s, d) => s + d.tripFuel, 0) || 0)} icon={Fuel} accent="amber" />
        <KpiCard label="Active Vehicles" value={formatNumber(data?.filter((d) => d.completedTrips > 0).length || 0)} icon={Gauge} accent="emerald" />
      </div>

      <DataTable columns={columns} rows={data || []} loading={loading} rowKey={(r) => r.registration_number} initialSort={{ key: 'efficiency', dir: 'desc' }} emptyTitle="No fuel efficiency data" emptyIcon={Fuel} />
    </div>
  )
}