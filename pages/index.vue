<template>
  <UCard style="height: 100%;">
    <UButton
      :label="$t('_index.refresh')"
      color="gray"
      size="sm"
      block
      leading-icon="i-heroicons-arrow-path-20-solid"
      :disabled="isLoading"
      :loading="isLoading"
      @click="refresh"
    />
  </UCard>
</template>

<script>
import { mapState } from 'pinia'

export default {
  name: 'Index',
  components: {},
  data() {
    return {}
  },
  computed: {
    ...mapState(useMain, {
      isLoading: (store) => !!store.loading.length
    })
  },
  watch: {},
  created () {},
  mounted() {},
  beforeUnmount () {},
  methods: {
    refresh() {
      const main = useMain()
      main.startLoading('refresh')
      setTimeout(() => {
        main.stopLoading('refresh')
      }, 1000)
    }
  }
}

</script>
