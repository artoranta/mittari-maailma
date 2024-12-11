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
import { mapState } from "pinia";
import en from '~/locales/en/charts'
import fi from '~/locales/fi/charts'

export default {
  name: 'Charts',
  components: {},
  data() {
    return {
      ready: false,
      options: {
        chart: {
          height: 350,
          type: 'line'
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
        },
        locales: [
          fi.charts.lang,
          en.charts.lang
        ]
      }
    }
  },
  computed: {
    ...mapState(useMain, {
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
  watch: {},
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
    getMeasurements() {
      try {
        const main = useMain()
        main.getMeasurements()
      } catch (err) {
        console.log(err.message)
      }
    },
    resetZoom (e, name) {
      if (e.target.tagName !== 'foreignObject' && e.target.tagName !== 'svg') {
        return
      }
      if (this.$refs[name]) {
        this.$refs[name][0].resetSeries()
      }
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
  height: 350px;
  width: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
}
.spinner {
  color: #e5e5e5;
}
</style>
