import { defineStore } from 'pinia'
import { mande } from 'mande'
import { sub } from 'date-fns'

const initialState = {
  encryptionKey: !process.client ? undefined : window.localStorage.getItem('encryptionKey'),
  url: !process.client ? undefined : window.localStorage.getItem('url')
}

const offsets = {
  '06696698': 82.502,
  '06697364': 176.820
}

const names = {
  '06696698': 'lämmin',
  '06697364': 'kylmä'
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

const convertMeasurement = ({ id, media, meter, total_m3, timestamp }) => ({
  id,
  media,
  meter,
  name: names[id] || '',
  total_m3: (Math.round((total_m3 + (offsets[id] || 0)) * 1000) / 1000).toFixed(3),
  timestamp
})


export const useMain = defineStore('main', {
  state: () => ({
    loading: [],
    latest: [],
    measurements: [],
    timestamp: new Date().toISOString(),
    encryptionKey: initialState.encryptionKey,
    url: initialState.url,
    errorMessage: null,
    user: null,
    locale: 'fi'
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
        const main = useMain()
        if (isValidBase64) {
          await main.getUser()
        }
        if (!this.user) {
          this.encryptionKey = null
          this.errorMessage = 'Invalid credentials'
          this.stopLoading('login')
        } else {
          if (process.client) {
            window.localStorage.setItem('encryptionKey', this.encryptionKey)
            window.localStorage.setItem('url', this.url)
          }
          await main.getLatest()
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
    logout () {
      if (process.client) {
        window.localStorage.removeItem('encryptionKey');
        window.localStorage.removeItem('url');
      }
      this.errorMessage = null
      this.encryptionKey = null
      this.url = null
      this.user = null
      this.latest = []
      this.measurements = []
    },
    async getLatest() {
      try {
        this.startLoading('latest')
        const api = mande(atob(this.url))
        const path = `/latest.json`;
        const latest = await api.get(path)
        try {
          this.latest = (await Promise.all(Object.values(latest)
            .map(async value => JSON.parse(await decryptData(value.encryptedData, this.encryptionKey, value.iv)))))
            .map(convertMeasurement)
        } catch (err) {
          console.log(err.message)
        }
        this.timestamp = new Date().toISOString()
        this.stopLoading('latest')
      } catch (err) {
        console.log(err.message)
        this.stopLoading('latest')
      }
    },
    async getMeasurements(start, end) {
      try {
        this.startLoading('measurements')
        const api = mande(atob(this.url))
        const path = start && end ? encodeURI(`/measurements.json?orderBy="timestamp"&startAt="${new Date(start).toISOString()}"&endAt="${new Date(end).toISOString()}"`) : '/measurements.json';
        const measurements = await api.get(path)
        this.measurements = (await Promise.all(Object.values(measurements)
          .map(async value => JSON.parse(await decryptData(value.encryptedData, this.encryptionKey, value.iv)))))
          .map(convertMeasurement).sort((a, b) => {
            // Convert the timestamps to Date objects
            const dateA = new Date(a.timestamp);
            const dateB = new Date(b.timestamp);

            // Compare the dates and return either -1, 0, or 1
            // depending on whether dateA is before, the same as,
            // or after dateB
            if (dateA < dateB) return -1;
            if (dateA > dateB) return 1;
            return 0;
          });
        this.timestamp = new Date().toISOString()
        this.stopLoading('measurements')
      } catch (err) {
        console.log(err.message)
        this.stopLoading('measurements')
      }
    }
  }
})
