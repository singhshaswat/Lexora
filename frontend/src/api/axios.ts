import axios from 'axios'
import { store } from '@/store'
import { setAccessToken, clearAccessToken, setUserData } from '@/store/slices/authSlice'
import { getBackendUrl } from '@/utils/getBackendUrl'

const api = axios.create({
  baseURL: getBackendUrl(),
  withCredentials: true,
})

api.interceptors.request.use((config) => {
  const token = store.getState().auth.accessToken
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config

    if (
      originalRequest.url?.includes('/api/auth/login') ||
      originalRequest.url?.includes('/api/auth/refresh') ||
      originalRequest.url?.includes('/api/auth/register')
    ) {
      return Promise.reject(error)
    }

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true
      try {
        const res = await axios.post(
          `${getBackendUrl()}/api/auth/refresh`,
          {},
          { withCredentials: true }
        )

        if (!res.data?.access_token) {
          throw new Error('No access token in refresh response')
        }

        // Store the new access token
        store.dispatch(setAccessToken(res.data.access_token))
        store.dispatch(setUserData({ 
          email: res.data.email
        }))
        const newAccessToken = res.data.access_token

        // Update the original request with the new token
        originalRequest.headers = originalRequest.headers || {}
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`

        // Retry the original request
        return api(originalRequest)
      } catch (err) {
        console.error('Refresh token failed:', err)
        // Clear the access token and redirect to login
        store.dispatch(clearAccessToken())
        window.location.href = '/login'
        return Promise.reject(error) // Important to prevent further processing
      }
    }

    return Promise.reject(error)
  }
)

export default api
