import { Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import VoidFinder from './pages/VoidFinder'
import Alerts from './pages/Alerts'
import Reports from './pages/Reports'
import Methodology from './pages/Methodology'

function App() {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<Dashboard />} />
        <Route path="voids" element={<VoidFinder />} />
        <Route path="alerts" element={<Alerts />} />
        <Route path="reports" element={<Reports />} />
        <Route path="methodology" element={<Methodology />} />
      </Route>
    </Routes>
  )
}

export default App
