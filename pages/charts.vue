<template>
  <UCard
    v-if="isLoggedIn"
    class="charts-card"
  >
    <UPopover :popper="{ placement: 'bottom-start' }">
      <UButton icon="i-heroicons-calendar-days-20-solid">
        {{ format(selected.start, 'd MMM, yyy') }} - {{ format(selected.end, 'd MMM, yyy') }}
      </UButton>
      <template #panel="{ close }">
        <div class="flex items-center sm:divide-x divide-gray-200 dark:divide-gray-800">
          <div class="hidden sm:flex flex-col py-4">
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
            :columns="1"
            @day-click="onDayClick"
            @close="close"
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
      :options="options"
      :series="[s]"
      @dblclick="resetZoom($event, s.name)"
    />
  </UCard>
</template>

<script>
import { mapState } from 'pinia';
import { fi } from 'date-fns/locale'
import { sub, format, formatDuration, intervalToDuration } from 'date-fns'
import enCharts from '~/locales/en/charts'
import fiCharts from '~/locales/fi/charts'
import DatePicker from '~/components/DatePicker.vue'

export default {
  name: 'Charts',
  components: {
    DatePicker
  },
  data() {
    return {
      ready: false,
      ranges: [
        { label: this.$t('_charts.range.twelveHours'), duration: { hours: 12 } },
        { label: this.$t('_charts.range.day'), duration: { days: 1 } },
        { label: this.$t('_charts.range.twoDays'), duration: { days: 2 } },
        { label: this.$t('_charts.range.week'), duration: { days: 7 } },
        { label: this.$t('_charts.range.twoWeeks'), duration: { days: 14 } },
        { label: this.$t('_charts.range.month'), duration: { months: 1 } },
        { label: this.$t('_charts.range.threeMonths'), duration: { months: 3 } },
        { label: this.$t('_charts.range.sixMonths'), duration: { months: 6 } },
        { label: this.$t('_charts.range.year'), duration: { years: 1 } }
      ],
      options: {
        chart: {
          height: 350,
          type: 'line',
          locales: [
            fiCharts._charts.lang,
            enCharts._charts.lang
          ],
          defaultLocale: 'fi'
        },
        stroke: {
          show: true,
          curve: 'straight',
          width: 2
        },
        xaxis: {
          labels: {
            rotate: 0,
            hideOverlappingLabels: true,
            datetimeUTC: false
          },
          type: 'datetime',
        },
        grid: {
          show: true,
          strokeDashArray: 2,
          xaxis: {
            lines: {
              show: true
            }
          },
          yaxis: {
            lines: {
              show: true
            }
          }
        },
        tooltip: {
          enabled: true,
          x: {
            show: true,
            format: 'd.M klo HH:mm'
          }
        }
      },
      selected: { start: sub(new Date(), { days: 1 }), end: new Date() },
      locales: { fi, en: undefined },
      rangeSelected: false
    }
  },
  computed: {
    ...mapState(useMain, {
      locale: (store) => store.locale,
      isLoggedIn: (store) => store.isLoggedIn,
      isLoading: (store) => !!store.loading.length,
      latest: (store) => store.latest,
      series: (store) => Object.values(store.measurements.reduce((acc, cur) => {
        const name = cur.name || cur.id;
        const timestamp = new Date(cur.timestamp).getTime();
        const value = Number.parseFloat(cur.total_m3);
        if (!Object.hasOwnProperty.call(acc, name)) {
          acc[name] = {
            name,
            data: [[timestamp, value]],
            color: name === 'lämmin' ? '#ff3d36' : '#52a1fe'
          };
        }
        acc[name].data.push([timestamp, value]);
        return acc;
      }, {})),
    }),
  },
  watch: {
    selected (v) {
      if (!this.rangeSelected) {
        this.getMeasurements(v.start, v.end)
      }
    }
  },
  async created () {
    if (this.isLoggedIn && this.latest.length === 0) {
      await this.getLatest()
    }
    if (this.isLoggedIn && this.series.length === 0) {
      await this.getMeasurements()
    }
  },
  mounted() {},
  beforeUnmount () {},
  methods: {
    getLatest() {
      try {
        const main = useMain()
        main.getLatest()
      } catch (err) {
        console.log(err.message)
      }
    },
    getMeasurements(start, end) {
      try {
        const main = useMain()
        main.getMeasurements(start, end)
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
      return formatDuration(intervalToDuration(this.selected)) === formatDuration(duration)
    },
    selectRange(duration) {
      this.rangeSelected = true
      this.selected = { start: sub(new Date(), duration), end: new Date() }
      this.getMeasurements(this.selected.start, this.selected.end)
    },
    format(...args) {
      return format(...args, ...(this.locales[this.locale] ? [{
        locale: this.locales[this.locale]
      }] : []))
    },
    onDayClick () {
      this.rangeSelected = false
    }
  }
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
