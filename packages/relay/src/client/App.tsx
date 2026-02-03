import { Radio } from 'lucide-react'
import AdminPage from './pages/AdminPage'
import './App.css'

export default function App() {
  return (
    <div className="app">
      <header className="app-header">
        <Radio size={28} strokeWidth={1.5} />
        <h1>RELAY</h1>
      </header>
      <main className="app-main">
        <AdminPage />
      </main>
    </div>
  )
}
