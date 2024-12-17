<template>
  <UCard
    v-if="isLoggedIn"
    class="charts-card"
  >
    <!--<div
      v-if="isLoading"
      class="spinner-wrapper"
    >
      <UIcon
        name="i-svg-spinners:180-ring"
        class="spinner w-10 h-10"
      />
    </div>-->
    <UPopover :popper="{ placement: 'bottom-start' }">
      <UButton
        icon="i-heroicons-calendar-days-20-solid"
        style="width: 100%; display: flex; justify-content: center; margin-bottom: 0.75rem;"
      >
        {{ label }}
      </UButton>
      <template #panel="{ close }">
        <div class="flex items-center divide-x divide-gray-200 dark:divide-gray-800">
          <div class="flex flex-col py-4">
            <UButton
              v-for="(range, index) in rangeOptions"
              :key="index"
              :label="range.label"
              color="gray"
              :disabled="isLoading"
              variant="ghost"
              class="rounded-none px-6"
              :class="[isRangeSelected(range) ? 'bg-gray-100 dark:bg-gray-800' : 'hover:bg-gray-50 dark:hover:bg-gray-800/50']"
              truncate
              @click="selectRange(range)"
            />
          </div>
          <DatePicker
            v-model="selected"
            locale="fi-FI"
            :columns="$device.isMobile ? 1 : 2"
            @day-click="onDayClick"
            @close="closeDatePicker(close)"
          />
        </div>
      </template>
    </UPopover>
    <div style="display: flex; flex-direction: row; justify-content: space-between;">
      <UTabs
        :default-index="selectedGroupedByIndex"
        :items="groupedByOptions"
        @change="selectGroupedBy(groupedByOptions[$event].value)"
      />
      <UTabs
        :default-index="selectedMergedIndex"
        :items="mergedOptions"
        @change="selectMerged(mergedOptions[$event].value)"
      />
    </div>
    <apexchart
      v-if="rows.length && !isLoading"
      :key="`${selectedGroupedBy}-${selectedMerged}-${JSON.stringify(selected)}-${rows.length}-${start.getTime()}-${end.getTime()}-${selectedRange}`"
      ref="reportChart"
      :height="350"
      :options="options"
      :series="series"
    />
    <UTable
      :loading="isLoading || !rows.length"
      :empty-state="{
        icon: 'i-heroicons:circle-stack-20-solid',
        label: $t('noItems')
      }"
      :loading-state="{
        icon: 'i-heroicons:arrow-path-20-solid',
        label: $t('loading')
      }"
      :columns="columns"
      :rows="rows"
    />
  </UCard>
</template>

<script>
import { mapState } from 'pinia'
import {
  endOfDay,
  format,
  startOfDay,
  sub,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  startOfYear,
  endOfYear
} from 'date-fns'

export default {
  name: 'Reports',
  components: {
  },
  data() {
    return {
      mergedOptions: [
        {
          label: this.t('_charts.options.separately'),
          value: false,
          index: 0,
        },
        {
          label: this.t('_charts.options.merged'),
          value: true,
          index: 1,
        },
      ],
      groupedByOptions: [
        {
          label: this.t('_charts.group.hour'),
          value: 'hour',
          index: 0,
        },
        {
          label: this.t('_charts.group.day'),
          value: 'day',
          index: 1,
        },
        {
          label: this.t('_charts.group.week'),
          value: 'week',
          index: 2,
        },
        {
          label: this.t('_charts.group.month'),
          value: 'month',
          index: 3,
        },
      ],
      rangeOptions: [
        {
          label: this.t('_charts.range.today'),
          start: startOfDay(new Date()),
          end: endOfDay(new Date()),
        },
        {
          label: this.t('_charts.range.yesterday'),
          start: sub(startOfDay(new Date()), { days: 1 }),
          end: sub(endOfDay(new Date()), { days: 1 }),
        },
        {
          label: this.t('_charts.range.thisWeek'),
          start: startOfWeek(new Date()),
          end: endOfDay(new Date()), // endOfWeek(new Date()) is disabled
        },
        {
          label: this.t('_charts.range.lastWeek'),
          start: sub(startOfWeek(new Date()), { days: 7 }),
          end: sub(endOfWeek(new Date()), { days: 7 }),
        },
        {
          label: this.t('_charts.range.thisMonth'),
          start: startOfMonth(new Date()),
          end: endOfDay(new Date()), // endOfMonth(new Date()) is disabled
        },
        {
          label: this.t('_charts.range.lastMonth'),
          start: sub(startOfMonth(new Date()), { months: 1 }),
          end: sub(endOfMonth(new Date()), { months: 1 }),
        },
        {
          label: this.t('_charts.range.thisYear'),
          start: startOfYear(new Date()),
          end: endOfDay(new Date()), // endOfYear(new Date()) is disabled
        },
        {
          label: this.t('_charts.range.lastYear'),
          start: sub(startOfYear(new Date()), { years: 1 }),
          end: sub(endOfYear(new Date()), { years: 1 }),
        },
      ],
      columns: [
        {
          key: 'date',
          label: this.t('_reports.date'),
          sortable: true,
        },
        {
          key: 'name',
          label: this.t('_reports.name'),
          sortable: true,
        },
        ...(this.$device.isMobile ? [] : [
          {
            key: 'range',
            label: this.t('_reports.range'),
          },
        ]),
        {
          key: 'consumption',
          label: this.t('_reports.consumption'),
          sortable: true,
        },
        ...(this.$device.isMobile ? [] : [
          {
            key: 'count',
            label: this.t('_reports.count'),
          },
        ]),
      ],
      selected: {
        start: startOfWeek(new Date()),
        end: endOfDay(new Date()),
      },
      selectedRange: true,
    }
  },
  computed: {
    ...mapState(useMain, {
      isLoggedIn: (store) => store.isLoggedIn,
      isLoading: (store) => !!store.loading.length,
    }),
    ...mapState(useReports, {
      start: (store) => store.start,
      end: (store) => store.end,
      rows: (store) => store.rows,
      series: (store) => store.series,
      options: (store) => store.options,
      selectedGroupedBy: (store) => store.groupedBy,
      selectedMerged: (store) => store.merged,
    }),
    selectedGroupedByIndex() {
      const selection = this.groupedByOptions.find(i => i.value === this.selectedGroupedBy)
      return selection ? selection.index : 2
    },
    selectedMergedIndex() {
      const selection = this.mergedOptions.find(i => i.value === this.selectedMerged)
      return selection ? selection.index : 0
    },
    label() {
      const rangeLabel = `${format(this.selected.start, 'd MMM, yyy')} - ${format(this.selected.end, 'd MMM, yyy')}`
      const selectedRangeLabel = (this.rangeOptions.find(range => this.selected.start.getTime() === range.start.getTime() && this.selected.end.getTime() === range.end.getTime()) || {}).label
      return selectedRangeLabel
        ? `${selectedRangeLabel} (${rangeLabel})`
        : rangeLabel
    },
  },
  watch: {},
  async created () {
    if (this.isLoggedIn && this.rows.length === 0) {
      await this.getRows(this.selected.start, this.selected.end)
    }
  },
  mounted() {},
  beforeUnmount () {},
  methods: {
    async getRows(start, end) {
      try {
        const reports = useReports()
        await reports.getRows(start, end)
      } catch (err) {
        console.log(err.message)
      }
    },
    isRangeSelected (range) {
      return this.selectedRange && this.selected.start.getTime() === range.start.getTime() && this.selected.end.getTime() === range.end.getTime()
    },
    async selectRange(range) {
      this.selectedRange = true
      this.selected = {
        start: range.start,
        end: range.end,
      }
    },
    async selectGroupedBy(value) {
      const reports = useReports()
      await reports.setGroupedBy(value)
    },
    async selectMerged(value) {
      const reports = useReports()
      await reports.setMerged(value)
    },
    async onDayClick () {
      this.selectedRange = false
    },
    t (key) {
      return this.$t(this.$device.isMobile ? `${key.split('.').slice(0, -1).join('.')}._mobile.${key.split('.').pop()}` : key)
    },
    async closeDatePicker (cb) {
      cb()
      if (!this.selectedRange) {
        this.selected = {
          start: startOfDay(this.selected.start),
          end: endOfDay(this.selected.end),
        }
      }
      if (this.start !== this.selected.start || this.end !== this.selected.end) {
        await this.getRows(this.selected.start, this.selected.end)
      }
    },
  },
}

</script>

<style>
.charts-card {
  min-height: 450px;
  width: 100%;
}
.spinner-wrapper {
  position: absolute;
  top: 0;
  left: 0;
  height: 100%;
  width: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
}
.spinner {
  color: #e5e5e5;
}
</style>
