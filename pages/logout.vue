<template>
  <div style="display: flex; gap: 1rem; flex-direction: column;" />
</template>
<script>

export default {
  name: 'Logout',
  components: {},
  data() {
    return {}
  },
  computed: {},
  watch: {},
  async created () {
    const main = useMain()
    await main.logout()
    const router = useRouter()
    await router.push('/login')
  },
  mounted() {},
  beforeUnmount () {},
  methods: {}
}

</script>
