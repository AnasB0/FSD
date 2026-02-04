import axios from 'axios'

const API_URL = import.meta.env.VITE_API_URL || '/api'

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json'
  }
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('driver_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('driver_token')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

export const login = async (username, password) => {
  const response = await api.post('/auth/login', { username, password, role: 'driver' })
  return response.data
}

export const getMyRoute = async () => {
  const response = await api.get('/routes/my-route')
  return response.data
}

export const updateDeliveryStatus = async (deliveryId, status) => {
  const response = await api.put(`/deliveries/${deliveryId}/status`, { status })
  return response.data
}

export default api
