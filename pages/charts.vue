<template>
  <UCard
    v-if="isLoggedIn"
    style="height: 100%; width: 100%;"
  >
    <h1>...</h1>
  </UCard>
</template>

<script>
import {mapState} from "pinia";

export default {
  name: 'Charts',
  components: {},
  data() {
    return {}
  },
  computed: {
    ...mapState(useMain, {
      isLoggedIn: (store) => store.isLoggedIn,
    })
  },
  watch: {},
  created () {},
  mounted() {},
  beforeUnmount () {},
  methods: {
  }
}

</script>
