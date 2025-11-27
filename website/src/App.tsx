// src/App.tsx
import { Routes, Route, Navigate } from 'react-router-dom'
import Login from './screens/Login'
import Dashboard from './screens/Dashboard'
import DataKaryawan from './screens/DataKaryawan/DataKaryawan'
import Absensi from './screens/Absensi/Absensi'
import DetailAbsensi from './screens/Absensi/DetailAbsensi'
import ShiftManagement from './screens/ShiftManagement'
import Settings from './screens/Settings'
import Reports from './screens/Reports'

function App() {
  return (
    <div className="App">
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/employees" element={<DataKaryawan />} />
        <Route path="/attendance" element={<Absensi />} />
        <Route path="/shift-management" element={<ShiftManagement />} />
        <Route path="/attendance/detail" element={<DetailAbsensi />} />
        <Route path="/settings" element={<Settings />} /> 
        <Route path="/reports" element={<Reports />} />
        <Route path="/" element={<Navigate to="/login" replace />} />
      </Routes>
    </div>
  )
}

export default App