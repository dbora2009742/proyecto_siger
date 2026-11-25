import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import LoginPage from './pages/auth/LoginPage'

const Placeholder = ({ titulo }) => (
  <div className="flex items-center justify-center h-64">
    <p className="text-gray-400 text-lg font-medium">{titulo} — próximamente</p>
  </div>
)

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<LoginPage />} />

        

      </Routes>
    </BrowserRouter>
  )
}

export default App
