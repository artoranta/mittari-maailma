import { defineStore } from 'pinia'
import { mande } from 'mande'
import { useMain, decryptData } from './main'

const offsets = {
  '06696698': 82.502,
  '06697364': 176.820,
}

const names = {
  '06696698': 'lämmin',
  '06697364': 'kylmä',
}

export const convertMeasurement = ({ id, media, meter, total_m3, timestamp }) => ({
  id,
  media,
  meter,
  name: names[id] || '',
  total_m3: (Math.round((total_m3 + (offsets[id] || 0)) * 1000) / 1000).toFixed(3),
  timestamp,
})

export const fetchMeasurements = async (start, end) => {
  const main = useMain()
  try {
    main.startLoading('measurements')
    const api = mande(atob(main.url))
    const path = start && end ? encodeURI(`/measurements.json?orderBy="timestamp"&startAt="${new Date(start).toISOString()}"&endAt="${new Date(end).toISOString()}"`) : '/measurements.json'
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
            color: name === 'lämmin' ? '#ff3d36' : '#52a1fe',
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
      try {
        main.startLoading('latest')
        const api = mande(atob(main.url))
        const path = `/latest.json`
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
