import { defineStore } from 'pinia'
import { mande } from 'mande'

const initialState = {
  encryptionKey: !process.client ? undefined : window.localStorage.getItem('encryptionKey'),
  url: !process.client ? undefined : window.localStorage.getItem('url')
}

const base64regex = /^([0-9a-zA-Z+/]{4})*(([0-9a-zA-Z+/]{2}==)|([0-9a-zA-Z+/]{3}=))?$/;

async function decryptData(encryptedData, base64Key, base64Iv) {
  const key = await crypto.subtle.importKey(
    'raw',
    Uint8Array.from(atob(base64Key), c => c.charCodeAt(0)),
    'AES-CBC',
    false,
    ['decrypt']
  );

  const iv = Uint8Array.from(atob(base64Iv), c => c.charCodeAt(0));
  const encryptedBytes = Uint8Array.from(atob(encryptedData), c => c.charCodeAt(0));
  const decryptedBuffer = await crypto.subtle.decrypt(
    { name: 'AES-CBC', iv },
    key,
    encryptedBytes
  );

  return new TextDecoder().decode(decryptedBuffer);
}

export const useMain = defineStore('main', {
  state: () => ({
    loading: [],
    measurements: [],
    timestamp: new Date().toISOString(),
    encryptionKey: initialState.encryptionKey,
    url: initialState.url,
    errorMessage: null,
    user: null
  }),
  getters: {
    isLoggedIn(state) {
      return state.url && state.encryptionKey
    },
  },
  actions: {
    startLoading(value) {
      this.loading.push(value)
    },
    stopLoading(value) {
      this.loading = this.loading.filter(i => i !== value)
    },
    async getUser () {
      const api = mande(atob(this.url))
      const path = `/users.json`;
      const users = await api.get(path)
      for (let i = 0; i < Object.values(users).length; i++) {
        try {
          const user = Object.values(users)[i]
          const decryptedUser = await decryptData(user.encryptedData, this.encryptionKey, user.iv)
          this.user = JSON.parse(decryptedUser)
        } catch (err) {
          console.log(err.message)
        }
      }
    },
    async loginWithToken (url, encryptionKey, callback) {
      try {
        this.user = null
        this.startLoading('login')
        this.encryptionKey = encryptionKey || this.encryptionKey
        this.url = url || this.url
        const isValidBase64 = base64regex.test(this.url)
        if (isValidBase64) {
          const main = useMain()
          await main.getUser()
        }
        if (!this.user) {
          this.encryptionKey = null
          this.errorMessage = 'Invalid credentials'
        } else {
          if (process.client) {
            window.localStorage.setItem('encryptionKey', this.encryptionKey)
            window.localStorage.setItem('url', this.url)
          }
          callback()
        }
        this.stopLoading('login')
      } catch (err) {
        console.log(err.message)
        this.encryptionKey = null
        this.errorMessage = err.message
        this.stopLoading('login')
      }
    },
    logout () {
      if (process.client) {
        window.localStorage.removeItem('encryptionKey');
        window.localStorage.removeItem('url');
      }
      this.errorMessage = null
      this.encryptionKey = null
      this.url = null
      this.user = null
      this.measurements = {}
    },
    async getMeasurements() {
      try {
        this.startLoading('measurements')
        const api = mande(atob(this.url))
        const path = `/measurements.json`;
        const measurements = await api.get(path)
        this.measurements = []
        const timestamps = {}
        for (let i = 0; i < Object.values(measurements).length; i++) {
          try {
            const measurement = Object.values(measurements)[i]
            const decryptedMeasurement = JSON.parse(await decryptData(measurement.encryptedData, this.encryptionKey, measurement.iv))
            if (!Object.hasOwnProperty.call(timestamps, decryptedMeasurement.id)) {
              timestamps[decryptedMeasurement.id] = decryptedMeasurement
              this.measurements.push(decryptedMeasurement)
            } else if (new Date(decryptedMeasurement.timestamp) > new Date(timestamps[decryptedMeasurement.id].timestamp)){
              timestamps[decryptedMeasurement.id] = decryptedMeasurement
            }
          } catch (err) {
            console.log(err.message)
          }
        }
        this.measurements = Object.values(timestamps)
        this.timestamp = new Date().toISOString()
        this.stopLoading('measurements')
      } catch (err) {
        console.log(err.message)
        this.stopLoading('measurements')
      }
    }
  }
})
