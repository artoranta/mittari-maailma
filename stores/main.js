import { defineStore } from 'pinia'

export const useMain = defineStore('main', {
   state: () => ({
      loading: []
   }),
   actions: {
      startLoading(value) {
         this.loading.push(value)
      },
      stopLoading(value) {
         this.loading = this.loading.filter(i => i !== value)
      }
   }
})
