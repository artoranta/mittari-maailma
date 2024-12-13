// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2024-11-01',
  devtools: { enabled: true },
  ssr: false,
  modules: [
    '@nuxt/ui',
    '@pinia/nuxt',
    '@nuxtjs/device',
    '@nuxt/fonts',
  ],
  runtimeConfig: {
    public: {
      buildDate: (new Date()).toISOString(),
    },
  },
})
