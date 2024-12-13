import VueApexCharts from 'vue3-apexcharts'

// eslint-disable-next-line no-undef
export default defineNuxtPlugin((nuxtApp) => {
  nuxtApp.vueApp.use(VueApexCharts)
})
