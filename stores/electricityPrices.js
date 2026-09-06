import { defineStore } from 'pinia'
import { mande } from 'mande'
import { useMain } from './main'

const quarterHourStart = (value) => {
  const date = new Date(value)
  date.setSeconds(0, 0)
  date.setMinutes(Math.floor(date.getMinutes() / 15) * 15)
  return date
}

const mockPrice = (date) => {
  const hour = date.getHours() + date.getMinutes() / 60
  return Number((8 + 5 * Math.sin(((hour - 7) / 24) * Math.PI * 2) + (hour >= 17 && hour < 21 ? 4 : 0)).toFixed(2))
}

export const useElectricityPrices = defineStore('electricityPrices', {
  state: () => ({
    prices: [],
  }),
  getters: {
    currentPriceCents: (state) => {
      const start = quarterHourStart(new Date()).getTime()
      return state.prices.find(price => new Date(price.start).getTime() === start)?.priceCents ?? 0
    },
  },
  actions: {
    async load(start = new Date(), end = new Date(Date.now() + 15 * 60 * 1000)) {
      const main = useMain()
      if (main.mockData === '1') {
        const current = quarterHourStart(start)
        this.prices = []
        while (current <= end) {
          this.prices.push({
            start: current.toISOString(),
            end: new Date(current.getTime() + 15 * 60 * 1000).toISOString(),
            priceCents: mockPrice(current),
          })
          current.setMinutes(current.getMinutes() + 15)
        }
        return this.prices
      }

      try {
        const token = await main.getFirebaseToken()
        const api = mande(main.url)
        const prices = await api.get(`/electricityPrices.json?auth=${token}`)
        this.prices = Object.values(prices || {}).map(price => ({
          start: price.start,
          end: price.end,
          priceCents: Number(price.priceCents),
        }))
      } catch (err) {
        console.log(err.message)
        this.prices = []
      }
      return this.prices
    },
  },
})