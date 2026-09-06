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

const quarterHourTimestamp = timestamp => {
  const date = new Date(timestamp)
  date.setSeconds(0, 0)
  date.setMinutes(Math.round(date.getMinutes() / 15) * 15)
  return date.getTime()
}

const valueFields = {
  'water': 'total_m3',
  'electricity': 'total_kwh',
}

let mockLatestInterval = null
const mockLatestValues = new Map()
const mockLatestIntervalMs = 5000
const mockConsumptionPerMinute = {
  electricity: 0.061,
  water: 0.010,
}

export const convertMeasurement = ({ id, media, meter, timestamp, ...measurement }) => ({
  id,
  media,
  meter,
  name: names(id, media) || '',
  [valueFields[media]]: (Math.round((measurement[valueFields[media]] + (offsets[id] || 0)) * 1000) / 1000).toFixed(3),
  timestamp,
})

const generateMockData = (start, end, dataType, hours = 'all') => {
  const data = []
  const current = new Date(start)
  let total1 = 0
  let total2 = 0

  // Pattern configuration based on dataType
  let activePeriodReadings
  let pausePeriodReadings

  if (dataType === 'electricity') {
    // Electricity: 4 hours active (16 x 15min) + 24 hours pause (96 x 15min)
    activePeriodReadings = 16 // 4 hours
    pausePeriodReadings = 96 // 24 hours
  } else {
    // Water: 30 min active (2 x 15min) + 60 min pause (4 x 15min)
    activePeriodReadings = 2 // 30 minutes
    pausePeriodReadings = 8 // 60 minutes
  }

  const cycleLength = activePeriodReadings + pausePeriodReadings
  let readingCount1 = 0
  let readingCount2 = 0

  const isActiveHour = (date) => {
    const hour = date.getHours()
    if (hours === 'day') return hour >= 6 && hour < 22
    if (hours === 'night') return hour >= 22 || hour < 6
    return true
  }

  while (current.getTime() <= end.getTime()) {
    if (isActiveHour(current)) {
      // Meter 1 pattern
      const posInCycle1 = readingCount1 % cycleLength
      if (posInCycle1 < activePeriodReadings) {
        // Active period: increment with small variation
        total1 += (Math.random() * 0.3 + 0.5) // 0.1 to 0.4 per reading
      }
      // else: pause period - no increment

      // Meter 2 pattern
      const posInCycle2 = readingCount2 % cycleLength
      if (posInCycle2 < activePeriodReadings) {
        // Active period: increment with small variation
        total2 += (Math.random() * 0.3 + 0.5) // 0.1 to 0.4 per reading
      }
      // else: pause period - no increment

      readingCount1++
      readingCount2++
    }

    data.push({ id: '01234567', timestamp: current.toISOString(), media: dataType, [valueFields[dataType]]: total1.toFixed(3) })
    data.push({ id: '07654321', timestamp: current.toISOString(), media: dataType, [valueFields[dataType]]: total2.toFixed(3) })

    current.setMinutes(current.getMinutes() + 15)
  }
  return data
}

export const fetchMeasurements = async (start, end, dataType) => {
  const main = useMain()
  if (main.mockData === '1') {
    return Object.values(generateMockData(start, end, dataType, dataType === 'water' ? 'day' : 'night')).map(convertMeasurement)
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

const seriesFromMeasurements = (start) => (acc, { name, media, timestamp, ...measurement }) => {
  const value = Number.parseFloat(measurement[valueFields[media]])
  if (!Object.hasOwnProperty.call(acc, name)) {
    acc[name] = {
      name,
      data: [
        [
          new Date(start).getTime(),
          null,
        ],
      ],
      color: colors[name] || '#52a1fe',
    }
  }
  acc[name].data.push([
    media === 'electricity' ? quarterHourTimestamp(timestamp) : new Date(timestamp).getTime(),
    value,
  ])
  return acc
}

const annotationsFromSeries = s => {
  const annotation = {
    yaxis: [],
    xaxis: [],
  }
  const values = s.data.map(([_ts, vl]) => vl).filter(v => v !== null)
  const peak = Math.max(...values)
  const isWater = s.name.includes('lämmin') || s.name.includes('kylmä')
  const labelValue = isWater ? peak - Math.min(...values) : peak
  annotation.yaxis.push({
    y: peak,
    borderColor: '#cecece',
    borderWidth: 2,
    label: {
      text: labelValue.toFixed(3) + (isWater ? ' m³' : 'kWh'),
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
}

const intervalSeries = (series) => series.map(([timestamp, value], index) => {
  const nextValue = series[index + 1]?.[1]
  return [
    timestamp,
    value === null || nextValue === null || nextValue === undefined
      ? null
      : nextValue - value,
  ]
})

export const useMeasurements = defineStore('measurements', {
  state: () => ({
    latest: [],
    reportMeasurements: [],
    chartMeasurements: [],
    reportStart: null,
    reportEnd: null,
    chartStart: null,
    chartEnd: null,
    timestamp: new Date().toISOString(),
  }),
  getters: {
    // Series for charts page
    series(state) {
      const measurements = useMeasurements()
      const baseSeries = Object.values(state.chartMeasurements.reduce(seriesFromMeasurements(state.chartStart), {}))
      return measurements.chartDataType === 'electricity'
        ? baseSeries.map(s => ({
          ...s,
          data: intervalSeries(s.data).map(([timestamp, value]) => [
            timestamp,
            value === null ? null : value.toFixed(3),
          ]),
        }))
        : baseSeries
    },
    annotations(state) {
      return Object.fromEntries(state.series.map(annotationsFromSeries))
    },
  },
  actions: {
    startMockLatestSubscription() {
      if (mockLatestInterval) return

      this.latest.forEach(measurement => {
        mockLatestValues.set(`${measurement.media}:${measurement.id}`, Number.parseFloat(measurement[valueFields[measurement.media]]))
      })
      mockLatestInterval = window.setInterval(() => {
        this.latest = this.latest.map(measurement => {
          const key = `${measurement.media}:${measurement.id}`
          const previousValue = mockLatestValues.get(key) ?? Number.parseFloat(measurement[valueFields[measurement.media]])
          const increment = (mockConsumptionPerMinute[measurement.media] || 0) * (mockLatestIntervalMs / 60000)
          const value = previousValue + increment
          mockLatestValues.set(key, value)
          return {
            ...measurement,
            [valueFields[measurement.media]]: value.toFixed(3),
            timestamp: new Date().toISOString(),
          }
        })
        this.timestamp = new Date().toISOString()
      }, mockLatestIntervalMs)
    },
    stopMockLatestSubscription() {
      if (mockLatestInterval) {
        window.clearInterval(mockLatestInterval)
        mockLatestInterval = null
      }
      mockLatestValues.clear()
    },
    async updateLatest(latest) {
      const main = useMain()
      try {
        this.latest = (await Promise.all(Object.values(latest || {})
          .map(async value => JSON.parse(await decryptData(value.encryptedData, main.encryptionKey, value.iv))))
        ).map(convertMeasurement)
        this.timestamp = new Date().toISOString()
      } catch (err) {
        console.log(err.message)
      }
    },
    async getLatest() {
      const main = useMain()
      if (main.mockData === '1') {
        /*
        {
          "id": "01234567",
          "media": "electricity",
          "meter": "em111",
          "name": "sähkö",
          "total_kwh": "137.120",
          "power_kw": "2.340",
          "timestamp": new Date().toISOString()
        }
        */
        this.latest = Object.values([
          { id: '01234567', timestamp: new Date().toISOString(), media: 'water', total_m3: Math.random().toFixed(3) },
          { id: '07654321', timestamp: new Date().toISOString(), media: 'water', total_m3: Math.random().toFixed(3) },
          { id: '01234567', timestamp: new Date().toISOString(), media: 'electricity', total_kwh: Math.random().toFixed(3) * 10, power_kw: 0 },
          { id: '07654321', timestamp: new Date().toISOString(), media: 'electricity', total_kwh: Math.random().toFixed(3) * 10, power_kw: 0 }
        ].map(convertMeasurement))
        this.startMockLatestSubscription()
        return this.latest
      }
      try {
        main.startLoading('latest')
        const token = await main.getFirebaseToken()
        const api = mande(main.url)
        const path = `/latest.json?auth=${token}`
        const latest = await api.get(path)
        await this.updateLatest(latest)
        main.stopLoading('latest')
      } catch (err) {
        console.log(err.message)
        main.stopLoading('latest')
      }
    },
    async getMeasurements(start, end, stateName = 'reportMeasurements', dataType) {
      if (stateName === 'reportMeasurements') {
        this.reportMeasurements = await fetchMeasurements(start, end, dataType)
        if (start && end) {
          this.reportStart = start
          this.reportEnd = end
        } else {
          this.reportStart = null
          this.reportEnd = null
        }
      } else if (stateName === 'chartMeasurements') {
        this.chartMeasurements = await fetchMeasurements(start, end, dataType)
        this.chartDataType = dataType
        if (start && end) {
          this.chartStart = start
          this.chartEnd = end
        } else {
          this.chartStart = null
          this.chartEnd = null
        }
      }
    },
  },
})
