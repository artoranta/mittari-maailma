import { defineStore } from 'pinia'
import { mande } from 'mande'
import { fi } from 'date-fns/locale'
import { setDefaultOptions } from 'date-fns'
import { useMeasurements, fetchMeasurements } from './measurements'
import { initializeApp } from 'firebase/app'
import { getAuth, onAuthStateChanged, setPersistence, browserLocalPersistence } from 'firebase/auth'

const firebaseConfig = {
  apiKey: "AIzaSyD4OKFodCl19-HJ-BblEE_4hRWlE0qXIHU", // Public, not secret.
  authDomain: "mittari-maailma.firebaseapp.com",
  databaseURL: "https://mittari-maailma-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "mittari-maailma",
  storageBucket: "mittari-maailma.firebasestorage.app",
  messagingSenderId: "919189723518",
  appId: "1:919189723518:web:19071e8307749f346d3b2f"
}

const app = initializeApp(firebaseConfig)

const initialState = {
  encryptionKey: !process.client ? undefined : window.localStorage.getItem('encryptionKey'),
  url: !process.client ? undefined : firebaseConfig.databaseURL,
  token: !process.client ? undefined : window.localStorage.getItem('token'),
  mockData: !process.client ? undefined : window.localStorage.getItem('mockData') || '0',
  reportDataType: !process.client ? undefined : window.localStorage.getItem('reportDataType') || 'water',
  chartDataType: !process.client ? undefined : window.localStorage.getItem('chartDataType') || 'water',
}

export const decryptData = async (encryptedData, base64Key, base64Iv) => {
  const key = await crypto.subtle.importKey(
    'raw',
    Uint8Array.from(atob(base64Key), c => c.charCodeAt(0)),
    'AES-CBC',
    false,
    [
      'decrypt',
    ]
  )

  const iv = Uint8Array.from(atob(base64Iv), c => c.charCodeAt(0))
  const encryptedBytes = Uint8Array.from(atob(encryptedData), c => c.charCodeAt(0))
  const decryptedBuffer = await crypto.subtle.decrypt({
    name: 'AES-CBC',
    iv,
  }, key, encryptedBytes)
  return new TextDecoder().decode(decryptedBuffer)
}

let tokenPromise = null

export const useMain = defineStore('main', {
  state: () => ({
    loading: [],
    timestamp: new Date().toISOString(),
    encryptionKey: initialState.encryptionKey,
    url: initialState.url,
    token: initialState.token,
    errorMessage: null,
    user: null,
    authUser: null,
    locale: 'fi',
    unsubAuth: null,
    mockData: initialState.mockData,
    reportDataType: initialState.reportDataType,
    chartDataType: initialState.chartDataType,
  }),
  getters: {
    isLoggedIn(state) {
      return state.encryptionKey && state.token
    },
    isAuthenticated(state) {
      return !!state.authUser
    },
    firebaseConfig() {
      return firebaseConfig
    }
  },
  actions: {
    async initAuth() {
      const auth = getAuth(app)

      await setPersistence(auth, browserLocalPersistence)

      // avoid multiple listeners
      if (this.unsubAuth) return

      this.unsubAuth = onAuthStateChanged(auth, (user) => {
        if (user) {
          this.setAuthUser(user)
        } else {
          this.setAuthUser(null)
        }
        this.stopLoading('auth')
      })
    },
    startLoading(value) {
      this.loading.push(value)
    },
    stopLoading(value) {
      this.loading = this.loading.filter(i => i !== value)
    },
    setAuthUser(value) {
      this.authUser = value
    },
    setMockData(value, fetchMeasuements) {
      const mockData = value === '1' ? '1' : '0'
      this.mockData = mockData
      window.localStorage.setItem('mockData', mockData)
      if (fetchMeasuements) {
        const measurements = useMeasurements()
        measurements.getLatest()
      }
    },
    setDataType(value, stateName) {
      const dataType = value === 'electricity' ? 'electricity' : 'water'
      if (stateName === 'chart') {
        this.chartDataType = dataType
        window.localStorage.setItem('chartDataType', dataType)
      } else if (stateName === 'report') {
        this.reportDataType = dataType
        window.localStorage.setItem('reportDataType', dataType)
      }
    },
    async getUser () {
      await setDefaultOptions({ locale: fi })
      if (this.mockData === '1') {
        this.user = { username: 'Asunto X', timestamp: new Date().toISOString(), demo: true }
      }
      const token = await this.getFirebaseToken()
      const api = mande(this.url)
      const path = `/users.json?auth=${token}`
      const users = await api.get(path)
      for (let i = 0; i < Object.values(users || {}).length; i++) {
        try {
          const user = Object.values(users)[i]
          const decryptedUser = await decryptData(user.encryptedData, this.encryptionKey, user.iv)
          this.user = JSON.parse(decryptedUser)
        } catch (err) {
          console.log(err.message)
        }
      }
    },
    getFirebaseToken() {
      const user = this.authUser
      if (!user && this.token) {
        return this.token
      } else if (!user) {
        return null
      }

      // avoid multiple simultaneous refresh calls
      if (!tokenPromise) {
        tokenPromise = user.getIdToken().then((token) => {
          this.token = token
          window.localStorage.setItem('token', this.token)
          tokenPromise = null
          return token
        })
      }

      return tokenPromise
    },
    async loginWithToken(encryptionKey, callback) {
      try {
        this.user = null
        this.startLoading('login')
        this.encryptionKey = encryptionKey || this.encryptionKey
        if (this.encryptionKey === 'demo') {
          this.setMockData('1')
        }
        const measurements = useMeasurements()
        await this.getUser()
        if (!this.user) {
          this.encryptionKey = null
          this.errorMessage = 'Invalid credentials'
          this.stopLoading('login')
        } else {
          if (process.client) {
            window.localStorage.setItem('encryptionKey', this.encryptionKey)
          }
          await measurements.getLatest()
          this.stopLoading('login')
          callback()
        }
      } catch (err) {
        console.log(err.message)
        this.encryptionKey = null
        this.errorMessage = err.message
        this.stopLoading('login')
      }
    },
    logout() {
      if (process.client) {
        window.localStorage.removeItem('encryptionKey')
        window.localStorage.removeItem('url')
        window.localStorage.removeItem('token')
        const auth = getAuth()
        auth.signOut()
      }
      this.errorMessage = null
      this.encryptionKey = null
      this.user = null
      this.token = null
      this.authUser = null
      this.latest = []
      this.measurements = []
    },
  },
})
