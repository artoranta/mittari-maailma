import { defineStore } from 'pinia'
import { mande } from 'mande'
import { useMain, decryptData } from './main'

const offsets = {
  '06696698': 82.502,
  '06697364': 176.820,
}

const names = (id, media) => {
  return media === 'water' ? {
    '01234567': 'lämmin',
    '07654321': 'kylmä',
    '06696698': 'lämmin',
    '06697364': 'kylmä',
  }[id] : {
    '01234567': 'autonlataus',
    '07654321': 'varasto',
  }[id]
}

const colors = {
  'lämmin': '#ff3d36',
  'kylmä': '#52a1fe',
  'autonlataus': '#4ada80',
  'varasto': '#f5f95c',
}

export const convertMeasurement = ({ id, media, meter, total_m3, timestamp }) => ({
  id,
  media,
  meter,
  name: names(id, media) || '',
  total_m3: (Math.round((total_m3 + (offsets[id] || 0)) * 1000) / 1000).toFixed(3),
  timestamp,
})

const generateMockData = (start, end, dataType, hours = 'all') => {
  const data = []
  const current = new Date(start)
  let total1 = 0
  let total2 = 0
  let nextIncrement1 = Math.floor(Math.random() * (120 - 15 + 1)) + 15
  let nextIncrement2 = Math.floor(Math.random() * (120 - 15 + 1)) + 15
  let minutesElapsed1 = 0
  let minutesElapsed2 = 0
  
  const isActiveHour = (date) => {
    const hour = date.getHours()
    if (hours === 'day') return hour >= 6 && hour < 22
    if (hours === 'night') return hour >= 22 || hour < 6
    return true
  }
  
  while (current.getTime() <= end.getTime()) {
    if (isActiveHour(current)) {
      if (minutesElapsed1 >= nextIncrement1) {
        total1 += Math.random() * 1
        minutesElapsed1 = 0
        nextIncrement1 = Math.floor(Math.random() * (120 - 15 + 1)) + 15
      }
      if (minutesElapsed2 >= nextIncrement2) {
        total2 += Math.random() * 1
        minutesElapsed2 = 0
        nextIncrement2 = Math.floor(Math.random() * (120 - 15 + 1)) + 15
      }
      minutesElapsed1 += 15
      minutesElapsed2 += 15
    }
    
    data.push({ id: '01234567', timestamp: current.toISOString(), media: dataType, total_m3: total1.toFixed(3) })
    data.push({ id: '07654321', timestamp: current.toISOString(), media: dataType, total_m3: total2.toFixed(3) })
    
    current.setMinutes(current.getMinutes() + 15)
  }
  return data
}

export const fetchMeasurements = async (start, end) => {
  const main = useMain()
  if (main.mockData === '1') {
    main.startLoading('measurements')
    const data = Object.values(generateMockData(start, end, main.dataType, main.dataType === 'water' ? 'day' : 'night')).map(convertMeasurement)
    main.stopLoading('measurements')
    return data
  }
  try {
    main.startLoading('measurements')
    const token = await main.getFirebaseToken()
    const api = mande(main.url)
    const path = start && end ? encodeURI(`/measurements.json?orderBy="timestamp"&startAt="${new Date(start).toISOString()}"&endAt="${new Date(end).toISOString()}"&auth=${token}`) : `/measurements.json?auth=${token}`
    const measurements = await api.get(path)
    main.stopLoading('measurements')
    return (await Promise.all(Object.values(measurements)
      .map(async value => JSON.parse(await decryptData(value.encryptedData, main.encryptionKey, value.iv)))))
      .map(convertMeasurement).sort((a, b) => {
        // Convert the timestamps to Date objects
        const dateA = new Date(a.timestamp)
        const dateB = new Date(b.timestamp)

        // Compare the dates and return either -1, 0, or 1
        // depending on whether dateA is before, the same as,
        // or after dateB
        if (dateA < dateB) return -1
        if (dateA > dateB) return 1
        return 0
      })
  } catch (err) {
    console.log(err.message)
    main.stopLoading('measurements')
    return []
  }
}

export const useMeasurements = defineStore('measurements', {
  state: () => ({
    latest: [],
    measurements: [],
    start: null,
    end: null,
    timestamp: new Date().toISOString(),
  }),
  getters: {
    series(state) {
      return Object.values(state.measurements.reduce((acc, cur) => {
        const name = cur.name || cur.id
        const timestamp = new Date(cur.timestamp).getTime()
        const value = Number.parseFloat(cur.total_m3)
        if (!Object.hasOwnProperty.call(acc, name)) {
          acc[name] = {
            name,
            data: [
              [
                new Date(state.start).getTime(),
                null,
              ],
            ],
            color: colors[name] || '#52a1fe',
          }
        }
        acc[name].data.push([
          timestamp,
          value,
        ])
        return acc
      }, {}))
    },
    annotations(state) {
      return Object.fromEntries(state.series.map(s => {
        const annotation = {
          yaxis: [],
          xaxis: [],
        }
        const avg = Math.max(...s.data.map(([_ts, vl]) => vl).filter(v => v !== null))
        const dff = (Math.max(...s.data.map(([_ts, vl]) => vl).filter(v => v !== null)) - Math.min(...s.data.map(([_ts, vl]) => vl).filter(v => v !== null)))
        annotation.yaxis.push({
          y: avg,
          borderColor: '#cecece',
          borderWidth: 2,
          label: {
            text: dff.toFixed(3) + 'm³',
            position: 'left',
            textAnchor: 'right',
            offsetX: 10,
            offsetY: -5,
            style: {
              fontSize: '11px',
            },
          },
        })
        return [
          s.name,
          annotation,
        ]
      }))
    },
  },
  actions: {
    async getLatest() {
      const main = useMain()
      if (main.mockData === '1') {
        return this.latest = Object.values([
          { id: '01234567', timestamp: new Date().toISOString(), media: 'water', total_m3: Math.random().toFixed(3) },
          { id: '07654321', timestamp: new Date().toISOString(), media: 'water', total_m3: Math.random().toFixed(3) },
          { id: '01234567', timestamp: new Date().toISOString(), media: 'electricity', total_m3: Math.random().toFixed(3) * 10 }, // total_kWh
          { id: '07654321', timestamp: new Date().toISOString(), media: 'electricity', total_m3: Math.random().toFixed(3) * 10 } // total_kWh
        ].map(convertMeasurement))
      }
      try {
        main.startLoading('latest')
        const token = await main.getFirebaseToken()
        const api = mande(main.url)
        const path = `/latest.json?auth=${token}`
        const latest = await api.get(path)
        try {
          this.latest = (await Promise.all(Object.values(latest)
            .map(async value => JSON.parse(await decryptData(value.encryptedData, main.encryptionKey, value.iv)))))
            .map(convertMeasurement)
        } catch (err) {
          console.log(err.message)
        }
        this.timestamp = new Date().toISOString()
        main.stopLoading('latest')
      } catch (err) {
        console.log(err.message)
        main.stopLoading('latest')
      }
    },
    async getMeasurements(start, end) {
      this.measurements = await fetchMeasurements(start, end)
      if (start && end) {
        this.start = start
        this.end = end
      } else {
        this.start = null
        this.end = null
      }
    },
  },
})
