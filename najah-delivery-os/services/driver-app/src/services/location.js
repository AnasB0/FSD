import api from './api'

let trackingInterval = null
let watchId = null

const updateLocation = async (latitude, longitude) => {
  try {
    await api.post('/tracking/update', {
      latitude,
      longitude,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('Failed to update location:', error)
  }
}

const getCurrentPosition = () => {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation not supported'))
      return
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude
        })
      },
      (error) => reject(error),
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    )
  })
}

export const startLocationTracking = () => {
  if (trackingInterval) {
    return
  }

  const sendLocationUpdate = async () => {
    try {
      const { latitude, longitude } = await getCurrentPosition()
      await updateLocation(latitude, longitude)
    } catch (error) {
      console.error('Location tracking error:', error)
    }
  }

  sendLocationUpdate()
  trackingInterval = setInterval(sendLocationUpdate, 30000)

  if (navigator.geolocation) {
    watchId = navigator.geolocation.watchPosition(
      (position) => {
        updateLocation(position.coords.latitude, position.coords.longitude)
      },
      (error) => console.error('Watch position error:', error),
      { enableHighAccuracy: true }
    )
  }
}

export const stopLocationTracking = () => {
  if (trackingInterval) {
    clearInterval(trackingInterval)
    trackingInterval = null
  }

  if (watchId !== null && navigator.geolocation) {
    navigator.geolocation.clearWatch(watchId)
    watchId = null
  }
}
