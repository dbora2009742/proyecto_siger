import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import Topbar from './Topbar'

export default function MainLayout() {
  return (
    <div className="min-h-screen" style={{ backgroundColor: '#f1f5f9' }}>
      <Sidebar />
      <Topbar />
      <main className="ml-56 pt-14 min-h-screen">
        <div className="p-6">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
