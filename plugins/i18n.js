// plugins/i18n.js
import { createI18n } from 'vue-i18n'
import * as enMain from '../locales/en/main.js'
import * as fiMain from '../locales/fi/main.js'
import * as enCharts from '../locales/en/charts.js'
import * as fiCharts from '../locales/fi/charts.js'

// eslint-disable-next-line no-undef
export default defineNuxtPlugin(({ vueApp }) => {
  const messages = {
    en: {
      ...enMain.default,
      ...enCharts.default,
    },
    fi: {
      ...fiMain.default,
      ...fiCharts.default,
    },
  }

  const i18n = createI18n({
    legacy: false,
    locale: 'fi',
    globalInjection: true,
    defaultLocale: 'fi',
    locales: [
      {
        code: 'fi',
        name: 'Finnish',
      },
      {
        code: 'en',
        name: 'English',
      },
    ],
    detectBrowserLanguage: {
      useCookie: true,
      cookieKey: 'i18n_redirected',
    },
    vueI18n: {
      fallbackLocale: 'fi',
    },
    messages,
  })
  vueApp.use(i18n)
})
