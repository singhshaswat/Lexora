import { getEnv } from './getEnv'

/**
 * Get the backend URL from environment variables
 * Automatically converts HTTP to HTTPS when the app is served over HTTPS to prevent mixed content errors
 * @returns The backend URL, defaults to http://localhost:8000 if not set
 */
export const getBackendUrl = (): string => {
  const backendUrl = getEnv('VITE_BACKEND_URL') || 'http://localhost:8000'
  
  // If the app is running over HTTPS, ensure the backend URL also uses HTTPS
  // This prevents mixed content errors in production
  let finalUrl = backendUrl
  if (typeof window !== 'undefined' && window.location.protocol === 'https:') {
    // Convert http:// to https://
    if (backendUrl.startsWith('http://')) {
      finalUrl = backendUrl.replace('http://', 'https://')
      console.warn('⚠️ Backend URL converted from HTTP to HTTPS:', backendUrl, '→', finalUrl)
    }
  }
  
  return finalUrl
}
