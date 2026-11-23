import axios from 'axios'

const unavailableLocation = 'Location unavailable'
const unavailableWeather = 'Weather unavailable'

function getCurrentCoordinates() {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      resolve(null)
      return
    }

    navigator.geolocation.getCurrentPosition(
      ({ coords }) => resolve({ latitude: coords.latitude, longitude: coords.longitude }),
      () => resolve(null),
    )
  })
}

function getCityName(address = {}) {
  return address.city || address.town || address.village || address.county || 'Current location'
}

export async function getLocationWeather() {
  const coordinates = await getCurrentCoordinates()
  if (!coordinates) {
    return { locationName: unavailableLocation, weather: unavailableWeather }
  }

  const { latitude, longitude } = coordinates
  const [weatherResult, locationResult] = await Promise.allSettled([
    axios.get(
      `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,weather_code`,
    ),
    axios.get(
      `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json&accept-language=en`,
    ),
  ])

  const temperature = weatherResult.status === 'fulfilled'
    ? weatherResult.value.data.current?.temperature_2m
    : null
  const address = locationResult.status === 'fulfilled'
    ? locationResult.value.data.address
    : null

  return {
    locationName: address ? getCityName(address) : 'Current location',
    weather: Number.isFinite(temperature) ? `${Math.round(temperature)}°C` : unavailableWeather,
  }
}
