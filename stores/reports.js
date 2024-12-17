import { defineStore } from 'pinia'
import { uniq } from 'lodash'
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
    end: null
  }),
  getters: {
    rows(state) {
      return Object.values(state.measurements.reduce((acc, cur) => {
        const name = cur.name || cur.id
        const timestamp = convertFinnishDateToISOString(new Date(cur.timestamp), true)
        const date = formatDate(timestamp)
        const value = Number.parseFloat(cur.total_m3)
        if (!Object.hasOwnProperty.call(acc, name)) {
          acc[name] = {}
        }
        if (!Object.hasOwnProperty.call(acc[name], date)) {
          acc[name][date] = {
            name,
            date,
            data: [
              [
                new Date(state.start).getTime(),
                null,
              ],
            ],
          }
        }
        acc[name][date].data.push([timestamp,
          value,
        ])
        return acc
      }, {})).map(o => Object.values(o)).flat().map(row => ({
        ...row,
        range: [
          Math.min(...row.data.map(([_ts, vl]) => vl).filter(v => v !== null)),
          Math.max(...row.data.map(([_ts, vl]) => vl).filter(v => v !== null)),
        ].join(' → '),
        consumption: (Math.max(...row.data.map(([_ts, vl]) => vl).filter(v => v !== null)) - Math.min(...row.data.map(([_ts, vl]) => vl).filter(v => v !== null))).toFixed(3),
        count: row.data.length,
        data: undefined,
      }))
    },
    options(state) {
      const categories = uniq((state.rows || []).map(d => d.date))
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
          enabled: true,
        },
        xaxis: {
          categories,
        },
      }
    },
  },
  actions: {
    async getRows(start, end) {
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
