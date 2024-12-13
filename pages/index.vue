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
      <!--<pre
        class="latest"
      >{{ JSON.stringify(latest, undefined, 2).slice(0, 50001) }}</pre>-->
    </UCard>
    <UButton
      :label="$t('_index.refresh')"
      size="sm"
      :disabled="isLoading"
      :loading="isLoading"
      leading-icon="i-heroicons-arrow-path-20-solid"
      block
      @click="getLatest()"
    />
  </div>
</template>

<script>
import { mapState } from 'pinia'
import dayjs from "dayjs";

import meterRed from '~/assets/images/meter-red.svg'
import meterBlue from '~/assets/images/meter-blue.svg'

export default {
  name: 'Index',
  components: {},
  data() {
    return {
      meterRed,
      meterBlue
    }
  },
  computed: {
    ...mapState(useMain, {
      isLoading: (store) => !!store.loading.length,
      latest: (store) => store.latest,
      timestamp: (store) => store.timestamp,
      isLoggedIn: (store) => store.isLoggedIn,
    })
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
    getLatest() {
      try {
        const main = useMain()
        main.getLatest()
      } catch (err) {
        console.log(err.message)
      }
    }
  }
}

</script>

<style>
.latest-card {
  position: relative;
  min-height: 399px;
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
.meter-container {
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
  margin-top: 4.05rem;
  margin-right: 3.40rem;
  text-align: right;
  font-size: 10cqmin;
  letter-spacing: .155rem;
  font-family:  "Lucida Console", Monaco, monospace;
}

.meter-reading-dot {
  margin-top: -2rem;
  margin-right: 6.05rem;
  text-align: right;
  font-size: 10cqmin;
  letter-spacing: .15rem;
  font-family:  "Lucida Console", Monaco, monospace;
}

.meter-reading-timestamp {
  margin-top: 1rem;
  margin-left: 5.6rem;
  text-align: right;
  max-width: 8rem;
  font-size: 5cqmin;
  letter-spacing: .15rem;
  font-family:  "Lucida Console", Monaco, monospace;
}

.meter-reading-id {
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
  opacity: 0.5;
}
</style>
