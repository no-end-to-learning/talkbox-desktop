import axios, { AxiosInstance } from 'axios'
import { useAuthStore } from '@/stores/auth'
import { getServerUrl } from './config'

let baseUrl = getServerUrl()

const http: AxiosInstance = axios.create({
  baseURL: baseUrl,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
  }
})

export function updateBaseUrl(url: string) {
  baseUrl = url
  http.defaults.baseURL = url
}

export function getBaseUrl(): string {
  return baseUrl
}

http.interceptors.request.use(
  (config) => {
    const authStore = useAuthStore()
    if (authStore.token) {
      config.headers.Authorization = `Bearer ${authStore.token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

http.interceptors.response.use(
  (response) => {
    const data = response.data
    if (data.code !== 0 && data.code !== undefined) {
      return Promise.reject(new Error(data.message || 'Request failed'))
    }
    return data.data !== undefined ? data.data : data
  },
  (error) => {
    if (error.response?.status === 401) {
      const authStore = useAuthStore()
      authStore.logout()
      window.location.href = '/login'
    }
    const message = error.response?.data?.message || error.message || 'Request failed'
    return Promise.reject(new Error(message))
  }
)

export default http
