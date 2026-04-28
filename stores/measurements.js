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

    data.push({ id: '01234567', timestamp: current.toISOString(), media: dataType, total_m3: total1.toFixed(3) })
    data.push({ id: '07654321', timestamp: current.toISOString(), media: dataType, total_m3: total2.toFixed(3) })

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

const seriesFromMeasurements = (start) => (acc, { name, timestamp, total_m3 }) => {
  const value = Number.parseFloat(total_m3)
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
    new Date(timestamp).getTime(),
    value,
  ])
  return acc
}

const annotationsFromSeries = s => {
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
      text: dff.toFixed(3) + (s.name.includes('lämmin') || s.name.includes('kylmä') ? ' m³' : 'kWh'),
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

const normalizeSeries = (series) => {
  const data = [...series]
  if (!data.length) return [];

  let result = [];
  let baseline = data[0][1]; // initial baseline
  let prevValue = data[0][1];

  for (let i = 0; i < data.length; i++) {
    const [timestamp, value] = data[i];

    // if same as previous → reset baseline
    if (i > 0 && value === prevValue) {
      baseline = value;
      result.push([data[i - 1][0], 0]);
      result.push([timestamp, 0]);
    } else {
      result.push([timestamp, value - baseline]);
    }

    prevValue = value;
  }

  return result;
}

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
        ? baseSeries.map(s => ({ ...s, data: normalizeSeries(s.data).map(([ts, vl]) => [ts, vl.toFixed(3)]) }))
        : baseSeries
    },
    annotations(state) {
      return Object.fromEntries(state.series.map(annotationsFromSeries))
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
