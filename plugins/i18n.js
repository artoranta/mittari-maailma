// plugins/i18n.js
import { createI18n } from 'vue-i18n'
import * as enMain from '../locales/en/main.js'
import * as fiMain from '../locales/fi/main.js'

export default defineNuxtPlugin(({ vueApp }) => {
  const locales = {
    en: enMain,
    fi: fiMain
  }
  const messages = {}
  for (const path in locales) {
    messages[path] = messages[path]
      ? Object.assign(messages[path], locales[path].default)
      : locales[path].default
  }
  const i18n = createI18n({
    legacy: false,
    locale: 'fi',
    globalInjection: true,
    defaultLocale: 'fi',
    locales: [
      {
        code: 'fi',
        name: 'Finnish'
      },
      {
        code: 'en',
        name: 'English'
      }
    ],
    detectBrowserLanguage: {
      useCookie: true,
      cookieKey: 'i18n_redirected'
    },
    vueI18n: {
      fallbackLocale: 'fi'
    },
    messages
  })
  vueApp.use(i18n)
})
