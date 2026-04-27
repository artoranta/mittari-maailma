<template>
  <UCard
    v-if="isLoggedIn"
    class="settings-card"
  >
    <div class="setting-container">
      <p>
        {{ $t('_settings.mockData') }}
      </p>
      <div>
        <USelect
          :options="[
            { label: $t('_settings.mockDataOptions.On'), value: '1' },
            { label: $t('_settings.mockDataOptions.Off'), value: '0' },
          ]"
          :model-value="mockData"
          @update:model-value="selectMockData"
        />
      </div>
    </div>
  </UCard>
</template>

<script>
import { mapState } from 'pinia'

export default {
  name: 'Settings',
  components: {},
  data() {
    return {}
  },
  computed: {
    ...mapState(useMain, {
      isLoggedIn: (store) => store.isLoggedIn,
      mockData: (store) => store.mockData,
    })
  },
  watch: {},
  async created () {},
  mounted() {},
  beforeUnmount () {},
  methods: {
    async selectMockData(value) {
      const main = useMain()
      await main.setMockData(value)
    },
  },
}

</script>

<style>
.settings-card {
  min-height: 450px;
  width: 100%;
}

.setting-container {
  margin-top: 1rem;
  margin-bottom: 1rem;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 2rem;
  flex-wrap: wrap;
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
