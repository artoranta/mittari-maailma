<template>
  <div style="height: 100%;">
    <UHorizontalNavigation
      :links="links"
      class="border-b border-gray-200 dark:border-gray-800"
    />
    <div style="padding: 20px; height: 100%;">
      <slot />
    </div>
    <div style="position: absolute; bottom: 25px; right: 30px; color: grey;">
      {{ formatDate($config.public.buildDate) }}
    </div>
  </div>
</template>

<script>
import dayjs from 'dayjs'
import 'dayjs/locale/fi'
import updateLocale from 'dayjs/plugin/updateLocale'

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
            label: this.$t('_links.home'),
            icon: 'i-heroicons-home',
            to: '/'
          }, {
            label: this.$t('_links.charts'),
            icon: 'i-heroicons-chart-bar',
            to: '/charts'
          }
        ],
        [
          {
            label: this.$t('_links.profile'),
            icon: 'i-heroicons-user-16-solid'
          }
        ]
      ]
    }
  },
  computed: {},
  mounted() {
  },
  methods: {
    formatDate(string) {
      return dayjs(string).locale('fi').format('D.M.YYYY [klo] HH:mm')
    }
  }
}
</script>
