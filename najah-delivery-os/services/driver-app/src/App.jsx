import { Routes, Route, Navigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import Login from './pages/Login'
import MyRoute from './pages/MyRoute'
import Header from './components/Header'

function PrivateRoute({ children }) {
  const token = localStorage.getItem('driver_token')
  return token ? children : <Navigate to="/login" replace />
}

function App() {
  const { i18n } = useTranslation()
  const isAuthenticated = localStorage.getItem('driver_token')

  return (
    <div className="app" dir={i18n.language === 'ar' ? 'rtl' : 'ltr'}>
      {isAuthenticated && <Header />}
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          path="/my-route"
          element={
            <PrivateRoute>
              <MyRoute />
            </PrivateRoute>
          }
        />
        <Route path="/" element={<Navigate to="/my-route" replace />} />
      </Routes>
    </div>
  )
}

export default App
