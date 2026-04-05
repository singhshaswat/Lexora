import { createSlice } from '@reduxjs/toolkit'

interface AuthState {
  accessToken: string | null
  isInitialized: boolean
  email: string | null
  firstName: string | null
  lastName: string | null
  isAdmin: boolean
}

const initialState: AuthState = {
  accessToken: null,
  isInitialized: false,
  email: null,
  firstName: null,
  lastName: null,
  isAdmin: false,
}

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setAccessToken: (state, action) => {
      // Handle string, or objects with jwt_token (refresh) or access_token (login)
      const payload = action.payload as string | { jwt_token?: string; access_token?: string }
      if (typeof payload === 'string') {
        state.accessToken = payload
      } else if (payload.jwt_token) {
        state.accessToken = payload.jwt_token
      } else if (payload.access_token) {
        state.accessToken = payload.access_token
      }
      state.isInitialized = true
    },
    clearAccessToken: (state) => {
      state.accessToken = null
      state.email = null
      state.firstName = null
      state.lastName = null
      state.isAdmin = false
      state.isInitialized = true
    },
    setUserData: (state, action) => {
      state.email = action.payload.email || null
      state.firstName = action.payload.firstName || null
      state.lastName = action.payload.lastName || null
      state.isAdmin = action.payload.isAdmin || false
    },
    updateUserEmail: (state, action) => {
      state.email = action.payload.email || null
    },
    setInitialized: (state) => {
      state.isInitialized = true
    },
  },
})

export const { setAccessToken, clearAccessToken, setUserData, setInitialized, updateUserEmail } = authSlice.actions
export default authSlice.reducer
