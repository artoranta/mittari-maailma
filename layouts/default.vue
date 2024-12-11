<template>
  <div class="layout-container">
    <UHorizontalNavigation
      v-if="isLoggedIn && path !== 'login'"
      :links="links"
      class="border-b border-gray-200 dark:border-gray-800 navigation"
    />
    <div
      class="text-gray-500 font-medium text-sm"
      style="position: absolute; top: 14px; width: 100%; text-align: center; pointer-events: none; opacity: 0.8;"
    >
      {{ (user || {}).username }}
    </div>
    <div style="position: relative; z-index: 10; padding: 1rem; height: calc(100% - 49px); display: flex; flex-direction: column; align-items: center; justify-content: center;">
      <slot />
    </div>
    <div style="position: absolute; bottom: 25px; right: 30px; color: grey; font-size: 12px;">
      {{ formatDate($config.public.buildDate) }}
    </div>
  </div>
</template>

<script>
import dayjs from 'dayjs'
import 'dayjs/locale/fi'
import updateLocale from 'dayjs/plugin/updateLocale'
import {mapState} from "pinia";

dayjs.extend(updateLocale)
dayjs.updateLocale('fi', {
  weekStart: 1
})

export default {
  i18n: {
    inject: true
  },
  auth: false,
  data() {
    return {
      links: [
        [
          {
            label: this.$device.isMobile ? undefined : this.$t('_links.home'),
            icon: 'i-heroicons-home',
            to: '/'
          }, {
            label: this.$device.isMobile ? undefined : this.$t('_links.charts'),
            icon: 'i-heroicons-chart-bar',
            to: '/charts'
          }
        ],
        [
          {
            label: this.$device.isMobile ? undefined : this.$t('_links.logout'),
            icon: 'i-heroicons-arrow-right-end-on-rectangle',
            to: '/logout'
          }
        ]
      ]
    }
  },
  computed: {
    ...mapState(useMain, {
      isLoggedIn: (store) => store.isLoggedIn,
      user: (store) => store.user,
    }),
    path: () => {
      const route = useRoute()
      return route.path.replace('/', '')
    }
  },
  mounted() {
  },
  async created () {
    if (!this.isLoggedIn && this.path !== 'login') {
      const router = useRouter()
      await router.push('/login')
    } else if (!this.user) {
      const main = useMain()
      await main.getUser()
    }
  },
  methods: {
    formatDate(string) {
      return dayjs(string).locale('fi').format('D.M.YYYY [klo] HH:mm')
    }
  }
}
</script>

<style>
.layout-container {}
.navigation {
  background-color: white;
}
</style>
