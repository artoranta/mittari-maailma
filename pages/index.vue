<template>
  <div
    v-if="isLoggedIn"
    style="display: flex; gap: 1rem; flex-direction: column; height: 100%; width: 100%;"
  >
    <UCard class="latest-card">
      <div style="position: absolute; top: 5px; right: 10px; color: grey; font-size: 12px;">
        {{ formatDate(timestamp) }}
      </div>
      <pre
        class="latest"
      >{{ JSON.stringify(latest, undefined, 2).slice(0, 50001) }}</pre>
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

export default {
  name: 'Index',
  components: {},
  data() {
    return {}
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
  justify-content: flex-start;
  align-items: center;
}
.latest {
  font-size: 13px;
  font-family: ui-sans-serif, system-ui, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji";
  cursor: text;
  width: 100%;
}
</style>
