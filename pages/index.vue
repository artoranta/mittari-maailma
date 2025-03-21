<template>
  <div
    v-if="isLoggedIn"
    style="display: flex; gap: 1rem; flex-direction: column; height: 100%; width: 100%;"
  >
    <UCard class="latest-card">
      <div class="meter-container">
        <div
          v-for="meter in latest"
          :key="meter.id"
          class="meter"
        >
          <div class="meter-reading">
            {{ meter.total_m3.replace('.', '') }}
          </div>
          <div class="meter-reading-dot">
            ,
          </div>
          <div class="meter-reading-timestamp">
            {{ formatDate(meter.timestamp) }}
          </div>
          <div class="meter-reading-id">
            {{ meter.id }}
          </div>
          <img
            class="meter-picture"
            alt="hot-water"
            :src="meter.name === 'lämmin' ? meterRed : meterBlue"
          >
        </div>
      </div>
      <div style="position: absolute; top: 5px; right: 10px; color: grey; font-size: 12px;">
        {{ formatDate(timestamp) }}
      </div>
      <UButton
        size="sm"
        color="white"
        variant="solid"
        :disabled="isLoading"
        :loading="isLoading"
        class="refresh-button"
        leading-icon="i-heroicons-arrow-path-20-solid"
        block
        @click="getLatest()"
      />
      <!--<pre
        class="latest"
      >{{ JSON.stringify(latest, undefined, 2).slice(0, 50001) }}</pre>-->
    </UCard>
  </div>
</template>

<script>
import { mapState } from 'pinia'
import dayjs from "dayjs"

import meterRed from '~/assets/images/meter-red.svg'
import meterBlue from '~/assets/images/meter-blue.svg'

export default {
  name: 'Index',
  components: {},
  data() {
    return {
      meterRed,
      meterBlue,
    }
  },
  computed: {
    ...mapState(useMain, {
      isLoading: (store) => !!store.loading.length,
      isLoggedIn: (store) => store.isLoggedIn,
    }),
    ...mapState(useMeasurements, {
      latest: (store) => store.latest,
      timestamp: (store) => store.timestamp,
    }),
  },
  watch: {},
  created () {
    if (this.isLoggedIn && this.latest.length === 0) {
      this.getLatest()
    }
  },
  mounted() {},
  beforeUnmount () {},
  methods: {
    formatDate(string) {
      return dayjs(string).locale('fi').format('D.M.YYYY [klo] HH:mm.ss')
    },
    async getLatest() {
      try {
        const measurements = useMeasurements()
        await measurements.getLatest()
      } catch (err) {
        console.log(err.message)
      }
    },
  },
}

</script>

<style>
.latest-card {
  position: relative;
  display: flex;
  justify-content: center;
  align-items: center;
}
.latest {
  font-size: 13px;
  font-family: ui-sans-serif, system-ui, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji";
  cursor: text;
  width: 100%;
}
.refresh-button {
  position: absolute;
  bottom: 0.75rem;
  right: 0.75rem;
  width: 3rem;
  color: grey;
}
.meter-container {
  margin-top: 1rem;
  margin-bottom: 1rem;
  display: flex;
  flex-direction: row;
  justify-content: center;
  gap: 2rem;
  flex-wrap: wrap;

}
.meter {
  position: relative;
  container-type: size;
  width: 15rem;
  height: 15rem;
  resize: both;
}
.meter-reading {
  position: relative;
  z-index: 1000;
  margin-top: 4.05rem;
  margin-right: 3.40rem;
  text-align: right;
  font-size: 10cqmin;
  letter-spacing: .155rem;
  font-family:  "Lucida Console", Monaco, monospace;
}

.meter-reading-dot {
  position: relative;
  z-index: 1000;
  margin-top: -2rem;
  margin-right: 6.05rem;
  text-align: right;
  font-size: 10cqmin;
  letter-spacing: .15rem;
  font-family:  "Lucida Console", Monaco, monospace;
}

.meter-reading-timestamp {
  position: relative;
  z-index: 1000;
  margin-top: 1rem;
  margin-left: 5.6rem;
  text-align: right;
  max-width: 8rem;
  font-size: 5cqmin;
  letter-spacing: .15rem;
  font-family:  "Lucida Console", Monaco, monospace;
}

.meter-reading-id {
  position: relative;
  z-index: 1000;
  margin-top: -7.5rem;
  margin-left: 1.8rem;
  text-align: right;
  max-width: 8rem;
  font-size: 5cqmin;
  letter-spacing: .15rem;
  font-family:  "Lucida Console", Monaco, monospace;
}

.meter-picture {
  position: absolute;
  top: 0;
  right: 0;
}
</style>
