<template>
  <UCard
    v-if="isLoggedIn"
    class="charts-card"
  >
    <UPopover :popper="{ placement: 'bottom-start' }">
      <UButton
        icon="i-heroicons-calendar-days-20-solid"
        style="width: 100%; display: flex; justify-content: center; margin-bottom: 0.75rem;"
      >
        {{ format(selected.start, 'd MMM, yyy') }} - {{ format(selected.end, 'd MMM, yyy') }}
      </UButton>
      <template #panel="{ close }">
        <div class="flex items-center divide-x divide-gray-200 dark:divide-gray-800">
          <div class="flex flex-col py-4">
            <UButton
              v-for="(range, index) in ranges"
              :key="index"
              :label="range.label"
              color="gray"
              :disabled="isLoading"
              variant="ghost"
              class="rounded-none px-6"
              :class="[isRangeSelected(range.duration) ? 'bg-gray-100 dark:bg-gray-800' : 'hover:bg-gray-50 dark:hover:bg-gray-800/50']"
              truncate
              @click="selectRange(range.duration)"
            />
          </div>
          <DatePicker
            v-model="selected"
            locale="fi-FI"
            :columns="$device.isMobile ? 1 : 2"
            @day-click="onDayClick"
            @close="closeDatePicker(close)"
          />
        </div>
      </template>
    </UPopover>
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
      v-for="s in series"
      :key="s.name"
      :ref="s.name"
      :height="options.chart.height"
      :options="{ ...options, annotations: getAnnotations(s.name) }"
      :series="[s]"
      @dblclick="resetZoom($event, s.name)"
    />
  </UCard>
</template>

<script>
import { mapState } from 'pinia'
import { fi } from 'date-fns/locale'
import { sub, format, formatDuration, intervalToDuration } from 'date-fns'
import enCharts from '~/locales/en/charts'
import fiCharts from '~/locales/fi/charts'
import DatePicker from '~/components/DatePicker.vue'

export default {
  name: 'Charts',
  components: {
    DatePicker,
  },
  data() {
    return {
      ranges: [
        {
          label: this.$t('_charts.range.twelveHours'),
          duration: {
            hours: 12,
          },
        },
        {
          label: this.$t('_charts.range.day'),
          duration: {
            days: 1,
          },
        },
        {
          label: this.$t('_charts.range.twoDays'),
          duration: {
            days: 2,
          },
        },
        {
          label: this.$t('_charts.range.week'),
          duration: {
            days: 7,
          },
        },
        {
          label: this.$t('_charts.range.twoWeeks'),
          duration: {
            days: 14,
          },
        },
        {
          label: this.$t('_charts.range.month'),
          duration: {
            months: 1,
          },
        },
        {
          label: this.$t('_charts.range.threeMonths'),
          duration: {
            months: 3,
          },
        },
        {
          label: this.$t('_charts.range.sixMonths'),
          duration: {
            months: 6,
          },
        },
        {
          label: this.$t('_charts.range.year'),
          duration: {
            years: 1,
          },
        },
      ],
      options: {
        chart: {
          height: 350,
          type: 'line',
          locales: [
            fiCharts._charts.lang,
            enCharts._charts.lang,
          ],
          defaultLocale: 'fi',
        },
        stroke: {
          show: true,
          curve: 'straight',
          width: 2,
        },
        xaxis: {
          labels: {
            rotate: 0,
            hideOverlappingLabels: true,
            datetimeUTC: false,
          },
          type: 'datetime',
        },
        yaxis: {
          axisBorder: {
            show: true,
          },
          axisTicks: {
            show: true,
          },
        },
        grid: {
          show: true,
          strokeDashArray: 2,
          xaxis: {
            lines: {
              show: true,
            },
          },
          yaxis: {
            lines: {
              show: true,
            },
          },
        },
        tooltip: {
          enabled: true,
          x: {
            show: true,
            format: 'd.M klo HH:mm',
          },
        },
      },
      selected: {
        start: sub(new Date(), { days: 1 }),
        end: new Date(),
      },
      locales: {
        fi,
        en: undefined,
      },
      selectedRange: {
        start: sub(new Date(), { days: 1 }),
        end: new Date(),
      },
      initialized: false,
    }
  },
  computed: {
    ...mapState(useMain, {
      locale: (store) => store.locale,
      isLoggedIn: (store) => store.isLoggedIn,
      isLoading: (store) => !!store.loading.length,
      series: (store) => Object.values(store.measurements.reduce((acc, cur) => {
        const name = cur.name || cur.id
        const timestamp = new Date(cur.timestamp).getTime()
        const value = Number.parseFloat(cur.total_m3)
        if (!Object.hasOwnProperty.call(acc, name)) {
          acc[name] = {
            name,
            data: [],
            color: name === 'lämmin' ? '#ff3d36' : '#52a1fe',
          }
        }
        acc[name].data.push([
          timestamp,
          value,
        ])
        return acc
      }, {})),
    }),
  },
  watch: {},
  async created () {
    if (this.isLoggedIn && this.series.length === 0) {
      await this.getMeasurements(this.selected.start, this.selected.end)
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
    resetZoom (e = {}, name) {
      if ((e.target || {}).tagName !== 'foreignObject' && (e.target || {}).tagName !== 'svg') {
        return
      }
      if (this.$refs[name]) {
        this.$refs[name][0].resetSeries()
      }
    },
    isRangeSelected (duration) {
      return this.selectedRange ? formatDuration(intervalToDuration(this.selectedRange)) === formatDuration(duration) : false
    },
    async selectRange(duration) {
      this.initialized = true
      this.selectedRange = {
        start: sub(new Date(), duration),
        end: new Date(),
      }
      this.selected = {
        start: sub(new Date(), duration),
        end: new Date(),
      }
      await this.getMeasurements(this.selected.start, this.selected.end)
    },
    format(...args) {
      return format(...args, ...(this.locales[this.locale] ? [{
        locale: this.locales[this.locale],
      }] : []))
    },
    onDayClick () {
      this.initialized = true
      this.selectedRange = null
    },
    closeDatePicker (cb) {
      if (this.initialized) {
        cb()
        this.$nextTick(() => {
          this.getMeasurements(this.selected.start, this.selected.end)
        })
      }
    },
    getAnnotations (name) {
      const s = this.series.find(i => i.name === name)
      const annotations = { yaxis: [],
        xaxis: [],
      }
      if (s) {
        const avg = Math.max(...s.data.map(([_ts, vl]) => vl))
        const dff = (Math.max(...s.data.map(([_ts, vl]) => vl)) - Math.min(...s.data.map(([_ts, vl]) => vl)))
        annotations.yaxis.push({
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
      }
      return annotations
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
