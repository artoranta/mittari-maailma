<template>
  <UCard v-if="isLoggedIn" class="billing-card">
    <div class="billing-header">
      <div>
        <h1>{{ $t('_billing.title') }}</h1>
        <p>{{ months.length }} {{ $t('_billing.month').toLowerCase() }}</p>
      </div>
      <UButton
        icon="i-heroicons-plus"
        :label="$t('_billing.addMonth')"
        variant="soft"
        @click="addMonth"
      />
    </div>

    <div v-if="!months.length" class="empty-state">
      {{ $t('_billing.noMonths') }}
    </div>

    <div class="month-controls">
      <div v-for="(month, monthIndex) in months" :key="month.id" class="month-heading">
        <div class="month-picker">
          <input :id="`month-${month.id}`" v-model="month.month" type="month" @change="updateMonthDates(month)">
        </div>
        <div class="date-range">
          <span>{{ $t('_billing.start') }} {{ formatDate(month.start) }}</span>
          <span>{{ $t('_billing.end') }} {{ formatEndDate(month.end) }}</span>
        </div>
        <UButton
          v-if="months.length > 1"
          icon="i-heroicons-trash"
          color="red"
          variant="ghost"
          :aria-label="$t('_billing.removeMonth')"
          @click="removeMonth(monthIndex)"
        />
      </div>
    </div>

    <section class="charge-section">
      <h2>{{ $t('_billing.sales') }}</h2>
      <div class="charge-table">
        <div class="charge-table-row charge-table-header">
          <span>{{ $t('_billing.month') }}</span>
          <span>{{ $t('_billing.consumption') }}</span>
          <span>{{ $t('_billing.unitPrice') }}</span>
          <span>{{ $t('_billing.monthlyFee') }}</span>
          <span>{{ $t('_billing.sum') }}</span>
        </div>
        <div v-for="month in months" :key="`sales-${month.id}`" class="charge-table-row">
          <strong>{{ month.month }}</strong>
          <input v-model.number="month.sales.consumption" class="user-input" type="number" min="0" step="0.001">
          <input :value="formatNumber(unitPrice(month.sales, month), 5)" type="text" readonly>
          <input v-model.number="month.sales.monthlyFee" type="number" min="0" step="0.01">
          <input v-model.number="month.sales.cost" class="user-input" type="number" min="0" step="0.01">
        </div>
        <div class="section-total">{{ $t('_billing.salesTotal') }} <strong>{{ formatMoney(totalFor('sales')) }} €</strong></div>
      </div>
    </section>

    <section class="charge-section">
      <h2>{{ $t('_billing.transfer') }}</h2>
      <div class="charge-table">
        <div class="charge-table-row charge-table-header">
          <span>{{ $t('_billing.month') }}</span>
          <span>{{ $t('_billing.consumption') }}</span>
          <span>{{ $t('_billing.unitPrice') }}</span>
          <span>{{ $t('_billing.monthlyFee') }}</span>
          <span>{{ $t('_billing.sum') }}</span>
        </div>
        <div v-for="month in months" :key="`transfer-${month.id}`" class="charge-table-row">
          <strong>{{ month.month }}</strong>
          <input :value="formatNumber(monthConsumption(month))" type="text" readonly>
          <input :value="formatNumber(unitPrice(month.transfer, month), 5)" type="text" readonly>
          <input v-model.number="month.transfer.monthlyFee" type="number" min="0" step="0.01">
          <input v-model.number="month.transfer.cost" class="user-input" type="number" min="0" step="0.01">
        </div>
        <div class="section-total">{{ $t('_billing.transferTotal') }} <strong>{{ formatMoney(totalFor('transfer')) }} €</strong></div>
      </div>
    </section>

    <section class="charge-section">
      <h2>{{ $t('_billing.tax') }}</h2>
      <div class="charge-table">
        <div class="charge-table-row charge-table-header">
          <span>{{ $t('_billing.month') }}</span>
          <span>{{ $t('_billing.consumption') }}</span>
          <span>{{ $t('_billing.unitPrice') }}</span>
          <span>{{ $t('_billing.monthlyFee') }}</span>
          <span>{{ $t('_billing.sum') }}</span>
        </div>
        <div v-for="month in months" :key="`tax-${month.id}`" class="charge-table-row">
          <strong>{{ month.month }}</strong>
          <input :value="formatNumber(monthConsumption(month))" type="text" readonly>
          <input :value="formatNumber(unitPrice(month.tax, month), 5)" type="text" readonly>
          <input class="invisible-input" type="text" readonly>
          <input v-model.number="month.tax.cost" class="user-input" type="number" min="0" step="0.01">
        </div>
        <div class="section-total">{{ $t('_billing.taxTotal') }} <strong>{{ formatMoney(totalFor('tax')) }} €</strong></div>
      </div>
    </section>

    <template v-for="month in months" :key="`meters-${month.id}`">
      <section v-if="month.meters.length" class="meter-breakdown">
        <h2>{{ month.month }} · {{ $t('_billing.meterBreakdown') }}</h2>
        <div class="resident-cards">
          <article v-for="resident in month.residents" :key="resident.number" class="resident-card">
            <div class="resident-card-header">
              <strong>{{ $t('_billing.apartment', { letter: apartmentLetter(resident.number) }) }}</strong>
            </div>
            <div class="meter-grid">
              <div v-for="meter in resident.meters" :key="meter.id" class="meter-item">
                <span>{{ meterLabel(meter.id) }}</span>
                <strong>{{ formatNumber(meter.consumption) }} kWh</strong>
                <small>{{ formatNumber(meter.averagePrice, 3) }} c/kWh</small>
              </div>
            </div>
            <div class="resident-stats">
              <div><span>{{ $t('_billing.residentConsumption') }}</span><strong>{{ formatNumber(resident.meterConsumption) }} kWh</strong></div>
              <div><span>{{ $t('_billing.commonConsumption') }}</span><strong>{{ formatNumber(resident.commonConsumption) }} kWh</strong></div>
              <div><span>{{ $t('_billing.totalResidentConsumption') }}</span><strong>{{ formatNumber(resident.totalConsumption) }} kWh</strong></div>
              <div><span>{{ $t('_billing.averagePrice') }}</span><strong>{{ formatNumber(resident.averagePrice, 3) }} c/kWh</strong></div>
            </div>
          </article>
        </div>
        <div class="common-summary">
          <span>{{ $t('_billing.realEstateConsumption') }}</span>
          <strong>{{ formatNumber(month.commonConsumption) }} kWh</strong>
          <small>{{ $t('_billing.splitEqually') }}</small>
        </div>
      </section>
    </template>

    <div v-if="residentBillTotals.length" class="resident-bill-summary">
      <div v-for="resident in residentBillTotals" :key="resident.number">
        <span>{{ $t('_billing.apartment', { letter: apartmentLetter(resident.number) }) }}</span>
        <strong>{{ formatMoney(resident.billShare) }} €</strong>
      </div>
    </div>

    <div class="billing-footer">
      <div class="totals">
        <span class="grand-total">{{ $t('_billing.grandTotal') }} <strong>{{ formatMoney(grandTotal) }} €</strong></span>
      </div>
      <UButton
        icon="i-heroicons-calculator"
        :label="isCalculating ? $t('_billing.calculating') : $t('_billing.calculate')"
        :loading="isCalculating"
        :disabled="isCalculating"
        @click="calculate"
      />
    </div>
  </UCard>
</template>

<script>
import { mapState } from 'pinia'
import { fetchMeasurements } from '~/stores/measurements'

const quarterHour = 15 * 60 * 1000
const meterIds = ['resident-1a', 'resident-1b', 'resident-2a', 'resident-2b', 'resident-3a', 'resident-3b']

const localMonthValue = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`

const monthBounds = (month) => {
  const [year, monthNumber] = month.split('-').map(Number)
  const start = new Date(year, monthNumber - 1, 1)
  const end = new Date(year, monthNumber, 1)
  return { start, end }
}

const createMonth = (month = localMonthValue(new Date())) => ({
  month,
  ...monthBounds(month),
  sales: { consumption: 0, unitPrice: 0, cost: 0, monthlyFee: 5.99 },
  transfer: { consumption: 0, unitPrice: 5.26, cost: 0, monthlyFee: 51.68 },
  tax: { consumption: 0, unitPrice: 2.82752, cost: 0 },
  meters: [],
  residents: [],
  commonConsumption: 0,
})

const mockBillingMeasurements = (start, end) => {
  const values = Object.fromEntries(meterIds.map(id => [id, 0]))
  const data = []
  for (let timestamp = start.getTime(); timestamp <= end.getTime(); timestamp += quarterHour) {
    const date = new Date(timestamp)
    const hour = date.getHours() + date.getMinutes() / 60
    meterIds.forEach((id, index) => {
      const active = hour >= 6 + (index % 2) && hour < 23
      const base = active ? 0.04 + index * 0.008 : 0.008 + index * 0.001
      values[id] += base + Math.max(0, Math.sin((hour / 24) * Math.PI * 2)) * 0.015
      data.push({ id, timestamp: date.toISOString(), total_kwh: values[id].toFixed(3) })
    })
  }
  return data
}

export default {
  name: 'Billing',
  data() {
    return {
      months: [createMonth()],
      isCalculating: false,
    }
  },
  computed: {
    ...mapState(useMain, {
      isLoggedIn: (store) => store.isLoggedIn,
      mockData: (store) => store.mockData,
    }),
    grandTotal() {
      return this.totalFor('sales') + this.totalFor('transfer') + this.totalFor('tax')
    },
    residentBillTotals() {
      return [1, 2, 3].map(number => ({
        number,
        billShare: this.months.reduce((total, month) => total + (month.residents.find(resident => resident.number === number)?.billShare || 0), 0),
      })).filter(resident => resident.billShare > 0)
    },
  },
  methods: {
    addMonth() {
      const last = this.months[this.months.length - 1]
      const next = new Date(last ? last.start : new Date())
      next.setMonth(next.getMonth() + 1)
      this.months.push(createMonth(localMonthValue(next)))
    },
    removeMonth(index) {
      this.months.splice(index, 1)
    },
    updateMonthDates(month) {
      Object.assign(month, monthBounds(month.month), { meters: [], residents: [] })
    },
    salesCost(month) {
      return Number(month.sales.cost || 0) + Number(month.sales.monthlyFee || 0)
    },
    transferCost(month) {
      return Number(month.transfer.cost || 0) + Number(month.transfer.monthlyFee || 0)
    },
    taxCost(month) {
      return Number(month.tax.cost || 0)
    },
    unitPrice(charge, month) {
      const consumption = this.monthConsumption(month)
      return consumption ? Number(charge.cost || 0) / consumption * 100 : 0
    },
    monthConsumption(month) {
      return Number(month.sales.consumption) || 0
    },
    totalFor(type) {
      return this.months.reduce((total, month) => total + this[`${type}Cost`](month), 0)
    },
    formatNumber(value, digits = 2) {
      return Number(value || 0).toLocaleString('fi-FI', { minimumFractionDigits: digits, maximumFractionDigits: digits })
    },
    formatMoney(value) {
      return this.formatNumber(value, 2)
    },
    apartmentLetter(number) {
      return String.fromCharCode(64 + number)
    },
    meterLabel(id) {
      const labels = {
        'resident-1a': 'varasto A',
        'resident-1b': 'autonlataus A',
        'resident-2a': 'varasto B',
        'resident-2b': 'autonlataus B',
        'resident-3a': 'varasto C',
        'resident-3b': 'autonlataus C',
      }
      return labels[id] || id
    },
    formatDate(value) {
      return new Intl.DateTimeFormat('fi-FI', { dateStyle: 'short' }).format(value)
    },
    formatEndDate(value) {
      return this.formatDate(new Date(value.getTime() - 1))
    },
    async calculate() {
      if (!this.months.length) return
      this.isCalculating = true
      try {
        const prices = useElectricityPrices()
        for (const month of this.months) {
          const measurements = this.mockData === '1'
            ? mockBillingMeasurements(month.start, month.end)
            : await fetchMeasurements(month.start, month.end, 'electricity')
          await new Promise(resolve => setTimeout(resolve, 0))
          const spotPrices = await prices.load(month.start, month.end)
          const priceByTimestamp = new Map(spotPrices.map(price => [new Date(price.start).getTime(), Number(price.priceCents)]))
          const meterTotals = {}
          measurements.forEach((reading) => {
            const current = Number(reading.total_kwh)
            const previous = meterTotals[reading.id]
            if (previous) {
              const delta = Math.max(0, current - previous.value)
              const price = priceByTimestamp.get(new Date(previous.timestamp).getTime()) || 0
              previous.consumption += delta
              previous.costCents += delta * price
            } else {
              meterTotals[reading.id] = { value: current, timestamp: reading.timestamp, consumption: 0, costCents: 0 }
              return
            }
            previous.value = current
            previous.timestamp = reading.timestamp
          })
          const meterResults = Object.entries(meterTotals).map(([id, meter]) => ({
            id,
            consumption: meter.consumption,
            averagePrice: meter.consumption ? meter.costCents / meter.consumption : 0,
          }))
          const totalConsumption = meterResults.reduce((sum, meter) => sum + meter.consumption, 0)
          if (!month.sales.consumption) {
            month.sales.consumption = totalConsumption
          }
          const billConsumption = this.monthConsumption(month)
          const commonConsumption = Math.max(0, billConsumption - totalConsumption)
          const commonPerResident = commonConsumption / 3
          const residents = [1, 2, 3].map(number => {
            const residentMeters = meterResults.slice((number - 1) * 2, number * 2)
            const meterConsumption = residentMeters.reduce((sum, meter) => sum + meter.consumption, 0)
            const meterCost = residentMeters.reduce((sum, meter) => sum + meter.consumption * meter.averagePrice, 0)
            return {
              number,
              meters: residentMeters,
              meterConsumption,
              commonConsumption: commonPerResident,
              totalConsumption: meterConsumption + commonPerResident,
              averagePrice: meterConsumption ? meterCost / meterConsumption : 0,
              billShare: 0,
            }
          })
          const residentConsumptionTotal = residents.reduce((sum, resident) => sum + resident.totalConsumption, 0)
          const monthBillTotal = this.salesCost(month) + this.transferCost(month) + this.taxCost(month)
          residents.forEach(resident => {
            resident.billShare = residentConsumptionTotal
              ? monthBillTotal * resident.totalConsumption / residentConsumptionTotal
              : 0
          })
          month.meters = meterResults
          month.commonConsumption = commonConsumption
          month.residents = residents
        }
      } finally {
        this.isCalculating = false
      }
    },
  },
}
</script>

<style scoped>
.billing-card { width: min(100%, 1100px); max-height: 100%; overflow: auto; }
.billing-header, .month-heading, .billing-footer { display: flex; align-items: center; justify-content: space-between; gap: 1rem; }
.billing-header { margin-bottom: 1.5rem; }
h1, h2, p { margin: 0; }
h1 { font-size: 1.35rem; }
.billing-header p { color: #6b7280; font-size: .85rem; }
.month-controls { border-bottom: 1px solid #e5e7eb; margin-bottom: 1rem; padding-bottom: 0.6rem; }
.month-heading { align-items: center; margin-bottom: 0; padding: .25rem 0; }
.month-picker, label { display: flex; flex-direction: column; gap: .35rem; font-size: .8rem; color: #6b7280; }
input { border: 1px solid #d1d5db; border-radius: .375rem; padding: .45rem .55rem; color: #111827; background: white; min-width: 0; }
input:read-only { background: #f3f4f6; color: #6b7280; cursor: default; }
input.user-input { border-color: #22a06b; box-shadow: 0 0 0 1px rgb(34 160 107 / 15%); }
.date-range { display: flex; gap: 1rem; color: #6b7280; font-size: .8rem; }
.charge-table { overflow-x: auto; }
.charge-table-row { display: grid; grid-template-columns: minmax(7rem, .8fr) repeat(4, minmax(7rem, 1fr)); gap: .65rem; align-items: end; min-width: 42rem; padding: .45rem 0; }
.charge-table-header { color: #6b7280; font-size: .75rem; font-weight: 600; align-items: center; }
.charge-table-row strong { color: #374151; }
.charge-table-row input { width: 100%; }
.charge-section { border-bottom: 1px solid #e5e7eb; padding: .75rem 0 1rem; }
.charge-section h2 { font-size: 1rem; margin-bottom: .35rem; }
.section-total { border-top: 1px solid #d1d5db; margin-top: .4rem; padding: .55rem 0 0; text-align: right; font-size: .85rem; }
.invisible-input { visibility: hidden; }
.meter-breakdown { margin-top: 1rem; background: #f8fafc; padding: 1rem; border: 1px solid #e5e7eb; border-radius: .5rem; }
.meter-breakdown h2 { font-size: .95rem; margin-bottom: .75rem; }
.resident-cards { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: .75rem; }
.resident-card { background: white; border: 1px solid #dbe3ea; border-radius: .45rem; padding: .75rem; min-width: 0; }
.resident-card-header { display: flex; justify-content: space-between; align-items: center; gap: .5rem; }
.resident-card-header { border-bottom: 1px solid #e5e7eb; padding-bottom: .55rem; color: #166534; }
.meter-grid { display: grid; gap: .45rem; padding: .65rem 0; }
.meter-item { display: grid; grid-template-columns: 1fr auto; gap: .15rem .5rem; font-size: .78rem; }
.meter-item span { color: #374151; }
.meter-item strong { text-align: right; }
.meter-item small { grid-column: 1 / -1; color: #6b7280; }
.resident-stats { display: grid; grid-template-columns: 1fr 1fr; gap: .45rem; border-top: 1px solid #e5e7eb; padding-top: .65rem; }
.resident-stats div { display: flex; flex-direction: column; gap: .15rem; min-width: 0; }
.resident-stats span, .resident-bill span { color: #6b7280; font-size: .7rem; }
.resident-stats strong { font-size: .78rem; }
.resident-bill-summary { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: .75rem; border-top: 1px solid #d1d5db; margin-top: .75rem; padding-top: .75rem; }
.resident-bill-summary div { display: flex; justify-content: space-between; align-items: center; gap: .5rem; background: #fff7ed; border: 2px solid #f97316; border-radius: .25rem; padding: .45rem .65rem; font-size: .78rem; }
.resident-bill-summary span { color: #6b7280; }
.resident-bill-summary strong { color: #166534; }
.common-summary { display: flex; align-items: baseline; gap: .5rem; border-top: 1px solid #d1d5db; margin-top: 1rem; padding-top: .7rem; font-size: .8rem; }
.common-summary span { color: #374151; }
.common-summary small { color: #6b7280; }
.billing-footer { border-top: 1px solid #e5e7eb; padding-top: 1rem; margin-top: 1rem; align-items: end; }
.totals { display: flex; flex-wrap: wrap; gap: .5rem 1.25rem; font-size: .85rem; }
.grand-total { color: #111827; }
.empty-state { padding: 2rem 0; color: #6b7280; }
@media (max-width: 700px) {
  .date-range { flex-direction: column; gap: .2rem; }
  .billing-footer { align-items: stretch; flex-direction: column; }
  .resident-cards { grid-template-columns: 1fr; }
  .resident-bill-summary { grid-template-columns: 1fr; }
}
</style>