import { Routes, Route, Navigate } from 'react-router-dom'
import MainLayout from './layouts/MainLayout'
import { ProtectedRoute, RoleGuard } from './routes/guards'
import { useAuth } from './context/AuthContext'

import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Vehicles from './pages/Vehicles'
import Drivers from './pages/Drivers'
import Trips from './pages/Trips'
import Maintenance from './pages/Maintenance'
import FuelLogs from './pages/FuelLogs'
import Expenses from './pages/Expenses'
import Reports from './pages/Reports'
import NotFound from './pages/NotFound'

export default function App() {
  const { isAuthenticated } = useAuth()

  return (
    <Routes>
      <Route
        path="/login"
        element={isAuthenticated ? <Navigate to="/" replace /> : <Login />}
      />

      <Route
        element={
          <ProtectedRoute>
            <MainLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/" element={<Dashboard />} />
        <Route
          path="/vehicles"
          element={
            <RoleGuard allowed={['fleet_manager']}>
              <Vehicles />
            </RoleGuard>
          }
        />
        <Route
          path="/drivers"
          element={
            <RoleGuard allowed={['fleet_manager', 'safety_officer']}>
              <Drivers />
            </RoleGuard>
          }
        />
        <Route
          path="/trips"
          element={
            <RoleGuard allowed={['fleet_manager', 'driver']}>
              <Trips />
            </RoleGuard>
          }
        />
        <Route
          path="/maintenance"
          element={
            <RoleGuard allowed={['fleet_manager', 'safety_officer']}>
              <Maintenance />
            </RoleGuard>
          }
        />
        <Route
          path="/fuel-logs"
          element={
            <RoleGuard allowed={['fleet_manager', 'driver', 'financial_analyst']}>
              <FuelLogs />
            </RoleGuard>
          }
        />
        <Route
          path="/expenses"
          element={
            <RoleGuard allowed={['fleet_manager', 'driver', 'financial_analyst']}>
              <Expenses />
            </RoleGuard>
          }
        />
        <Route
          path="/reports"
          element={
            <RoleGuard allowed={['fleet_manager', 'financial_analyst', 'safety_officer']}>
              <Reports />
            </RoleGuard>
          }
        />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  )
}
