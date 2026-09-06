<template>
  <div
    v-if="isLoggedIn"
    style="display: flex; gap: 1rem; flex-direction: column; height: 100%; width: 100%;"
  >
    <UCard class="latest-card">
      <div class="meter-container">
        <div
          v-for="meter in latest.sort((a, b) => a.media.localeCompare(b.media))"
          :key="meter.id"
          class="meter"
        >
          <div
            class="meter-reading"
            :aria-label="meter[valueFields[meter.media]]"
          >
            <span
              v-for="(digit, index) in meterDigits(meter[valueFields[meter.media]])"
              :key="`${meter.id}-${index}`"
              class="meter-digit"
            >
              <span
                class="meter-digit-track"
                :style="{ transform: `translateY(-${digit * 10}%)` }"
              >
                <span
                  v-for="value in 10"
                  :key="value"
                  class="meter-digit-value"
                >
                  {{ value - 1 }}
                </span>
              </span>
            </span>
          </div>
          <div :class="`${meter.media === 'water' ? 'meter-reading-dot' : 'meter-reading-dot-electricity'}`">
            ,
          </div>
          <div :class="`${meter.media === 'water' ? 'meter-reading-timestamp' : 'meter-reading-timestamp-electricity'}`">
            {{ formatDate(meter.timestamp) }}
          </div>
          <div :class="`${meter.media === 'water' ? 'meter-reading-id' : 'meter-reading-id-electricity'}`">
            {{ meter.id }}
          </div>
          <div v-if="meter.media === 'electricity'" class="meter-name-electricity">
            {{ meter.name }}
          </div>
          <img
            class="meter-picture"
            alt="hot-water"
            :src="meter.name === 'lämmin' ? meterRed : (meter.media === 'water' ? meterBlue : (meter.name === 'varasto' ? meterYellow : meterGreen))"
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
    <EvChargingCard v-if="hasChargingMeter" />
  </div>
</template>

<script>
import { mapState } from 'pinia'
import dayjs from "dayjs"

import meterRed from '~/assets/images/meter-red.svg'
import meterBlue from '~/assets/images/meter-blue.svg'
import meterGreen from '~/assets/images/meter-green.svg'
import meterYellow from '~/assets/images/meter-yellow.svg'
import EvChargingCard from '~/components/EvChargingCard.vue'
export default {
  name: 'Index',
  components: { EvChargingCard },
  data() {
    return {
      meterRed,
      meterBlue,
      meterGreen,
      meterYellow,
      valueFields: {
        water: 'total_m3',
        electricity: 'total_kwh',
      },
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
    hasChargingMeter() {
      return this.latest.some(measurement => measurement.media === 'electricity' && measurement.name === 'autonlataus')
    },
  },
  watch: {
    isLoggedIn(isLoggedIn) {
      if (isLoggedIn && this.latest.length === 0) {
        this.getLatest()
      }
    },
  },
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
    meterDigits(value) {
      return value.replace('.', '').split('').map(Number)
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
  display: flex;
  gap: 3px;
  justify-content: flex-end;
  height: 1em;
  overflow: hidden;
  z-index: 1000;
  margin-top: 4.35rem;
  margin-right: 3.55rem;
  text-align: right;
  font-size: 10cqmin;
  letter-spacing: .155rem;
  font-family:  "Lucida Console", Monaco, monospace;
}
.meter-digit {
  display: block;
  height: 1em;
  width: 14px;
  overflow: hidden;
}
.meter-digit-track {
  display: flex;
  flex-direction: column;
  transition: transform 0.7s cubic-bezier(.2, .75, .25, 1);
  will-change: transform;
}
.meter-digit-value {
  display: block;
  height: 1em;
  line-height: 1em;
}
.meter-reading-dot {
  position: relative;
  z-index: 1000;
  margin-top: -1.6rem;
  margin-right: 6rem;
  text-align: right;
  font-size: 10cqmin;
  letter-spacing: .15rem;
  font-family:  "Lucida Console", Monaco, monospace;
}
.meter-reading-dot-electricity {
  position: relative;
  z-index: 1000;
  margin-top: -1.6rem;
  margin-right: 3.9rem;
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
.meter-reading-timestamp-electricity {
  position: relative;
  z-index: 1000;
  margin-top: 2.9rem;
  margin-left: 3.5rem;
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
.meter-reading-id-electricity {
  position: relative;
  z-index: 1000;
  margin-top: -5.4rem;
  margin-left: 3.5rem;
  text-align: right;
  max-width: 8rem;
  font-size: 5cqmin;
  letter-spacing: .15rem;
  font-family:  "Lucida Console", Monaco, monospace;
}
.meter-name-electricity {
  position: relative;
  z-index: 1000;
  color: grey;
  margin-top: 5.4rem;
  margin-left: 3.5rem;
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
