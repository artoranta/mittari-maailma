<template>
  <UCard
    v-if="isLoggedIn"
    class="charts-card"
  >
    <div
      v-if="isLoading"
      class="spinner-wrapper"
    >
      <UIcon
        name="i-svg-spinners:180-ring"
        class="spinner w-10 h-10"
      />
    </div>
    <apexchart
      v-if="days.length && !noFullHistory"
      :height="350"
      :options="getOptions(uniq((days || []).map(d => d.date)))"
      :series="Object.values(days.reduce((acc, { name, consumption }) => {
        if (!Object.hasOwnProperty.call(acc, name)) {
          acc[name] = {
            name,
            data: [],
            color: name === 'lämmin' ? '#ff3d36' : '#52a1fe'
          };
        }
        acc[name].data.push(consumption);
        return acc;
      }, {}))"
    />
    <UTable
      :columns="columns"
      :rows="days"
    />
  </UCard>
</template>

<script>
import { uniq } from 'lodash'
import { mapState } from 'pinia'
import fiCharts from "~/locales/fi/charts.js"
import enCharts from "~/locales/en/charts.js"

Date.prototype.stdTimezoneOffset = function () {
  const jan = new Date(this.getFullYear(), 0, 1)
  const jul = new Date(this.getFullYear(), 6, 1)
  return Math.max(jan.getTimezoneOffset(), jul.getTimezoneOffset())
}

Date.prototype.isDstObserved = function () {
  return this.getTimezoneOffset() < this.stdTimezoneOffset()
}

const formatDate = (value, reverse) => {
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
const convertFinnishDateToISOString = (input, reverse = false, convert = false) => {
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

export default {
  name: 'Reports',
  components: {
  },
  data() {
    return {
      columns: [
        {
          key: 'date',
          label: this.$t('_reports.date'),
          sortable: true,
        },
        {
          key: 'name',
          label: this.$t('_reports.name'),
          sortable: true,
        },
        ...(this.$device.isMobile ? [] : [
          {
            key: 'range',
            label: this.$t('_reports.range'),
          },
        ]),
        {
          key: 'consumption',
          label: this.$t('_reports.consumption'),
          sortable: true,
        },
        ...(this.$device.isMobile ? [] : [
          {
            key: 'count',
            label: this.$t('_reports.count'),
          },
        ]),
      ],
    }
  },
  computed: {
    ...mapState(useMain, {
      isLoggedIn: (store) => store.isLoggedIn,
      isLoading: (store) => !!store.loading.length,
      noFullHistory: (store) => !!store.start && !!store.end,
      days: (store) => Object.values(store.measurements.reduce((acc, cur) => {
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
            data: [],
          }
        }
        acc[name][date].data.push([timestamp,
          value,
        ])
        return acc
      }, {})).map(o => Object.values(o)).flat().map(row => ({
        ...row,
        range: [
          Math.min(...row.data.map(([_ts, vl]) => vl)),
          Math.max(...row.data.map(([_ts, vl]) => vl)),
        ].join(' → '),
        consumption: (Math.max(...row.data.map(([_ts, vl]) => vl)) - Math.min(...row.data.map(([_ts, vl]) => vl))).toFixed(3),
        count: row.data.length,
        data: undefined,
      })),
    }),
  },
  watch: {},
  async created () {
    if (this.isLoggedIn && (this.noFullHistory || this.days.length === 0)) {
      await this.getMeasurements()
    }
  },
  mounted() {},
  beforeUnmount () {},
  methods: {
    async getMeasurements(start, end) {
      try {
        const main = useMain()
        await main.getMeasurements(start, end)
      } catch (err) {
        console.log(err.message)
      }
    },
    formatDate (...args) {
      return formatDate(...args)
    },
    uniq (array) {
      return uniq(array)
    },
    getOptions(categories) {
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
}

</script>

<style>
.charts-card {
  min-height: 450px;
  width: 100%;
}
.spinner-wrapper {
  position: absolute;
  top: 0;
  left: 0;
  height: 100%;
  width: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
}
.spinner {
  color: #e5e5e5;
}
</style>
