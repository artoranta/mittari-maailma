import { defineStore } from 'pinia'
import { sortedUniq, sortBy } from 'lodash'
import { getWeek } from 'date-fns'
import { fetchMeasurements } from './measurements'
import fiCharts from '~/locales/fi/charts.js'
import enCharts from '~/locales/en/charts.js'

Date.prototype.stdTimezoneOffset = function () {
  const jan = new Date(this.getFullYear(), 0, 1)
  const jul = new Date(this.getFullYear(), 6, 1)
  return Math.max(jan.getTimezoneOffset(), jul.getTimezoneOffset())
}

Date.prototype.isDstObserved = function () {
  return this.getTimezoneOffset() < this.stdTimezoneOffset()
}

export const formatDate = (value, reverse) => {
  return reverse ? `${value.split('.').reverse().join('-')}T00:00:00.000Z` : value.split('T')[0].split('-').reverse().join('.')
}

const price = 4.675

/**
 * Converts date object which has finnish UTC(+2 OR +3) as UTC0 to valid date object and vice versa.
 *
 * @param {Date} input
 * @param {Boolean} [reverse]
 * @param {Boolean} [convert]
 * @return {String}
 */
export const convertFinnishDateToISOString = (input, reverse = false, convert = false) => {
  // Examples.
  // Finnish UTC +2 or +3.
  // new Date(1610031289498); -2
  // new Date(1631092909080); -3 (Daylight Saving Time)
  let output
  if (typeof input === 'string' && convert) {
    input = input.replace(' ', 'T')
  }
  input = convert ? new Date(input) : input
  if (input.isDstObserved()) {
    output = new Date(input.setHours(input.getHours() - (reverse ? -3 : 3)))
  } else {
    output = new Date(input.setHours(input.getHours() - (reverse ? -2 : 2)))
  }
  return output.toISOString()
}

export const useReports = defineStore('reports', {
  state: () => ({
    measurements: [],
    start: null,
    end: null,
    groupedBy: 'day', //hour, day, week, month
    merged: false,
    valueType: 'consumption', //cost
  }),
  getters: {
    rows(state) {
      return sortBy(Object.values(state.measurements.reduce((acc, cur) => {
        const name = state.merged ? 'Vedenkulutus' : cur.name || cur.id
        const timestamp = convertFinnishDateToISOString(new Date(cur.timestamp), true)
        const date = {
          hour: timestamp.slice(11, 13),
          day: formatDate(timestamp),
          week: `${formatDate(timestamp).slice(3, 10)} (vko ${getWeek(new Date(cur.timestamp))})`,
          month: formatDate(timestamp).slice(3, 10),
        }[state.groupedBy]
        const id = {
          hour: `${cur.id}-${formatDate(timestamp)}`,
          day: cur.id,
          week: cur.id,
          month: cur.id,
        }[state.groupedBy]
        const value = this.valueType === 'consumption' ? Number.parseFloat(cur.total_m3) : Number.parseFloat(cur.total_m3) * price
        if (!Object.hasOwnProperty.call(acc, name)) {
          acc[name] = {}
        }
        if (!Object.hasOwnProperty.call(acc[name], date)) {
          acc[name][date] = {
            name,
            date,
            data: { [id]: [] },
          }
        }
        if (!Object.hasOwnProperty.call(acc[name][date].data, id)) {
          acc[name][date].data[id] = []
        }
        acc[name][date].data[id].push([
          timestamp,
          value,
        ])
        return acc
      }, {})).map(o => Object.values(o)).flat().map(row => ({
        ...row,
        range: Object.values(row.data).length > 2 ? Object.values(Object.entries(row.data).reduce((acc, entry) => {
          const _id = entry[0].split('-')[0]
          if (!Object.hasOwnProperty.call(acc, _id)) {
            acc[_id] = {
              data: [],
            }
          }
          acc[_id].data.push(...entry[1])
          return acc
        }, {})).map(i => i.data).map(d => [
          Math.min(...d.map(([_ts, vl]) => vl).filter(v => v !== null)),
          Math.max(...d.map(([_ts, vl]) => vl).filter(v => v !== null)),
        ].join(' → ')).join(', ') : Object.values(row.data).map(d => [
          Math.min(...d.map(([_ts, vl]) => vl).filter(v => v !== null)),
          Math.max(...d.map(([_ts, vl]) => vl).filter(v => v !== null)),
        ].join(' → ')).join(', '),
        consumption: Object.values(row.data).map(d => (Math.max(...d.map(([_ts, vl]) => vl).filter(v => v !== null)) - Math.min(...d.map(([_ts, vl]) => vl).filter(v => v !== null)))).reduce((partialSum, a) => partialSum + a, 0).toFixed(3),
        count: Object.values(row.data).map(d => d.length).reduce((partialSum, a) => partialSum + a, 0),
        data: undefined,
      })), 'date')
    },
    options(state) {
      const categories = sortedUniq((state.rows || []).map(d => d.date)).map(c => c.toString()[0] === '0' ? c.toString().slice(1, c.length) : c)
      return {
        chart: {
          stacked: false,
          zoom: {
            enabled: false,
          },
          height: 350,
          type: 'bar',
          locales: [
            fiCharts._charts.lang,
            enCharts._charts.lang,
          ],
          defaultLocale: 'fi',
        },
        dataLabels: {
          enabled: categories.length < 4,
        },
        xaxis: {
          categories,
        },
      }
    },
    series(state) {
      return Object.values(state.rows.reduce((acc, { name, consumption }) => {
        if (!Object.hasOwnProperty.call(acc, name)) {
          acc[name] = {
            name,
            data: [],
            color: name === 'lämmin' ? '#ff3d36' : '#52a1fe',
          }
        }
        acc[name].data.push(consumption)
        return acc
      }, {}))
    },
  },
  actions: {
    async getRows(start, end) {
      this.start = start
      this.end = end
      this.measurements = await fetchMeasurements(start, end)
    },
    async setGroupedBy(value) {
      this.groupedBy = value
    },
    async setMerged(value) {
      this.merged = value
    },
    async setValueType(value) {
      this.valueType = value
    },
  },
})
